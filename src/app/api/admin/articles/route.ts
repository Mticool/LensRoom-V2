import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

// Helper to check admin role
async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("telegram_profiles")
    .select("role")
    .eq("telegram_id", session.telegramId)
    .single();

  return data?.role === "admin" || data?.role === "manager";
}

// GET /api/admin/articles - List all articles (including drafts)
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    articles: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// POST /api/admin/articles - Create new article
export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, description, content, cover_image, tags, is_published } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const articleData: any = {
      title,
      slug,
      description: description || null,
      content,
      cover_image: cover_image || null,
      tags: tags || [],
      is_published: is_published || false,
    };

    // Set published_at if publishing
    if (is_published) {
      articleData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("articles")
      .insert(articleData)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Article with this slug already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ article: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

