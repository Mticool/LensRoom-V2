import crypto from 'crypto';

interface CreatePaymentParams {
  orderNumber: string;
  amount: number;
  customerEmail: string;
  userId: string;
  type: 'subscription' | 'package';
  planId?: string;
  credits?: number;
  description: string;
}

export class PayformClient {
  private secretKey: string;
  private merchantId: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = process.env.PAYFORM_SECRET_KEY || '';
    this.merchantId = process.env.PAYFORM_MERCHANT_ID || 'ozoncheck';
    this.baseUrl = 'https://ozoncheck.payform.ru';
  }

  // Генерация MD5 подписи (если требуется)
  private generateSignature(params: Record<string, string>): string {
    // Сортируем ключи
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${params[key]}`)
      .join('') + this.secretKey;
    
    return crypto
      .createHash('md5')
      .update(signString)
      .digest('hex');
  }

  // Создать платеж для подписки (использует ID из Payform)
  createSubscriptionPayment({ 
    orderNumber, 
    customerEmail, 
    userId, 
    planId, 
    credits 
  }: CreatePaymentParams): string {
    
    const subscriptionId = planId === 'pro' 
      ? process.env.PAYFORM_SUBSCRIPTION_PRO 
      : process.env.PAYFORM_SUBSCRIPTION_BUSINESS;

    if (!subscriptionId) {
      throw new Error(`Subscription ID not found for plan: ${planId}`);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const params = new URLSearchParams({
      // ID подписки из Payform
      'subscription_id': subscriptionId,
      
      // Email покупателя
      'email': customerEmail,
      
      // Custom параметры (будут в webhook)
      'custom[user_id]': userId,
      'custom[order_id]': orderNumber,
      'custom[type]': 'subscription',
      'custom[plan_id]': planId || '',
      'custom[credits]': (credits || 0).toString(),
      
      // Success/Fail URLs
      'success_url': `${appUrl}/payment/success?type=subscription&plan=${planId}`,
      'fail_url': `${appUrl}/pricing`,
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Создать разовый платеж (БЕЗ создания товара в Payform!)
  createPackagePayment({ 
    orderNumber, 
    amount, 
    customerEmail, 
    userId, 
    credits,
    description 
  }: CreatePaymentParams): string {
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const params = new URLSearchParams({
      // Merchant ID
      'merchant': this.merchantId,
      
      // Сумма в рублях
      'amount': amount.toString(),
      
      // Описание платежа
      'order_desc': description,
      
      // ID заказа (уникальный)
      'order_id': orderNumber,
      
      // Email покупателя
      'customer_email': customerEmail,
      
      // Custom параметры (будут переданы в webhook)
      'custom[user_id]': userId,
      'custom[type]': 'package',
      'custom[credits]': (credits || 0).toString(),
      'custom[order_id]': orderNumber,
      
      // Success/Fail URLs
      'success_url': `${appUrl}/payment/success?type=package&credits=${credits}`,
      'fail_url': `${appUrl}/pricing`,
      
      // Result URL (webhook)
      'server_url': `${appUrl}/api/webhooks/payform`,
    });

    // Если Payform требует подпись, добавляем:
    // const signature = this.generateSignature({ amount: amount.toString(), order_id: orderNumber });
    // params.append('signature', signature);

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Универсальный метод
  createPaymentUrl(params: CreatePaymentParams): string {
    if (params.type === 'subscription') {
      return this.createSubscriptionPayment(params);
    }
    return this.createPackagePayment(params);
  }

  // Проверка webhook подписи
  verifyWebhook(body: Record<string, unknown>, signature?: string): boolean {
    if (!signature) {
      // Если подпись не требуется
      return true;
    }

    const custom = body.custom as Record<string, string> | undefined;

    const calculatedSignature = this.generateSignature({
      order_id: (body.order_id as string) || custom?.order_id || '',
      amount: body.amount?.toString() || '',
      status: (body.status as string) || '',
    });

    return calculatedSignature === signature;
  }

  // Отмена подписки
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      // Payform обычно требует отмену через админ-панель
      // Или можно использовать API если есть
      console.log('[Payform] Cancel subscription:', subscriptionId);
      return true;
    } catch (error) {
      console.error('[Payform] Cancel error:', error);
      return false;
    }
  }
}

export const payformClient = new PayformClient();
export const payform = payformClient;
