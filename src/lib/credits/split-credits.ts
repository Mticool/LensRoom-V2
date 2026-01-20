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
  const safeAmount = Number(amount) || 0;
  if (safeAmount <= 0) {
    const balance = await getCreditBalance(supabase, userId);
    return {
      success: true,
      subscriptionStars: balance.subscriptionStars,
      packageStars: balance.packageStars,
      totalBalance: balance.totalBalance,
      deductedFromSubscription: 0,
      deductedFromPackage: 0,
    };
  }

  // IMPORTANT: must be safe under concurrency (Studio 4/4 parallel requests).
  // We implement optimistic CAS updates to avoid race conditions without requiring DB RPCs.

  // Best-effort: ensure credits row exists (do not overwrite if it already exists).
  try {
    const { error: insErr } = await supabase.from('credits').insert({
      user_id: userId,
      subscription_stars: 0,
      package_stars: 0,
      amount: 0,
      updated_at: new Date().toISOString(),
    } as any);
    // Ignore duplicates
    if (insErr && String((insErr as any).code || '') !== '23505') {
      // If insert fails for another reason, continue to reads (getCreditBalance will handle).
      console.error('[SplitCredits] ensure credits row insert error:', insErr);
    }
  } catch {
    // ignore
  }

  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const balanceBefore = await getCreditBalance(supabase, userId);
    if (balanceBefore.totalBalance < safeAmount) {
      return {
        success: false,
        subscriptionStars: balanceBefore.subscriptionStars,
        packageStars: balanceBefore.packageStars,
        totalBalance: balanceBefore.totalBalance,
        deductedFromSubscription: 0,
        deductedFromPackage: 0,
      };
    }

    const fromSubscription = Math.min(balanceBefore.subscriptionStars, safeAmount);
    const fromPackage = safeAmount - fromSubscription;
    const newSubscriptionStars = balanceBefore.subscriptionStars - fromSubscription;
    const newPackageStars = balanceBefore.packageStars - fromPackage;
    const newTotal = newSubscriptionStars + newPackageStars;

    if (newTotal < 0) {
      console.error(
        `[SplitCredits] Balance would go negative: ${newTotal} (current: ${balanceBefore.totalBalance}, deducting: ${safeAmount})`
      );
      return {
        success: false,
        subscriptionStars: balanceBefore.subscriptionStars,
        packageStars: balanceBefore.packageStars,
        totalBalance: balanceBefore.totalBalance,
        deductedFromSubscription: 0,
        deductedFromPackage: 0,
      };
    }

    const { data, error } = await supabase
      .from('credits')
      .update({
        subscription_stars: newSubscriptionStars,
        package_stars: newPackageStars,
        amount: newTotal, // keep legacy column in sync
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      // CAS: only update if no other concurrent update happened
      .eq('subscription_stars', balanceBefore.subscriptionStars)
      .eq('package_stars', balanceBefore.packageStars)
      .select('subscription_stars,package_stars,amount');

    if (error) {
      console.error('[SplitCredits] Deduct error (cas):', error);
      return {
        success: false,
        subscriptionStars: balanceBefore.subscriptionStars,
        packageStars: balanceBefore.packageStars,
        totalBalance: balanceBefore.totalBalance,
        deductedFromSubscription: 0,
        deductedFromPackage: 0,
      };
    }

    const updatedRow = Array.isArray(data) ? (data[0] as any) : (data as any);
    if (updatedRow) {
      const updatedSub = Number(updatedRow.subscription_stars ?? 0) || 0;
      const updatedPkg = Number(updatedRow.package_stars ?? 0) || 0;
      const updatedTotal = updatedSub + updatedPkg;

      if (process.env.NODE_ENV === 'development' || process.env.AUDIT_STARS === 'true') {
        console.log('[⭐ SPLIT] Deduction (cas):', JSON.stringify({
          userId,
          amount: safeAmount,
          fromSubscription,
          fromPackage,
          before: { sub: balanceBefore.subscriptionStars, pkg: balanceBefore.packageStars },
          after: { sub: updatedSub, pkg: updatedPkg },
          attempt,
        }));
      }

      return {
        success: true,
        subscriptionStars: updatedSub,
        packageStars: updatedPkg,
        totalBalance: updatedTotal,
        deductedFromSubscription: fromSubscription,
        deductedFromPackage: fromPackage,
      };
    }

    // If we updated 0 rows, a concurrent update won. Retry.
    if (attempt === maxAttempts) {
      console.error('[SplitCredits] CAS retry exhausted');
    }
  }

  const finalBalance = await getCreditBalance(supabase, userId);
  return {
    success: false,
    subscriptionStars: finalBalance.subscriptionStars,
    packageStars: finalBalance.packageStars,
    totalBalance: finalBalance.totalBalance,
    deductedFromSubscription: 0,
    deductedFromPackage: 0,
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







