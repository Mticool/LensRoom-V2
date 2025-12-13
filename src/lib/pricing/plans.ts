export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
  recurring?: boolean;
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  discount?: number;
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Стартовый',
    price: 0,
    credits: 100,
    features: [
      '100 кредитов единоразово',
      'Базовые модели',
      'Стандартная скорость',
      'Базовая поддержка',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    credits: 500,
    popular: true,
    recurring: true,
    features: [
      '500 кредитов/месяц',
      'Все AI модели',
      'Приоритетная генерация',
      'HD качество',
      'Приоритетная поддержка',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 2990,
    credits: 2000,
    recurring: true,
    features: [
      '2000 кредитов/месяц',
      'Все AI модели',
      'Максимальная скорость',
      '4K качество',
      'API доступ',
      'Персональный менеджер',
    ],
  },
];

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_200',
    credits: 200,
    price: 299,
  },
  {
    id: 'pack_500',
    credits: 500,
    price: 599,
    discount: 20,
  },
  {
    id: 'pack_1200',
    credits: 1200,
    price: 1190,
    discount: 34,
    popular: true,
  },
  {
    id: 'pack_3000',
    credits: 3000,
    price: 2490,
    discount: 44,
  },
];

export function getCreditPrice(packageId: string): number {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  return pkg ? pkg.price / pkg.credits : 0;
}

export function getBestDeal(): CreditPackage {
  return CREDIT_PACKAGES.reduce((best, current) => {
    const bestPrice = best.price / best.credits;
    const currentPrice = current.price / current.credits;
    return currentPrice < bestPrice ? current : best;
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

