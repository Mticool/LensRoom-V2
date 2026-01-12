import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/partners/manual
 * 
 * Manually add a user as affiliate partner (without application)
 * Body: { userId: string, tier: 'classic'|'pro', percent: number, recurringPercent?: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();

    const body = await request.json();

    // Accept either direct auth user id OR telegram identity
    let userId = String(body?.userId || "").trim();
    let telegramUsername = String(body?.telegramUsername || body?.username || "").trim();
    const telegramId = body?.telegramId ? Number(body.telegramId) : null;
    const tier = body?.tier;
    const percent = Number(body?.percent);
    const recurringPercentRaw = body?.recurringPercent ?? body?.repeatPercent ?? body?.recurring_percent;
    const recurringPercent = Number(recurringPercentRaw);

    // Allow entering @username into the existing "userId" field (admin UI currently sends only userId)
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
      // Resolve telegram profile -> auth_user_id
      let q = supabase.from("telegram_profiles").select("auth_user_id");
      if (telegramId) q = q.eq("telegram_id", telegramId);
      else q = q.eq("telegram_username", telegramUsername);

      const { data: p, error: pErr } = await q.maybeSingle();
      const mapped = (p as any)?.auth_user_id as string | null | undefined;
      if (pErr || !mapped) {
        return NextResponse.json(
          { error: "User not found or has not logged in yet (no auth_user_id mapping)" },
          { status: 404 }
        );
      }
      targetAuthUserId = mapped;
    }

    // Create/update affiliate tier
    const tierValue = tier || (percent >= 50 ? "pro" : "classic");
    // Default: recurring OFF (0%) unless admin explicitly sets it
    const recurringValue = Number.isFinite(recurringPercent) ? recurringPercent : 0;
    if (recurringValue < 0 || recurringValue > 100) {
      return NextResponse.json({ error: "recurringPercent must be between 0 and 100" }, { status: 400 });
    }
    
    // Prefer writing recurring_percent if column exists; fallback for non-migrated DB
    const payloadV2 = {
      user_id: targetAuthUserId,
      tier: tierValue,
      percent: percent,
      recurring_percent: recurringValue,
      updated_at: new Date().toISOString(),
    } as any;

    const payloadV1 = {
      user_id: targetAuthUserId,
      tier: tierValue,
      percent: percent,
      updated_at: new Date().toISOString(),
    } as any;

    let tierError: any = null;
    const { error: e1 } = await supabase
      .from("affiliate_tiers")
      .upsert(payloadV2);
    tierError = e1;
    if (tierError && /column .*recurring_percent does not exist/i.test(tierError.message || "")) {
      const { error: e2 } = await supabase.from("affiliate_tiers").upsert(payloadV1);
      tierError = e2;
    }
    
    if (tierError) {
      // Most common: FK violation if auth user doesn't exist
      return NextResponse.json({ error: tierError.message || "Failed to add partner" }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `User added as ${tierValue} partner: first=${percent}% / recurring=${recurringValue}%`,
    });
    
  } catch (error) {
    console.error("[/api/admin/partners/manual] POST Error:", error);
    return respondAuthError(error);
  }
}

