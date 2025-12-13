import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { payform } from '@/lib/payments/payform-client';

// Используем service role для webhook (без RLS ограничений)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Получить данные (JSON или FormData)
    const contentType = request.headers.get('content-type');
    let body: Record<string, unknown>;

    if (contentType?.includes('application/json')) {
      body = await request.json();
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
      
      body = { ...data, custom };
    }

    console.log('📥 Payform webhook received:', JSON.stringify(body, null, 2));

    // Проверка подписи (если требуется)
    const signature = (body.signature as string) || request.headers.get('x-signature') || undefined;
    if (!payform.verifyWebhook(body, signature)) {
      console.error('❌ Invalid signature');
      // В development пропускаем проверку
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      console.warn('⚠️ Skipping signature check in development');
    }

    // Извлечь данные из custom полей
    const custom = (body.custom as Record<string, string>) || {};
    const userId = custom.user_id || (body.user_id as string);
    const orderId = custom.order_id || (body.order_id as string);
    const type = custom.type || (body.type as string);
    const credits = parseInt(custom.credits || (body.credits as string) || '0', 10);
    const planId = custom.plan_id || (body.plan_id as string);

    // Проверка статуса платежа
    const paymentStatus = (body.status as string) || (body.payment_status as string);
    const isSuccess = ['success', 'paid', 'confirmed', 'completed'].includes(paymentStatus?.toLowerCase());

    if (!isSuccess) {
      console.log('⏸️ Payment not successful:', paymentStatus);
      return NextResponse.json({ received: true, status: 'pending' });
    }

    console.log('✅ Payment successful:', {
      userId,
      orderId,
      type,
      credits,
      planId,
    });

    if (!userId || !orderId || !credits) {
      console.error('❌ Missing required fields:', { userId, orderId, credits });
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (type === 'subscription') {
      // ========== ПОДПИСКА ==========
      console.log('💳 Processing subscription...');

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId || 'pro',
          prodamus_subscription_id: orderId, // Используем существующее поле
          status: 'active',
          credits_per_month: credits,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'prodamus_subscription_id',
        });

      if (subError) {
        console.error('❌ Subscription error:', subError);
        return NextResponse.json({ error: subError.message }, { status: 500 });
      }

      // Обновить план пользователя
      await supabase
        .from('profiles')
        .update({ 
          plan: planId || 'pro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Начислить кредиты
      const { data: currentCredits } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single();

      const newBalance = (currentCredits?.amount || 0) + credits;

      await supabase
        .from('credits')
        .update({ 
          amount: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Записать транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        type: 'subscription',
        description: `Подписка ${planId}: +${credits} кредитов`,
        metadata: { order_id: orderId, provider: 'payform' },
      });

      console.log(`✅ Subscription activated. Credits added: ${credits}. New balance: ${newBalance}`);

    } else if (type === 'package') {
      // ========== РАЗОВЫЙ ПАКЕТ ==========
      console.log('💰 Processing package...');

      const { data: currentCredits } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single();

      const newBalance = (currentCredits?.amount || 0) + credits;

      await supabase
        .from('credits')
        .update({ 
          amount: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Записать транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        type: 'purchase',
        description: `Покупка ${credits} кредитов`,
        metadata: { order_id: orderId, provider: 'payform' },
      });

      console.log(`✅ Package processed. Credits added: ${credits}. New balance: ${newBalance}`);
    }

    // Обновить статус платежа
    await supabase
      .from('payments')
      .update({ 
        status: 'completed',
        metadata: {
          ...(body as object),
          completed_at: new Date().toISOString(),
        }
      })
      .eq('prodamus_order_id', orderId);

    console.log('✅ Webhook processed successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Payment processed',
      credits_added: credits,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: message,
    }, { status: 500 });
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
