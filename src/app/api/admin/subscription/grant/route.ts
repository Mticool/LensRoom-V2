import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/requireRole";

/**
 * POST /api/admin/subscription/grant
 * Назначение подписки пользователю (только для админов)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");

    const body = await request.json();
    const { username, telegramId, planId, durationMonths = 1 } = body;

    if (!username && !telegramId) {
      return NextResponse.json(
        { error: "username or telegramId is required" },
        { status: 400 }
      );
    }

    const validPlans = ['creator', 'creator_plus', 'business'];
    if (!planId || !validPlans.includes(planId)) {
      return NextResponse.json(
        { error: `planId must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Find user
    let profile: any = null;
    let profileError: any = null;
    
    const cleanUsername = username 
      ? (username.startsWith("@") ? username.slice(1) : username) 
      : "";

    if (telegramId) {
      const { data, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .eq("telegram_id", telegramId)
        .maybeSingle();
      
      profile = data;
      profileError = error;
    } else if (username && cleanUsername) {
      const { data: profiles, error } = await supabase
        .from("telegram_profiles")
        .select("auth_user_id, telegram_username, telegram_id")
        .ilike("telegram_username", `%${cleanUsername}%`)
        .limit(10);
      
      profileError = error;
      
      profile = profiles?.find(
        (p: any) =>
          p.telegram_username &&
          (p.telegram_username.toLowerCase() === cleanUsername.toLowerCase() ||
            p.telegram_username.toLowerCase() === `@${cleanUsername}`.toLowerCase())
      );
    }

    if (profileError) {
      console.error("[Admin Grant Subscription] Error:", profileError);
      return NextResponse.json({ error: "Failed to find user" }, { status: 500 });
    }

    if (!profile || !profile.auth_user_id) {
      const identifier = telegramId ? `Telegram ID ${telegramId}` : `username "${username}"`;
      return NextResponse.json({ error: `User with ${identifier} not found` }, { status: 404 });
    }

    const userId = profile.auth_user_id;

    // Calculate period
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

    // Plan credits mapping
    const planCredits: Record<string, number> = {
      'creator': 1000,
      'creator_plus': 3000,
      'business': 10000,
    };

    // Check for existing subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, plan_id, status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planId,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          credits_per_month: planCredits[planId],
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);

      if (updateError) {
        console.error("[Admin Grant Subscription] Update error:", updateError);
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          credits_per_month: planCredits[planId],
          cancel_at_period_end: false,
        });

      if (insertError) {
        console.error("[Admin Grant Subscription] Insert error:", insertError);
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
      }
    }

    // Log transaction
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: 0,
      type: "admin_subscription_grant",
      description: `Админ назначил подписку ${planId} на ${durationMonths} мес.`,
      metadata: { 
        admin_action: true, 
        plan_id: planId,
        duration_months: durationMonths,
        username: profile.telegram_username || cleanUsername,
      },
    });

    const displayUsername = profile.telegram_username || cleanUsername || String(telegramId);
    const planNames: Record<string, string> = {
      'creator': 'Creator',
      'creator_plus': 'Creator+ (безлимит Pro)',
      'business': 'Business (безлимит Pro)',
    };

    return NextResponse.json({
      success: true,
      message: `Подписка ${planNames[planId]} назначена пользователю @${displayUsername} на ${durationMonths} мес.`,
      data: { 
        username: displayUsername, 
        userId, 
        planId,
        planName: planNames[planId],
        periodEnd: periodEnd.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Admin Grant Subscription] Error:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
