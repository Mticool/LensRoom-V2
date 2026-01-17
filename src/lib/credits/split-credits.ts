/**
 * Split Credits System
 * 
 * - subscription_stars: From monthly subscriptions, expire at end of billing period
 * - package_stars: From one-time packages, never expire
 * 
 * Deduction order: subscription first (use before expiry), then package
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface CreditBalance {
  subscriptionStars: number;
  packageStars: number;
  totalBalance: number;
}

export interface DeductResult {
  success: boolean;
  subscriptionStars: number;
  packageStars: number;
  totalBalance: number;
  deductedFromSubscription: number;
  deductedFromPackage: number;
}

/**
 * Get user's split credit balance
 */
export async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditBalance> {
  const { data, error } = await supabase
    .from('credits')
    .select('subscription_stars, package_stars, amount')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      subscriptionStars: 0,
      packageStars: 0,
      totalBalance: 0,
    };
  }

  // Handle legacy data: if split columns are null/0 but amount exists
  const subscriptionStars = data.subscription_stars ?? 0;
  const packageStars = data.package_stars ?? 0;
  const legacyAmount = data.amount ?? 0;

  // If split columns are both 0 but legacy amount exists, treat as package stars
  if (subscriptionStars === 0 && packageStars === 0 && legacyAmount > 0) {
    return {
      subscriptionStars: 0,
      packageStars: legacyAmount,
      totalBalance: legacyAmount,
    };
  }

  return {
    subscriptionStars,
    packageStars,
    totalBalance: subscriptionStars + packageStars,
  };
}

/**
 * Deduct stars from user balance
 * Priority: subscription stars first (use before they expire), then package stars
 */
