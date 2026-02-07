import { NextRequest, NextResponse } from 'next/server';

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
]);

// Public proxy for media used in public galleries (inspiration/home).
// We keep it tightly scoped to a small allowlist to avoid SSRF abuse.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get('url');
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
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'LensRoom/1.0 (public-media-proxy)',
        Accept: 'image/*,video/*,*/*;q=0.5',
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

    return new NextResponse(upstream.body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache proxy responses to reduce load and speed up gallery scrolling.
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    console.error('[Media Proxy] Error:', e);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

