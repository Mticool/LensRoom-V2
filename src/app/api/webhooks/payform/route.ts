import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from "@/lib/env";
import { STAR_PACKS, packTotalStars } from "@/config/pricing";
import { addSubscriptionStars, addPackageStars, renewSubscription } from "@/lib/credits/split-credits";
import { processAffiliateCommission } from "@/lib/referrals/process-affiliate-commission";
import crypto from "crypto";

function getWebhookSupabase() {
  const url = env.required("NEXT_PUBLIC_SUPABASE_URL", "Supabase URL for webhooks");
  const serviceKey =
    env.optional("SUPABASE_SERVICE_ROLE_KEY") ||
    env.required("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key (fallback)");

  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

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

function computePayformSignature(payload: Record<string, any>, secretKey: string): string {
  const toSortedDeep = (v: any): any => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) return v.map(toSortedDeep);
    if (typeof v === "object") {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v).sort()) out[k] = toSortedDeep(v[k]);
      return out;
    }
    return String(v);
  };
  const sorted = toSortedDeep(payload);
  const json = JSON.stringify(sorted).replace(/\//g, "\\/");
  return crypto.createHmac("sha256", secretKey).update(json).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getWebhookSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Integration is not configured", hint: "Missing Supabase keys for webhook" },
        { status: 500 }
      );
    }

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

    // Verify signature if provided (Payform/Prodamus docs use header: Sign)
    const signHeader =
      request.headers.get("Sign") ||
      request.headers.get("sign") ||
      request.headers.get("x-prodamus-signature") ||
      "";
    const secretKey = process.env.PAYFORM_SECRET_KEY || "";
    if (secretKey && signHeader) {
      const payloadForSign: any = { ...(body as any) };
      // Some providers include signature inside body as well; remove to avoid recursion.
      delete payloadForSign.signature;
      const calc = computePayformSignature(payloadForSign, secretKey);
      if (calc !== signHeader) {
        console.error("❌ Payform webhook invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

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

    // Idempotency: if already completed, skip
    if (orderId) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status')
        .eq('prodamus_order_id', orderId)
        .maybeSingle();
      if (existingPayment?.status === 'completed') {
        console.log('[Payform Webhook] Payment already processed:', orderId);
        return NextResponse.json({ received: true, status: 'already_processed' });
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
      // Маппинг сумм на кредиты (пакеты ⭐) — единый источник: src/config/pricing.ts
      // Важно: credits = total ⭐ including bonus.
      const sorted = [...STAR_PACKS].sort((a, b) => b.price - a.price);
      const matched = sorted.find((p) => amount + 0.01 >= p.price);
      if (matched) credits = packTotalStars(matched);
      else credits = Math.floor(amount); // Fallback
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

    // Начисляем кредиты (раздельно: подписка vs пакет)
    if (credits > 0) {
      let newBalance;
      
      if (paymentType === 'subscription') {
        // Подписка: звёзды сгорают в конце месяца
        // При продлении: старые subscription_stars сбрасываются, новые начисляются
        newBalance = await renewSubscription(supabase, userId, credits);
        console.log(`✅ Subscription stars renewed: ${credits}. Balance: ${newBalance.totalBalance} (sub: ${newBalance.subscriptionStars}, pkg: ${newBalance.packageStars})`);
      } else {
        // Пакет: звёзды остаются навсегда
        newBalance = await addPackageStars(supabase, userId, credits);
        console.log(`✅ Package stars added: ${credits}. Balance: ${newBalance.totalBalance} (sub: ${newBalance.subscriptionStars}, pkg: ${newBalance.packageStars})`);
      }

      // Записываем транзакцию
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: credits,
        type: paymentType === 'subscription' ? 'subscription' : 'purchase',
        description: `${paymentType === 'subscription' ? 'Подписка' : 'Покупка'}: +${credits} ⭐ (${body.sum})`,
        metadata: { 
          payform_order_id: body.order_id,
          sum: body.sum,
          products: body.products,
          credit_type: paymentType === 'subscription' ? 'subscription_stars' : 'package_stars',
        },
      });
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
      const completedAt = new Date().toISOString();
      await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          provider: 'payform',
          external_id: body.order_id || orderId,
          completed_at: completedAt,
          metadata: { ...body, completed_at: completedAt },
        })
        .eq('prodamus_order_id', orderId);
    }

    // Affiliate commission (async, don't block webhook)
    processAffiliateCommission({
      userId,
      paymentId: body.order_id || orderId || `payform-${Date.now()}`,
      amountRub: Number(parseFloat(body.sum || "0").toFixed(2)),
      tariffName: paymentType === 'subscription'
        ? `Подписка ${planId || ''}`.trim()
        : `Пакет ${credits}⭐`,
    }).catch((err) => {
      console.error('[Payform Webhook] Affiliate commission failed (ignored):', err);
    });

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