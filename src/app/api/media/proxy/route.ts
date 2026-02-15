import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;

  // Block plain IPv4 private ranges.
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

const ALLOWED_HOSTS = new Set([
  // Temporary CDN used by some providers. Chrome can block these via ORB when fetched cross-origin.
  'tempfile.aiquickdraw.com',
  // LaoZhang video content endpoint (requires server-side Authorization).
  'api.laozhang.ai',
]);

function getSupabaseHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedSupabaseObjectUrl(target: URL, supabaseHost: string): boolean {
  if (target.hostname.toLowerCase() !== supabaseHost) return false;
  // Only allow object fetches from Supabase Storage (public or signed), but keep it scoped to buckets we use
  // for user-visible media. This prevents using the proxy to hit arbitrary Supabase endpoints.
  const allowedBuckets = new Set(['generations', 'gallery']);
  const m = target.pathname.match(/^\/storage\/v1\/object\/(public|sign)\/([^/]+)\//);
  if (!m) return false;
  const bucket = m[2];
  if (!bucket || !allowedBuckets.has(bucket)) return false;
  return (
    target.pathname.startsWith(`/storage/v1/object/public/${bucket}/`) ||
    target.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`)
  );
}

// Public proxy for media used in public galleries (inspiration/home).
// We keep it tightly scoped to a small allowlist to avoid SSRF abuse.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get('url');
  const forceDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';
  const filenameParam = (searchParams.get('filename') || '').trim();
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 });
  }
  if (isPrivateOrLocalHost(target.hostname)) {
    return NextResponse.json({ error: 'Blocked host' }, { status: 400 });
  }
  const host = target.hostname.toLowerCase();
  const supabaseHost = getSupabaseHost();
  const hostAllowed =
    ALLOWED_HOSTS.has(host) ||
    (supabaseHost ? isAllowedSupabaseObjectUrl(target, supabaseHost) : false);
  if (!hostAllowed) return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
  if (host === 'api.laozhang.ai' && !/^\/v1\/videos\/[^/]+\/content$/i.test(target.pathname)) {
    return NextResponse.json({ error: 'LaoZhang path not allowed' }, { status: 400 });
  }

  try {
    const extraHeaders: Record<string, string> = {};
    if (host === 'api.laozhang.ai') {
      const key = process.env.LAOZHANG_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'LaoZhang key missing' }, { status: 500 });
      extraHeaders.Authorization = `Bearer ${key}`;
    }

    const upstream = await fetchWithTimeout(target.toString(), {
      // Downloads (especially videos) can exceed 20s on slow networks.
      // Keep a higher ceiling, but this endpoint is allowlisted to prevent abuse.
      timeout: 60_000,
      redirect: 'follow',
      headers: {
        'User-Agent': 'LensRoom/1.0 (public-media-proxy)',
        Accept: 'image/*,video/*,*/*;q=0.5',
        ...extraHeaders,
      },
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: 'Upstream fetch failed', status: upstream.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    // If upstream returned HTML, do not forward it as "image" because the browser will treat it as a broken media.
    if (contentType.includes('text/html')) {
      return NextResponse.json({ error: 'Upstream returned HTML' }, { status: 502 });
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Cache proxy responses to reduce load and speed up gallery scrolling.
      // If we force-download, do not cache (these requests are usually one-off).
      'Cache-Control': forceDownload ? 'private, no-cache, no-store, must-revalidate' : 'public, max-age=86400, stale-while-revalidate=604800',
    };

    if (forceDownload) {
      // Keep filename conservative to avoid header injection.
      const safeName = filenameParam.replace(/[^\w.\-() ]+/g, '').slice(0, 120) || 'lensroom-download';
      headers['Content-Disposition'] = `attachment; filename="${safeName}"`;
    }

    return new NextResponse(upstream.body as any, {
      status: 200,
      headers,
    });
  } catch (e) {
    if (e instanceof FetchTimeoutError) {
      return NextResponse.json({ error: 'Upstream timeout' }, { status: 504 });
    }
    console.error('[Media Proxy] Error:', e);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
