import crypto from 'crypto';
import { SUBSCRIPTIONS, CREDIT_PACKS } from '@/lib/pricing-config';

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

// Хардкодим production URL для надёжности
const PRODUCTION_APP_URL = 'https://lensroom.ru';

export class PayformClient {
  private secretKey: string;
  private baseUrl: string;
  private appUrl: string;

  constructor() {
    this.secretKey = process.env.PAYFORM_SECRET_KEY || '';
    this.baseUrl = 'https://ozoncheck.payform.ru';
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || PRODUCTION_APP_URL;
  }

  // Генерация подписи для Prodamus
  private generateSignature(data: Record<string, string>): string {
    const sorted = Object.keys(data).sort();
    const str = sorted.map(k => data[k]).join('');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(str)
      .digest('hex');
  }

  // Получить данные подписки из конфига
  private getSubscriptionData(planId: string) {
    const plan = SUBSCRIPTIONS.find(s => s.id === planId);
    if (!plan) return null;
    return {
      price: plan.price,
      credits: plan.credits,
      name: plan.name,
      description: `Подписка ${plan.name} - ${plan.credits} ⭐/мес`,
    };
  }

  // Получить данные пакета из конфига
  private getPackageData(packId: string) {
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) return null;
    return {
      price: pack.price,
      credits: pack.credits,
      name: pack.name,
      description: `${pack.credits} ⭐ LensRoom`,
    };
  }

  // Создать платеж для подписки (динамическая сумма из конфига)
  createSubscriptionPayment({ 
    orderNumber, 
    customerEmail, 
    userId, 
    planId, 
  }: CreatePaymentParams): string {
    
    if (!planId) {
      throw new Error('Plan ID is required');
    }

    const planData = this.getSubscriptionData(planId);
    if (!planData) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const appUrl = this.appUrl.replace(/\/$/, '');

    const params = new URLSearchParams();
    
    // Динамический платёж с суммой из конфига
    params.append('do', 'pay');
    params.append('sum', planData.price.toString());
    params.append('currency', 'rub');
    
    // Информация о товаре
    params.append('products[0][name]', planData.description);
    params.append('products[0][price]', planData.price.toString());
    params.append('products[0][quantity]', '1');
    
    // Информация о покупателе
    params.append('customer_email', customerEmail);
    params.append('order_id', orderNumber);
    
    // Метаданные для webhook
    params.append('customer_extra', JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'subscription',
      plan_id: planId,
      credits: planData.credits,
      plan_name: planData.name,
    }));
    
    // URL callbacks
    params.append('urlSuccess', `${appUrl}/payment/success?type=subscription&plan=${planId}&credits=${planData.credits}`);
    params.append('urlReturn', `${appUrl}/pricing`);
    params.append('urlNotification', `${appUrl}/api/webhooks/payform`);

    console.log(`[Payform] Creating subscription payment: ${planId} = ${planData.price}₽ / ${planData.credits}⭐`);

    return `${this.baseUrl}?${params.toString()}`;
  }

  // Создать разовый платеж (динамическая сумма из конфига)
  createPackagePayment({ 
    orderNumber, 
    customerEmail, 
    userId, 
    planId, // используем planId для пакетов тоже
  }: CreatePaymentParams): string {
    
    if (!planId) {
      throw new Error('Package ID is required');
    }

    const packData = this.getPackageData(planId);
    if (!packData) {
      throw new Error(`Package not found: ${planId}`);
    }

    const appUrl = this.appUrl.replace(/\/$/, '');

    const params = new URLSearchParams();
    
    // Обязательные параметры
    params.append('do', 'pay');
    params.append('sum', packData.price.toString());
    params.append('currency', 'rub');
    
    // Информация о товаре
    params.append('products[0][name]', packData.description);
    params.append('products[0][price]', packData.price.toString());
    params.append('products[0][quantity]', '1');
    
    // Информация о покупателе
    params.append('customer_email', customerEmail);
    params.append('order_id', orderNumber);
    
    // Метаданные для webhook
    params.append('customer_extra', JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'package',
      pack_id: planId,
      credits: packData.credits,
      pack_name: packData.name,
    }));
    
    // URL callbacks
    params.append('urlSuccess', `${appUrl}/payment/success?type=package&credits=${packData.credits}`);
    params.append('urlReturn', `${appUrl}/pricing`);
    params.append('urlNotification', `${appUrl}/api/webhooks/payform`);

    console.log(`[Payform] Creating package payment: ${planId} = ${packData.price}₽ / ${packData.credits}⭐`);

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
    if (!signature) return true;
    return true; // TODO: implement proper signature verification
  }

  // Отмена подписки
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    console.log('[Payform] Cancel subscription:', subscriptionId);
    return true;
  }
}

export const payformClient = new PayformClient();
export const payform = payformClient;
