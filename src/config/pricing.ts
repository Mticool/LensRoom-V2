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
  subtitle?: string; // Краткое описание для кого подходит
  features: string[];
  benefits?: string[]; // "Что вы выигрываете" - польза для пользователя
  capacity?: string[]; // "Хватит примерно на" - конкретные примеры
  targetAudience?: string; // "Кому подходит" - целевая аудитория
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
  description?: string; // Для чего подходит
  capacity?: string; // Хватит примерно на
}

// === КУРС ДЛЯ UI (оценка) ===
// Используется только для "≈ ₽" в интерфейсе. Реальная оплата — по тарифам/пакетам ниже.
export function packTotalStars(pack: StarPack): number {
  return pack.stars + (pack.bonus || 0);
}

export function packBonusPercent(pack: StarPack): number {
  if (!pack.bonus || pack.stars <= 0) return 0;
  return Math.round((pack.bonus / pack.stars) * 100);
}

// === ПОДПИСКИ ===
export const SUBSCRIPTION_TIERS: PricingTier[] = [
  {
    id: 'creator',
    name: 'Creator',
    price: 990,
    stars: 1200,
    period: 'month',
    subtitle: 'Уверенный старт для ежедневного контента. Быстро делайте качественные изображения для карточек товара, постов, обложек и рекламных креативов — без переплат.',
    features: [
      '✅ Nano Banana включён — быстрый фотореализм для рабочих задач',
      '✅ Базовые фото-модели: FLUX, Seedream, Ideogram, Z-image',
      '✅ Удаление фона и апскейл — по ⭐',
      '✅ Видео-модели — по ⭐, когда нужно оживить контент',
    ],
    benefits: [
      '80% фото-задач закрываете "на автомате"',
      '⭐ тратите только на премиум: видео, 4K, апскейл',
      'Быстро тестируете идеи и масштабируете лучшие',
    ],
    capacity: [
      'до 171 Nano Banana (7⭐)',
      'или до 109 Seedream (11⭐)',
      'или до 24 Sora 2 (50⭐)',
    ],
    targetAudience: 'E-Com, соцсети, тесты креативов, регулярные публикации',
    limits: {
      credits: 1200,
      starsPerMonth: 1200,
      models: 'Nano Banana + базовые фото',
      support: 'Email',
    },
  },
  {
    id: 'creator_plus',
    name: 'Creator+',
    price: 1990,
    stars: 2550,
    period: 'month',
    popular: true,
    subtitle: 'Тариф "делаю контент системно". Много вариантов, стабильное качество и возможность делать контент "пачками".',
    features: [
      '✅ Всё из Creator',
      '🎁 Nano Banana Pro 1–2K включён — безлимит (fair use)',
      '💎 Nano Banana Pro 4K — премиум-качество за ⭐',
      '⭐ 2550⭐ на видео, 4K, апскейл и тяжёлые генерации',
    ],
    benefits: [
      'Pro 1–2K — ваш новый стандарт качества',
      '⭐ остаются на усиление: видео, 4K, максимум результата',
      'Контент "пачками" без ощущения экономии',
    ],
    capacity: [
      'Pro 1–2K: безлимит (0⭐)',
      'до 364 Nano Banana (7⭐)',
      'или до 51 Sora 2 (50⭐)',
      'или до 25 Veo Fast (100⭐)',
    ],
    targetAudience: 'Контент ежедневно, запуск рекламы, много вариантов под проект',
    limits: {
      credits: 2550,
      starsPerMonth: 2550,
      models: 'Все фото + видео + Pro 1–2K',
      support: 'Telegram (2ч)',
    },
  },
  {
    id: 'business',
    name: 'Business',
    price: 2990,
    stars: 3500,
    period: 'month',
    subtitle: 'Максимум свободы для потока и масштаба. Много товаров, активная реклама, серии креативов — без остановок.',
    features: [
      '✅ Всё из Creator+',
      '🎁 Nano Banana Pro 1–2K включён — безлимит (fair use)',
      '💎 Nano Banana Pro 4K — премиум-качество за ⭐',
      '⭐ 3500⭐ — большой запас для видео и премиум-режимов',
    ],
    benefits: [
      'Работаете "в продакшне" без оглядки на лимиты',
      'Быстро генерируете, тестируете, выбираете лучшее',
      'Масштабируете без ощущения, что каждый шаг надо экономить',
    ],
    capacity: [
      'Pro 1–2K: безлимит (0⭐)',
      'до 500 Nano Banana (7⭐)',
      'или до 70 Sora 2 (50⭐)',
      'или до 35 Veo Fast (100⭐)',
    ],
    targetAudience: 'Команды, агентства, магазины с большим ассортиментом, продакшн-режим',
    limits: {
      credits: 3500,
      starsPerMonth: 3500,
      models: 'Все модели + Pro 1–2K',
      support: 'VIP 24/7 + менеджер',
    },
  },
];

