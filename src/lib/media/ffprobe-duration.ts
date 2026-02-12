import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

type MediaDurationErrorCode = 'DURATION_EXTRACT_FAILED' | 'UNSUPPORTED_MEDIA';

export class MediaDurationError extends Error {
  code: MediaDurationErrorCode;

  constructor(code: MediaDurationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'MediaDurationError';
  }
}

function extFromMime(mime?: string): string {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('quicktime') || m.includes('mov')) return 'mov';
  if (m.includes('aac')) return 'aac';
  if (m.includes('flac')) return 'flac';
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'bin';
}

async function resolveFfprobePath(): Promise<string> {
  try {
    const mod = await import('ffprobe-static');
    const path = (mod as any)?.path;
    if (path) return String(path);
  } catch {
    // fallback below
  }
  return 'ffprobe';
}

async function ffprobeSeconds(filePath: string): Promise<number> {
  const ffprobePath = await resolveFfprobePath();
  const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath];

  const jsonRaw = await new Promise<string>((resolve, reject) => {
    const proc = spawn(ffprobePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';

    proc.stdout.on('data', (d) => {
      out += String(d || '');
    });
    proc.stderr.on('data', (d) => {
      err += String(d || '');
    });
    proc.on('error', (e) => {
      reject(new MediaDurationError('DURATION_EXTRACT_FAILED', `ffprobe launch failed: ${String(e)}`));
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new MediaDurationError('DURATION_EXTRACT_FAILED', `ffprobe exited with code ${code}: ${err}`));
        return;
      }
      resolve(out);
    });
  });

  let parsed: any;
  try {
    parsed = JSON.parse(jsonRaw);
  } catch (e) {
    throw new MediaDurationError('DURATION_EXTRACT_FAILED', `ffprobe invalid JSON: ${String(e)}`);
  }

  const formatDuration = Number(parsed?.format?.duration);
  const streamDurations = Array.isArray(parsed?.streams)
    ? parsed.streams.map((s: any) => Number(s?.duration)).filter((v: number) => Number.isFinite(v) && v > 0)
    : [];

  const best = Number.isFinite(formatDuration) && formatDuration > 0
    ? formatDuration
    : (streamDurations.length ? Math.max(...streamDurations) : NaN);

  if (!Number.isFinite(best) || best <= 0) {
    throw new MediaDurationError('DURATION_EXTRACT_FAILED', 'ffprobe returned no valid duration');
  }

  return Math.ceil(best);
}

export async function getMediaDurationFromBuffer(buffer: Buffer, mime?: string): Promise<number> {
  if (!buffer || !buffer.length) {
    throw new MediaDurationError('UNSUPPORTED_MEDIA', 'Empty media buffer');
  }

  const ext = extFromMime(mime);
  const tempPath = join(tmpdir(), `lensroom-media-${randomUUID()}.${ext}`);

  await fs.writeFile(tempPath, buffer);
  try {
    return await ffprobeSeconds(tempPath);
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function getMediaDurationFromUrl(url: string): Promise<number> {
  const target = String(url || '').trim();
  if (!target) {
    throw new MediaDurationError('UNSUPPORTED_MEDIA', 'Empty media URL');
  }
  const response = await fetch(target);
  if (!response.ok) {
    throw new MediaDurationError('DURATION_EXTRACT_FAILED', `Failed to fetch media: ${response.status}`);
  }
  const mime = response.headers.get('content-type') || undefined;
  const arr = await response.arrayBuffer();
  return getMediaDurationFromBuffer(Buffer.from(arr), mime);
}

export async function getMediaDurationFromDataUrl(dataUrl: string): Promise<number> {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new MediaDurationError('UNSUPPORTED_MEDIA', 'Invalid data URL');
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return getMediaDurationFromBuffer(buffer, mime);
}

