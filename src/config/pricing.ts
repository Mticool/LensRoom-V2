/**
 * Единый источник правды для тарифов LensRoom
 * Используется на главной, /pricing, и везде где показываются тарифы
 */

export interface PricingTier {
  id: string;
  name: string;
  price: number; // в рублях
  stars: number; // звёздочек в месяц
  period: 'month';
  popular?: boolean;
  features: string[];
  limits: {
    credits: number; // кредитов в месяц
    starsPerMonth: number; // звёзд в месяц
    models: string; // какие модели доступны
    support: string;
  };
}

export interface StarPack {
  id: string;
  stars: number;
  price: number; // в рублях
  bonus?: number; // бонусных звёзд
  popular?: boolean;
}

// === ПОДПИСКИ ===
export const SUBSCRIPTION_TIERS: PricingTier[] = [
  {
    id: 'star',
    name: 'Star',
    price: 490,
    stars: 500,
    period: 'month',
    features: [
      '500⭐ в месяц',
      'Доступ к базовым моделям',
      'Nano Banana, Imagen 4 Fast',
      'Стандартный приоритет',
      'Email поддержка',
    ],
    limits: {
      credits: 500,
      starsPerMonth: 500,
      models: 'Базовые (Nano Banana, Imagen 4 Fast)',
      support: 'Email (24 часа)',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    stars: 1200,
    period: 'month',
    popular: true,
    features: [
      '1200⭐ в месяц (+20% бонус)',
      'Все фото модели',
      'FLUX.2 Pro, Imagen 4 Ultra',
      'Базовые видео модели',
      'Veo 3.1 Fast, Sora 2',
      'Приоритетная генерация',
      'Telegram поддержка',
    ],
    limits: {
      credits: 1200,
      starsPerMonth: 1200,
      models: 'Все фото + базовые видео',
      support: 'Telegram (2 часа)',
    },
  },
  {
    id: 'business',
    name: 'Business',
    price: 2990,
    stars: 3500,
    period: 'month',
    features: [
      '3500⭐ в месяц (+40% бонус)',
      'Все модели без ограничений',
      'Veo 3.1, Kling 2.6, Sora 2 Pro',
      'Максимальный приоритет',
      'API доступ',
      'Персональный менеджер',
      'VIP поддержка 24/7',
    ],
    limits: {
      credits: 3500,
      starsPerMonth: 3500,
      models: 'Все модели (Premium)',
      support: 'VIP 24/7 + менеджер',
    },
  },
];

// === ПАКЕТЫ ЗВЁЗД (разовая покупка) ===
export const STAR_PACKS: StarPack[] = [
  {
    id: 'mini',
    stars: 1000,
    price: 990,
    bonus: 50,
  },
  {
    id: 'plus',
    stars: 1600,
    price: 1490,
    bonus: 200,
  },
  {
    id: 'max',
    stars: 2200,
    price: 1990,
    bonus: 350,
    popular: true,
  },
  {
    id: 'ultra',
    stars: 3500,
    price: 2990,
    bonus: 700,
  },
];

// === УТИЛИТЫ ===

/**
 * Получить тариф по ID
 */
export function getTierById(id: string): PricingTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === id);
}

/**
 * Получить пакет звёзд по ID
 */
export function getStarPackById(id: string): StarPack | undefined {
  return STAR_PACKS.find((pack) => pack.id === id);
}

/**
 * Получить популярный тариф
 */
export function getPopularTier(): PricingTier {
  return SUBSCRIPTION_TIERS.find((tier) => tier.popular) || SUBSCRIPTION_TIERS[1];
}

/**
 * Получить популярный пакет звёзд
 */
export function getPopularStarPack(): StarPack {
  return STAR_PACKS.find((pack) => pack.popular) || STAR_PACKS[2];
}

/**
 * Форматировать цену
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(price);
}

/**
 * Форматировать звёзды
 */
export function formatStars(stars: number): string {
  return `${stars}⭐`;
}

/**
 * Рассчитать экономию для пакета
 */
export function calculateSavings(pack: StarPack): number {
  const basePrice = pack.stars; // 1⭐ = 1₽ (условно)
  const actualPrice = pack.price;
  return basePrice - actualPrice + (pack.bonus || 0);
}

