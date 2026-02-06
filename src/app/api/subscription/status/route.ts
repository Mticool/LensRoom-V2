import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get active subscription
    const { data: subscription, error: subError } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('[Subscription Status] Error:', subError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
      });
    }

    // Check if subscription is expired
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const isExpired = now > periodEnd;

    if (isExpired && !subscription.cancel_at_period_end) {
      // Mark as expired
      await admin
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
        message: 'Подписка истекла',
      });
    }

    // Get plan details
    const planNames: Record<string, string> = {
      start: 'START',
      pro: 'PRO',
      max: 'MAX',
    };

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        planId: subscription.plan_id,
        planName: planNames[subscription.plan_id] || subscription.plan_id,
        status: subscription.status,
        creditsPerMonth: subscription.credits_per_month,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        daysRemaining: Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      },
    });

  } catch (error) {
    console.error('[Subscription Status] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
