import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";
import { env } from "@/lib/env";

/**
 * POST /api/kie/sync?taskId=xxx
 * Manually sync a KIE task to database
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const providedSecret =
      (searchParams.get("secret") || "").trim() ||
      (request.headers.get("x-sync-secret") || "").trim() ||
      (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();

    // This endpoint is powerful (can force-sync tasks and hit upstreams).
    // Keep it disabled unless a secret is configured.
    const expectedSecret =
      (env.optional("KIE_MANUAL_SYNC_SECRET") || "").trim() ||
      (env.optional("KIE_CALLBACK_SECRET") || "").trim();
    if (!expectedSecret) {
      return NextResponse.json({ error: "Manual sync disabled" }, { status: 403 });
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing taskId parameter" },
        { status: 400 }
      );
    }
    if (taskId.length > 128) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const result = await syncKieTaskToDb({ supabase, taskId });

    return NextResponse.json({
      success: true,
      taskId,
      result,
    });
  } catch (error) {
    console.error("[KIE Sync] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kie/sync
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/kie/sync",
    usage: "POST /api/kie/sync?taskId=xxx&secret=***",
  });
}
