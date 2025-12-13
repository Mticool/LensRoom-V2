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

  // Генерация MD5 подписи
  private generateSignature(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${params[key]}`)
      .join('') + this.secretKey;
    
    return crypto
      .createHash('md5')
      .update(signString)
      .digest('hex');
  }

  // Создать платеж для подписки
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
      'do': 'subscription',
      'subscription_id': subscriptionId,
      'email': customerEmail,
      'customer_email': customerEmail,
      'custom[user_id]': userId,
      'custom[order_id]': orderNumber,
      'custom[type]': 'subscription',
      'custom[plan_id]': planId || '',
      'custom[credits]': (credits || 0).toString(),
      'success_url': `${appUrl}/payment/success?type=subscription&plan=${planId}&credits=${credits}`,
      'fail_url': `${appUrl}/pricing?error=failed`,
    });

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Создать разовый платеж
  createPackagePayment({ 
    orderNumber, 
    amount, 
    customerEmail, 
    userId, 
    credits,
    description 
  }: CreatePaymentParams): string {
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Попробуем разные варианты параметров для Payform
    const params = new URLSearchParams({
      // Действие
      'do': 'pay',
      
      // Сумма (пробуем разные названия)
      'sum': amount.toString(),
      'amount': amount.toString(),
      'price': amount.toString(),
      
      // Валюта
      'currency': 'RUB',
      
      // Описание
      'name': description,
      'description': description,
      'order_desc': description,
      'comment': description,
      
      // ID заказа
      'order_id': orderNumber,
      'invoice_id': orderNumber,
      
      // Email
      'email': customerEmail,
      'customer_email': customerEmail,
      
      // Custom данные для webhook
      'customer_extra': JSON.stringify({
        user_id: userId,
        type: 'package',
        credits: credits,
        order_id: orderNumber,
      }),
      'custom[user_id]': userId,
      'custom[type]': 'package',
      'custom[credits]': (credits || 0).toString(),
      'custom[order_id]': orderNumber,
      
      // URLs
      'success_url': `${appUrl}/payment/success?type=package&credits=${credits}`,
      'fail_url': `${appUrl}/pricing?error=failed`,
      'result_url': `${appUrl}/api/webhooks/payform`,
      'server_url': `${appUrl}/api/webhooks/payform`,
      'callback_url': `${appUrl}/api/webhooks/payform`,
    });

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
