import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/requireRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    // Требуется роль manager или admin
    await requireRole("manager");

    const { searchParams } = new URL(req.url);
    const placement = searchParams.get("placement"); // homepage | inspiration | both

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("inspiration_styles")
      .select("*")
      .order("display_order", { ascending: true });

    if (placement) {
      query = query.or(`placement.eq.${placement},placement.eq.both`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Admin Styles] Error fetching styles:", error);
      return NextResponse.json(
        { error: "Failed to fetch styles", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ styles: data || [] });
  } catch (error: any) {
    console.error("[Admin Styles] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Требуется роль manager или admin
    const ctx = await requireRole("manager");

    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Если есть ID - обновляем, иначе создаём
    if (body.id) {
      const { data, error } = await supabase
        .from("inspiration_styles")
        .update({
          title: body.title,
          description: body.description,
          placement: body.placement,
          preview_image: body.preview_image,
          thumbnail_url: body.thumbnail_url,
          model_key: body.model_key,
          preset_id: body.preset_id,
          template_prompt: body.template_prompt,
          cost_stars: body.cost_stars,
          featured: body.featured,
          published: body.published,
          display_order: body.display_order,
          category: body.category,
          tags: body.tags,
        })
        .eq("id", body.id)
        .select()
        .single();

      if (error) {
        console.error("[Admin Styles] Update error:", error);
        return NextResponse.json(
          { error: "Failed to update style", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ style: data });
    } else {
      // Создание
      const { data, error } = await supabase
        .from("inspiration_styles")
        .insert({
          title: body.title,
          description: body.description,
          placement: body.placement,
          preview_image: body.preview_image,
          thumbnail_url: body.thumbnail_url,
          model_key: body.model_key,
          preset_id: body.preset_id,
          template_prompt: body.template_prompt,
          cost_stars: body.cost_stars || 4,
          featured: body.featured || false,
          published: body.published !== undefined ? body.published : true,
          display_order: body.display_order || 0,
          category: body.category,
          tags: body.tags || [],
          created_by: ctx.authUserId,
        })
        .select()
        .single();

      if (error) {
        console.error("[Admin Styles] Create error:", error);
        return NextResponse.json(
          { error: "Failed to create style", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ style: data }, { status: 201 });
    }
  } catch (error: any) {
    console.error("[Admin Styles] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Требуется роль manager или admin
    await requireRole("manager");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("inspiration_styles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Admin Styles] Delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete style", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin Styles] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

