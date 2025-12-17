import { NextRequest, NextResponse } from 'next/server';
import { getKieClient } from '@/lib/api/kie-client';
import { integrationNotConfigured } from "@/lib/http/integration-error";

/**
 * Get 1080p version of Veo video
 * GET /api/jobs/veo/[taskId]/1080p
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
        "KIE_CALLBACK_SECRET",
        "KIE_CALLBACK_URL",
      ]);
    }

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Get 1080p video from Veo API
    const response = await kieClient.veoGet1080p(taskId);

    if (!response.data.video1080pUrl) {
      return NextResponse.json(
        { 
          error: '1080p version not ready yet',
          status: response.data.status || 'processing'
        },
        { status: 202 } // Accepted, but not ready
      );
    }

    return NextResponse.json({
      success: true,
      taskId,
      video1080pUrl: response.data.video1080pUrl,
      status: response.data.status || 'completed',
    });
  } catch (error) {
    console.error('[API] Veo 1080p error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

