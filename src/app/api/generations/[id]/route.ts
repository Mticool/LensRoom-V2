import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

interface GenerationUpdate {
  status?: "pending" | "processing" | "completed" | "failed";
  results?: { url: string; thumbnail?: string }[];
  thumbnailUrl?: string;
  creditsUsed?: number;
  is_favorite?: boolean;
  isPublic?: boolean;
  tags?: string[];
}

// Helper to get user ID from either Telegram or Supabase auth
async function getUserId(): Promise<string | null> {
  // Try Telegram auth first
  const session = await getSession();
  if (session) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("telegram_profiles")
      .select("auth_user_id")
      .eq("telegram_id", session.telegramId)
      .single();
    if (data?.auth_user_id) return data.auth_user_id;
  }
  
  // Fallback to Supabase auth
  const supabaseClient = await createServerSupabaseClient();
  if (supabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user?.id) return user.id;
  }
  
  return null;
}

// GET - Fetch single generation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Generations API] GET request for id:', id);
    
    const userId = await getUserId();
    console.log('[Generations API] User ID:', userId);
    
    if (!userId) {
      console.error('[Generations API] No userId - returning 401');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    
    console.log('[Generations API] Query result:', { 
      found: !!data, 
      error: error?.message,
      generationStatus: data?.status 
    });

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ generation: data });
  } catch (error) {
    console.error("[Generation API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update generation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const body: GenerationUpdate = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (body.results) {
      updateData.results = body.results;
      if (!body.thumbnailUrl && body.results.length > 0) {
        updateData.thumbnail_url = body.results[0].thumbnail || body.results[0].url;
      }
    }

    if (body.thumbnailUrl) {
      updateData.thumbnail_url = body.thumbnailUrl;
    }

    if (body.creditsUsed !== undefined) {
      updateData.credits_used = body.creditsUsed;
    }

    if (body.is_favorite !== undefined) {
      updateData.is_favorite = body.is_favorite;
    }

    if (body.isPublic !== undefined) {
      updateData.is_public = body.isPublic;
    }

    if (body.tags) {
      updateData.tags = body.tags;
    }

    const { data, error } = await supabase
      .from("generations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[Generation API] Error updating:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ generation: data });
  } catch (error) {
    console.error("[Generation API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete generation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Generation API] Error deleting:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Generation API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
