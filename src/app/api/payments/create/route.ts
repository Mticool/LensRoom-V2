import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getRobokassaClient } from '@/lib/payments/robokassa-client';
import { getProdamusClient } from '@/lib/payments/prodamus-client';
import { PAYMENT_CREDIT_PACKAGES, PAYMENT_SUBSCRIPTION_PLANS } from '@/config/pricing';
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credits, type = 'package', planId } = body;

    // Validate package or subscription
    let amount: number;
    let creditsAmount: number;
    let description: string;

    if (type === 'subscription' && planId) {
      // Подписка
      const plan = PAYMENT_SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (!plan) {
        return NextResponse.json(
          { error: 'Invalid subscription plan', availablePlans: PAYMENT_SUBSCRIPTION_PLANS.map(p => p.id) },
          { status: 400 }
        );
      }
      amount = plan.price;
      creditsAmount = plan.credits;
      description = `Подписка ${plan.name}: ${plan.credits} ⭐/мес`;
    } else {
      // Пакет звёзд
      const package_ = PAYMENT_CREDIT_PACKAGES.find(p => p.credits === credits);
      if (!package_) {
        return NextResponse.json(
          { error: 'Invalid credits package', availablePackages: PAYMENT_CREDIT_PACKAGES.map(p => p.credits) },
          { status: 400 }
        );
      }
      amount = package_.price;
      creditsAmount = package_.credits;
      description = `Пополнение баланса: ${package_.credits} ⭐`;
    }

    // Check auth
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate order number
    const orderNumber = `LR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Try Robokassa first, fallback to Prodamus
    let paymentUrl: string;
    let provider: string;

    const robokassa = getRobokassaClient();
    if (robokassa) {
      // Используем Robokassa
      if (type === 'subscription' && planId) {
        paymentUrl = robokassa.createSubscriptionPayment({
          orderNumber,
          amount,
          credits: creditsAmount,
          userId: user.id,
          planId,
          email: user.email || undefined,
        });
      } else {
        paymentUrl = robokassa.createPackagePayment({
          orderNumber,
          amount,
          credits: creditsAmount,
          userId: user.id,
          email: user.email || undefined,
        });
      }
      provider = 'robokassa';
    } else {
      // Fallback на Prodamus
      const prodamus = getProdamusClient();
      if (!prodamus) {
        return integrationNotConfigured("payment", [
          "ROBOKASSA_MERCHANT_LOGIN",
          "ROBOKASSA_PASSWORD1", 
          "ROBOKASSA_PASSWORD2",
        ]);
      }
      paymentUrl = prodamus.createPaymentLink({
        orderNumber,
        amount,
        customerEmail: user.email || '',
        credits: creditsAmount,
        userId: user.id,
      });
      provider = 'prodamus';
    }

    // Создаём запись платежа в статусе pending
    const adminSupabase = getSupabaseAdmin();
    await adminSupabase.from('payments').insert({
      user_id: user.id,
      type: type === 'subscription' ? 'subscription' : 'stars_purchase',
      package_id: planId || null,
      amount,
      credits: creditsAmount,
      status: 'pending',
      provider,
      metadata: {
        order_number: orderNumber,
        description,
      },
    });

    console.log('[Payments] Created payment:', {
      orderNumber,
      userId: user.id,
      credits: creditsAmount,
      amount,
      provider,
      type,
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderNumber,
      credits: creditsAmount,
      amount,
      provider,
    });
  } catch (error) {
    console.error('[Payments] Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
