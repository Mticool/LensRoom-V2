import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/telegram/auth";

export const dynamic = "force-dynamic";

// POST /api/promocodes/apply - Apply a bonus_stars promocode (instant activation)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user's auth_user_id
    const { data: profile } = await supabase
      .from("telegram_profiles")
      .select("auth_user_id, credits")
      .eq("telegram_id", session.id)
      .single();

    if (!profile?.auth_user_id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate promocode first
    const { data: validation, error: valError } = await supabase.rpc("validate_promocode", {
      p_code: code.toUpperCase().trim(),
      p_user_id: profile.auth_user_id,
      p_pack_id: null,
    });

    if (valError) {
      console.error("[Promocode] Validation error:", valError);
      return NextResponse.json({ error: "Ошибка проверки промокода" }, { status: 500 });
    }

    const result = validation?.[0];
    
    if (!result?.is_valid) {
      return NextResponse.json({
        success: false,
        error: result?.error_message || "Промокод недействителен",
      });
    }

    // Only bonus_stars can be applied directly, others need to be used during purchase
    if (result.bonus_type !== "bonus_stars" && result.bonus_type !== "free_pack") {
      return NextResponse.json({
        success: false,
        error: "Этот промокод применяется при покупке пакета",
        bonus_type: result.bonus_type,
      });
    }

    // Apply the promocode
    const { data: applied, error: applyError } = await supabase.rpc("apply_promocode", {
      p_promocode_id: result.promocode_id,
      p_user_id: profile.auth_user_id,
      p_payment_id: null,
      p_pack_id: null,
    });

    if (applyError || !applied) {
      console.error("[Promocode] Apply error:", applyError);
      return NextResponse.json({ error: "Ошибка применения промокода" }, { status: 500 });
    }

    // Get updated credits
    const { data: updatedProfile } = await supabase
      .from("telegram_profiles")
      .select("credits")
      .eq("telegram_id", session.id)
      .single();

    return NextResponse.json({
      success: true,
      bonus_type: result.bonus_type,
      bonus_value: result.bonus_value,
      new_credits: updatedProfile?.credits || 0,
      message: `Промокод активирован! Вы получили ${result.bonus_value} ⭐`,
    });
  } catch (error) {
    console.error("[Promocode] Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
