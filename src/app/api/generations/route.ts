import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Types
interface GenerationInput {
  type: "photo" | "video" | "product";
  modelId: string;
  prompt: string;
  aspectRatio?: string;
}

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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (favorites) {
      query = query.eq("is_favorite", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Generations API] Error fetching:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      generations: data || [],
      count: data?.length || 0,
    });
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
