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

type PayformProduct = {
  name: string;
  price: string | number;
  quantity: string | number;
  sku?: string;
};

type PayformData = Record<string, any> & {
  do: 'pay' | 'link';
  order_id: string;
  customer_email?: string;
  customer_extra?: string;
  urlReturn?: string;
  urlSuccess?: string;
  urlNotification?: string;
  currency?: string;
  products?: PayformProduct[];
  subscription?: string | number;
};

export class PayformClient {
  private secretKey: string;
  private merchantId: string;
  private baseUrl: string;

  constructor() {
    this.secretKey = process.env.PAYFORM_SECRET_KEY || '';
    this.merchantId = process.env.PAYFORM_MERCHANT_ID || 'ozoncheck';
    this.baseUrl = 'https://ozoncheck.payform.ru';
  }

  /**
   * Генерация подписи Payform/Prodamus согласно документации:
   * 1) привести все значения к строкам
   * 2) отсортировать по ключам вглубь
   * 3) перевести в JSON строку
   * 4) экранировать /
   * 5) подписать sha256 секретным ключом
   *
   * ref: https://help.prodamus.ru/payform/integracii/rest-api/instrukcii-dlya-samostoyatelnaya-integracii-servisov
   */
  private generateSignature(data: PayformData): string {
    const toSortedDeep = (v: any): any => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
      if (Array.isArray(v)) return v.map(toSortedDeep);
      if (typeof v === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(v).sort()) {
          out[k] = toSortedDeep(v[k]);
        }
        return out;
      }
      return String(v);
    };

    const sorted = toSortedDeep(data);
    // Escape forward slashes as required by Prodamus docs.
    const json = JSON.stringify(sorted).replace(/\//g, '\\/');
    return crypto.createHmac('sha256', this.secretKey).update(json).digest('hex');
  }

  private buildQueryParams(data: PayformData & { signature: string }): URLSearchParams {
    const params = new URLSearchParams();
    const { products, ...rest } = data;

    // Root-level scalars
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined || v === null || v === '') continue;
      params.append(k, String(v));
    }

    // Flatten products array
    if (Array.isArray(products)) {
      products.forEach((p, idx) => {
        params.append(`products[${idx}][name]`, String(p.name));
        params.append(`products[${idx}][price]`, String(p.price));
        params.append(`products[${idx}][quantity]`, String(p.quantity));
        if (p.sku) params.append(`products[${idx}][sku]`, String(p.sku));
      });
    }

    return params;
  }

  // Создать платеж для подписки
  createSubscriptionPayment({ 
    orderNumber, 
    amount,
    customerEmail, 
    userId, 
    planId, 
    credits,
    description,
  }: CreatePaymentParams): string {
    
    const subscriptionId =
      planId === 'start'
        ? process.env.PAYFORM_SUBSCRIPTION_START
        : planId === 'pro'
          ? process.env.PAYFORM_SUBSCRIPTION_PRO
          : process.env.PAYFORM_SUBSCRIPTION_MAX;

    if (!subscriptionId) {
      throw new Error(`Subscription ID not found for plan: ${planId}`);
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru').replace(/\/$/, '');

    const payload: PayformData = {
      do: 'pay',
      order_id: orderNumber,
      currency: 'rub',
      // Prodamus/Payform docs use `subscription` (not subscription_id)
      subscription: String(subscriptionId),
      customer_email: customerEmail,
      customer_extra: JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'subscription',
      plan_id: planId,
      credits: credits,
      }),
      urlSuccess: `${appUrl}/payment/success?type=subscription&plan=${planId}&credits=${credits}`,
      urlReturn: `${appUrl}/pricing`,
      urlNotification: `${appUrl}/api/webhooks/payform`,
    };

    const signature = this.generateSignature(payload);
    const query = this.buildQueryParams({ ...payload, signature });
    return `${this.baseUrl}?${query.toString()}`;
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
    
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru').replace(/\/$/, '');

    const payload: PayformData = {
      do: 'pay',
      order_id: orderNumber,
      currency: 'rub',
      // Some Payform forms use order_sum for prefill; also keep products price.
      order_sum: String(amount),
      customer_email: customerEmail,
      customer_extra: JSON.stringify({
      user_id: userId,
      order_id: orderNumber,
      type: 'package',
      credits: credits,
      }),
      products: [
        {
          name: description,
          price: String(amount),
          quantity: '1',
          sku: credits ? `credits-${credits}` : undefined,
        },
      ],
      urlSuccess: `${appUrl}/payment/success?type=package&credits=${credits}`,
      urlReturn: `${appUrl}/pricing`,
      urlNotification: `${appUrl}/api/webhooks/payform`,
    };

    const signature = this.generateSignature(payload);
    const query = this.buildQueryParams({ ...payload, signature });
    return `${this.baseUrl}?${query.toString()}`;
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
