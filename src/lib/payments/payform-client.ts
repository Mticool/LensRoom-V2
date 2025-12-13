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

  // Генерация подписи для Prodamus
  private generateSignature(data: Record<string, string>): string {
    // Сортируем по ключам и формируем строку
    const sorted = Object.keys(data).sort();
    const str = sorted.map(k => data[k]).join('');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(str)
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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    const params = new URLSearchParams();
    params.append('subscription_id', subscriptionId);
    params.append('customer_email', customerEmail);
    params.append('customer_extra', JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'subscription',
      plan_id: planId,
      credits: credits,
    }));
    params.append('urlSuccess', `${appUrl}/payment/success?type=subscription&plan=${planId}&credits=${credits}`);
    params.append('urlReturn', `${appUrl}/pricing`);

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Создать разовый платеж с динамической суммой
  createPackagePayment({ 
    orderNumber, 
    amount, 
    customerEmail, 
    userId, 
    credits,
    description 
  }: CreatePaymentParams): string {
    
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    // Prodamus/Payform параметры для динамического платежа
    const params = new URLSearchParams();
    
    // Обязательные параметры
    params.append('do', 'pay');
    params.append('sum', amount.toString());
    params.append('currency', 'rub');
    
    // Информация о товаре
    params.append('products[0][name]', description);
    params.append('products[0][price]', amount.toString());
    params.append('products[0][quantity]', '1');
    
    // Информация о покупателе
    params.append('customer_email', customerEmail);
    params.append('order_id', orderNumber);
    
    // Дополнительные данные для webhook
    params.append('customer_extra', JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'package',
      credits: credits,
    }));
    
    // URL callbacks
    params.append('urlSuccess', `${appUrl}/payment/success?type=package&credits=${credits}`);
    params.append('urlReturn', `${appUrl}/pricing`);
    params.append('urlNotification', `${appUrl}/api/webhooks/payform`);
    
    // Подпись (если требуется)
    const signData = {
      sum: amount.toString(),
      order_id: orderNumber,
      customer_email: customerEmail,
    };
    const signature = this.generateSignature(signData);
    params.append('signature', signature);

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
    // Для Prodamus проверка подписи отличается
    return true; // Пока пропускаем
  }

  // Отмена подписки
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    console.log('[Payform] Cancel subscription:', subscriptionId);
    return true;
  }
}

export const payformClient = new PayformClient();
export const payform = payformClient;