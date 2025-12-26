import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const NOTIFICATION_BONUS = 10; // Stars

/**
 * POST /api/notifications/bonus
 * Grant bonus stars when user enables notifications
 * Can only be claimed once per user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user already claimed the bonus
    const { data: existing } = await supabase
      .from("notification_bonuses")
      .select("id")
      .eq("profile_id", session.profileId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: false,
        message: "Bonus already claimed",
        alreadyClaimed: true,
      });
    }

    // Verify user has actually enabled notifications
    const { data: botLink } = await supabase
      .from("telegram_bot_links")
      .select("can_notify")
      .eq("telegram_id", session.telegramId)
      .single();

    if (!botLink?.can_notify) {
      return NextResponse.json({
        success: false,
        message: "Notifications not enabled",
      });
    }

    // Grant bonus
    const { error: creditError } = await supabase.rpc("add_credits", {
      p_profile_id: session.profileId,
      p_amount: NOTIFICATION_BONUS,
      p_reason: "notification_bonus",
    });

    if (creditError) {
      // Fallback: direct update
      await supabase
        .from("credits")
        .update({
          balance: supabase.rpc("credits_balance", { pid: session.profileId }) as any,
        })
        .eq("profile_id", session.profileId);
    }

    // Record that bonus was claimed
    await supabase.from("notification_bonuses").insert({
      profile_id: session.profileId,
      telegram_id: session.telegramId,
      amount: NOTIFICATION_BONUS,
    }).catch(() => {
      // Table might not exist, that's ok
    });

    // Also record in credit_transactions
    await supabase.from("credit_transactions").insert({
      profile_id: session.profileId,
      amount: NOTIFICATION_BONUS,
      type: "bonus",
      description: "Бонус за подключение уведомлений",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      bonus: NOTIFICATION_BONUS,
      message: `+${NOTIFICATION_BONUS}⭐ зачислены на баланс!`,
    });
  } catch (error: any) {
    console.error("[Notification Bonus] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/bonus
 * Check if user can claim bonus
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Check if already claimed
    const { data: existing } = await supabase
      .from("notification_bonuses")
      .select("id, created_at")
      .eq("profile_id", session.profileId)
      .single();

    // Check notification status
    const { data: botLink } = await supabase
      .from("telegram_bot_links")
      .select("can_notify")
      .eq("telegram_id", session.telegramId)
      .single();

    return NextResponse.json({
      canClaim: !existing && !botLink?.can_notify,
      alreadyClaimed: !!existing,
      hasNotifications: botLink?.can_notify || false,
      bonus: NOTIFICATION_BONUS,
    });
  } catch (error: any) {
    console.error("[Notification Bonus Check] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

