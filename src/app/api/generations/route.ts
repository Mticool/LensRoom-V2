import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Types
interface GenerationInput {
  type: "photo" | "video" | "product";
  modelId: string;
  prompt: string;
  aspectRatio?: string;
}

// GET - Fetch user's generations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const favorites = searchParams.get("favorites") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
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
      generations: data,
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
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        user_id: user.id,
        type: body.type,
        model: body.modelId,
        prompt: body.prompt,
        aspect_ratio: body.aspectRatio || "1:1",
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
