import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("telegram_profiles")
    .select("role")
    .eq("telegram_id", session.id)
    .single();

  return data?.role === "admin" || data?.role === "manager";
}

// GET - List all categories from effects_gallery
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Get unique categories from effects_gallery
    const { data: effects, error } = await supabase
      .from("effects_gallery")
      .select("category, placement")
      .order("category");

    if (error) {
      throw error;
    }

    // Aggregate categories with counts
    const categoryMap: Record<string, { name: string; count: number; placements: Set<string> }> = {};

    (effects || []).forEach((e) => {
      const cat = (e.category || "").trim();
      if (!cat) return;

      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, count: 0, placements: new Set() };
      }
      categoryMap[cat].count++;
      if (e.placement) {
        categoryMap[cat].placements.add(e.placement);
      }
    });

    const categories = Object.values(categoryMap).map((c) => ({
      name: c.name,
      count: c.count,
      placements: Array.from(c.placements),
    }));

    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name, "ru"));

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[Admin Categories] Error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST - Rename category
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || !newName) {
      return NextResponse.json(
        { error: "oldName and newName are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Update all effects with this category
    const { error } = await supabase
      .from("effects_gallery")
      .update({ category: newName.trim() })
      .eq("category", oldName.trim());

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Categories] Error:", error);
    return NextResponse.json({ error: "Failed to rename category" }, { status: 500 });
  }
}

// DELETE - Delete category (set to empty)
export async function DELETE(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Set category to empty for all effects with this category
    const { error } = await supabase
      .from("effects_gallery")
      .update({ category: "" })
      .eq("category", name.trim());

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Categories] Error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
