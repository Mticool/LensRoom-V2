import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";
import { env } from "@/lib/env";

// Types
interface GenerationInput {
  type: "photo" | "video" | "product";
  modelId: string;
  prompt: string;
  aspectRatio?: string;
}

interface GenerationPatchInput {
  id: string;
  status?: "pending" | "processing" | "completed" | "failed";
  results?: Array<{ url: string; thumbnail?: string }>;
  thumbnailUrl?: string;
  creditsUsed?: number;
  taskId?: string;
  error?: string;
}

// Keep API payload small (faster TTFB + less JSON parse on client).
// Only include fields used by Library/Studio UI.
const GENERATIONS_SELECT =
  // NOTE: some older DB schemas don't have `results` column.
  "id,user_id,type,status,model_id,model_name,prompt,negative_prompt,credits_used,task_id,asset_url,preview_url,thumbnail_url,preview_path,poster_path,preview_status,result_urls,error,is_favorite,created_at,updated_at";

// GET - Fetch user's generations (history)
export async function GET(request: NextRequest) {
  try {
    // Check Telegram auth
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const favorites = searchParams.get("favorites") === "true";
    const limitRaw = parseInt(searchParams.get("limit") || "50");
    const offsetRaw = parseInt(searchParams.get("offset") || "0");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const sync = searchParams.get("sync") === "true";
    const fallbackSyncEnabled = env.bool("KIE_FALLBACK_SYNC");

    const buildQuery = (select: string) => {
      let query = supabase
        .from("generations")
        .select(select)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);
      if (favorites) query = query.eq("is_favorite", true);
      return query;
    };

    // Prefer a small select for speed, but fall back to "*" for older schemas.
    let { data, error } = await buildQuery(GENERATIONS_SELECT);
    if (error) {
      const msg = String((error as any)?.message || error);
      const code = String((error as any)?.code || "");
      const isMissingColumn =
        code === "42703" || /column .* does not exist/i.test(msg) || /does not exist/i.test(msg);

      if (isMissingColumn) {
        ({ data, error } = await buildQuery("*"));
      }
    }

    if (error) {
      console.error("[Generations API] Error fetching:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional best-effort server-side fallback syncing (auth-protected).
    if (sync && fallbackSyncEnabled && Array.isArray(data) && data.length) {
      const supabaseAdmin = getSupabaseAdmin();
      const candidates = (data as any[])
        .filter((g) => {
          const st = String(g.status || "");
          const inProgress = st === "pending" || st === "processing" || st === "queued" || st === "generating";
          return inProgress && !!g.task_id && !g.asset_url;
        })
        .slice(0, 5);

      for (const g of candidates) {
        try {
          const result = await syncKieTaskToDb({ supabase: supabaseAdmin, taskId: String(g.task_id) });
          if (result.ok && result.status === "success") {
            console.log("[Generations API] Fallback sync success:", g.task_id, result.assetUrl);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("[Generations API] Fallback sync error:", g.task_id, msg);
        }
      }
    }

    return NextResponse.json(
      {
        generations: data || [],
        count: data?.length || 0,
      },
      {
        headers: {
          // No cache for instant preview updates
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[Generations API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new generation record
export async function POST(request: NextRequest) {
  try {
    // Check Telegram auth
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();

    const body: GenerationInput = await request.json();

    if (!body.type || !body.modelId || !body.prompt) {
      return NextResponse.json(
        { error: "Missing required fields: type, modelId, prompt" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        type: body.type,
        model_id: body.modelId,
        model_name: body.modelId,
        prompt: body.prompt,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[Generations API] Error creating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ generation: data }, { status: 201 });
  } catch (error) {
    console.error("[Generations API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update generation record (Telegram auth)
export async function PATCH(request: NextRequest) {
  try {
    const telegramSession = await getSession();
    if (!telegramSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getAuthUserId(telegramSession);
    if (!userId) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const body: GenerationPatchInput = await request.json();
    if (!body?.id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (body.status) {
      updateData.status = body.status;
    }
    if (body.results) {
      updateData.results = body.results;
      if (!body.thumbnailUrl && body.results.length > 0) {
        updateData.thumbnail_url = body.results[0].thumbnail || body.results[0].url;
      }
    }
    if (body.thumbnailUrl) updateData.thumbnail_url = body.thumbnailUrl;
    if (typeof body.creditsUsed === "number") updateData.credits_used = body.creditsUsed;
    if (body.taskId) updateData.task_id = body.taskId;
    if (body.error) updateData.error = body.error;
    updateData.updated_at = new Date().toISOString();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generations")
      .update(updateData)
      .eq("id", body.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[Generations API] Error updating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ generation: data });
  } catch (error) {
    console.error("[Generations API] PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
