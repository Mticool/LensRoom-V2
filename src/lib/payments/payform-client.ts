import crypto from 'crypto';

interface CreatePackagePaymentParams {
  orderId: string;
  amount: number;
  email: string;
  userId: string;
  credits: number;
}

interface CreateSubscriptionPaymentParams {
  orderId: string;
  email: string;
  userId: string;
  planId: 'pro' | 'business';
}

export class PayformClient {
  private secretKey: string;
  private merchantId: string;
  private baseUrl: string;

  // ID подписок из Payform
  private subscriptionIds: Record<string, string> = {
    pro: process.env.PAYFORM_SUBSCRIPTION_PRO || '',
    business: process.env.PAYFORM_SUBSCRIPTION_BUSINESS || '',
  };

  constructor() {
    this.secretKey = process.env.PAYFORM_SECRET_KEY || '';
    this.merchantId = process.env.PAYFORM_MERCHANT_ID || '';
    this.baseUrl = 'https://payform.ru';

    if (!this.secretKey || !this.merchantId) {
      console.warn('[Payform] Missing PAYFORM_SECRET_KEY or PAYFORM_MERCHANT_ID');
    }
  }

  // Генерация подписи для Payform
  private generateSignature(params: Record<string, string | number>): string {
    // Сортируем параметры по ключу
    const sortedKeys = Object.keys(params).sort();
    const values = sortedKeys.map(key => params[key]).join('|');
    const signString = `${values}|${this.secretKey}`;
    
    return crypto
      .createHash('sha256')
      .update(signString)
      .digest('hex');
  }

  // Создание платежа для разового пакета кредитов
  createPackagePaymentUrl({ orderId, amount, email, userId, credits }: CreatePackagePaymentParams): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const params: Record<string, string | number> = {
      merchant_id: this.merchantId,
      order_id: orderId,
      amount: amount,
      currency: 'RUB',
      description: `${credits} кредитов LensRoom`,
      customer_email: email,
      customer_extra: userId, // Сохраняем user_id
      success_url: `${appUrl}/payment/success?type=package&credits=${credits}`,
      fail_url: `${appUrl}/pricing?error=payment_failed`,
      notification_url: `${appUrl}/api/webhooks/payform`,
    };

    const signature = this.generateSignature(params);
    params.sign = signature;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });

    return `${this.baseUrl}/pay?${queryParams.toString()}`;
  }

  // Создание подписки (использует предустановленные ID из Payform)
  createSubscriptionPaymentUrl({ orderId, email, userId, planId }: CreateSubscriptionPaymentParams): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const subscriptionId = this.subscriptionIds[planId];

    if (!subscriptionId) {
      throw new Error(`Subscription ID not found for plan: ${planId}`);
    }

    const params: Record<string, string | number> = {
      merchant_id: this.merchantId,
      subscription_id: subscriptionId,
      order_id: orderId,
      customer_email: email,
      customer_extra: userId,
      success_url: `${appUrl}/payment/success?type=subscription&plan=${planId}`,
      fail_url: `${appUrl}/pricing?error=payment_failed`,
      notification_url: `${appUrl}/api/webhooks/payform`,
    };

    const signature = this.generateSignature(params);
    params.sign = signature;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });

    return `${this.baseUrl}/subscribe?${queryParams.toString()}`;
  }

  // Проверка подписи webhook
  verifyWebhookSignature(payload: Record<string, string | number>, receivedSignature: string): boolean {
    // Удаляем sign из payload перед проверкой
    const payloadCopy = { ...payload };
    delete payloadCopy.sign;
    
    const calculatedSignature = this.generateSignature(payloadCopy);
    return calculatedSignature === receivedSignature;
  }

  // Отмена подписки
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const params: Record<string, string> = {
        merchant_id: this.merchantId,
        subscription_id: subscriptionId,
        action: 'cancel',
      };

      const signature = this.generateSignature(params);

      const response = await fetch(`${this.baseUrl}/api/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          sign: signature,
        }),
      });

      if (!response.ok) {
        console.error('[Payform] Failed to cancel subscription:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Payform] Error canceling subscription:', error);
      return false;
    }
  }
}

// Singleton экземпляр
export const payformClient = new PayformClient();

