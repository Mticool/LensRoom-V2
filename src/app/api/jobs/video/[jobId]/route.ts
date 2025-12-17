import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Mock response
  return NextResponse.json({
    jobId,
    status: 'completed',
    progress: 100,
    result: {
      url: 'https://example.com/video.mp4',
      thumbnail: 'https://example.com/thumbnail.jpg',
    },
  });
}





