import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limit error logging
    const ip = getClientIP(request);
    const rateLimitResult = checkRateLimit(`error-log:${ip}`, RATE_LIMITS.errorLog);
    
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    
    // Log to console (in production, this could go to a logging service)
    console.error('[Client Error]', {
      timestamp: body.timestamp || new Date().toISOString(),
      url: body.url,
      message: body.message,
      stack: body.stack?.substring(0, 500), // Truncate stack
      componentStack: body.componentStack?.substring(0, 300),
      userAgent: request.headers.get('user-agent'),
      ip,
    });

    return NextResponse.json({ logged: true });
  } catch (error) {
    console.error('Error logging client error:', error);
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}

