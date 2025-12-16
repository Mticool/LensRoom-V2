import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

const KIE_SYNC_SECRET = process.env.KIE_SYNC_SECRET || process.env.KIE_CALLBACK_SECRET;

/**
 * GET /api/kie/sync?taskId=xxx&secret=yyy
 *
 * Manual fallback sync endpoint (server-only).
 * Requires secret; does not expose KIE keys to client.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logPrefix = "[KIE sync]";

  try {
    const { searchParams } = new URL(request.url);
    const taskId = String(searchParams.get("taskId") || "").trim();
    const secret = searchParams.get("secret");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    if (KIE_SYNC_SECRET && secret !== KIE_SYNC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const synced = await syncKieTaskToDb({ supabase, taskId });

    console.log(`${logPrefix} handled`, { taskId, synced, ms: Date.now() - startTime });

    return NextResponse.json({ ok: true, synced });
  } catch (error) {
    console.error(`${logPrefix} Unexpected error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
