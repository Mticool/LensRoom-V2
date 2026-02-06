import { NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Get Telegram session
    const session = await getSession();
    if (!session?.profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get user ID from telegram_profiles
    const { data: profile, error: profileError } = await supabase
      .from('telegram_profiles')
      .select('id')
      .eq('id', session.profileId)
      .single();

    if (profileError || !profile) {
      console.error('[Subscription Current] Profile not found:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get active subscription using profileId as user_id
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.profileId)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('[Subscription Current] Error:', subError);
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

    if (isExpired) {
      // Mark as expired
      await supabase
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
        plan_id: subscription.plan_id,
        planName: planNames[subscription.plan_id] || subscription.plan_id,
        status: subscription.status,
        credits_per_month: subscription.credits_per_month,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        daysRemaining: Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      },
    });

  } catch (error) {
    console.error('[Subscription Current] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
