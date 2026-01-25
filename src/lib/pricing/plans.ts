// Now uses unified pricing from src/config/pricing.ts
import { SUBSCRIPTION_TIERS, STAR_PACKS } from '@/config/pricing';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  description?: string;
  subtitle?: string;
  features: string[];
  popular?: boolean;
  recurring?: boolean;
  badge?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description?: string;
  features?: string[];
  discount?: number;
  popular?: boolean;
  badge?: string;
}

// Convert unified config to page format
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = SUBSCRIPTION_TIERS.map((tier) => {
  const descriptions: Record<string, string> = {
    star: `${tier.stars}⭐ в месяц + 50⭐ при регистрации. Для старта и теста моделей: фото, первые ролики, обложки и эффекты.`,
    pro: `${tier.stars}⭐ в месяц. Оптимальный тариф для регулярного контента и задач каждый день.`,
    business: `${tier.stars}⭐ в месяц. Для бизнеса, e-commerce и производства контента потоком.`,
  };

  const badges: Record<string, string> = {
    star: 'Попробовать',
    pro: 'Лучший выбор',
    business: 'Для объёма',
  };

  const subtitles: Record<string, string> = {
    star: 'Акция до конца декабря',
  };

  return {
    id: tier.id,
    name: tier.name,
    price: tier.price,
    credits: tier.stars,
    subtitle: subtitles[tier.id],
    badge: badges[tier.id],
    description: descriptions[tier.id] || tier.features.join('. '),
    features: tier.features,
    popular: tier.popular,
    recurring: true,
  };
});

export const CREDIT_PACKAGES: CreditPackage[] = STAR_PACKS.map((pack) => {
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
    name: pack.id.charAt(0).toUpperCase() + pack.id.slice(1),
    credits: pack.stars + (pack.bonus || 0),
    price: pack.price,
    badge: badges[pack.id],
    description: descriptions[pack.id] || `${pack.stars}⭐`,
    features: featuresList[pack.id] || [],
    popular: pack.popular,
  };
});

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
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(price);
}


