import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { payformClient } from '@/lib/payments/payform-client';

interface PayformWebhookPayload {
  // Статус платежа
  status?: string; // 'success' | 'fail'
  payment_status?: string;
  
  // Сумма
  amount?: string;
  
  // ID заказа
  order_id?: string;
  
  // Email
  customer_email?: string;
  email?: string;
  
  // Subscription ID (для подписок)
  subscription_id?: string;
  
  // Custom данные
  custom?: {
    user_id?: string;
    order_id?: string;
    type?: string; // 'subscription' | 'package'
    plan_id?: string;
    credits?: string;
  };
  
  // Подпись (если есть)
  signature?: string;
  sign?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse payload - может быть JSON или form-data
    let payload: PayformWebhookPayload;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      const data: Record<string, string> = {};
      const custom: Record<string, string> = {};
      
      formData.forEach((value, key) => {
        const strValue = value.toString();
        // Parse custom[xxx] keys
        if (key.startsWith('custom[') && key.endsWith(']')) {
          const customKey = key.slice(7, -1);
          custom[customKey] = strValue;
        } else {
          data[key] = strValue;
        }
      });
      
      payload = { ...data, custom } as PayformWebhookPayload;
    }

    console.log('[Payform Webhook] Received:', JSON.stringify(payload, null, 2));

    // Verify signature if present
    const signature = payload.signature || payload.sign;
    if (!payformClient.verifyWebhook(payload as Record<string, unknown>, signature)) {
      console.error('[Payform Webhook] Invalid signature');
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Check status
    const status = payload.status || payload.payment_status;
    if (status !== 'success' && status !== 'paid' && status !== 'completed') {
      console.log('[Payform Webhook] Payment not successful:', status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    // Extract data from custom fields
    const userId = payload.custom?.user_id;
    const orderId = payload.custom?.order_id || payload.order_id;
    const paymentType = payload.custom?.type;
    const planId = payload.custom?.plan_id;
    let credits = parseInt(payload.custom?.credits || '0', 10);

    if (!userId) {
      console.error('[Payform Webhook] No user_id in payload');
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // If no credits in custom, try to get from payment record
    if (!credits && orderId) {
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('credits')
        .eq('prodamus_order_id', orderId)
        .single();
      
      credits = paymentRecord?.credits || 0;
    }

    // Still no credits? Try to determine from amount
    if (!credits && payload.amount) {
      const amount = parseFloat(payload.amount);
      if (amount >= 2490) credits = 3000;
      else if (amount >= 1190) credits = 1200;
      else if (amount >= 599) credits = 500;
      else if (amount >= 299) credits = 200;
    }

    console.log('[Payform Webhook] Processing:', {
      userId,
      orderId,
      credits,
      paymentType,
      planId,
    });

    // Add credits to user
    const { data: currentCredits } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();

    const newBalance = (currentCredits?.amount || 0) + credits;

    const { error: updateError } = await supabase
      .from('credits')
      .update({
        amount: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Payform Webhook] Error updating credits:', updateError);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    // Handle subscription
    if (paymentType === 'subscription' && (planId || payload.subscription_id)) {
      const actualPlanId = planId || 
        (payload.subscription_id === process.env.PAYFORM_SUBSCRIPTION_BUSINESS ? 'business' : 'pro');
      
      const creditsPerMonth = actualPlanId === 'business' ? 1500 : 500;

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: actualPlanId,
          prodamus_subscription_id: payload.subscription_id || `payform-${orderId}`,
          status: 'active',
          credits_per_month: creditsPerMonth,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      // Update user plan
      await supabase
        .from('profiles')
        .update({
          plan: actualPlanId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // Record transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: credits,
      type: paymentType === 'subscription' ? 'subscription' : 'purchase',
      description: paymentType === 'subscription'
        ? `Подписка ${planId}: +${credits} кредитов`
        : `Покупка ${credits} кредитов`,
      metadata: { order_id: orderId, provider: 'payform' },
    });

    // Update payment status
    if (orderId) {
      await supabase
        .from('payments')
        .update({ status: 'completed' })
        .eq('prodamus_order_id', orderId);
    }

    console.log('[Payform Webhook] Success:', {
      userId,
      credits,
      newBalance,
    });

    return NextResponse.json({ 
      received: true, 
      status: 'success',
      credits_added: credits,
    });

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
