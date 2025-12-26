import crypto from 'crypto';

interface CreatePaymentParams {
  orderNumber: string;
  amount: number;
  description: string;
  userId: string;
  credits: number;
  type: 'subscription' | 'package';
  planId?: string;
  email?: string;
}

interface RobokassaConfig {
  merchantLogin: string;
  password1: string;
  password2: string;
  testMode: boolean;
}

/**
 * Robokassa Payment Client
 * Документация: https://docs.robokassa.ru/
 */
export class RobokassaClient {
  private config: RobokassaConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      merchantLogin: process.env.ROBOKASSA_MERCHANT_LOGIN || '',
      password1: process.env.ROBOKASSA_PASSWORD1 || '',
      password2: process.env.ROBOKASSA_PASSWORD2 || '',
      testMode: process.env.ROBOKASSA_TEST_MODE === 'true',
    };
    
    // Боевой URL Robokassa
    this.baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
  }

  /**
   * Проверка конфигурации
   */
  isConfigured(): boolean {
    return !!(
      this.config.merchantLogin &&
      this.config.password1 &&
      this.config.password2
    );
  }

  /**
   * Генерация подписи для создания платежа (SignatureValue)
   * Формула: MD5(MerchantLogin:OutSum:InvId:Password1)
   * Или с Receipt: MD5(MerchantLogin:OutSum:InvId:Receipt:Password1)
   */
  private generatePaymentSignature(
    outSum: number,
    invId: number,
    receipt?: string
  ): string {
    let signString = `${this.config.merchantLogin}:${outSum}:${invId}`;
    
    if (receipt) {
      signString += `:${receipt}`;
    }
    
    signString += `:${this.config.password1}`;
    
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  /**
   * Генерация подписи для проверки Result URL (webhook)
   * Формула: MD5(OutSum:InvId:Password2)
   */
  generateResultSignature(outSum: string, invId: string): string {
    const signString = `${outSum}:${invId}:${this.config.password2}`;
    return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  }

  /**
   * Проверка подписи webhook от Robokassa
   */
  verifyWebhookSignature(
    outSum: string,
    invId: string,
    signatureValue: string
  ): boolean {
    const expectedSignature = this.generateResultSignature(outSum, invId);
    return expectedSignature.toUpperCase() === signatureValue.toUpperCase();
  }

  /**
   * Создание URL для оплаты
   */
  createPaymentUrl(params: CreatePaymentParams): string {
    if (!this.isConfigured()) {
      throw new Error('Robokassa is not configured');
    }

    // InvId - уникальный номер заказа (число)
    // Используем timestamp + random для уникальности
    const invId = parseInt(Date.now().toString().slice(-9) + Math.floor(Math.random() * 1000));
    
    // Сумма в рублях (с копейками)
    const outSum = params.amount.toFixed(2);
    
    // Описание заказа
    const description = encodeURIComponent(params.description);
    
    // Дополнительные данные (Shp_ параметры)
    // Они вернутся в webhook
    const shpCredits = params.credits;
    const shpUserId = params.userId;
    const shpType = params.type;
    const shpPlanId = params.planId || '';
    const shpOrderNumber = params.orderNumber;
    
    // Чек для 54-ФЗ (обязательно для России)
    const receipt = this.createReceipt(params);
    const receiptEncoded = encodeURIComponent(JSON.stringify(receipt));
    
    // Подпись с чеком
    // MD5(MerchantLogin:OutSum:InvId:Receipt:Password1:Shp_credits=X:Shp_ordernumber=X:Shp_planid=X:Shp_type=X:Shp_userid=X)
    // Важно: Shp параметры в подписи должны быть в алфавитном порядке!
    const shpParams = [
      `Shp_credits=${shpCredits}`,
      `Shp_ordernumber=${shpOrderNumber}`,
      `Shp_planid=${shpPlanId}`,
      `Shp_type=${shpType}`,
      `Shp_userid=${shpUserId}`,
    ].sort().join(':');
    
    const signString = `${this.config.merchantLogin}:${outSum}:${invId}:${receiptEncoded}:${this.config.password1}:${shpParams}`;
    const signature = crypto.createHash('md5').update(signString).digest('hex');
    
    // Формируем URL
    const urlParams = new URLSearchParams({
      MerchantLogin: this.config.merchantLogin,
      OutSum: outSum,
      InvId: invId.toString(),
      Description: params.description,
      SignatureValue: signature,
      Receipt: receiptEncoded,
      Shp_credits: shpCredits.toString(),
      Shp_ordernumber: shpOrderNumber,
      Shp_planid: shpPlanId,
      Shp_type: shpType,
      Shp_userid: shpUserId,
    });
    
    // Добавляем email если есть
    if (params.email) {
      urlParams.append('Email', params.email);
    }
    
    // Тестовый режим
    if (this.config.testMode) {
      urlParams.append('IsTest', '1');
    }
    
    return `${this.baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Создание чека для 54-ФЗ
   */
  private createReceipt(params: CreatePaymentParams): object {
    return {
      sno: 'usn_income', // Система налогообложения (УСН доходы)
      items: [
        {
          name: params.description,
          quantity: 1,
          sum: params.amount,
          payment_method: 'full_payment', // Полная оплата
          payment_object: 'service', // Услуга
          tax: 'none', // Без НДС
        },
      ],
    };
  }

  /**
   * Создание платежа для покупки пакета звёзд
   */
  createPackagePayment(params: {
    orderNumber: string;
    amount: number;
    credits: number;
    userId: string;
    email?: string;
  }): string {
    return this.createPaymentUrl({
      ...params,
      type: 'package',
      description: `Пополнение баланса: ${params.credits} ⭐`,
    });
  }

  /**
   * Создание платежа для подписки (рекуррентный платёж)
   * Использует готовые ссылки из раздела "Подписки" Robokassa
   */
  createSubscriptionPayment(params: {
    orderNumber: string;
    amount: number;
    credits: number;
    userId: string;
    planId: string;
    email?: string;
  }): string {
    // Получаем SubscriptionId из env
    // New plans: creator, creator_plus, business
    const subscriptionIds: Record<string, string> = {
      // New plans
      creator: process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || '',
      creator_plus: process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || '',
      business: process.env.ROBOKASSA_SUBSCRIPTION_BUSINESS || '',
      // Legacy mappings
      star: process.env.ROBOKASSA_SUBSCRIPTION_CREATOR || process.env.ROBOKASSA_SUBSCRIPTION_STAR || '',
      pro: process.env.ROBOKASSA_SUBSCRIPTION_CREATOR_PLUS || process.env.ROBOKASSA_SUBSCRIPTION_PRO || '',
    };
    
    const subscriptionId = subscriptionIds[params.planId];
    
    if (!subscriptionId) {
      // Если нет SubscriptionId, используем обычный платёж
      console.warn(`[Robokassa] No subscription ID for plan: ${params.planId}, using one-time payment`);
      const planNames: Record<string, string> = {
        creator: 'Creator',
        creator_plus: 'Creator+', 
        business: 'Business',
        star: 'Creator',
        pro: 'Creator+',
      };
      return this.createPaymentUrl({
        ...params,
        type: 'subscription',
        description: `Подписка ${planNames[params.planId] || params.planId}: ${params.credits} ⭐/мес`,
      });
    }
    
    // Используем готовую ссылку Robokassa для рекуррентных подписок
    // Формат: https://auth.robokassa.ru/RecurringSubscriptionPage/Subscription/Subscribe?SubscriptionId=XXX
    const baseUrl = 'https://auth.robokassa.ru/RecurringSubscriptionPage/Subscription/Subscribe';
    
    const urlParams = new URLSearchParams({
      SubscriptionId: subscriptionId,
    });
    
    // Добавляем email если есть
    if (params.email) {
      urlParams.append('Email', params.email);
    }
    
    console.log('[Robokassa] Creating subscription URL:', {
      planId: params.planId,
      subscriptionId,
      userId: params.userId,
    });
    
    return `${baseUrl}?${urlParams.toString()}`;
  }

  /**
   * Проверка наличия подписок
   */
  hasSubscriptions(): boolean {
    return !!(
      process.env.ROBOKASSA_SUBSCRIPTION_STAR ||
      process.env.ROBOKASSA_SUBSCRIPTION_PRO ||
      process.env.ROBOKASSA_SUBSCRIPTION_BUSINESS
    );
  }
}

// Singleton instance
let robokassaClient: RobokassaClient | null = null;

export function getRobokassaClient(): RobokassaClient | null {
  if (!robokassaClient) {
    robokassaClient = new RobokassaClient();
  }
  
  if (!robokassaClient.isConfigured()) {
    return null;
  }
  
  return robokassaClient;
}

export { robokassaClient };

