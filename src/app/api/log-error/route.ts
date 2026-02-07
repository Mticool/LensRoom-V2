import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Some browsers/extensions can abort the request body; avoid crashing the route.
    const raw = await request.text();
    if (!raw) return NextResponse.json({ success: true });

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: true });
    }
    const ua = request.headers.get('user-agent') || '';

    // В логах PM2: pm2 logs lensroom — ищите [Client Error]
    console.error('[Client Error]', {
      message: body.message,
      stack: body.stack ?? '(no stack)',
      url: body.url,
      componentStack: body.componentStack,
      isChunkError: body.isChunkError ?? false,
      source: body.source,
      userAgent: ua.slice(0, 120),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Log Error API]', error);
    return NextResponse.json({ success: true });
  }
}
