import { getSupabaseAdmin } from '@/lib/supabase/admin';

const CONTENT_BUCKET = 'content';

function guessExtension(contentType: string | null, url: string): string {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/gif')) return 'gif';
  if (ct.includes('image/avif')) return 'avif';
  if (ct.includes('video/mp4')) return 'mp4';
  if (ct.includes('video/webm')) return 'webm';

  try {
    const u = new URL(url);
    const p = u.pathname.split('/').pop() || '';
    const ext = p.includes('.') ? p.split('.').pop() : '';
    const clean = String(ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean && clean.length <= 6) return clean;
  } catch {
    // ignore
  }

  return 'bin';
}

export function isTempfileUrl(url: string | null | undefined): boolean {
  const s = String(url || '').trim();
  if (!s) return false;
  return s.includes('tempfile.aiquickdraw.com');
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Some CDNs require UA; Cloudflare returns HTML errors otherwise.
        'User-Agent': 'LensRoom/1.0 (persist-media)',
        Accept: 'image/*,video/*,*/*;q=0.5',
      },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(t);
  }
}

async function ensureContentBucket(supabase: ReturnType<typeof getSupabaseAdmin>) {
  // Create bucket if missing (idempotent-ish).
  try {
    // Prefer fast check: listBuckets (admin only).
    const { data, error } = await supabase.storage.listBuckets();
    if (!error && Array.isArray(data) && data.some((b) => b.name === CONTENT_BUCKET)) return;
  } catch {
    // ignore
  }

  try {
    await supabase.storage.createBucket(CONTENT_BUCKET, {
      public: true,
      // 100MB matches existing upload route.
      fileSizeLimit: 100 * 1024 * 1024,
    });
  } catch {
    // ignore (may already exist or policy disallows)
  }
}

export type PersistResult =
  | { ok: true; publicUrl: string; bucket: string; path: string; contentType: string | null; sizeBytes: number }
  | { ok: false; reason: 'empty' | 'not_ok' | 'timeout' | 'too_large' | 'upload_failed' | 'unknown'; status?: number; details?: string };

/**
 * Download an external media URL and upload it into Supabase Storage bucket `content`.
 * Returns a stable public URL on success.
 */
export async function persistExternalMediaToContentBucket(opts: {
  url: string;
  keyPrefix: string; // e.g. "effects/<presetId>"
  maxBytes?: number;
  timeoutMs?: number;
}): Promise<PersistResult> {
  const url = String(opts.url || '').trim();
  if (!url) return { ok: false, reason: 'empty' };

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? (opts.timeoutMs as number) : 20_000;
  const maxBytes = Number.isFinite(opts.maxBytes) ? (opts.maxBytes as number) : 25 * 1024 * 1024; // 25MB

  let upstream: Response;
  try {
    upstream = await fetchWithTimeout(url, timeoutMs);
  } catch (e: any) {
    const msg = String(e?.name || e?.message || e || '');
    if (msg.toLowerCase().includes('abort')) return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'unknown', details: msg.slice(0, 500) };
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return { ok: false, reason: 'not_ok', status: upstream.status, details: text.slice(0, 500) };
  }

  const contentLength = Number(upstream.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, reason: 'too_large', status: upstream.status, details: `content-length=${contentLength}` };
  }

  const contentType = upstream.headers.get('content-type');
  const ext = guessExtension(contentType, url);
  const safePrefix = String(opts.keyPrefix || 'external').replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\/+/g, '/');
  const fileName = `${safePrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const ab = await upstream.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.byteLength > maxBytes) {
    return { ok: false, reason: 'too_large', details: `bytes=${buf.byteLength}` };
  }

  const supabase = getSupabaseAdmin();
  await ensureContentBucket(supabase);

  const { data, error } = await supabase.storage.from(CONTENT_BUCKET).upload(fileName, buf, {
    contentType: contentType || undefined,
    upsert: false,
  });

  if (error || !data?.path) {
    return { ok: false, reason: 'upload_failed', details: error?.message || 'no path' };
  }

  const { data: pub } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(data.path);
  return {
    ok: true,
    publicUrl: pub.publicUrl,
    bucket: CONTENT_BUCKET,
    path: data.path,
    contentType: contentType || null,
    sizeBytes: buf.byteLength,
  };
}
