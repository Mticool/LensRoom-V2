import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

// POST /api/promocodes/validate - Validate a promocode
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code, pack_id } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user's auth_user_id
    const { data: profile } = await supabase
      .from("telegram_profiles")
      .select("auth_user_id")
      .eq("telegram_id", session.telegramId)
      .single();

    if (!profile?.auth_user_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Call validate function
    const { data, error } = await supabase.rpc("validate_promocode", {
      p_code: code.toUpperCase().trim(),
      p_user_id: profile.auth_user_id,
      p_pack_id: pack_id || null,
    });

    if (error) {
      console.error("[Promocode] Validation error:", error);
      return NextResponse.json({ error: "Ошибка проверки промокода" }, { status: 500 });
    }

    const result = data?.[0];
    
    if (!result?.is_valid) {
      return NextResponse.json({
        valid: false,
        error: result?.error_message || "Промокод недействителен",
      });
    }

    // Get full promocode details for display
    const { data: promocode } = await supabase
      .from("promocodes")
      .select("code, description, bonus_type, bonus_value, free_pack_id")
      .eq("id", result.promocode_id)
      .single();

    return NextResponse.json({
      valid: true,
      promocode_id: result.promocode_id,
      bonus_type: result.bonus_type,
      bonus_value: result.bonus_value,
      free_pack_id: result.free_pack_id,
      description: promocode?.description,
    });
  } catch (error) {
    console.error("[Promocode] Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

