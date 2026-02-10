import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/api/fetch-with-timeout";

/**
 * POST /api/kie/sync-manual
 * Manual sync endpoint that bypasses the problematic syncKieTaskToDb
 */
export async function POST(request: NextRequest) {
  try {
    const providedSecret =
      (request.headers.get("x-sync-secret") || "").trim() ||
      (request.headers.get("authorization") || "").replace(/^Bearer\\s+/i, "").trim();
    const expectedSecret =
      (env.optional("KIE_MANUAL_SYNC_SECRET") || "").trim() ||
      (env.optional("KIE_CALLBACK_SECRET") || "").trim();
    if (!expectedSecret) {
      return NextResponse.json({ error: "Manual sync disabled" }, { status: 403 });
    }
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const kieKey = env.optional("KIE_API_KEY");
    
    if (!kieKey) {
      return NextResponse.json({ error: "KIE_API_KEY not configured" }, { status: 500 });
    }

    // 1. Get generation by task_id
    const { data: gen, error: genError } = await supabase
      .from("generations")
      .select("*")
      .eq("task_id", taskId)
      .single();

    if (genError || !gen) {
      return NextResponse.json({ error: "Generation not found", taskId }, { status: 404 });
    }

    // 2. Fetch KIE task info
    let kieRes: Response;
    try {
      kieRes = await fetchWithTimeout(
        `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        {
          timeout: 20_000,
          headers: { Authorization: `Bearer ${kieKey}` }
        }
      );
    } catch (e) {
      if (e instanceof FetchTimeoutError) {
        return NextResponse.json({ error: "KIE API timeout" }, { status: 504 });
      }
      throw e;
    }

    if (!kieRes.ok) {
      return NextResponse.json({ error: "KIE API error", status: kieRes.status }, { status: 500 });
    }

    const kieData = await kieRes.json();
    const info = kieData?.data;

    if (!info) {
      return NextResponse.json({ error: "Invalid KIE response" }, { status: 500 });
    }

    // 3. Process based on state
    if (info.state === "success") {
      let urls: string[] = [];
      
      try {
        const resultJson = JSON.parse(info.resultJson || "{}");
        urls = resultJson.resultUrls || [];
      } catch {
        urls = [];
      }

      if (!urls.length) {
        return NextResponse.json({ error: "No result URLs", info }, { status: 500 });
      }

      // Update database
      const { error: updateError } = await supabase
        .from("generations")
        .update({
          status: "success",
          result_urls: urls,
          asset_url: urls[0],
          preview_url: urls[0],
          thumbnail_url: urls[0],
          error: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", gen.id);

      if (updateError) {
        return NextResponse.json({ error: "Update failed", details: updateError }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        generationId: gen.id,
        status: "success",
        urls
      });
    } else if (info.state === "fail") {
      const { error: updateError } = await supabase
        .from("generations")
        .update({
          status: "failed",
          error: info.failMsg || "Generation failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", gen.id);

      if (updateError) {
        return NextResponse.json({ error: "Update failed", details: updateError }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        generationId: gen.id,
        status: "failed",
        error: info.failMsg
      });
    } else {
      // Still in progress
      return NextResponse.json({
        success: true,
        generationId: gen.id,
        status: info.state,
        message: "Still processing"
      });
    }
  } catch (error) {
    console.error("[Manual Sync] Error:", error);
    return NextResponse.json(
      {
        error: "Internal error",
        details: error instanceof Error ? error.message : "Unknown"
      },
      { status: 500 }
    );
  }
}
