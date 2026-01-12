import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/partners/update
 * 
 * Update affiliate partner tier/percent
 * Body: { userId: string, tier: 'classic'|'pro', percent: number, recurringPercent?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();

    const body = await request.json();

    let userId = String(body?.userId || "").trim();
    let telegramUsername = String(body?.telegramUsername || body?.username || "").trim();
    const telegramId = body?.telegramId ? Number(body.telegramId) : null;
    const tier = body?.tier;
    const percent = Number(body?.percent);
    const recurringPercentRaw = body?.recurringPercent ?? body?.repeatPercent ?? body?.recurring_percent;
    const recurringPercent = Number(recurringPercentRaw);

    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    if (userId && !looksLikeUuid && !telegramUsername && !telegramId) {
      telegramUsername = userId.replace(/^@/, "");
      userId = "";
    }

    if ((!userId && !telegramUsername && !telegramId) || !Number.isFinite(percent) || percent <= 0) {
      return NextResponse.json(
        { error: "userId (or telegramUsername/telegramId) and percent are required" },
        { status: 400 }
      );
    }

    let targetAuthUserId = userId || null;
    if (!targetAuthUserId) {
      let q = supabase.from("telegram_profiles").select("auth_user_id");
      if (telegramId) q = q.eq("telegram_id", telegramId);
      else q = q.eq("telegram_username", telegramUsername);
      const { data: p } = await q.maybeSingle();
      targetAuthUserId = (p as any)?.auth_user_id || null;
    }
    if (!targetAuthUserId) {
      return NextResponse.json({ error: "User not found or has not logged in yet" }, { status: 404 });
    }

    const tierValue = tier || (percent >= 50 ? "pro" : "classic");
    // Default: recurring OFF (0%) unless admin explicitly sets it
    const recurringValue = Number.isFinite(recurringPercent) ? recurringPercent : 0;
    if (recurringValue < 0 || recurringValue > 100) {
      return NextResponse.json({ error: "recurringPercent must be between 0 and 100" }, { status: 400 });
    }
    
    const updateV2 = {
      tier: tierValue,
      percent: percent,
      recurring_percent: recurringValue,
      updated_at: new Date().toISOString(),
    } as any;
    const updateV1 = {
      tier: tierValue,
      percent: percent,
      updated_at: new Date().toISOString(),
    } as any;

    let updateError: any = null;
    const { error: e1 } = await supabase
      .from("affiliate_tiers")
      .update(updateV2)
      .eq("user_id", targetAuthUserId);
    updateError = e1;
    if (updateError && /column .*recurring_percent does not exist/i.test(updateError.message || "")) {
      const { error: e2 } = await supabase
        .from("affiliate_tiers")
        .update(updateV1)
        .eq("user_id", targetAuthUserId);
      updateError = e2;
    }
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message || "Failed to update partner" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Partner updated: ${tierValue} first=${percent}% / recurring=${recurringValue}%`,
    });
    
  } catch (error) {
    console.error("[/api/admin/partners/update] POST Error:", error);
    return respondAuthError(error);
  }
}

