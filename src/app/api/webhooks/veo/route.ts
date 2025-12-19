import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { env } from "@/lib/env";
import { notifyGenerationStatus } from "@/lib/telegram/notify";

/**
 * Veo 3.1 Callback Webhook
 * POST /api/webhooks/veo
 * 
 * Called by KIE.ai when Veo video generation completes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, msg, data } = body;

    console.log('[VEO Webhook] Received:', { code, msg, taskId: data?.taskId });

    // Verify the request (optional: add secret verification)
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== (env.optional("VEO_WEBHOOK_SECRET") || "")) {
      console.warn('[VEO Webhook] Invalid secret');
      // Still accept for now, but log warning
    }

    if (code !== 200) {
      console.error('[VEO Webhook] Error response:', body);
      return NextResponse.json({ status: 'error', message: msg }, { status: 400 });
    }

    // Extract task info
    const taskId = data?.taskId;
    const successFlag = data?.info?.successFlag;
    const resultUrls = data?.info?.resultUrls || [];
    const errorMsg = data?.info?.errorMsg;

    if (!taskId) {
      return NextResponse.json({ status: 'error', message: 'Missing taskId' }, { status: 400 });
    }

    // Update generation in database
    const supabase = getSupabaseAdmin();

    if (successFlag === 1) {
      // Success - update with result URLs
      console.log('[VEO Webhook] Success:', taskId, 'URLs:', resultUrls.length);

      // Fetch current row to detect status transition + get ids for notification
      const { data: beforeRow } = await supabase
        .from("generations")
        .select("id, user_id, type, status")
        .eq("task_id", taskId)
        .maybeSingle();

      const beforeStatus = String((beforeRow as any)?.status || "").toLowerCase();

      const { error: updateError } = await supabase
        .from("generations")
        .update({
          status: "completed",
          result_urls: resultUrls,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskId);

      if (updateError) {
        console.error('[VEO Webhook] Failed to update generation:', updateError);
      } else {
        // Notify only on real transition into a terminal success state
        const isAlreadyTerminal = beforeStatus === "completed" || beforeStatus === "success" || beforeStatus === "failed";
        if (!isAlreadyTerminal) {
          try {
            const kind = String((beforeRow as any)?.type || "").toLowerCase() === "video" ? "video" : "photo";
            await notifyGenerationStatus({
              userId: String((beforeRow as any)?.user_id),
              generationId: String((beforeRow as any)?.id),
              kind,
              status: "success",
            });
          } catch {
            // ignore
          }
        }
      }
    } else if (successFlag === 2 || successFlag === 3) {
      // Failed
      console.error('[VEO Webhook] Generation failed:', taskId, errorMsg);

      const { data: beforeRow } = await supabase
        .from("generations")
        .select("id, user_id, type, status")
        .eq("task_id", taskId)
        .maybeSingle();

      const beforeStatus = String((beforeRow as any)?.status || "").toLowerCase();

      const { error: updateError } = await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: errorMsg || "Video generation failed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskId);

      if (updateError) {
        console.error('[VEO Webhook] Failed to update generation:', updateError);
      } else {
        const isAlreadyTerminal = beforeStatus === "completed" || beforeStatus === "success" || beforeStatus === "failed";
        if (!isAlreadyTerminal) {
          try {
            const kind = String((beforeRow as any)?.type || "").toLowerCase() === "video" ? "video" : "photo";
            await notifyGenerationStatus({
              userId: String((beforeRow as any)?.user_id),
              generationId: String((beforeRow as any)?.id),
              kind,
              status: "failed",
            });
          } catch {
            // ignore
          }
        }
      }

      // TODO: Refund credits if needed
    }

    return NextResponse.json({ 
      status: 'received',
      taskId,
      successFlag,
    });
  } catch (error) {
    console.error('[VEO Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

