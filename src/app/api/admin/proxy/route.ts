import { NextRequest, NextResponse } from 'next/server';
import { requireRole, respondAuthError } from '@/lib/auth/requireRole';

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;

  // block plain IPv4 private ranges
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

// Admin-only proxy for fetching external assets (used for poster generation).
export async function GET(req: NextRequest) {
  try {
    await requireRole('manager');

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

    const upstream = await fetch(target.toString(), {
      redirect: 'follow',
      // Some CDNs require a user-agent
      headers: {
        'User-Agent': 'LensRoom/1.0 (poster-proxy)',
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

    return new NextResponse(upstream.body as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[Admin Proxy] Error:', error);
    return respondAuthError(error);
  }
}
