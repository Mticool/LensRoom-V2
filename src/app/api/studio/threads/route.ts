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
    const modelId = (searchParams.get("model_id") || "").trim();
    if (!modelId) return badRequest("model_id is required");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("studio_threads")
      .select("id,user_id,model_id,title,created_at,updated_at")
      .eq("user_id", userId)
      .eq("model_id", modelId)
      .order("created_at", { ascending: false });

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
    const modelId = String(body?.modelId || "").trim();
    if (!modelId) return badRequest("modelId is required");

    const supabase = getSupabaseAdmin();

    // Auto title: "Чат N" per user+model
    const { count, error: countErr } = await supabase
      .from("studio_threads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("model_id", modelId);

    if (countErr) {
      console.error("[Studio Threads API] count error:", countErr);
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }

    const nextIndex = (count || 0) + 1;
    const title = `Чат ${nextIndex}`;

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

