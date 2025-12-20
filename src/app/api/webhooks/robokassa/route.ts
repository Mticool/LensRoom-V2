import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processAffiliateCommission } from '@/lib/referrals/process-affiliate-commission';
import crypto from 'crypto';

/**
 * POST /api/webhooks/robokassa
 * 
 * Webhook для обработки платежей от Robokassa
 * 
 * TODO: Настроить в личном кабинете Robokassa:
 * Result URL: https://lensroom.ru/api/webhooks/robokassa
 * Method: POST
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    // TODO: Получить параметры от Robokassa
    const outSum = params.get('OutSum'); // Сумма
    const invId = params.get('InvId'); // ID счёта
    const signatureValue = params.get('SignatureValue'); // Подпись
    const shpUserId = params.get('Shp_user_id'); // Custom параметр: user_id
    const shpTariff = params.get('Shp_tariff'); // Custom параметр: название тарифа
    
    console.log('[Robokassa Webhook] Received:', {
      outSum,
      invId,
      shpUserId,
      shpTariff,
    });
    
    // TODO: Проверить подпись Robokassa
    // const merchantPass2 = process.env.ROBOKASSA_PASSWORD_2;
    // const mySignature = crypto
    //   .createHash('md5')
    //   .update(`${outSum}:${invId}:${merchantPass2}:Shp_user_id=${shpUserId}`)
    //   .digest('hex')
    //   .toUpperCase();
    // 
    // if (mySignature !== signatureValue) {
    //   console.error('[Robokassa Webhook] Invalid signature');
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    // }
    
    if (!outSum || !invId || !shpUserId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const userId = shpUserId;
    const amountRub = parseFloat(outSum);
    const paymentId = invId;
    const tariffName = shpTariff || 'Unknown';
    
    const supabase = getSupabaseAdmin();
    
    // TODO: 1. Начислить звёзды/пакет пользователю
    // TODO: 2. Сохранить транзакцию в базу
    // const { error: txError } = await supabase.from('transactions').insert({
    //   user_id: userId,
    //   type: 'purchase',
    //   amount: amountRub,
    //   payment_id: paymentId,
    //   status: 'completed',
    // });
    
    // 3. Обработать партнёрскую комиссию (если есть реферер)
    const commissionResult = await processAffiliateCommission({
      userId,
      paymentId,
      amountRub,
      tariffName,
    });
    
    if (commissionResult.success) {
      console.log(`[Robokassa Webhook] Affiliate commission processed: ${commissionResult.commissionRub}₽`);
    } else {
      console.log(`[Robokassa Webhook] No commission: ${commissionResult.message}`);
    }
    
    // Robokassa требует ответ "OK{InvId}"
    return new NextResponse(`OK${invId}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
    
  } catch (error) {
    console.error('[Robokassa Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/robokassa
 * 
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Robokassa webhook endpoint',
    note: 'Use POST method for actual webhooks',
  });
}
