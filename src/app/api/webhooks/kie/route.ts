import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

/**
 * POST /api/webhooks/kie
 * Receives callbacks from KIE.ai when generation completes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (check both header and query param)
    const callbackSecret = env.optional("KIE_CALLBACK_SECRET") || "";
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret") || "";

    if (callbackSecret && token !== callbackSecret && querySecret !== callbackSecret) {
      console.warn("[KIE Webhook] Unauthorized callback attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[KIE Webhook] Received callback:", JSON.stringify(body, null, 2));

    // KIE sends taskId inside data object: { code: 200, data: { taskId: "...", ... }, msg: "..." }
    const taskId = body?.data?.taskId || body?.taskId || body?.task_id || body?.data?.task_id;
    if (!taskId) {
      console.error("[KIE Webhook] Missing taskId in callback. Body keys:", Object.keys(body || {}));
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }
    
    console.log("[KIE Webhook] Extracted taskId:", taskId);

    // Check if webhook already contains result URLs (some KIE models include them)
    const supabase = getSupabaseAdmin();
    const data = body?.data || body;
    
    // Try to extract URLs directly from webhook payload
    let resultUrls: string[] = [];
    
    // Check for URLs in various formats
    if (data?.resultJson) {
      try {
        const parsed = JSON.parse(data.resultJson);
        if (parsed?.resultUrls) resultUrls = parsed.resultUrls;
        else if (parsed?.outputs) resultUrls = parsed.outputs;
        else if (Array.isArray(parsed)) resultUrls = parsed;
      } catch {
        // Try regex extraction
        const urlMatches = data.resultJson.match(/https?:\/\/[^\s"'\\<>]+\.(png|jpg|jpeg|webp|gif|mp4|mov|webm)[^\s"'\\<>]*/gi);
        if (urlMatches) resultUrls = urlMatches;
      }
    }
    
    // Also check for direct URL fields
    if (!resultUrls.length && data?.resultUrls) resultUrls = Array.isArray(data.resultUrls) ? data.resultUrls : [data.resultUrls];
    if (!resultUrls.length && data?.outputs) resultUrls = Array.isArray(data.outputs) ? data.outputs : [data.outputs];
    if (!resultUrls.length && data?.url) resultUrls = [data.url];
    if (!resultUrls.length && data?.imageUrl) resultUrls = [data.imageUrl];
    if (!resultUrls.length && data?.videoUrl) resultUrls = [data.videoUrl];
    
    // If we have URLs from webhook, update DB directly
    if (resultUrls.length > 0 && data?.state === 'success') {
      console.log("[KIE Webhook] Extracted URLs from webhook payload:", resultUrls.length);
      
      // Find generation by task_id
      const { data: gen } = await supabase
        .from('generations')
        .select('id, user_id, type')
        .eq('task_id', taskId)
        .single();
      
      if (gen) {
        await supabase
          .from('generations')
          .update({
            status: 'success',
            result_urls: resultUrls,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gen.id);
        
        console.log("[KIE Webhook] Updated generation directly from webhook:", gen.id);
        return NextResponse.json({ success: true, taskId, direct: true });
      }
    }
    
    // Fallback to sync-task (may fail for large responses)
    try {
      await syncKieTaskToDb({ supabase, taskId: String(taskId) });
      console.log("[KIE Webhook] Successfully synced task:", taskId);
      return NextResponse.json({ success: true, taskId });
    } catch (error) {
      console.error("[KIE Webhook] Sync failed:", error);
      // Return 200 to prevent KIE from retrying, but log error
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Sync failed",
        taskId 
      }, { status: 200 });
    }
  } catch (error) {
    console.error("[KIE Webhook] Error processing callback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/kie
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "/api/webhooks/kie",
    message: "KIE webhook endpoint is active" 
  });
}


