import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { payform } from '@/lib/payments/payform-client';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '@/lib/pricing/plans';

export async function POST(request: NextRequest) {
  try {
    const { type, itemId } = await request.json();

    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let paymentUrl: string;
    const orderNumber = `LR-${Date.now()}-${user.id.slice(0, 8)}`;

    if (type === 'subscription') {
      // ========== ПОДПИСКА ==========
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === itemId);
      if (!plan || !plan.recurring) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      paymentUrl = payform.createSubscriptionPayment({
        orderNumber,
        amount: plan.price,
        customerEmail: user.email!,
        userId: user.id,
        type: 'subscription',
        planId: plan.id,
        credits: plan.credits,
        description: `Подписка ${plan.name} - ${plan.credits} кредитов/мес`,
      });

      // Сохранить в БД
      await supabase.from('payments').insert({
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

      paymentUrl = payform.createPackagePayment({
        orderNumber,
        amount: pkg.price,
        customerEmail: user.email!,
        userId: user.id,
        type: 'package',
        credits: pkg.credits,
        description: `${pkg.credits} кредитов LensRoom`,
      });

      // Сохранить в БД
      await supabase.from('payments').insert({
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