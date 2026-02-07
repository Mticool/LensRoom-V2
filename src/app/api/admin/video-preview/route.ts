import { NextRequest, NextResponse } from 'next/server';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createWriteStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;

  const m = h.match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
  if (!m) return false;
  const parts = h.split('.').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function runFfmpeg(args: string[], timeoutMs: number) {
  return await new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    p.stderr.on('data', (d) => {
      stderr += String(d);
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });

    const t = setTimeout(() => {
      try {
        p.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error('ffmpeg timeout'));
    }, timeoutMs);

    p.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });

    p.on('close', (code) => {
      clearTimeout(t);
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg failed (${code}): ${stderr}`));
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('manager');

    const body = await req.json().catch(() => ({}));
    const videoUrl = String(body?.videoUrl || '');
    const seconds = Math.min(5, Math.max(2, Number(body?.seconds || 3)));

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    let target: URL;
    try {
      target = new URL(videoUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid videoUrl' }, { status: 400 });
    }

    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
    }

    if (isPrivateOrLocalHost(target.hostname)) {
      return NextResponse.json({ error: 'Blocked host' }, { status: 400 });
    }

    const id = randomUUID();
    const inputPath = join(tmpdir(), `lensroom-preview-in-${id}.mp4`);
    const outputPath = join(tmpdir(), `lensroom-preview-out-${id}.mp4`);
    const posterPath = join(tmpdir(), `lensroom-preview-poster-${id}.jpg`);

    try {
      let upstream: Response;
      try {
        upstream = await fetchWithTimeout(target.toString(), {
          timeout: 60_000,
          redirect: 'follow',
          headers: { 'User-Agent': 'LensRoom/1.0 (video-preview)' },
        });
      } catch (e) {
        if (e instanceof FetchTimeoutError) {
          return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
        }
        throw e;
      }

      if (!upstream.ok || !upstream.body) {
        const txt = await upstream.text().catch(() => '');
        return NextResponse.json(
          { error: 'Upstream fetch failed', status: upstream.status, details: txt.slice(0, 500) },
          { status: 502 }
        );
      }

      // Write to tmp
      await pipeline(Readable.fromWeb(upstream.body as any), createWriteStream(inputPath));

      // Extract poster frame (JPEG) for maximum compatibility
      const posterArgs = [
        '-y',
        '-ss',
        '0.10',
        '-i',
        inputPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-q:v',
        '4',
        posterPath,
      ];
      await runFfmpeg(posterArgs, 45_000);

      // Create short MP4 preview (H.264) for broad compatibility
      // - ensure even dimensions for H.264 encoder
      const ffArgs = [
        '-y',
        '-i',
        inputPath,
        '-t',
        String(seconds),
        '-vf',
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-an',
        '-movflags',
        '+faststart',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '28',
        outputPath,
      ];

      await runFfmpeg(ffArgs, 90_000);

      const buf = await fs.readFile(outputPath);
      const posterBuf = await fs.readFile(posterPath);

      const supabase = getSupabaseAdmin();
      const bucket = 'content';
      const previewStoragePath = `styles/previews/${Date.now()}-${id}.mp4`;
      const posterStoragePath = `styles/posters/${Date.now()}-${id}.jpg`;

      const { error: uploadError, data: uploaded } = await supabase.storage.from(bucket).upload(previewStoragePath, buf, {
        contentType: 'video/mp4',
        upsert: false,
      });

      if (uploadError) {
        // If bucket missing, try to create once
        if (uploadError.message.includes('not found')) {
          await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 100 * 1024 * 1024 }).catch(() => null);
          const retry = await supabase.storage.from(bucket).upload(previewStoragePath, buf, { contentType: 'video/mp4', upsert: false });
          if (retry.error) throw retry.error;
        } else {
          throw uploadError;
        }
      }

      // Upload poster too (best-effort)
      const { error: posterUploadError, data: posterUploaded } = await supabase.storage.from(bucket).upload(posterStoragePath, posterBuf, {
        contentType: 'image/jpeg',
        upsert: false,
      });

      const finalPreviewPath = (uploaded?.path as string) || previewStoragePath;
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(finalPreviewPath);

      let posterUrl: string | null = null;
      if (!posterUploadError) {
        const finalPosterPath = (posterUploaded?.path as string) || posterStoragePath;
        const { data: posterPublic } = supabase.storage.from(bucket).getPublicUrl(finalPosterPath);
        posterUrl = posterPublic.publicUrl;
      }

      return NextResponse.json({ url: publicData.publicUrl, seconds, posterUrl });
    } finally {
      await fs.unlink(inputPath).catch(() => null);
      await fs.unlink(outputPath).catch(() => null);
      await fs.unlink(posterPath).catch(() => null);
    }
  } catch (error: any) {
    console.error('[Admin Video Preview] Error:', error);
    return respondAuthError(error);
  }
}
