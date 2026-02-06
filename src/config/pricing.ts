/**
 * Единый источник правды для тарифов LensRoom
 * Обновлено: 2026-01-27
 */

export interface PricingTier {
  id: string;
  name: string;
  priceRub: number;
  starsMonthly: number;
  motionControlIncluded: boolean;
  nanobananaProTier: 'none' | '2k_free' | '4k_free';
  queuePriority: 'standard' | 'priority' | 'max';
  libraryTier: 'basic' | 'extended' | 'max';
  price: number;
  stars: number;
  period: 'month';
  popular?: boolean;
  highlights: string[];
  nanoBananaPro2k: string; // "—" | "Бесплатно*" | "✓"
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

export interface PaymentSubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
}

export interface PaymentCreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export function packTotalStars(pack: StarPack): number {
  return pack.stars + (pack.bonus || 0);
}

export function packBonusPercent(pack: StarPack): number {
  if (!pack.bonus || pack.stars <= 0) return 0;
  return Math.round((pack.bonus / pack.stars) * 100);
}

export const REGISTRATION_BONUS = 50;

// === НОВЫЕ ТАРИФЫ (2026-01-27) ===
export const SUBSCRIPTION_TIERS: PricingTier[] = [
  {
    id: 'start',
    name: 'START',
    priceRub: 990,
    starsMonthly: 1100,
    motionControlIncluded: true,
    nanobananaProTier: 'none',
    queuePriority: 'standard',
    libraryTier: 'basic',
    price: 990,
    stars: 1100,
    period: 'month',
    highlights: [
      '+1100⭐ каждый месяц',
      'Все видео и фото модели доступны',
      'Motion Control: доступен',
      'История и «Мои работы»',
    ],
    nanoBananaPro2k: '—',
    nanoBananaPro4k: '—',
    hasPriority: false,
    hasMaxPriority: false,
    hasExtendedLibrary: false,
  },
  {
    id: 'pro',
    name: 'PRO',
    priceRub: 1990,
    starsMonthly: 2400,
    motionControlIncluded: true,
    nanobananaProTier: '2k_free',
    queuePriority: 'priority',
    libraryTier: 'extended',
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
    priceRub: 2990,
    starsMonthly: 4000,
    motionControlIncluded: true,
    nanobananaProTier: '4k_free',
    queuePriority: 'max',
    libraryTier: 'max',
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

export const PAYMENT_SUBSCRIPTION_PLANS: PaymentSubscriptionPlan[] = SUBSCRIPTION_TIERS.map((tier) => ({
  id: tier.id,
  name: tier.name,
  price: tier.price,
  credits: tier.stars,
}));

export const PAYMENT_CREDIT_PACKAGES: PaymentCreditPackage[] = STAR_PACKS.map((pack) => ({
  id: pack.id,
  name: pack.id.charAt(0).toUpperCase() + pack.id.slice(1),
  credits: packTotalStars(pack),
  price: pack.price,
}));

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
  { label: 'NanoBanana Pro 2K/4K', category: 'image', start: '—', pro: '2K бесплатно* / —', max: 'Бесплатно* (4K)' },
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
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 0, priceWhenNotIncluded: 9 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 9 },
    ],
  },
  {
    planId: 'pro',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: -1, priceWhenNotIncluded: 9 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 9 },
    ],
  },
  {
    planId: 'max',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: -1, priceWhenNotIncluded: 9 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: -1, priceWhenNotIncluded: 9 },
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
      return { stars: 9, isIncluded: false };
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
  'Бесплатно* = без списания ⭐ в рамках разумного использования. При аномальной нагрузке возможны ограничения скорости или списание ⭐ по стандартному прайсу.',
  'Модели и режимы пополняются: обновления каждую неделю.',
];
