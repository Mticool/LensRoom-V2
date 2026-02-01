/**
 * Единый источник правды для тарифов LensRoom
 * Обновлено: 2026-01-27
 */

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  stars: number;
  period: 'month';
  popular?: boolean;
  highlights: string[];
  nanoBananaPro2k: string; // "120/мес" | "Бесплатно*" | "✓"
  nanoBananaPro4k: string; // "—" | "Бесплатно*"
  hasPriority: boolean;
  hasMaxPriority: boolean;
  hasExtendedLibrary: boolean;
}

export interface StarPack {
  id: string;
  stars: number;
  price: number;
  bonus?: number;
  popular?: boolean;
  description?: string;
  capacity?: string;
}

export function packTotalStars(pack: StarPack): number {
  return pack.stars + (pack.bonus || 0);
}

export function packBonusPercent(pack: StarPack): number {
  if (!pack.bonus || pack.stars <= 0) return 0;
  return Math.round((pack.bonus / pack.stars) * 100);
}

// === НОВЫЕ ТАРИФЫ (2026-01-27) ===
export const SUBSCRIPTION_TIERS: PricingTier[] = [
  {
    id: 'start',
    name: 'START',
    price: 990,
    stars: 1100,
    period: 'month',
    highlights: [
      '+1100⭐ каждый месяц',
      'Все видео и фото модели доступны',
      'NanoBanana Pro 2K: 120 генераций/мес включено',
      'Motion Control: доступен',
      'История и «Мои работы»',
    ],
    nanoBananaPro2k: '120/мес',
    nanoBananaPro4k: '—',
    hasPriority: false,
    hasMaxPriority: false,
    hasExtendedLibrary: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 1990,
    stars: 2400,
    period: 'month',
    popular: true,
    highlights: [
      '+2400⭐ каждый месяц',
      'NanoBanana Pro 2K: Бесплатно*',
      'Приоритет в очереди',
      'Motion Control: доступен',
      'Расширенная библиотека «Мои работы»',
    ],
    nanoBananaPro2k: 'Бесплатно*',
    nanoBananaPro4k: '—',
    hasPriority: true,
    hasMaxPriority: false,
    hasExtendedLibrary: true,
  },
  {
    id: 'max',
    name: 'MAX',
    price: 2990,
    stars: 4000,
    period: 'month',
    highlights: [
      '+4000⭐ каждый месяц',
      'NanoBanana Pro 4K: Бесплатно*',
      'Максимальный приоритет',
      'Motion Control: доступен',
      'Максимум контроля и скорости',
    ],
    nanoBananaPro2k: '✓',
    nanoBananaPro4k: 'Бесплатно*',
    hasPriority: true,
    hasMaxPriority: true,
    hasExtendedLibrary: true,
  },
];

// === ПАКЕТЫ ЗВЁЗД (скрыты, но оставлены для совместимости) ===
export const STAR_PACKS: StarPack[] = [
  { id: 'mini', stars: 1400, price: 990, capacity: '~200 Nano Banana' },
  { id: 'plus', stars: 2200, price: 1490, capacity: '~314 Nano Banana' },
  { id: 'max', stars: 3000, price: 1990, popular: true, capacity: '~428 Nano Banana' },
  { id: 'ultra', stars: 7600, price: 4990, capacity: '~1085 Nano Banana' },
];

// === ТАБЛИЦА СРАВНЕНИЯ ===
export interface ComparisonRow {
  label: string;
  category: 'general' | 'video' | 'image';
  start: string;
  pro: string;
  max: string;
}

