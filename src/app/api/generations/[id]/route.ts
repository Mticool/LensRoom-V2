import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GenerationUpdate {
  status?: "pending" | "processing" | "completed" | "failed";
  results?: { url: string; thumbnail?: string }[];
  thumbnailUrl?: string;
  creditsUsed?: number;
  isFavorite?: boolean;
  isPublic?: boolean;
  tags?: string[];
}

// GET - Fetch single generation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

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

// PATCH - Update generation (status, results, favorite, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: GenerationUpdate = await request.json();

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (body.results) {
      updateData.results = body.results;
      // Set thumbnail from first result if not provided
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

    if (body.isFavorite !== undefined) {
      updateData.is_favorite = body.isFavorite;
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
      .eq("user_id", user.id)
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
    const supabase = await createClient();
    
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

