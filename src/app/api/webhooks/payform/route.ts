import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем service role для webhook (без RLS ограничений)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PayformWebhook {
  date: string;
  order_id: string;
  order_num: string;
  domain: string;
  sum: string;
  currency: string;
  customer_phone: string;
  customer_email: string;
  customer_extra: string;
  payment_type: string;
  commission: string;
  commission_sum: string;
  attempt: string;
  products: Array<{
    name: string;
    price: string;
    quantity: string;
    sum: string;
  }>;
  payment_status: string;
  payment_status_description: string;
  payment_init: string;
}

export async function POST(request: NextRequest) {
  try {
    // Получить данные
    const contentType = request.headers.get('content-type') || '';
    let body: PayformWebhook;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      const data: Record<string, string> = {};
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
      body = data as unknown as PayformWebhook;
    }

    console.log('📥 Payform webhook received:', JSON.stringify(body, null, 2));

    // Проверка статуса платежа
    if (body.payment_status !== 'success') {
      console.log('⏸️ Payment not successful:', body.payment_status);
      return NextResponse.json({ received: true, status: 'pending' });
    }

    // Попробуем найти данные из customer_extra
    let userId: string | null = null;
    let orderId: string | null = null;
    let paymentType: string = 'package';
    let credits: number = 0;
    let planId: string | null = null;

    // 1. Парсим customer_extra если есть
    if (body.customer_extra && body.customer_extra !== '') {
      try {
        const extra = JSON.parse(body.customer_extra);
        userId = extra.user_id;
        orderId = extra.order_id;
        paymentType = extra.type || 'package';
        credits = parseInt(extra.credits || '0', 10);
        planId = extra.plan_id;
      } catch (e) {
        console.log('⚠️ Could not parse customer_extra:', body.customer_extra);
      }
    }

    // 2. Если нет customer_extra, ищем по order_id в нашей БД
    if (!userId && body.order_id) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('prodamus_order_id', body.order_id)
        .single();

      if (payment) {
        userId = payment.user_id;
        orderId = body.order_id;
        credits = payment.credits;
        paymentType = payment.type;
        planId = payment.metadata?.plan_id;
        console.log('✅ Found payment in DB:', payment);
      }
    }

    // 3. Если всё ещё нет userId, ищем по email в auth.users
    if (!userId && body.customer_email) {
      // Используем admin API для поиска пользователя
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === body.customer_email);
      
      if (user) {
        userId = user.id;
        console.log('✅ Found user by email:', body.customer_email, '→', userId);
      }
    }

    // 4. Определяем credits из суммы если не знаем
    if (credits === 0 && body.sum) {
      const amount = parseFloat(body.sum);
      // Маппинг сумм на кредиты
      if (amount >= 2490) credits = 3000;
      else if (amount >= 1190) credits = 1200;
      else if (amount >= 599) credits = 500;
      else if (amount >= 299) credits = 200;
      else credits = Math.floor(amount); // Fallback: 1 кредит = 1 рубль
    }

    console.log('📊 Parsed data:', { userId, orderId, paymentType, credits, planId });

    // Если нет userId — не можем обработать
    if (!userId) {
      console.error('❌ Could not determine user_id');
      // Возвращаем 200 чтобы Payform не повторял
      return NextResponse.json({ 
        received: true, 
        warning: 'Could not determine user_id',
        email: body.customer_email,
      });
    }

    // Начисляем кредиты
    if (credits > 0) {
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
        // Если записи нет — создаём
        await supabase.from('credits').insert({
          user_id: userId,
          amount: credits,
        });
      }

      // Записываем транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        type: paymentType === 'subscription' ? 'subscription' : 'purchase',
        description: `${paymentType === 'subscription' ? 'Подписка' : 'Покупка'}: +${credits} кредитов (${body.sum}₽)`,
        metadata: { 
          payform_order_id: body.order_id,
          sum: body.sum,
          products: body.products,
        },
      });

      console.log(`✅ Credits added: ${credits}. New balance: ${newBalance}`);
    }

    // Обработка подписки
    if (paymentType === 'subscription' && planId) {
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          prodamus_subscription_id: body.order_id,
          status: 'active',
          credits_per_month: credits,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      await supabase
        .from('profiles')
        .update({ plan: planId, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    // Обновляем статус платежа если есть
    if (orderId) {
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          metadata: { ...body, completed_at: new Date().toISOString() },
        })
        .eq('prodamus_order_id', orderId);
    }

    console.log('✅ Webhook processed successfully');

    return NextResponse.json({ 
      success: true,
      credits_added: credits,
      user_id: userId,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Возвращаем 200 чтобы Payform не повторял при ошибках парсинга
    return NextResponse.json({ 
      received: true,
      error: message,
    });
  }
}

// GET для проверки
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Payform webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}