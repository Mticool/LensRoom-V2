/**
 * Nano Banana Pro Quota Management
 * 
 * Handles included generations for Creator+/Business plans:
 * - Creator+: 200 Pro 1-2K generations/month included
 * - Business: 300 Pro 1-2K generations/month included
 * - Pro 4K: pricing depends on plan entitlements
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getEntitlement, getVariantPrice } from "@/config/pricing";

// Model and variant keys
export const NBP_MODEL_KEY = 'nano-banana-pro';
export const NBP_VARIANT_1K_2K = '1k_2k';
export const NBP_VARIANT_4K = '4k';

// Prices in stars (2026-01-27 pricing update)
// These match the pricing.ts SKU prices:
// - nano_banana_pro:2k = 17⭐
// - nano_banana_pro:4k = 25⭐
export const NBP_PRICE_1K_2K = 17; // Updated from 30 to 17
export const NBP_PRICE_4K = 25; // Updated from 40 to 25

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get user's current subscription plan
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return data?.plan_id || null;
  } catch (e) {
    // No active subscription
    return null;
  }
}

/**
 * Get quota usage for current month
 */
export async function getQuotaUsage(
  supabase: SupabaseClient,
  userId: string,
  modelKey: string,
  variantKey: string
): Promise<number> {
  const month = getCurrentMonth();
  
  try {
    const { data } = await supabase.rpc('get_quota_usage', {
      p_user_id: userId,
      p_month: month,
      p_model_key: modelKey,
      p_variant_key: variantKey,
    });
    
    return data ?? 0;
  } catch (e) {
    // Fallback to direct query if RPC doesn't exist yet
    try {
      const { data } = await supabase
        .from('user_quota_usage')
        .select('used_count')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('model_key', modelKey)
        .eq('variant_key', variantKey)
        .single();
      
      return data?.used_count ?? 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Increment quota usage atomically
 */
export async function incrementQuotaUsage(
  supabase: SupabaseClient,
  userId: string,
  modelKey: string,
  variantKey: string
): Promise<number> {
  const month = getCurrentMonth();
  
  try {
    const { data, error } = await supabase.rpc('increment_quota_usage', {
      p_user_id: userId,
      p_month: month,
      p_model_key: modelKey,
      p_variant_key: variantKey,
    });
    
    if (error) throw error;
    return data ?? 1;
  } catch (e) {
    // Fallback to upsert if RPC doesn't exist yet
    const { data, error } = await supabase
      .from('user_quota_usage')
      .upsert({
        user_id: userId,
        month: month,
        model_key: modelKey,
        variant_key: variantKey,
        used_count: 1,
      }, {
        onConflict: 'user_id,month,model_key,variant_key',
      })
      .select('used_count')
      .single();
    
    if (error) {
      console.error('[Quota] Failed to increment usage:', error);
      throw error;
    }
    
    return data?.used_count ?? 1;
  }
}

/**
 * Determine variant key from quality parameter
 */
export function determineVariantKey(quality: string | undefined): string {
  // Map quality parameter to variant key
  const q = String(quality || '').toLowerCase();
  if (q === '4k') {
    return NBP_VARIANT_4K;
  }
  // Default to 1k_2k for '1k_2k', '1k', '2k', or anything else
  return NBP_VARIANT_1K_2K;
}

/**
 * Check if this is a Nano Banana Pro generation
 */
export function isNanoBananaPro(modelId: string): boolean {
  return modelId === NBP_MODEL_KEY || modelId === 'nano-banana-pro';
}

/**
 * Calculate the actual cost for a Nano Banana Pro generation
 * 
 * Returns:
 * - stars: number of stars to charge (0 if included)
 * - isIncluded: whether this generation is covered by plan
 * - variantKey: the resolved variant key
 */
export async function calculateNBPCost(
  supabase: SupabaseClient,
  userId: string,
  quality: string | undefined
): Promise<{
  stars: number;
  isIncluded: boolean;
  variantKey: string;
  planId: string | null;
  usedThisMonth: number;
}> {
  const variantKey = determineVariantKey(quality);

  // Get user's plan
  const planId = await getUserPlan(supabase, userId);
  
  // No plan = always charge
  if (!planId) {
    return {
      stars: variantKey === NBP_VARIANT_4K ? NBP_PRICE_4K : NBP_PRICE_1K_2K,
      isIncluded: false,
      variantKey,
      planId: null,
      usedThisMonth: 0,
    };
  }
  
  // Get quota usage
  const usedThisMonth = await getQuotaUsage(supabase, userId, NBP_MODEL_KEY, variantKey);
  
  // Get entitlement for this plan
  const priceInfo = getVariantPrice(planId, NBP_MODEL_KEY, variantKey, usedThisMonth);
  
  return {
    stars: priceInfo.stars,
    isIncluded: priceInfo.isIncluded,
    variantKey,
    planId,
    usedThisMonth,
  };
}

/**
 * Record generation run for analytics
 */
export async function recordGenerationRun(
  supabase: SupabaseClient,
  params: {
    generationId: string | undefined;
    userId: string;
    provider: string;
    providerModel: string;
    variantKey: string;
    starsCharged: number;
    includedByPlan: boolean;
    status: 'pending' | 'success' | 'failed' | 'refunded';
    providerCostUsd?: number;
    providerCostRub?: number;
  }
): Promise<void> {
  try {
    await supabase.from('generation_runs').insert({
      generation_id: params.generationId,
      user_id: params.userId,
      provider: params.provider,
      provider_model: params.providerModel,
      variant_key: params.variantKey,
      stars_charged: params.starsCharged,
      included_by_plan: params.includedByPlan,
      status: params.status,
      provider_cost_usd: params.providerCostUsd,
      provider_cost_rub: params.providerCostRub,
    });
  } catch (e) {
    console.error('[Quota] Failed to record generation run:', e);
  }
}

/**
 * Refund stars if generation failed
 */
export async function refundStars(
  supabase: SupabaseClient,
  userId: string,
  stars: number,
  generationId?: string
): Promise<void> {
  if (stars <= 0) return;
  
  try {
    // Refund should work with split credits (package_stars) + keep legacy amount synced.
    // Use optimistic CAS update so it works even if DB RPC helpers aren't installed.
    try {
      const { error: insErr } = await supabase.from('credits').insert({
        user_id: userId,
        subscription_stars: 0,
        package_stars: 0,
        amount: 0,
        updated_at: new Date().toISOString(),
      } as any);
      if (insErr && String((insErr as any).code || '') !== '23505') {
        console.error('[Quota] ensure credits row insert error:', insErr);
      }
    } catch {
      // ignore
    }

    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: row, error: readErr } = await supabase
        .from('credits')
        .select('subscription_stars,package_stars')
        .eq('user_id', userId)
        .single();
      if (readErr || !row) throw readErr || new Error('credits row not found');

      const sub = Number((row as any).subscription_stars ?? 0) || 0;
      const pkg = Number((row as any).package_stars ?? 0) || 0;
      const nextPkg = pkg + stars;
      const nextTotal = sub + nextPkg;

      const { data: upd, error: updErr } = await supabase
        .from('credits')
        .update({
          package_stars: nextPkg,
          amount: nextTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('subscription_stars', sub)
        .eq('package_stars', pkg)
        .select('user_id');

      if (updErr) throw updErr;
      if (Array.isArray(upd) ? upd.length > 0 : !!upd) break;
      if (attempt === maxAttempts) throw new Error('refund CAS retry exhausted');
    }
    
    // Record refund transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: stars, // Positive for refund
      type: 'refund',
      description: 'Возврат за неудачную генерацию',
      generation_id: generationId,
    });
  } catch (e) {
    console.error('[Quota] Failed to refund stars:', e);
  }
}
