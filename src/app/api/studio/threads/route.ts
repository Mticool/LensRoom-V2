import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type StudioThread = {
  id: string;
  user_id: string;
  model_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function requireTelegramUserId(): Promise<string | null> {
  const telegramSession = await getSession();
  if (!telegramSession) return null;
  const userId = await getAuthUserId(telegramSession);
  return userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireTelegramUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    // Backward-compatible: old clients passed model_id and got per-model threads.
    // New behavior: projects are global per user; model_id is optional filter only.
    const modelId = (searchParams.get("model_id") || "").trim() || null;

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("studio_threads")
      .select("id,user_id,model_id,title,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (modelId) query = query.eq("model_id", modelId);
    const { data, error } = await query;

    if (error) {
      console.error("[Studio Threads API] GET error:", error);
      return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
    }

    return NextResponse.json({ threads: (data || []) as StudioThread[] }, { status: 200 });
  } catch (e) {
    console.error("[Studio Threads API] GET exception:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireTelegramUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    // Backward-compatible: old clients sent modelId and created a per-model thread.
    // New behavior: modelId is optional (project is content-type agnostic).
    const modelId = String(body?.modelId || "").trim() || "project";

    const supabase = getSupabaseAdmin();

    // Auto title: "Проект N" per user (global)
    const { count, error: countErr } = await supabase
      .from("studio_threads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countErr) {
      console.error("[Studio Threads API] count error:", countErr);
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }

    const nextIndex = (count || 0) + 1;
    const title = `Проект ${nextIndex}`;

    const { data, error } = await supabase
      .from("studio_threads")
      .insert({
        user_id: userId,
        model_id: modelId,
        title,
      })
      .select("id,user_id,model_id,title,created_at,updated_at")
      .single();

    if (error) {
      console.error("[Studio Threads API] POST error:", error);
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }

    return NextResponse.json({ thread: data as StudioThread }, { status: 201 });
  } catch (e) {
    console.error("[Studio Threads API] POST exception:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireTelegramUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const threadId = String(body?.threadId || body?.id || "").trim();
    const titleRaw = String(body?.title || "").trim();

    if (!threadId) return badRequest("threadId is required");
    if (!titleRaw) return badRequest("title is required");
    if (titleRaw.length > 80) return badRequest("title is too long");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("studio_threads")
      .update({ title: titleRaw, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("user_id", userId)
      .select("id,user_id,model_id,title,created_at,updated_at")
      .single();

    if (error) {
      console.error("[Studio Threads API] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
    }

    return NextResponse.json({ thread: data as StudioThread }, { status: 200 });
  } catch (e) {
    console.error("[Studio Threads API] PATCH exception:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

