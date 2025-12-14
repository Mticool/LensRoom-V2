// ============================================
// PRICING - Final Approved Version
// ============================================

export interface Subscription {
  id: string;
  name: string;
  price: number;
  credits: number;
  period: 'month';
  description: string;
  features: string[];
  popular?: boolean;
  badge?: string;
  payformId?: string;
}

export interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
  popular?: boolean;
  savings?: string;
  payformId?: string;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export const SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'star',
    name: 'Star',
    price: 690,
    credits: 250,
    period: 'month',
    description: 'Для начинающих креаторов',
    features: [
      '250 ⭐ каждый месяц',
      'Все модели доступны',
      '~35 фото Seedream',
      '~16 видео Sora 2 (5s)',
      'История генераций 30 дней',
      'Без watermark',
    ],
    payformId: process.env.PAYFORM_SUBSCRIPTION_STAR,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1490,
    credits: 800,
    period: 'month',
    description: 'Для активных пользователей',
    popular: true,
    badge: 'Популярно',
    features: [
      '800 ⭐ каждый месяц',
      'Всё из Star +',
      '~114 фото Seedream',
      '~53 видео Sora 2 (5s)',
      'Приоритетная генерация',
      'История 90 дней',
      'Priority support',
    ],
    payformId: process.env.PAYFORM_SUBSCRIPTION_PRO || '2650381',
  },
  {
    id: 'business',
    name: 'Business',
    price: 3490,
    credits: 2500,
    period: 'month',
    description: 'Для команд и бизнеса',
    badge: 'Максимум',
    features: [
      '2500 ⭐ каждый месяц',
      'Всё из Pro +',
      '~357 фото Seedream',
      '~166 видео Sora 2 (5s)',
      'API доступ',
      'Batch processing',
      'Unlimited история',
      'Dedicated support',
      'Custom integrations',
    ],
    payformId: process.env.PAYFORM_SUBSCRIPTION_BUSINESS || '2650383',
  },
];

// ============================================
// ONE-TIME CREDIT PACKS
// ============================================

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'mini',
    name: 'Mini',
    price: 299,
    credits: 100,
    description: 'Попробовать платформу',
    payformId: process.env.PAYFORM_PACK_MINI,
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 990,
    credits: 400,
    description: 'Для разовых задач',
    popular: true,
    savings: 'Экономия 20%',
    payformId: process.env.PAYFORM_PACK_PLUS,
  },
  {
    id: 'max',
    name: 'Max',
    price: 2990,
    credits: 1200,
    description: 'Максимальная выгода',
    savings: 'Экономия 17%',
    payformId: process.env.PAYFORM_PACK_MAX,
  },
];

// ============================================
// BONUSES
// ============================================

export const REGISTRATION_BONUS = 50; // ⭐
export const REFERRAL_BONUS = 100; // ⭐ (both users)

// ============================================
// FREE TIER (for future)
// ============================================

export const FREE_TIER = {
  id: 'free',
  name: 'Free',
  price: 0,
  credits: 0,
  monthlyBonus: 5, // ⭐ every month
  registrationBonus: REGISTRATION_BONUS,
  features: [
    '50 ⭐ при регистрации',
    '+5 ⭐ каждый месяц',
    'Watermark на генерациях',
    'Макс 3 генерации в день',
    'История 7 дней',
  ],
};

// ============================================
// TRIAL OFFERS (for future)
// ============================================

export const TRIAL_OFFERS = [
  {
    id: 'star-trial',
    name: 'Star Trial',
    price: 99,
    credits: 50,
    duration: 7, // days
    description: '7 дней Star за 99₽',
  },
  {
    id: 'pro-trial',
    name: 'Pro Trial',
    price: 199,
    credits: 100,
    duration: 7,
    description: '7 дней Pro за 199₽',
  },
];

// ============================================
// HELPERS
// ============================================

export function getPricePerStar(price: number, credits: number): number {
  return Number((price / credits).toFixed(2));
}

export function getMargin(price: number, credits: number): number {
  const cost = credits * 0.45; // 1⭐ = 0.45₽ себестоимость
  return Number((((price - cost) / price) * 100).toFixed(1));
}

export function getSavings(regularPrice: number, discountPrice: number): number {
  return Math.round(((regularPrice - discountPrice) / regularPrice) * 100);
}
