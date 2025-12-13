import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { payformClient } from '@/lib/payments/payform-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем активную подписку
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    console.log('[Subscription Cancel] Canceling:', {
      userId: user.id,
      subscriptionId: subscription.prodamus_subscription_id,
    });

    // Отменяем в Payform
    if (subscription.prodamus_subscription_id) {
      const success = await payformClient.cancelSubscription(subscription.prodamus_subscription_id);

      if (!success) {
        console.error('[Subscription Cancel] Failed to cancel in Payform');
        // Continue anyway - we'll mark it as canceled in our DB
      }
    }

    // Обновляем в БД - подписка будет отменена в конце периода
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('[Subscription Cancel] DB update error:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Записываем транзакцию
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: 0,
      type: 'subscription',
      description: `Отмена подписки ${subscription.plan_id} (действует до ${new Date(subscription.current_period_end).toLocaleDateString('ru-RU')})`,
    });

    return NextResponse.json({ 
      success: true,
      message: 'Подписка будет отменена в конце периода',
      expiresAt: subscription.current_period_end,
    });

  } catch (error) {
    console.error('[Subscription Cancel] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET для получения статуса подписки
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return NextResponse.json({ 
        hasSubscription: false,
        plan: 'starter',
      });
    }

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan_id,
        status: subscription.status,
        creditsPerMonth: subscription.credits_per_month,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

  } catch (error) {
    console.error('[Subscription Status] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}