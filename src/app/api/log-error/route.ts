import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log client-side errors for debugging
    console.error('[Client Error]', {
      message: body.message,
      stack: body.stack,
      url: body.url,
      componentStack: body.componentStack,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Log Error API]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

