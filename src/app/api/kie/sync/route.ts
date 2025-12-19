import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

/**
 * POST /api/kie/sync?taskId=xxx
 * Manually sync a KIE task to database
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing taskId parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    console.log("[KIE Sync] Manual sync requested for task:", taskId);

    const result = await syncKieTaskToDb({ supabase, taskId });

    console.log("[KIE Sync] Sync result:", result);

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
    usage: "POST /api/kie/sync?taskId=xxx",
  });
}

