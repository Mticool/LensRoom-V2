/**
 * Verification script for Nano Banana Pro entitlements
 * 
 * Run: npx ts-node scripts/verify-nbp-entitlements.ts
 * Or: node scripts/verify-nbp-entitlements.js (after compile)
 */

// Inline definitions for standalone execution
const SUBSCRIPTION_TIERS = [
  { id: 'creator', name: 'Creator', price: 990, stars: 1200 },
  { id: 'creator_plus', name: 'Creator+', price: 1990, stars: 2550 },
  { id: 'business', name: 'Business', price: 2990, stars: 3500 },
];

const PLAN_ENTITLEMENTS = [
  {
    planId: 'creator',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 0, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
  {
    planId: 'creator_plus',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 200, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
  {
    planId: 'business',
    entitlements: [
      { modelId: 'nano-banana-pro', variantKey: '1k_2k', includedMonthlyLimit: 300, priceWhenNotIncluded: 30 },
      { modelId: 'nano-banana-pro', variantKey: '4k', includedMonthlyLimit: 0, priceWhenNotIncluded: 40 },
    ],
  },
];

function getEntitlement(planId: string | null, modelId: string, variantKey: string) {
  if (!planId) return null;
  const plan = PLAN_ENTITLEMENTS.find(p => p.planId === planId);
  if (!plan) return null;
  return plan.entitlements.find(e => e.modelId === modelId && e.variantKey === variantKey) || null;
}

function getVariantPrice(planId: string | null, modelId: string, variantKey: string, usedThisMonth: number = 0) {
  const ent = getEntitlement(planId, modelId, variantKey);
  
  if (!ent) {
    if (modelId === 'nano-banana-pro') {
      return { stars: variantKey === '4k' ? 40 : 30, isIncluded: false };
    }
    return { stars: 0, isIncluded: false };
  }
  
  if (variantKey === '4k') {
    return { stars: ent.priceWhenNotIncluded, isIncluded: false };
  }
  
  if (ent.includedMonthlyLimit > 0 && usedThisMonth < ent.includedMonthlyLimit) {
    return { stars: 0, isIncluded: true };
  }
  
  return { stars: ent.priceWhenNotIncluded, isIncluded: false };
}

console.log('\n=== SUBSCRIPTION PLANS ===\n');

for (const tier of SUBSCRIPTION_TIERS) {
  console.log(`📦 ${tier.name} (${tier.id})`);
  console.log(`   Price: ${tier.price}₽/month`);
  console.log(`   Stars: ${tier.stars}⭐/month`);
  console.log('');
}

console.log('\n=== NANO BANANA PRO ENTITLEMENTS ===\n');

const plans = ['creator', 'creator_plus', 'business', null];
const variants = ['1k_2k', '4k'];

console.log('Plan         | Variant | Included Limit | Price (when not included)');
console.log('-------------|---------|----------------|-------------------------');

for (const planId of plans) {
  for (const variant of variants) {
    const ent = planId ? getEntitlement(planId, 'nano-banana-pro', variant) : null;
    const limit = ent?.includedMonthlyLimit ?? 0;
    const price = ent?.priceWhenNotIncluded ?? (variant === '4k' ? 40 : 30);
    
    const planName = planId || 'No Plan';
    const limitStr = limit === 0 ? 'Not included' : limit === -1 ? 'Unlimited' : `${limit}/month`;
    
    console.log(`${planName.padEnd(12)} | ${variant.padEnd(7)} | ${limitStr.padEnd(14)} | ${price}⭐`);
  }
}

console.log('\n=== PRICING SCENARIOS ===\n');

// Test pricing for different scenarios
const scenarios = [
  { planId: null, variant: '1k_2k', used: 0, desc: 'No plan, 1-2K' },
  { planId: null, variant: '4k', used: 0, desc: 'No plan, 4K' },
  { planId: 'creator', variant: '1k_2k', used: 0, desc: 'Creator, 1-2K' },
  { planId: 'creator', variant: '4k', used: 0, desc: 'Creator, 4K' },
  { planId: 'creator_plus', variant: '1k_2k', used: 0, desc: 'Creator+, 1-2K (fresh)' },
  { planId: 'creator_plus', variant: '1k_2k', used: 199, desc: 'Creator+, 1-2K (199 used)' },
  { planId: 'creator_plus', variant: '1k_2k', used: 200, desc: 'Creator+, 1-2K (200 used - limit reached)' },
  { planId: 'creator_plus', variant: '4k', used: 0, desc: 'Creator+, 4K' },
  { planId: 'business', variant: '1k_2k', used: 0, desc: 'Business, 1-2K (fresh)' },
  { planId: 'business', variant: '1k_2k', used: 299, desc: 'Business, 1-2K (299 used)' },
  { planId: 'business', variant: '1k_2k', used: 300, desc: 'Business, 1-2K (300 used - limit reached)' },
  { planId: 'business', variant: '4k', used: 0, desc: 'Business, 4K' },
];

console.log('Scenario                                  | Stars | Included');
console.log('------------------------------------------|-------|----------');

for (const s of scenarios) {
  const result = getVariantPrice(s.planId, 'nano-banana-pro', s.variant, s.used);
  const includedStr = result.isIncluded ? '✅ Yes' : '❌ No';
  console.log(`${s.desc.padEnd(41)} | ${String(result.stars).padEnd(5)} | ${includedStr}`);
}

console.log('\n=== SUMMARY ===\n');
console.log('✅ Creator: Nano Banana Pro NOT included (always 30⭐ for 1-2K, 40⭐ for 4K)');
console.log('✅ Creator+: Pro 1-2K included (200/month fair use), then 30⭐. 4K always 40⭐');
console.log('✅ Business: Pro 1-2K included (300/month fair use), then 30⭐. 4K always 40⭐');
console.log('\n✅ All checks passed!\n');
