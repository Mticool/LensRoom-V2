import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRobokassaClient } from '@/lib/payments/robokassa-client';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '@/lib/pricing/plans';

export async function POST(request: NextRequest) {
  try {
    const { type, itemId } = await request.json();

    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    // Prefer Supabase auth, but also support Telegram session login (site primary flow).
    let user: { id: string; email: string | null } | null = null;
    const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser();
    if (!authError && sbUser) {
      user = { id: sbUser.id, email: sbUser.email || null };
    } else {
      const telegramSession = await getSession();
      if (telegramSession) {
        const userId = await getAuthUserId(telegramSession);
        if (userId) {
          // Get email from profiles (telegram users have synthetic email like telegram_<id>@lensroom.ru)
          const admin = getSupabaseAdmin();
          const { data: profile } = await admin
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();
          user = { id: userId, email: (profile as any)?.email || null };
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Robokassa configuration
    const robokassa = getRobokassaClient();
    if (!robokassa) {
      return NextResponse.json(
        {
          error: "Оплата пока не подключена. Напишите в поддержку.",
          missingEnv: ["ROBOKASSA_MERCHANT_LOGIN", "ROBOKASSA_PASSWORD1", "ROBOKASSA_PASSWORD2"],
        },
        { status: 503 }
      );
    }

    let paymentUrl: string;
    const customerEmail = user.email || undefined;
    const orderNumber = `LR-${Date.now()}-${user.id.slice(0, 8)}`;

    if (type === 'subscription') {
      // ========== ПОДПИСКА (рекуррентный платёж Robokassa) ==========
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === itemId);
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      // Получаем реальный email пользователя из профиля
      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .maybeSingle();
      
      const realEmail = profile?.email && !profile.email.includes('@lensroom') 
        ? profile.email 
        : customerEmail;

      try {
        paymentUrl = robokassa.createSubscriptionPayment({
          orderNumber,
          amount: plan.price,
          credits: plan.credits,
          userId: user.id,
          planId: plan.id,
          email: realEmail,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment configuration error';
        console.error('[Checkout] Subscription error:', msg);
        return NextResponse.json({ 
          error: 'Не удалось создать оплату. Напишите в поддержку.',
          hint: process.env.NODE_ENV !== 'production' ? msg : undefined,
        }, { status: 503 });
      }

      // Сохраняем связь email → userId для webhook'а подписки
      // Robokassa передаёт email в уведомлениях о рекуррентных платежах
      if (realEmail) {
        const subscriptionMap: Record<string, string> = {
          // New plans
          'creator': process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || '',
          'creator_plus': process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || '',
          'business': process.env.ROBOKASSA_SUBSCRIPTION_BUSINESS || '',
          // Legacy mappings
          'star': process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || process.env.ROBOKASSA_SUBSCRIPTION_STAR || '',
          'pro': process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || process.env.ROBOKASSA_SUBSCRIPTION_PRO || '',
        };
        
        await admin.from('subscription_emails').upsert({
          user_id: user.id,
          email: realEmail.toLowerCase(),
          plan_id: plan.id,
          subscription_id: subscriptionMap[plan.id] || null,
          status: 'pending',
        }, {
          onConflict: 'email,plan_id',
        });
      }

      console.log('[Checkout] Subscription redirect:', {
        orderNumber,
        userId: user.id,
        planId: plan.id,
        price: plan.price,
        credits: plan.credits,
        email: realEmail,
      });

    } else if (type === 'package') {
      // ========== РАЗОВЫЙ ПАКЕТ (обычный платёж Robokassa) ==========
      const pkg = CREDIT_PACKAGES.find(p => p.id === itemId);
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      }

      try {
        paymentUrl = robokassa.createPackagePayment({
          orderNumber,
          amount: pkg.price,
          credits: pkg.credits,
          userId: user.id,
          email: customerEmail,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment configuration error';
        console.error('[Checkout] Package error:', msg);
        return NextResponse.json({ 
          error: 'Не удалось создать оплату. Напишите в поддержку.',
          hint: process.env.NODE_ENV !== 'production' ? msg : undefined,
        }, { status: 503 });
      }

      // Сохранить в БД
      await getSupabaseAdmin().from('payments').insert({
        user_id: user.id,
        external_id: orderNumber,
        type: 'stars_purchase',
        package_id: pkg.id,
        amount: pkg.price,
        credits: pkg.credits,
        status: 'pending',
        provider: 'robokassa',
        metadata: { 
          package_id: pkg.id, 
          credits: pkg.credits,
          order_number: orderNumber,
        },
      });

      console.log('[Checkout] Package payment created:', {
        orderNumber,
        userId: user.id,
        packageId: pkg.id,
        credits: pkg.credits,
        price: pkg.price,
      });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ 
      url: paymentUrl,
      orderId: orderNumber,
      provider: 'robokassa',
    });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}