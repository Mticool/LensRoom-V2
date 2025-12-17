import crypto from 'crypto';
import { env } from "@/lib/env";

interface CreatePaymentParams {
  orderNumber: string;
  amount: number;
  customerEmail: string;
  userId: string;
  type?: 'subscription' | 'package';
  planId?: string;
  credits?: number;
}

interface CreatePackageParams {
  orderNumber: string;
  amount: number;
  customerEmail: string;
  userId: string;
  credits: number;
}

interface CreateSubscriptionParams {
  orderNumber: string;
  amount: number;
  customerEmail: string;
  userId: string;
  planId: string;
  credits: number;
}

export interface ProdamusConfig {
  secretKey: string;
  projectId: string;
  baseUrl: string;
  appUrl: string;
}

export function getProdamusConfig(): ProdamusConfig | null {
  // Only evaluate env when Prodamus is actually used (no import-time warnings).
  const secretKey = env.required("PRODAMUS_SECRET_KEY", "Prodamus API secret");
  const projectId = env.required("PRODAMUS_PROJECT_ID", "Prodamus project ID");
  if (!secretKey || !projectId) return null;

  const appUrl = (env.optional("NEXT_PUBLIC_APP_URL") || "http://localhost:3000").replace(/\/$/, "");
  return {
    secretKey,
    projectId,
    baseUrl: "https://prodamus.ru/pay",
    appUrl,
  };
}

export class ProdamusClient {
  private secretKey: string;
  private projectId: string;
  private baseUrl: string;
  private appUrl: string;

  constructor(config: ProdamusConfig) {
    this.secretKey = config.secretKey;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl;
    this.appUrl = config.appUrl;
  }

  private generateSignature(params: Record<string, string | number>): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys
      .map(key => `${key};${params[key]}`)
      .join(';');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signString)
      .digest('hex');
  }

  createPaymentLink(params: CreatePaymentParams): string {
    if (params.type === 'subscription' && params.planId && params.credits) {
      return this.createSubscriptionPayment({
        orderNumber: params.orderNumber,
        amount: params.amount,
        customerEmail: params.customerEmail,
        userId: params.userId,
        planId: params.planId,
        credits: params.credits,
      });
    }
    
    return this.createPackagePayment({
      orderNumber: params.orderNumber,
      amount: params.amount,
      customerEmail: params.customerEmail,
      userId: params.userId,
      credits: params.credits || 0,
    });
  }

  createPackagePayment({ orderNumber, amount, customerEmail, userId, credits }: CreatePackageParams): string {
    const params: Record<string, string | number> = {
      do: 'link',
      sys: this.projectId,
      order_id: orderNumber,
      customer_email: customerEmail,
      customer_extra: userId,
      'products[0][name]': `${credits} кредитов LensRoom`,
      'products[0][price]': amount,
      'products[0][quantity]': 1,
      'products[0][sku]': `credits-${credits}`,
      urlReturn: `${this.appUrl}/payment/success`,
      urlNotification: `${this.appUrl}/api/webhooks/prodamus`,
      urlSuccess: `${this.appUrl}/payment/success?type=package&credits=${credits}`,
      payment_method: 'card',
    };

    const signature = this.generateSignature(params);
    params.signature = signature;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    
    return `${this.baseUrl}?${queryParams.toString()}`;
  }

  createSubscriptionPayment({ orderNumber, amount, customerEmail, userId, planId, credits }: CreateSubscriptionParams): string {
    const params: Record<string, string | number> = {
      do: 'link',
      sys: this.projectId,
      order_id: orderNumber,
      customer_email: customerEmail,
      customer_extra: userId,
      'products[0][name]': `Подписка ${planId} - ${credits} кредитов/мес`,
      'products[0][price]': amount,
      'products[0][quantity]': 1,
      'products[0][sku]': `subscription-${planId}`,
      is_recurring: 1,
      recurrent_period: 'month',
      recurrent_trial_days: 0,
      urlReturn: `${this.appUrl}/payment/success`,
      urlNotification: `${this.appUrl}/api/webhooks/prodamus`,
      urlSuccess: `${this.appUrl}/payment/success?type=subscription&plan=${planId}`,
      'custom_fields[plan_id]': planId,
      'custom_fields[credits_per_month]': credits,
    };

    const signature = this.generateSignature(params);
    params.signature = signature;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    
    return `${this.baseUrl}?${queryParams.toString()}`;
  }

  verifyWebhookSignature(payload: Record<string, string | number>, receivedSignature: string): boolean {
    const calculatedSignature = this.generateSignature(payload);
    return calculatedSignature === receivedSignature;
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch('https://prodamus.ru/api/v1/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      });

      if (!response.ok) {
        console.error('[Prodamus] Failed to cancel subscription:', await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Prodamus] Error canceling subscription:', error);
      return false;
    }
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<'active' | 'cancelled' | 'expired' | 'unknown'> {
    try {
      const response = await fetch(`https://prodamus.ru/api/v1/subscription/${subscriptionId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.secretKey}` },
      });

      if (!response.ok) return 'unknown';
      const data = await response.json();
      return data.status || 'unknown';
    } catch (error) {
      console.error('[Prodamus] Error getting subscription status:', error);
      return 'unknown';
    }
  }
}

let _client: ProdamusClient | null = null;
export function getProdamusClient(): ProdamusClient | null {
  const cfg = getProdamusConfig();
  if (!cfg) return null;
  if (_client) return _client;
  _client = new ProdamusClient(cfg);
  return _client;
}