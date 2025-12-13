import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, duration } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Mock response for now
    const jobId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      jobId,
      status: 'processing',
      message: 'Video generation started',
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 }
    );
  }
}