// === ПАКЕТЫ ЗВЁЗД (разовая покупка) ===
// Обновлено: 2025-01-03 по юнит-экономике
export const STAR_PACKS: StarPack[] = [
  {
    id: 'mini',
    stars: 1400,
    price: 990,
    bonus: 0,
    description: '"Догнать дедлайн": закончились ⭐ — докупили и продолжили работать.',
    capacity: 'Хватит на ~200 Nano Banana или ~14 Veo Fast',
  },
  {
    id: 'plus',
    stars: 2200,
    price: 1490,
    bonus: 0,
    description: 'Комфортный запас на неделю/две активной работы.',
    capacity: 'Хватит на ~314 Nano Banana или ~22 Veo Fast',
  },
  {
    id: 'max',
    stars: 3000,
    price: 1990,
    bonus: 0,
    popular: true,
    description: 'Пакет для тестов рекламы и масштабирования.',
    capacity: 'Хватит на ~428 Nano Banana или ~30 Veo Fast',
  },
  {
    id: 'ultra',
    stars: 7600,
    price: 4990,
    bonus: 0,
    description: 'Максимальная выгода: самая низкая цена за ⭐. Если генерите много — это выгоднее.',
    capacity: 'Хватит на ~1085 Nano Banana или ~76 Veo Fast',
  },
];

/**
 * Сколько ⭐ в среднем даёт 1 ₽ (для "≈ ₽" в UI).
 * Берём лучший доступный пакет, чтобы оценка не была завышена.
 */
export const starsPerRuble: number = (() => {
  const best = STAR_PACKS.reduce((acc, p) => {
    const rate = packTotalStars(p) / p.price; // ⭐ per ₽
    return rate > acc ? rate : acc;
  }, 0);
  return best || 0.3;
})();

export function approxRubFromStars(stars: number): number {
  if (!starsPerRuble) return 0;
  return Math.max(0, Math.ceil(stars / starsPerRuble));
}

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
  // "Выгода" в ⭐ относительно базового объёма (без бонуса)
  return packTotalStars(pack) - pack.stars;
}

// === ЭКВИВАЛЕНТЫ ГЕНЕРАЦИЙ ===
// Закреплённые цены для расчёта эквивалентов
export const REFERENCE_PRICES = {
  'nano-banana': 7,      // Nano Banana T2I
  'veo-fast': 99,        // Veo 3.1 Fast 8s
  'veo-quality': 490,    // Veo 3.1 Quality 8s
  'kling-turbo-5s': 105, // Kling 2.5 Turbo 5s
  'kling-turbo-10s': 210,// Kling 2.5 Turbo 10s
  'kling-audio-5s': 135, // Kling 2.6 Audio 5s
  'kling-audio-10s': 270,// Kling 2.6 Audio 10s
  'kling-pro-5s': 200,   // Kling 2.1 Pro 5s
  'kling-pro-10s': 400,  // Kling 2.1 Pro 10s
} as const;

/**
 * Рассчитать эквиваленты генераций для пакета/подписки
 */
