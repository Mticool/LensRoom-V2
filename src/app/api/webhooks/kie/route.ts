import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

/**
 * POST /api/webhooks/kie
 * Receives callbacks when generation completes
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const callbackSecret = env.optional("KIE_CALLBACK_SECRET") || "";
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (callbackSecret && token !== callbackSecret) {
      console.warn("[KIE Webhook] Unauthorized callback attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("[KIE Webhook] Received callback:", JSON.stringify(body, null, 2));

    const taskId = body?.taskId || body?.task_id;
    if (!taskId) {
      console.error("[KIE Webhook] Missing taskId in callback");
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    // Sync task to database
    const supabase = getSupabaseAdmin();
    
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


