import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prodamusClient } from '@/lib/payments/prodamus-client';

interface ProdamusWebhookPayload {
  order_id: string;
  customer_extra: string; // user_id
  customer_email: string;
  payment_status: string;
  sum: string;
  currency: string;
  products?: Array<{
    name: string;
    price: string;
    quantity: string;
    sku: string;
  }>;
  subscription_id?: string;
  custom_fields?: {
    plan_id?: string;
    credits_per_month?: string;
  };
  signature?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Try to parse as JSON first, then as form data
    let payload: ProdamusWebhookPayload;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
      payload = data as unknown as ProdamusWebhookPayload;
    }

    console.log('[Prodamus Webhook] Received:', payload);

    // Get signature
    const signature = request.headers.get('x-prodamus-signature') || payload.signature || '';

    // Remove signature from payload before verification
    const payloadForVerification = { ...payload };
    delete payloadForVerification.signature;

    // Flatten payload for signature verification (convert complex objects to strings)
    const flatPayload: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(payloadForVerification)) {
      if (typeof value === 'string' || typeof value === 'number') {
        flatPayload[key] = value;
      } else if (value !== null && value !== undefined) {
        flatPayload[key] = JSON.stringify(value);
      }
    }

    // Verify signature
    if (!prodamusClient.verifyWebhookSignature(flatPayload, signature)) {
      console.error('[Prodamus Webhook] Invalid signature');
      // In development, continue anyway for testing
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      console.warn('[Prodamus Webhook] Skipping signature check in development');
    }

    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const {
      order_id,
      customer_extra, // user_id
      payment_status,
      products,
      custom_fields,
      subscription_id,
    } = payload;

    // Только обрабатываем успешные платежи
    if (payment_status !== 'success' && payment_status !== 'paid') {
      console.log('[Prodamus Webhook] Payment not successful:', payment_status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const userId = customer_extra;
    const isSubscription = !!subscription_id;

    if (isSubscription) {
      // ПОДПИСКА
      const planId = custom_fields?.plan_id || 'pro';
      const creditsPerMonth = parseInt(custom_fields?.credits_per_month || '500');

      console.log('[Prodamus Webhook] Processing subscription:', {
        userId,
        planId,
        creditsPerMonth,
        subscriptionId: subscription_id,
      });

      // Создаём/обновляем подписку
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          prodamus_subscription_id: subscription_id,
          status: 'active',
          credits_per_month: creditsPerMonth,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'prodamus_subscription_id',
        });

      if (subError) {
        console.error('[Prodamus Webhook] Subscription creation error:', subError);
      }

      // Начисляем кредиты
      const { data: currentCredits } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single();

      const newAmount = (currentCredits?.amount || 0) + creditsPerMonth;

      await supabase
        .from('credits')
        .update({
          amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Обновляем план пользователя
      await supabase
        .from('profiles')
        .update({
          plan: planId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Записываем транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: creditsPerMonth,
        type: 'subscription',
        description: `Подписка ${planId}: +${creditsPerMonth} кредитов`,
      });

      console.log('[Prodamus Webhook] Subscription processed:', {
        userId,
        newBalance: newAmount,
      });

    } else {
      // РАЗОВЫЙ ПАКЕТ
      let credits = 0;
      
      // Try to extract credits from product name
      if (products && products.length > 0) {
        const productName = products[0].name;
        const match = productName.match(/(\d+)/);
        if (match) {
          credits = parseInt(match[1]);
        }
      }

      // Fallback based on common packages
      if (credits === 0) {
        const amount = parseFloat(payload.sum);
        if (amount >= 2490) credits = 3000;
        else if (amount >= 1190) credits = 1200;
        else if (amount >= 599) credits = 500;
        else if (amount >= 299) credits = 200;
      }

      console.log('[Prodamus Webhook] Processing package:', {
        userId,
        credits,
      });

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

      // Записываем транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        type: 'purchase',
        description: `Покупка ${credits} кредитов (${payload.sum}₽)`,
      });

      console.log('[Prodamus Webhook] Package processed:', {
        userId,
        credits,
        newBalance: newAmount,
      });
    }

    // Обновляем статус платежа
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('prodamus_order_id', order_id);

    return NextResponse.json({ received: true, status: 'success' });

  } catch (error) {
    console.error('[Prodamus Webhook] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET for verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Prodamus webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}
