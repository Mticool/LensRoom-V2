// Pricing config for homepage display
// Now uses unified pricing from src/config/pricing.ts

import { SUBSCRIPTION_TIERS, STAR_PACKS, type PricingTier } from '@/config/pricing';

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

export const REGISTRATION_BONUS = 50; // Updated to match actual bonus

// Convert new pricing config to legacy format for backwards compatibility
export const SUBSCRIPTIONS: SubscriptionPlan[] = SUBSCRIPTION_TIERS.map((tier) => {
  // Generate user-friendly descriptions
  const descriptions: Record<string, string> = {
    start: `+${tier.stars}⭐ каждый месяц. Все модели доступны.`,
    pro: `+${tier.stars}⭐ каждый месяц. NanoBanana Pro 2K бесплатно + приоритет.`,
    max: `+${tier.stars}⭐ каждый месяц. NanoBanana Pro 4K бесплатно + максимальный приоритет.`,
  };

  const badges: Record<string, string> = {
    start: 'Старт',
    pro: 'Лучший выбор',
    max: 'Максимум',
  };

  return {
    id: tier.id,
    name: tier.name,
    price: tier.price,
    credits: tier.stars,
    description: descriptions[tier.id] || tier.highlights.join('. '),
    badge: badges[tier.id],
    popular: tier.popular,
    features: tier.highlights.slice(0, 4),
  };
});

// Convert star packs from new config
export const CREDIT_PACKAGES = STAR_PACKS.map((pack) => {
  const descriptions: Record<string, string> = {
    mini: 'Быстро докупить монеты, когда нужно доделать 1–2 задачи.',
    plus: 'Удобный пакет для серии попыток: сделал → проверил → докрутил.',
    max: 'Для спринта: много генераций за короткий период. Максимум выгоды за ⭐.',
    ultra: `${pack.stars}⭐. Максимальный объём для контента и рекламы: делайте много генераций без пауз и ограничений.`,
  };

  const featuresList: Record<string, string[]> = {
    mini: ['Без подписки', 'Быстрое пополнение', 'Для точечных задач'],
    plus: ['Хорошо для пачки фото', 'Хватает на несколько видео', 'Оптимум цена/объём'],
    max: ['Контент сразу на неделю/месяц', 'Под кампании и запуски', 'Самый большой объём'],
    ultra: ['Лучшее соотношение объёма', 'Под большие кампании и каталоги', 'Идеально для видео и пачек фото'],
  };

  const badges: Record<string, string> = {
    plus: 'Выгодно',
    max: 'Максимум',
    ultra: 'Для профи',
  };

  return {
    id: pack.id,
    name: pack.id.charAt(0).toUpperCase() + pack.id.slice(1), // Mini, Plus, Max, Ultra
    credits: pack.stars + (pack.bonus || 0), // Total stars including bonus
    price: pack.price,
    badge: badges[pack.id],
    description: descriptions[pack.id] || `${pack.stars}⭐`,
    features: featuresList[pack.id] || [],
    popular: pack.popular,
  };
});



