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

// GET /api/admin/promocodes/[id] - Get single promocode with usage stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  // Get promocode
  const { data: promocode, error } = await supabase
    .from("promocodes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Promocode not found" }, { status: 404 });
  }

  // Get recent usages
  const { data: usages } = await supabase
    .from("promocode_usages")
    .select(`
      id,
      user_id,
      bonus_type,
      bonus_value,
      pack_id,
      used_at
    `)
    .eq("promocode_id", id)
    .order("used_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ promocode, usages: usages || [] });
}

// PUT /api/admin/promocodes/[id] - Update promocode
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      code,
      description,
      bonus_type,
      bonus_value,
      free_pack_id,
      max_uses,
      max_uses_per_user,
      min_purchase_amount,
      applicable_packs,
      starts_at,
      expires_at,
      is_active,
    } = body;

    if (!code || !bonus_type || bonus_value === undefined) {
      return NextResponse.json(
        { error: "Code, bonus_type, and bonus_value are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const updateData: any = {
      code: code.toUpperCase().trim(),
      description: description || null,
      bonus_type,
      bonus_value: parseFloat(bonus_value),
      free_pack_id: free_pack_id || null,
      max_uses: max_uses ? parseInt(max_uses) : null,
      max_uses_per_user: max_uses_per_user ? parseInt(max_uses_per_user) : 1,
      min_purchase_amount: min_purchase_amount ? parseInt(min_purchase_amount) : null,
      applicable_packs: applicable_packs?.length ? applicable_packs : null,
      starts_at: starts_at || new Date().toISOString(),
      expires_at: expires_at || null,
      is_active: is_active !== false,
    };

    const { data, error } = await supabase
      .from("promocodes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Промокод с таким кодом уже существует" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ promocode: data });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE /api/admin/promocodes/[id] - Delete promocode
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("promocodes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

