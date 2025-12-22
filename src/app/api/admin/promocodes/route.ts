import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

// Helper to check admin role
async function isAdmin(): Promise<{ isAdmin: boolean; userId?: string }> {
  const session = await getSession();
  if (!session) return { isAdmin: false };

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("telegram_profiles")
    .select("role, auth_user_id")
    .eq("telegram_id", session.telegramId)
    .single();

  const isAdminRole = data?.role === "admin" || data?.role === "manager";
  return { isAdmin: isAdminRole, userId: data?.auth_user_id };
}

// GET /api/admin/promocodes - List all promocodes
export async function GET(request: NextRequest) {
  const { isAdmin: isAdminUser } = await isAdmin();
  if (!isAdminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("promocodes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    promocodes: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// POST /api/admin/promocodes - Create new promocode
export async function POST(request: NextRequest) {
  const { isAdmin: isAdminUser, userId } = await isAdmin();
  if (!isAdminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Validate bonus_type
    const validTypes = ["bonus_stars", "percent_discount", "fixed_discount", "multiplier", "free_pack"];
    if (!validTypes.includes(bonus_type)) {
      return NextResponse.json(
        { error: `Invalid bonus_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate bonus_value based on type
    if (bonus_type === "percent_discount" && (bonus_value <= 0 || bonus_value > 100)) {
      return NextResponse.json(
        { error: "Percent discount must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (bonus_type === "multiplier" && bonus_value <= 1) {
      return NextResponse.json(
        { error: "Multiplier must be greater than 1 (e.g., 1.5 for +50%)" },
        { status: 400 }
      );
    }

    if (bonus_type === "free_pack" && !free_pack_id) {
      return NextResponse.json(
        { error: "free_pack_id is required for free_pack bonus type" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const promocodeData: any = {
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
      created_by: userId,
    };

    const { data, error } = await supabase
      .from("promocodes")
      .insert(promocodeData)
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

    return NextResponse.json({ promocode: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

