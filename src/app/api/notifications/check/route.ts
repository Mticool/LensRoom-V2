import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const NOTIFICATION_BONUS = 10; // Stars for enabling notifications

/**
 * POST /api/notifications/check
 * Check if user has enabled notifications and give bonus
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const telegramId = session.telegramId;

    // Check if user has bot link with notifications enabled
    const { data: botLink } = await supabase
      .from("telegram_bot_links")
      .select("can_notify, notification_bonus_given")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (!botLink || !botLink.can_notify) {
      return NextResponse.json({
        enabled: false,
        bonusGiven: false,
      });
    }

    // Check if bonus already given
    if (botLink.notification_bonus_given) {
      return NextResponse.json({
        enabled: true,
        bonusGiven: false, // Already given before
      });
    }

    // Give bonus!
    const userId = session.profileId;

    if (userId) {
      // Add credits
      const { data: credits } = await supabase
        .from("credits")
        .select("balance")
        .eq("profile_id", userId)
        .maybeSingle();

      const currentBalance = credits?.balance || 0;

      await supabase
        .from("credits")
        .upsert({
          profile_id: userId,
          balance: currentBalance + NOTIFICATION_BONUS,
          updated_at: new Date().toISOString(),
        }, { onConflict: "profile_id" });

      // Log transaction
      await supabase.from("credit_transactions").insert({
        profile_id: userId,
        amount: NOTIFICATION_BONUS,
        type: "bonus",
        description: "Бонус за включение уведомлений",
      }).catch(() => {}); // Ignore if table doesn't exist
    }

    // Mark bonus as given
    await supabase
      .from("telegram_bot_links")
      .update({ notification_bonus_given: true })
      .eq("telegram_id", telegramId);

    return NextResponse.json({
      enabled: true,
      bonusGiven: true,
      bonusAmount: NOTIFICATION_BONUS,
    });
  } catch (error: any) {
    console.error("[Notifications Check] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/check
 * Check notification status without giving bonus
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ enabled: false });
    }

    const supabase = getSupabaseAdmin();

    const { data: botLink } = await supabase
      .from("telegram_bot_links")
      .select("can_notify")
      .eq("telegram_id", session.telegramId)
      .maybeSingle();

    return NextResponse.json({
      enabled: botLink?.can_notify || false,
    });
  } catch (error) {
    console.error("[Notifications Check GET] Error:", error);
    return NextResponse.json({ enabled: false });
  }
}

