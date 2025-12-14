// Re-export from pricing-config for backwards compatibility
export { 
  SUBSCRIPTIONS as SUBSCRIPTION_PLANS,
  CREDIT_PACKS as CREDIT_PACKAGES,
  REGISTRATION_BONUS,
  REFERRAL_BONUS,
  getPricePerStar,
  getMargin,
  getSavings,
} from '@/lib/pricing-config';

export type { Subscription as SubscriptionPlan, CreditPack as CreditPackage } from '@/lib/pricing-config';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getCreditPrice(packageId: string): number {
  const { CREDIT_PACKS } = require('@/lib/pricing-config');
  const pkg = CREDIT_PACKS.find((p: { id: string; price: number; credits: number }) => p.id === packageId);
  return pkg ? pkg.price / pkg.credits : 0;
}

export function getBestDeal() {
  const { CREDIT_PACKS } = require('@/lib/pricing-config');
  return CREDIT_PACKS.reduce((best: { price: number; credits: number }, current: { price: number; credits: number }) => {
    const bestPrice = best.price / best.credits;
    const currentPrice = current.price / current.credits;
    return currentPrice < bestPrice ? current : best;
  });
}
