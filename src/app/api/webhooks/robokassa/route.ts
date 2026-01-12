import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addSubscriptionStars, addPackageStars, renewSubscription } from '@/lib/credits/split-credits';
import { notifyUserPayment, notifyAdminPayment } from '@/lib/email/notifications';
import { processAffiliateCommission } from '@/lib/referrals/process-affiliate-commission';
import crypto from 'crypto';

/**
 * Robokassa Result URL Webhook
 * 
 * Robokassa отправляет POST запрос с параметрами:
 * - OutSum: сумма платежа
 * - InvId: номер счёта
 * - SignatureValue: подпись
 * - Shp_* параметры: дополнительные данные
 * 
 * Для рекуррентных подписок также приходят уведомления.
 */
export async function POST(request: NextRequest) {
  console.log('[Robokassa Webhook] Received request');
  
  try {
    // Получаем данные - может быть formData или urlencoded
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
      // Try JSON
      try {
        params = await request.json();
      } catch {
        // Try as text/urlencoded
        const text = await request.text();
        const urlParams = new URLSearchParams(text);
        urlParams.forEach((value, key) => {
          params[key] = value;
        });
      }
    }
    
    const outSum = params['OutSum'] || params['out_sum'] || '';
    const invId = params['InvId'] || params['inv_id'] || '';
    const signatureValue = params['SignatureValue'] || params['signature_value'] || '';
    
    // Shp параметры (для обычных платежей)
    const shpCredits = params['Shp_credits'] || '0';
    const shpUserId = params['Shp_userid'] || '';
    const shpType = params['Shp_type'] || 'package';
    const shpPlanId = params['Shp_planid'] || '';
    const shpOrderNumber = params['Shp_ordernumber'] || '';
    
    // Параметры для рекуррентных подписок
    const subscriptionId = params['SubscriptionId'] || params['subscription_id'] || '';
    const email = params['Email'] || params['email'] || '';
    const state = params['State'] || params['state'] || ''; // active, cancelled, etc.
    
    console.log('[Robokassa Webhook] Payment data:', {
      outSum,
      invId,
      credits: shpCredits,
      userId: shpUserId,
      type: shpType,
      planId: shpPlanId,
      orderNumber: shpOrderNumber,
      subscriptionId,
      email,
      state,
    });
    
    const password2 = process.env.ROBOKASSA_PASSWORD2 || '';
    
    // Для рекуррентных подписок обработка особая
    if (subscriptionId && !shpUserId) {
      // Это уведомление от рекуррентной подписки
      console.log('[Robokassa Webhook] Recurring subscription notification:', {
        subscriptionId,
        email,
        state,
        outSum,
      });
      
      // Находим пользователя по email или subscriptionId
      const supabase = getSupabaseAdmin();
      
      // Определяем planId по subscriptionId
      // New plans: creator (990₽/1200⭐), creator_plus (1990₽/2550⭐), business (2990₽/3500⭐)
      const subscriptionMap: Record<string, { planId: string; credits: number }> = {
        // New plans
        [process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || '']: { planId: 'creator', credits: 1200 },
        [process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || '']: { planId: 'creator_plus', credits: 2550 },
        [process.env.ROBOKASSA_SUBSCRIPTION_BUSINESS || '']: { planId: 'business', credits: 3500 },
        // Legacy mappings
        [process.env.ROBOKASSA_SUBSCRIPTION_STAR || '']: { planId: 'creator', credits: 1200 },
        [process.env.ROBOKASSA_SUBSCRIPTION_PRO || '']: { planId: 'creator_plus', credits: 2550 },
      };
      
      const planInfo = subscriptionMap[subscriptionId];
      if (!planInfo) {
        console.error('[Robokassa Webhook] Unknown subscription ID:', subscriptionId);
        return new NextResponse('Unknown subscription', { status: 400 });
      }
      
      // Находим пользователя по email
      let userId: string | null = null;
      
      if (email) {
        // Ищем по email в profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (profile) {
          userId = profile.id;
        } else {
          // Ищем в auth.users через telegram_profiles
          const { data: tgProfile } = await supabase
            .from('telegram_profiles')
            .select('auth_user_id')
            .ilike('email', email)
            .maybeSingle();
          
          if (tgProfile) {
            userId = (tgProfile as any).auth_user_id;
          }
        }
      }
      
      if (!userId) {
        console.error('[Robokassa Webhook] User not found for email:', email);
        // Сохраняем платёж без user_id для последующей обработки
        await supabase.from('payments').insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder
          type: 'subscription',
          package_id: planInfo.planId,
          amount: Math.round(parseFloat(outSum) || 0),
          credits: planInfo.credits,
          status: 'pending_user',
          provider: 'robokassa',
          external_id: invId || `sub-${Date.now()}`,
          metadata: {
            subscription_id: subscriptionId,
            email,
            state,
            needs_user_mapping: true,
          },
        });
        
        return new NextResponse(`OK${invId || '0'}`, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      
      // Начисляем звёзды
      await addCreditsToUser(supabase, userId, planInfo.credits, 'subscription', planInfo.planId, invId, parseFloat(outSum));
      
      return new NextResponse(`OK${invId || '0'}`, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    // Обычный платёж (пакеты звёзд)
    if (!shpUserId) {
      console.error('[Robokassa Webhook] Missing user ID');
      return new NextResponse('Missing user ID', { status: 400 });
    }
    
    // Проверка подписи с Shp параметрами
    // MD5(OutSum:InvId:Password2:Shp_credits=X:Shp_ordernumber=X:Shp_planid=X:Shp_type=X:Shp_userid=X)
    const shpParamsArray = [
      `Shp_credits=${shpCredits}`,
      `Shp_ordernumber=${shpOrderNumber}`,
      `Shp_planid=${shpPlanId}`,
      `Shp_type=${shpType}`,
      `Shp_userid=${shpUserId}`,
    ].sort();
    
    const signString = `${outSum}:${invId}:${password2}:${shpParamsArray.join(':')}`;
    const expectedSignature = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
    
    if (signatureValue && expectedSignature !== signatureValue.toUpperCase()) {
      console.error('[Robokassa Webhook] Invalid signature', {
        expected: expectedSignature,
        received: signatureValue,
        signString: signString.replace(password2, '***'),
      });
      return new NextResponse('Invalid signature', { status: 400 });
    }
    
    console.log('[Robokassa Webhook] Signature verified');
    
    const supabase = getSupabaseAdmin();
    const credits = parseInt(shpCredits, 10);
    const amount = parseFloat(outSum);
    
    // Начисляем звёзды
    await addCreditsToUser(supabase, shpUserId, credits, shpType, shpPlanId, invId, amount);
    
    // Robokassa ожидает ответ в формате OK{InvId}
    return new NextResponse(`OK${invId}`, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
    
  } catch (error) {
    console.error('[Robokassa Webhook] Error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

/**
 * Начисление звёзд пользователю
 */
async function addCreditsToUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  credits: number,
  type: string,
  planId: string,
  invId: string,
  amount: number
) {
  // Проверяем, не обработан ли уже этот платёж
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('external_id', invId)
    .maybeSingle();
  
  if (existingPayment?.status === 'completed') {
    console.log('[Robokassa Webhook] Payment already processed:', invId);
    return;
  }
  
  // Создаём или обновляем запись платежа
  const paymentData = {
    user_id: userId,
    type: type === 'subscription' ? 'subscription' : 'stars_purchase',
    package_id: planId || null,
    amount: Math.round(amount),
    credits: credits,
    status: 'completed',
    provider: 'robokassa',
    external_id: invId,
    metadata: {
      inv_id: invId,
      out_sum: amount,
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
  
  console.log('[Robokassa Webhook] Payment recorded');
  
  // Используем раздельную систему: subscription_stars vs package_stars
  let newBalance;
  const creditType = type === 'subscription' ? 'subscription_stars' : 'package_stars';
  
  if (type === 'subscription') {
    // Подписка: звёзды сгорают в конце месяца
    // При продлении: старые subscription_stars сбрасываются, новые начисляются
    newBalance = await renewSubscription(supabase, userId, credits);
    console.log(`[Robokassa Webhook] Subscription stars renewed: ${credits}. Balance: ${newBalance.totalBalance} (sub: ${newBalance.subscriptionStars}, pkg: ${newBalance.packageStars})`);
  } else {
    // Пакет: звёзды остаются навсегда
    newBalance = await addPackageStars(supabase, userId, credits);
    console.log(`[Robokassa Webhook] Package stars added: ${credits}. Balance: ${newBalance.totalBalance} (sub: ${newBalance.subscriptionStars}, pkg: ${newBalance.packageStars})`);
  }
  
  // Записываем транзакцию
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: credits,
    type: type === 'subscription' ? 'subscription' : 'purchase',
    description: type === 'subscription' 
      ? `Подписка ${planId}: +${credits} ⭐`
      : `Покупка пакета: +${credits} ⭐`,
    metadata: {
      provider: 'robokassa',
      inv_id: invId,
      amount_rub: amount,
      credit_type: creditType,
    },
  });
  
  console.log('[Robokassa Webhook] Credits added:', {
    userId,
    credits,
    creditType,
    newBalance: newBalance.totalBalance,
    subscriptionStars: newBalance.subscriptionStars,
    packageStars: newBalance.packageStars,
  });
  
  // Send email notifications (async, don't block)
  const packageName = type === 'subscription' 
    ? `Подписка ${planId}` 
    : `Пакет ${credits}⭐`;
    
  // Get user info for notifications
  const { data: userProfile } = await supabase
    .from('telegram_profiles')
    .select('telegram_username')
    .eq('auth_user_id', userId)
    .maybeSingle();
    
  const notificationData = {
    telegramUsername: userProfile?.telegram_username || undefined,
    amount: Math.round(amount),
    currency: '₽',
    packageName,
    creditsAdded: credits,
    paymentId: invId,
  };
  
  // Send to admin (always)
  notifyAdminPayment(notificationData).catch(err => 
    console.error('[Email] Admin notification failed:', err)
  );
  
  // TODO: Send to user when email is available
  // notifyUserPayment({ ...notificationData, userEmail }).catch(() => {});

  // Affiliate commission (async, don't block webhook)
  processAffiliateCommission({
    userId,
    paymentId: invId,
    amountRub: Number(amount.toFixed(2)),
    tariffName: packageName,
  }).catch((err) => {
    console.error('[Robokassa Webhook] Affiliate commission failed (ignored):', err);
  });
}

// Также поддерживаем GET для тестирования и Success/Fail URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Если это Success URL редирект - показываем успех
  if (searchParams.has('success')) {
    return NextResponse.redirect(new URL('/payment/success', request.url));
  }
  
  // Пробуем обработать как webhook
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  // Создаём mock request
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  return POST(mockRequest);
}
