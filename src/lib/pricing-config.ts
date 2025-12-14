// Pricing config for homepage display

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

export const REGISTRATION_BONUS = 100;

export const SUBSCRIPTIONS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Стартовый',
    price: 0,
    credits: 100,
    description: 'Для знакомства с платформой',
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
    description: 'Для регулярного использования',
    popular: true,
    badge: 'Популярный',
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
    description: 'Для профессионалов и команд',
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

export const CREDIT_PACKAGES = [
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
