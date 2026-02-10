import { NextRequest, NextResponse } from 'next/server';
import { getKieClient } from '@/lib/api/kie-client';
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Get 1080p version of Veo video
 * GET /api/jobs/veo/[taskId]/1080p
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Use the same KIE key slot that created this task, if we can find it.
    const supabase = getSupabaseAdmin();
    const { data: dbGen } = await supabase
      .from("generations")
      .select("metadata")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const slot = (() => {
      const meta = (dbGen as any)?.metadata || {};
      const n = Number(meta?.kie_key_slot);
      return Number.isFinite(n) ? n : null;
    })();

    let kieClient: any;
    try {
      kieClient = getKieClient({ scope: "video", slot });
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
      ]);
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
