import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prodamusClient } from '@/lib/payments/prodamus-client';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '@/lib/pricing/plans';

export async function POST(request: NextRequest) {
  try {
    const { type, itemId } = await request.json();
    // type: 'subscription' | 'package'
    // itemId: plan id или package id

    // Auth check
    const supabase = await createServerSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let paymentUrl: string;
    const orderNumber = `order-${Date.now()}-${user.id.slice(0, 8)}`;

    if (type === 'subscription') {
      // Подписка
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === itemId);
      if (!plan || !plan.recurring) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      paymentUrl = prodamusClient.createSubscriptionPayment({
        orderNumber,
        amount: plan.price,
        customerEmail: user.email!,
        userId: user.id,
        planId: plan.id,
        credits: plan.credits,
      });

      // Создаём запись о платеже
      await supabase.from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber,
        type: 'subscription',
        amount: plan.price,
        credits: plan.credits,
        status: 'pending',
        metadata: { plan_id: plan.id },
      });

    } else if (type === 'package') {
      // Разовый пакет
      const pkg = CREDIT_PACKAGES.find(p => p.id === itemId);
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      }

      paymentUrl = prodamusClient.createPackagePayment({
        orderNumber,
        amount: pkg.price,
        customerEmail: user.email!,
        userId: user.id,
        credits: pkg.credits,
      });

      await supabase.from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber,
        type: 'package',
        amount: pkg.price,
        credits: pkg.credits,
        status: 'pending',
        metadata: { package_id: pkg.id },
      });

    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    console.log('[Checkout] Created payment:', {
      orderNumber,
      userId: user.id,
      type,
      itemId,
    });

    return NextResponse.json({ url: paymentUrl });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