export async function deductCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<DeductResult> {
  // Get current balance
  const balance = await getCreditBalance(supabase, userId);

  if (balance.totalBalance < amount) {
    return {
      success: false,
      subscriptionStars: balance.subscriptionStars,
      packageStars: balance.packageStars,
      totalBalance: balance.totalBalance,
      deductedFromSubscription: 0,
      deductedFromPackage: 0,
    };
  }

  // Calculate deduction split
  const fromSubscription = Math.min(balance.subscriptionStars, amount);
  const fromPackage = amount - fromSubscription;

  const newSubscriptionStars = balance.subscriptionStars - fromSubscription;
  const newPackageStars = balance.packageStars - fromPackage;
  const newTotal = newSubscriptionStars + newPackageStars;

  // Validate that balance won't go negative (prevent race conditions)
  if (newTotal < 0) {
    console.error(`[SplitCredits] Balance would go negative: ${newTotal} (current: ${balance.totalBalance}, deducting: ${amount})`);
    return {
      success: false,
      subscriptionStars: balance.subscriptionStars,
      packageStars: balance.packageStars,
      totalBalance: balance.totalBalance,
      deductedFromSubscription: 0,
      deductedFromPackage: 0,
    };
  }

  // Update database
  const { error } = await supabase
    .from('credits')
    .update({
      subscription_stars: newSubscriptionStars,
      package_stars: newPackageStars,
      amount: newTotal, // Keep legacy column in sync
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[SplitCredits] Deduct error:', error);
    return {
      success: false,
      subscriptionStars: balance.subscriptionStars,
      packageStars: balance.packageStars,
      totalBalance: balance.totalBalance,
      deductedFromSubscription: 0,
      deductedFromPackage: 0,
    };
  }

  // Audit log
  if (process.env.NODE_ENV === 'development' || process.env.AUDIT_STARS === 'true') {
    console.log('[⭐ SPLIT] Deduction:', JSON.stringify({
      userId,
      amount,
      fromSubscription,
      fromPackage,
      before: { sub: balance.subscriptionStars, pkg: balance.packageStars },
      after: { sub: newSubscriptionStars, pkg: newPackageStars },
    }));
  }

  return {
    success: true,
    subscriptionStars: newSubscriptionStars,
    packageStars: newPackageStars,
    totalBalance: newTotal,
    deductedFromSubscription: fromSubscription,
    deductedFromPackage: fromPackage,
  };
}

/**
 * Add subscription stars (from monthly subscription payment)
 * These will expire at end of billing period
 */
export async function addSubscriptionStars(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<CreditBalance> {
  // Get current balance
  const balance = await getCreditBalance(supabase, userId);

  const newSubscriptionStars = balance.subscriptionStars + amount;
  const newTotal = newSubscriptionStars + balance.packageStars;

  // Upsert credits
  const { error } = await supabase
    .from('credits')
    .upsert({
      user_id: userId,
      subscription_stars: newSubscriptionStars,
      package_stars: balance.packageStars,
      amount: newTotal,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[SplitCredits] Add subscription error:', error);
    return balance;
  }

  console.log(`[⭐ SPLIT] Added ${amount} subscription stars to user ${userId}`);

  return {
    subscriptionStars: newSubscriptionStars,
    packageStars: balance.packageStars,
    totalBalance: newTotal,
  };
}

/**
 * Add package stars (from one-time package purchase)
 * These never expire
 */
export async function addPackageStars(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<CreditBalance> {
  // Get current balance
  const balance = await getCreditBalance(supabase, userId);

  const newPackageStars = balance.packageStars + amount;
  const newTotal = balance.subscriptionStars + newPackageStars;

  // Upsert credits
  const { error } = await supabase
    .from('credits')
    .upsert({
      user_id: userId,
      subscription_stars: balance.subscriptionStars,
      package_stars: newPackageStars,
      amount: newTotal,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[SplitCredits] Add package error:', error);
    return balance;
  }

  console.log(`[⭐ SPLIT] Added ${amount} package stars to user ${userId}`);

  return {
    subscriptionStars: balance.subscriptionStars,
    packageStars: newPackageStars,
    totalBalance: newTotal,
  };
}

/**
 * Reset subscription stars to 0 (called at end of billing period)
 * Returns the number of expired stars
 */
export async function resetSubscriptionStars(
  supabase: SupabaseClient,
  userId: string
): Promise<{ expiredStars: number; remainingPackageStars: number }> {
  // Get current balance
  const balance = await getCreditBalance(supabase, userId);

  const expiredStars = balance.subscriptionStars;

  // Reset subscription stars to 0
  const { error } = await supabase
    .from('credits')
    .update({
      subscription_stars: 0,
      amount: balance.packageStars, // Only package stars remain
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('[SplitCredits] Reset error:', error);
    return { expiredStars: 0, remainingPackageStars: balance.packageStars };
  }

  console.log(`[⭐ SPLIT] Reset ${expiredStars} subscription stars for user ${userId}`);

  return {
    expiredStars,
    remainingPackageStars: balance.packageStars,
  };
}

/**
 * Renew subscription: reset old subscription stars and add new ones
 */
export async function renewSubscription(
  supabase: SupabaseClient,
  userId: string,
  newMonthlyStars: number
): Promise<CreditBalance> {
  // Get current balance
  const balance = await getCreditBalance(supabase, userId);

  // On renewal: old subscription stars expire, new ones are added
  // Note: We could keep unused subscription stars or expire them - 
  // Current implementation: old subscription stars expire, new allocation starts fresh
  const newTotal = newMonthlyStars + balance.packageStars;

  const { error } = await supabase
    .from('credits')
    .upsert({
      user_id: userId,
      subscription_stars: newMonthlyStars,
      package_stars: balance.packageStars,
      amount: newTotal,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[SplitCredits] Renew error:', error);
    return balance;
  }

  console.log(`[⭐ SPLIT] Renewed subscription: ${balance.subscriptionStars} expired, ${newMonthlyStars} new, ${balance.packageStars} package kept`);

  return {
    subscriptionStars: newMonthlyStars,
    packageStars: balance.packageStars,
    totalBalance: newTotal,
  };
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<boolean> {
  const balance = await getCreditBalance(supabase, userId);
  return balance.totalBalance >= amount;
}







