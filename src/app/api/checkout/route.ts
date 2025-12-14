import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { payform } from '@/lib/payments/payform-client';
import { SUBSCRIPTIONS, CREDIT_PACKS } from '@/lib/pricing-config';

export async function POST(request: NextRequest) {
  try {
    const { type, itemId } = await request.json();

    console.log('[Checkout] Request:', { type, itemId });

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
      const plan = SUBSCRIPTIONS.find(p => p.id === itemId);
      if (!plan) {
        console.error('[Checkout] Plan not found:', itemId);
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }

      console.log('[Checkout] Creating subscription:', { plan: plan.name, price: plan.price, credits: plan.credits });

      paymentUrl = payform.createSubscriptionPayment({
        orderNumber,
        amount: plan.price,
        customerEmail: user.email!,
        userId: user.id,
        type: 'subscription',
        planId: plan.id,
        credits: plan.credits,
        description: `Подписка ${plan.name} - ${plan.credits} ⭐/мес`,
      });

      // Сохранить в БД
      await supabase.from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber,
        type: 'subscription',
        amount: plan.price,
        credits: plan.credits,
        status: 'pending',
        metadata: { plan_id: plan.id, plan_name: plan.name, provider: 'payform' },
      });

      console.log('[Checkout] Subscription payment created:', {
        orderNumber,
        planId: plan.id,
        price: plan.price,
        credits: plan.credits,
        url: paymentUrl.substring(0, 100) + '...',
      });

    } else if (type === 'package') {
      // ========== РАЗОВЫЙ ПАКЕТ ==========
      const pack = CREDIT_PACKS.find(p => p.id === itemId);
      if (!pack) {
        console.error('[Checkout] Package not found:', itemId);
        return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      }

      console.log('[Checkout] Creating package:', { pack: pack.name, price: pack.price, credits: pack.credits });

      paymentUrl = payform.createPackagePayment({
        orderNumber,
        amount: pack.price,
        customerEmail: user.email!,
        userId: user.id,
        type: 'package',
        planId: pack.id, // Передаём ID пакета
        credits: pack.credits,
        description: `${pack.credits} ⭐ LensRoom`,
      });

      // Сохранить в БД
      await supabase.from('payments').insert({
        user_id: user.id,
        prodamus_order_id: orderNumber,
        type: 'package',
        amount: pack.price,
        credits: pack.credits,
        status: 'pending',
        metadata: { 
          package_id: pack.id, 
          package_name: pack.name,
          credits: pack.credits,
          provider: 'payform',
        },
      });

      console.log('[Checkout] Package payment created:', {
        orderNumber,
        packId: pack.id,
        price: pack.price,
        credits: pack.credits,
        url: paymentUrl.substring(0, 100) + '...',
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
