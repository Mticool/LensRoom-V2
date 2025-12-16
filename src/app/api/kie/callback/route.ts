import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

const KIE_CALLBACK_SECRET = process.env.KIE_CALLBACK_SECRET;

if (!KIE_CALLBACK_SECRET) {
  console.warn("[KIE callback] Missing KIE_CALLBACK_SECRET - callbacks will not be secure");
}

/**
 * POST /api/kie/callback?secret=xxx
 *
 * Public webhook endpoint with secret verification.
 * We sync via recordInfo to keep one reliable code path.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logPrefix = "[KIE callback]";

  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (KIE_CALLBACK_SECRET && secret !== KIE_CALLBACK_SECRET) {
      console.error(`${logPrefix} Invalid secret`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const taskId = String((payload as any)?.taskId || "").trim();
    const state = (payload as any)?.state;
    const failCode = (payload as any)?.failCode;
    const hasResultJson = !!(payload as any)?.resultJson;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const synced = await syncKieTaskToDb({ supabase, taskId });

    console.log(`${logPrefix} handled`, {
      taskId,
      state,
      failCode,
      hasResultJson,
      synced,
      ms: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, synced });
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
