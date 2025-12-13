import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { payformClient } from '@/lib/payments/payform-client';
import { SUBSCRIPTION_PLANS } from '@/lib/pricing/plans';

interface PayformWebhookPayload {
  order_id: string;
  merchant_id: string;
  amount: string;
  currency: string;
  status: string; // 'success' | 'fail' | 'pending'
  customer_email: string;
  customer_extra: string; // user_id
  subscription_id?: string;
  sign: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse payload
    let payload: PayformWebhookPayload;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
      payload = data as unknown as PayformWebhookPayload;
    }

    console.log('[Payform Webhook] Received:', payload);

    // Verify signature
    const signature = payload.sign;
    const payloadForVerification: Record<string, string | number> = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (key !== 'sign') {
        payloadForVerification[key] = value;
      }
    });

    if (!payformClient.verifyWebhookSignature(payloadForVerification, signature)) {
      console.error('[Payform Webhook] Invalid signature');
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      console.warn('[Payform Webhook] Skipping signature check in development');
    }

    // Check status
    if (payload.status !== 'success') {
      console.log('[Payform Webhook] Payment not successful:', payload.status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const userId = payload.customer_extra;
    const orderId = payload.order_id;
    const isSubscription = !!payload.subscription_id;

    // Get payment record to determine credits
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('*')
      .eq('prodamus_order_id', orderId)
      .single();

    let credits = paymentRecord?.credits || 0;

    // If no payment record, try to determine credits from amount
    if (!credits) {
      const amount = parseFloat(payload.amount);
      // Approximate credits based on our pricing
      if (amount >= 2490) credits = 3000;
      else if (amount >= 1190) credits = 1200;
      else if (amount >= 599) credits = 500;
      else if (amount >= 299) credits = 200;
    }

    console.log('[Payform Webhook] Processing payment:', {
      userId,
      orderId,
      credits,
      isSubscription,
    });

    // Add credits to user
    const { data: currentCredits } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();

    const newAmount = (currentCredits?.amount || 0) + credits;

    await supabase
      .from('credits')
      .update({
        amount: newAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // If subscription, create/update subscription record
    if (isSubscription && payload.subscription_id) {
      // Determine plan from subscription ID
      let planId = 'pro';
      let creditsPerMonth = 500;
      
      if (payload.subscription_id === process.env.PAYFORM_SUBSCRIPTION_BUSINESS) {
        planId = 'business';
        creditsPerMonth = 1500;
      }

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          prodamus_subscription_id: payload.subscription_id,
          status: 'active',
          credits_per_month: creditsPerMonth,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'prodamus_subscription_id',
        });

      // Update user plan
      await supabase
        .from('profiles')
        .update({
          plan: planId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: credits,
      type: isSubscription ? 'subscription' : 'purchase',
      description: isSubscription 
        ? `Подписка: +${credits} кредитов`
        : `Покупка ${credits} кредитов (${payload.amount}₽)`,
    });

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('prodamus_order_id', orderId);

    console.log('[Payform Webhook] Payment processed:', {
      userId,
      credits,
      newBalance: newAmount,
    });

    return NextResponse.json({ received: true, status: 'success' });

  } catch (error) {
    console.error('[Payform Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET for verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Payform webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}