export function calculateEquivalents(stars: number): {
  banana: number;
  veoFast: number;
  veoQuality: number;
  klingTurbo5s: number;
  klingTurbo10s: number;
  klingAudio5s: number;
  klingPro5s: number;
} {
  return {
    banana: Math.floor(stars / REFERENCE_PRICES['nano-banana']),
    veoFast: Math.floor(stars / REFERENCE_PRICES['veo-fast']),
    veoQuality: Math.floor(stars / REFERENCE_PRICES['veo-quality']),
    klingTurbo5s: Math.floor(stars / REFERENCE_PRICES['kling-turbo-5s']),
    klingTurbo10s: Math.floor(stars / REFERENCE_PRICES['kling-turbo-10s']),
    klingAudio5s: Math.floor(stars / REFERENCE_PRICES['kling-audio-5s']),
    klingPro5s: Math.floor(stars / REFERENCE_PRICES['kling-pro-5s']),
  };
}

/**
 * Форматировать эквиваленты для отображения
 */
export function formatEquivalents(stars: number): string[] {
  const eq = calculateEquivalents(stars);
  return [
    `~${eq.banana} Nano Banana`,
    `~${eq.veoFast} Veo Fast`,
    `~${eq.klingTurbo5s} Kling 5s`,
  ];
}

// === ENTITLEMENTS: Nano Banana Pro ===

export interface PlanEntitlement {
  modelId: string;
  variantKey: string;
  includedMonthlyLimit: number; // 0 = not included, -1 = truly unlimited
  priceWhenNotIncluded: number; // stars to charge when quota exhausted or not included
}

export interface PlanEntitlements {
  planId: string;
  entitlements: PlanEntitlement[];
}

// Nano Banana Pro entitlements by plan
// Internal limits - NOT displayed on pricing page
export const PLAN_ENTITLEMENTS: PlanEntitlements[] = [
  {
    planId: 'creator',
    entitlements: [
      // Creator: Nano Banana Pro NOT included
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 0, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
  {
    planId: 'creator_plus',
    entitlements: [
      // Creator+: Pro 1-2K included (200/month fair use), 4K always paid
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 200, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
  {
    planId: 'business',
    entitlements: [
      // Business: Pro 1-2K included (300/month fair use), 4K always paid
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 300, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
];

/**
 * Get entitlement for a specific model variant and plan
 */
export function getEntitlement(
  planId: string | null,
  modelId: string,
  variantKey: string
): PlanEntitlement | null {
  if (!planId) return null;
  const planEntitlements = PLAN_ENTITLEMENTS.find(p => p.planId === planId);
  if (!planEntitlements) return null;
  return planEntitlements.entitlements.find(
    e => e.modelId === modelId && e.variantKey === variantKey
  ) || null;
}

/**
 * Check if a variant is included in plan (has quota > 0)
 */
export function isVariantIncludedInPlan(
  planId: string | null,
  modelId: string,
  variantKey: string
): boolean {
  const ent = getEntitlement(planId, modelId, variantKey);
  return ent ? ent.includedMonthlyLimit > 0 : false;
}

/**
 * Get the price for a variant (either included or paid)
 */
export function getVariantPrice(
  planId: string | null,
  modelId: string,
  variantKey: string,
  usedThisMonth: number = 0
): { stars: number; isIncluded: boolean } {
  const ent = getEntitlement(planId, modelId, variantKey);
  
  if (!ent) {
    // No entitlement found - use default pricing from models
    // Nano Banana Pro defaults
    if (modelId === 'nano-banana-pro') {
      return { stars: variantKey === '4k' ? 40 : 30, isIncluded: false };
    }
    return { stars: 0, isIncluded: false };
  }
  
  // 4K is always paid
  if (variantKey === '4k') {
    return { stars: ent.priceWhenNotIncluded, isIncluded: false };
  }
  
  // Check if within included quota
  if (ent.includedMonthlyLimit > 0 && usedThisMonth < ent.includedMonthlyLimit) {
    return { stars: 0, isIncluded: true };
  }
  
  // Quota exhausted or not included
  return { stars: ent.priceWhenNotIncluded, isIncluded: false };
}



