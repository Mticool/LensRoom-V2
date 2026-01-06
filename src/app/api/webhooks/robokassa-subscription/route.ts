import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Robokassa Subscription Webhook
 * 
 * Получает уведомления о рекуррентных платежах от Robokassa подписок.
 * URL для настройки в Robokassa: https://lensroom.ru/api/webhooks/robokassa-subscription
 */
export async function POST(request: NextRequest) {
  console.log('[Robokassa Subscription Webhook] Received request');
  
  try {
    // Получаем данные
    let params: Record<string, string> = {};
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const urlParams = new URLSearchParams(text);
      urlParams.forEach((value, key) => {
        params[key] = value;
      });
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        params[key] = value.toString();
      });
    } else {
      try {
        params = await request.json();
      } catch {
        const text = await request.text();
        const urlParams = new URLSearchParams(text);
        urlParams.forEach((value, key) => {
          params[key] = value;
        });
      }
    }
    
    console.log('[Robokassa Subscription Webhook] Params:', params);
    
    const subscriptionId = params['SubscriptionId'] || params['subscription_id'] || '';
    const email = params['Email'] || params['email'] || '';
    const outSum = params['OutSum'] || params['out_sum'] || '0';
    const invId = params['InvId'] || params['inv_id'] || `sub-${Date.now()}`;
    const state = params['State'] || params['state'] || 'active';
    
    // Определяем план по subscriptionId
    // New plans: creator (990₽/1200⭐), creator_plus (1990₽/2550⭐), business (2990₽/3500⭐)
    const subscriptionMap: Record<string, { planId: string; credits: number; name: string }> = {
      // New plans
      [process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || '']: { planId: 'creator', credits: 1200, name: 'Creator' },
      [process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || '']: { planId: 'creator_plus', credits: 2550, name: 'Creator+' },
      [process.env.ROBOKASSA_SUBSCRIPTION_BUSINESS || '']: { planId: 'business', credits: 3500, name: 'Business' },
      // Legacy mappings (for existing subscriptions)
      [process.env.ROBOKASSA_SUBSCRIPTION_STAR || '']: { planId: 'creator', credits: 1200, name: 'Creator' },
      [process.env.ROBOKASSA_SUBSCRIPTION_PRO || '']: { planId: 'creator_plus', credits: 2550, name: 'Creator+' },
    };
    
    const planInfo = subscriptionMap[subscriptionId];
    
    if (!planInfo) {
      console.error('[Robokassa Subscription Webhook] Unknown subscription:', subscriptionId);
      return new NextResponse('Unknown subscription', { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Находим пользователя по email или subscription_id
    let userId: string | null = null;
    const emailLower = email?.toLowerCase() || '';
    
    // 1. Сначала ищем в таблице subscription_emails (самый точный способ)
    if (emailLower || subscriptionId) {
      const query = supabase.from('subscription_emails').select('user_id');
      
      if (emailLower && subscriptionId) {
        query.or(`email.eq.${emailLower},subscription_id.eq.${subscriptionId}`);
      } else if (emailLower) {
        query.eq('email', emailLower);
      } else {
        query.eq('subscription_id', subscriptionId);
      }
      
      const { data: subEmail } = await query.maybeSingle();
      if (subEmail) {
        userId = subEmail.user_id;
        console.log('[Robokassa Subscription Webhook] Found user via subscription_emails:', userId);
      }
    }
    
    // 2. Ищем в profiles по email
    if (!userId && emailLower) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', emailLower)
        .maybeSingle();
      
      if (profile) {
        userId = profile.id;
        console.log('[Robokassa Subscription Webhook] Found user via profiles:', userId);
      }
    }
    
    // 3. Ищем в telegram_profiles
    if (!userId && emailLower) {
      const { data: tgProfile } = await supabase
        .from('telegram_profiles')
        .select('auth_user_id')
        .ilike('email', emailLower)
        .maybeSingle();
      
      if (tgProfile?.auth_user_id) {
        userId = tgProfile.auth_user_id;
        console.log('[Robokassa Subscription Webhook] Found user via telegram_profiles:', userId);
      }
    }
    
    if (!userId) {
      console.error('[Robokassa Subscription Webhook] User not found:', { email: emailLower, subscriptionId });
      
      // Сохраняем для ручной обработки
      await supabase.from('payments').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        type: 'subscription',
        package_id: planInfo.planId,
        amount: Math.round(parseFloat(outSum)),
        credits: planInfo.credits,
        status: 'pending_user_mapping',
        provider: 'robokassa',
        external_id: invId,
        metadata: {
          subscription_id: subscriptionId,
          email,
          state,
          plan_name: planInfo.name,
          needs_manual_processing: true,
        },
      });
      
      return new NextResponse(`OK${invId}`, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    // Проверяем, не обработан ли уже этот платёж
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('external_id', invId)
      .maybeSingle();
    
    if (existingPayment?.status === 'completed') {
      console.log('[Robokassa Subscription Webhook] Already processed:', invId);
      return new NextResponse(`OK${invId}`, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    // Сохраняем платёж
    const paymentData = {
      user_id: userId,
      type: 'subscription',
      package_id: planInfo.planId,
      amount: Math.round(parseFloat(outSum)),
      credits: planInfo.credits,
      status: 'completed',
      provider: 'robokassa',
      external_id: invId,
      metadata: {
        subscription_id: subscriptionId,
        email,
        state,
        plan_name: planInfo.name,
      },
      completed_at: new Date().toISOString(),
    };
    
    if (existingPayment) {
      await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', existingPayment.id);
    } else {
      await supabase
        .from('payments')
        .insert(paymentData);
    }
    
    // Начисляем звёзды
    const { error: adjustError } = await supabase.rpc('adjust_credits', {
      p_user_id: userId,
      p_amount: planInfo.credits,
      p_type: 'subscription',
      p_description: `Подписка ${planInfo.name}: +${planInfo.credits} ⭐`,
      p_metadata: {
        provider: 'robokassa',
        subscription_id: subscriptionId,
        inv_id: invId,
        amount_rub: parseFloat(outSum),
      },
    });
    
    if (adjustError) {
      console.error('[Robokassa Subscription Webhook] adjust_credits error:', adjustError);
      
      // Fallback
      const { data: currentCredits } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single();
      
      if (currentCredits) {
        await supabase
          .from('credits')
          .update({ 
            amount: currentCredits.amount + planInfo.credits,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('credits')
          .insert({
            user_id: userId,
            amount: planInfo.credits,
          });
      }
      
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: planInfo.credits,
        type: 'subscription',
        description: `Подписка ${planInfo.name}: +${planInfo.credits} ⭐`,
        metadata: {
          provider: 'robokassa',
          subscription_id: subscriptionId,
          inv_id: invId,
        },
      });
    }
    
    // Обновляем статус подписки на active
    if (emailLower) {
      await supabase
        .from('subscription_emails')
        .update({ status: 'active' })
        .eq('email', emailLower)
        .eq('plan_id', planInfo.planId);
    }
    
    // Создаём/обновляем запись в subscriptions
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // +1 месяц
    
    // Check for existing active subscription for this user
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_id: planInfo.planId,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          credits_per_month: planInfo.credits,
          prodamus_subscription_id: subscriptionId,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id);
      
      if (updateError) {
        console.error('[Robokassa Subscription Webhook] Failed to update subscription:', updateError);
      } else {
        console.log('[Robokassa Subscription Webhook] Subscription renewed:', {
          userId,
          planId: planInfo.planId,
          periodEnd: periodEnd.toISOString(),
        });
      }
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planInfo.planId,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          credits_per_month: planInfo.credits,
          prodamus_subscription_id: subscriptionId,
          cancel_at_period_end: false,
        });
      
      if (insertError) {
        console.error('[Robokassa Subscription Webhook] Failed to create subscription:', insertError);
      } else {
        console.log('[Robokassa Subscription Webhook] Subscription created:', {
          userId,
          planId: planInfo.planId,
          periodEnd: periodEnd.toISOString(),
        });
      }
    }
    
    // Получаем новый баланс
    const { data: newBalance } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();
    
    console.log('[Robokassa Subscription Webhook] Credits added:', {
      userId,
      email: emailLower,
      plan: planInfo.name,
      credits: planInfo.credits,
      newBalance: newBalance?.amount,
    });
    
    return new NextResponse(`OK${invId}`, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
    
  } catch (error) {
    console.error('[Robokassa Subscription Webhook] Error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return new NextResponse('Robokassa Subscription Webhook is active', { status: 200 });
}

