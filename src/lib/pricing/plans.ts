// Подписки с автопродлением
export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    period: 'month' as const,
    credits: 100, // одноразово при регистрации
    features: [
      '100 кредитов на старт',
      'Доступ ко всем моделям',
      'История 7 дней',
      'Базовое качество',
      'Watermark на результатах',
    ],
    recurring: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    period: 'month' as const,
    credits: 500, // каждый месяц
    features: [
      '500 кредитов каждый месяц',
      'Без watermark',
      'История 30 дней',
      'Максимальное качество',
      'Priority генерация',
      'Premium промпты',
    ],
    recurring: true,
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 2490,
    period: 'month' as const,
    credits: 1500, // каждый месяц
    features: [
      '1500 кредитов каждый месяц',
      'API доступ',
      'Batch processing',
      'Custom модели',
      'Priority support 24/7',
      'Team workspace',
    ],
    recurring: true,
  },
];

// Разовые пакеты кредитов
export const CREDIT_PACKAGES = [
  {
    id: 'pack-200',
    credits: 200,
    price: 299,
    popular: false,
  },
  {
    id: 'pack-500',
    credits: 500,
    price: 599,
    popular: false,
    discount: 20, // 20% выгоднее
  },
  {
    id: 'pack-1200',
    credits: 1200,
    price: 1190,
    popular: true,
    discount: 33, // 33% выгоднее
  },
  {
    id: 'pack-3000',
    credits: 3000,
    price: 2490,
    popular: false,
    discount: 44, // 44% выгоднее
  },
];

export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[number];
export type CreditPackage = typeof CREDIT_PACKAGES[number];

// Стоимость за кредит для подсчётов
export function getCreditPrice(packageId: string): number {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return 0;
  return pkg.price / pkg.credits;
}

// Проверка лучшего предложения
export function getBestDeal(): CreditPackage {
  return CREDIT_PACKAGES.reduce((best, current) => {
    const bestPrice = best.price / best.credits;
    const currentPrice = current.price / current.credits;
    return currentPrice < bestPrice ? current : best;
  });
}

// Форматирование цены
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

