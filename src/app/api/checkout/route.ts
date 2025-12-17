import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { payform } from '@/lib/payments/payform-client';
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

    // Check if payment provider is configured
    const payformConfigured = process.env.PAYFORM_SECRET_KEY && process.env.PAYFORM_MERCHANT_ID;
    if (!payformConfigured) {
      return NextResponse.json({ 
        error: 'Payment system is not configured. Please contact support.',
        hint: process.env.NODE_ENV !== 'production' ? 'Missing PAYFORM_SECRET_KEY or PAYFORM_MERCHANT_ID' : undefined
      }, { status: 503 });
    }

    let paymentUrl: string;
    const customerEmail = user.email || `user_${user.id.slice(0, 8)}@lensroom.local`;
    const orderNumber = `LR-${Date.now()}-${user.id.slice(0, 8)}`;

    if (type === 'subscription') {
      // ========== ПОДПИСКА ==========
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === itemId);
      if (!plan || !plan.recurring) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      try {
        paymentUrl = payform.createSubscriptionPayment({
          orderNumber,
          amount: plan.price,
          customerEmail,
          userId: user.id,
          type: 'subscription',
          planId: plan.id,
          credits: plan.credits,
          description: `Подписка ${plan.name} - ${plan.credits} кредитов/мес`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment configuration error';
        return NextResponse.json({ 
          error: 'Unable to create payment. Please contact support.',
          hint: process.env.NODE_ENV !== 'production' ? msg : undefined
        }, { status: 503 });
      }

      // Сохранить в БД
      // Use admin to bypass RLS regardless of auth method
      await getSupabaseAdmin().from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber, // Используем существующее поле
        type: 'subscription',
        amount: plan.price,
        credits: plan.credits,
        status: 'pending',
        metadata: { plan_id: plan.id, plan_name: plan.name, provider: 'payform' },
      });

      console.log('[Checkout] Subscription payment created:', {
        orderNumber,
        userId: user.id,
        planId: plan.id,
        price: plan.price,
      });

    } else if (type === 'package') {
      // ========== РАЗОВЫЙ ПАКЕТ ==========
      const pkg = CREDIT_PACKAGES.find(p => p.id === itemId);
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      }

      try {
        paymentUrl = payform.createPackagePayment({
          orderNumber,
          amount: pkg.price,
          customerEmail,
          userId: user.id,
          type: 'package',
          credits: pkg.credits,
          description: `${pkg.credits} кредитов LensRoom`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Payment configuration error';
        return NextResponse.json({ 
          error: 'Unable to create payment. Please contact support.',
          hint: process.env.NODE_ENV !== 'production' ? msg : undefined
        }, { status: 503 });
      }

      // Сохранить в БД
      await getSupabaseAdmin().from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber,
        type: 'package',
        amount: pkg.price,
        credits: pkg.credits,
        status: 'pending',
        metadata: { 
          package_id: pkg.id, 
          credits: pkg.credits,
          popular: pkg.popular || false,
          provider: 'payform',
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
    });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}