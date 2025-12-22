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
    id: 'star',
    name: 'Star',
    price: 490,
    stars: 500,
    period: 'month',
    subtitle: 'Быстрый старт без лишних затрат. Подходит, если вам нужно делать контент регулярно, но без "видео-марафонов".',
    features: [
      '500⭐ в месяц',
      'Доступ к базовым моделям',
      'Nano Banana, Z-image',
      'Стандартный приоритет',
      'Email поддержка',
    ],
    benefits: [
      'Делаете поток картинок каждый день (карточки, посты, обложки)',
      'Быстро тестируете идеи: что заходит — то масштабируете',
      'Не переплачиваете за "тяжёлые" режимы, пока они не нужны',
    ],
    capacity: [
      'до 71 генерации Nano Banana (7⭐)',
      'или до 16 генераций Nano Banana Pro (30⭐)',
      'или до 10 роликов Sora 2 (50⭐)',
    ],
    limits: {
      credits: 500,
      starsPerMonth: 500,
      models: 'Базовые (Nano Banana, Z-image)',
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
    subtitle: 'Рабочий тариф "делаю контент системно". Идеален, если вы ведёте соцсети/магазин и хотите не думать о лимитах.',
    features: [
      '1200⭐ в месяц (+20% бонус)',
      'Все фото модели',
      'FLUX.2 Pro, Midjourney V7',
      'Базовые видео модели',
      'Veo 3.1 Fast, Sora 2',
      'Приоритетная генерация',
      'Telegram поддержка',
    ],
    benefits: [
      'Держите стабильный контент-план: фото + базовое видео',
      'Можете массово генерировать и выбирать лучшие варианты',
      'Экономите время: один вечер генераций — контент на неделю/две',
    ],
    capacity: [
      'до 171 Nano Banana (7⭐)',
      'или до 40 Nano Banana Pro (30⭐)',
      'или до 24 роликов Sora 2 (50⭐)',
      'или до 12 роликов Veo Fast (100⭐)',
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
    subtitle: 'Тариф для объёма: когда контент = производственная линия. Для команд, арбитража и множества товаров.',
    features: [
      '3500⭐ в месяц (+40% бонус)',
      'Все модели без ограничений',
      'Veo 3.1, Kling 2.6, Sora 2 Pro',
      'Kling AI Avatar',
      'Максимальный приоритет',
      'API доступ',
      'Персональный менеджер',
      'VIP поддержка 24/7',
    ],
    benefits: [
      'Делаете много контента без стопов: тесты, итерации, разные стили',
      'Спокойно запускаете серии роликов и не выбираете "что урезать"',
      'Самый практичный вариант для скорости и стабильности',
    ],
    capacity: [
      'до 500 Nano Banana (7⭐)',
      'или до 116 Nano Banana Pro (30⭐)',
      'или до 70 роликов Sora 2 (50⭐)',
      'или до 35 роликов Veo Fast (100⭐)',
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
    description: '"Догнать дедлайн": закончились ⭐ — докупили и продолжили работать.',
    capacity: 'Хватит на ~150 Nano Banana или 35 Pro',
  },
  {
    id: 'plus',
    stars: 1600,
    price: 1490,
    bonus: 200,
    description: 'Комфортный запас на неделю/две активной работы.',
    capacity: 'Хватит на ~257 Nano Banana или 60 Pro',
  },
  {
    id: 'max',
    stars: 2200,
    price: 1990,
    bonus: 350,
    popular: true,
    description: 'Пакет для тестов рекламы и масштабирования.',
    capacity: 'Хватит на ~364 Nano Banana или 85 Pro',
  },
  {
    id: 'ultra',
    stars: 5000,
    price: 4990,
    bonus: 1500,
    description: 'Максимальная выгода: самая низкая цена за ⭐. Если генерите много — это выгоднее.',
    capacity: 'Хватит на 928 Nano Banana или 130 Sora 2',
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