export const COMPARISON_TABLE: ComparisonRow[] = [
  // GENERAL
  { label: '⭐ Начисление каждый месяц', category: 'general', start: '1100⭐', pro: '2400⭐', max: '4000⭐' },
  { label: '⭐ можно тратить на любые модели', category: 'general', start: '✓', pro: '✓', max: '✓' },
  { label: 'Еженедельные обновления моделей', category: 'general', start: '✓', pro: '✓', max: '✓' },
  { label: 'Библиотека «Мои работы»', category: 'general', start: '✓', pro: '✓', max: '✓' },
  { label: 'Расширенная библиотека', category: 'general', start: '—', pro: '✓', max: '✓' },
  { label: 'Приоритет в очереди', category: 'general', start: '—', pro: '✓', max: '✓' },
  { label: 'Максимальный приоритет', category: 'general', start: '—', pro: '—', max: '✓' },
  
  // VIDEO
  { label: 'Veo 3.1 Fast', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Sora 2', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Kling 2.6', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Kling 2.5', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Kling 2.1', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'WAN 2.6', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Grok Video', category: 'video', start: '✓', pro: '✓', max: '✓' },
  { label: 'Kling 2.6 Motion Control', category: 'video', start: '✓', pro: '✓', max: '✓' },
  
  // IMAGE
  { label: 'Nano Banana', category: 'image', start: '✓', pro: '✓', max: '✓' },
  { label: 'NanoBanana Pro 2K', category: 'image', start: '120/мес', pro: 'Бесплатно*', max: '✓' },
  { label: 'NanoBanana Pro 4K', category: 'image', start: '—', pro: '—', max: 'Бесплатно*' },
  { label: 'Seedream 4.5', category: 'image', start: '✓', pro: '✓', max: '✓' },
  { label: 'Z-image', category: 'image', start: '✓', pro: '✓', max: '✓' },
  { label: 'GPT Image 1.5', category: 'image', start: '✓', pro: '✓', max: '✓' },
  { label: 'FLUX.2 Pro', category: 'image', start: '✓', pro: '✓', max: '✓' },
  { label: 'Grok Imagine', category: 'image', start: '✓', pro: '✓', max: '✓' },
];

// === УТИЛИТЫ ===

export function getTierById(id: string): PricingTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === id);
}

export function getStarPackById(id: string): StarPack | undefined {
  return STAR_PACKS.find((pack) => pack.id === id);
}

export function getPopularTier(): PricingTier {
  return SUBSCRIPTION_TIERS.find((tier) => tier.popular) || SUBSCRIPTION_TIERS[1];
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(price);
}

export function formatStars(stars: number): string {
  return `${stars}⭐`;
}

// === ENTITLEMENTS ===

export interface PlanEntitlement {
  modelId: string;
  variantKey: string;
  includedMonthlyLimit: number;
  priceWhenNotIncluded: number;
}

export interface PlanEntitlements {
  planId: string;
  entitlements: PlanEntitlement[];
}

export const PLAN_ENTITLEMENTS: PlanEntitlements[] = [
  {
    planId: 'start',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 120, priceWhenNotIncluded: 17 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 25 },
    ],
  },
  {
    planId: 'pro',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: -1, priceWhenNotIncluded: 17 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 25 },
    ],
  },
  {
    planId: 'max',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: -1, priceWhenNotIncluded: 17 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: -1, priceWhenNotIncluded: 25 },
    ],
  },
];

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

export function isVariantIncludedInPlan(
  planId: string | null,
  modelId: string,
  variantKey: string
): boolean {
  const ent = getEntitlement(planId, modelId, variantKey);
  return ent ? ent.includedMonthlyLimit > 0 || ent.includedMonthlyLimit === -1 : false;
}

export function getVariantPrice(
  planId: string | null,
  modelId: string,
  variantKey: string,
  usedThisMonth: number = 0
): { stars: number; isIncluded: boolean } {
  const ent = getEntitlement(planId, modelId, variantKey);
  
  if (!ent) {
    if (modelId === 'nano-banana-pro') {
      return { stars: variantKey === '4k' ? 25 : 17, isIncluded: false };
    }
    return { stars: 0, isIncluded: false };
  }

  if (ent.includedMonthlyLimit === -1 || (ent.includedMonthlyLimit > 0 && usedThisMonth < ent.includedMonthlyLimit)) {
    return { stars: 0, isIncluded: true };
  }
  
  return { stars: ent.priceWhenNotIncluded, isIncluded: false };
}

// Footnotes для страницы pricing
export const PRICING_FOOTNOTES = [
  '⭐ начисляются каждый месяц.',
  '⭐ можно тратить на любые модели.',
  'Все генерации, кроме включённых NanoBanana Pro, списываются в ⭐ по прайсу.',
  '*Бесплатно = включено в тариф (fair-use защита от злоупотреблений).',
  'Модели и режимы пополняются: обновления каждую неделю.',
];
