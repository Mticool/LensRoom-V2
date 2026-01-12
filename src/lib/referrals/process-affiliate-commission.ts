/**
 * Process affiliate commission for partner referrals
 * 
 * Called from payment webhooks (Robokassa) when a purchase is successful
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getReferralAttribution } from './referral-helper';

interface PaymentData {
  userId: string;
  paymentId: string;
  amountRub: number;
  tariffName?: string;
}

function parseIntSafe(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/**
 * Process affiliate commission after successful payment
 * 
 * 1. Check if buyer has a referrer
 * 2. Check if referrer is an affiliate (has tier)
 * 3. Determine first vs repeat purchase
 * 4. Calculate commission:
 *    - first purchase: tier.percent (admin-set, e.g. 20%+)
 *    - repeat purchases/renewals: small passive percent (tier-based, e.g. 2-5%)
 * 4. Save to affiliate_earnings table
 */
export async function processAffiliateCommission(payment: PaymentData): Promise<{
  success: boolean;
  message?: string;
  commissionRub?: number;
}> {
  const { userId, paymentId, amountRub, tariffName } = payment;
  
  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Check if buyer was referred by someone
    const attribution = await getReferralAttribution(userId);
    
    if (!attribution) {
      return { 
        success: false, 
        message: 'No referrer found for this user' 
      };
    }
    
    const referrerId = attribution.referrer_user_id;
    
    // 2. Check if referrer is an affiliate partner
    const { data: tier, error: tierError } = await supabase
      .from('affiliate_tiers')
      .select('tier, percent, recurring_percent')
      .eq('user_id', referrerId)
      .single();
    
    if (tierError || !tier) {
      return { 
        success: false, 
        message: 'Referrer is not an affiliate partner' 
      };
    }
    
    // 3. Determine if this is the first completed purchase for the buyer (safe: on any error treat as repeat)
    // Use payments table (more reliable than affiliate_earnings history).
    const { count: priorPaymentsCountRaw, error: paymentsCountError } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      // Include rows with NULL external_id (legacy), but exclude current payment when external_id matches.
      .or(`external_id.is.null,external_id.neq.${paymentId}`);

    let priorPaymentsCount: number | null = typeof priorPaymentsCountRaw === 'number' ? priorPaymentsCountRaw : null;
    if (paymentsCountError) {
      console.warn('[Affiliate Commission] Failed to count prior payments (treating as REPEAT):', paymentsCountError);
      priorPaymentsCount = null;
    }

    const isFirstPurchase = priorPaymentsCount === 0;
    const buyerPaymentIndex = priorPaymentsCount === null ? null : priorPaymentsCount + 1;

    // 4. Calculate commission percent
    // First purchase: admin-defined percent stored on affiliate_tiers
    // Repeat purchases: small passive percent (tier-based, configurable via env)
    const repeatClassic = parseIntSafe(process.env.AFFILIATE_REPEAT_PERCENT_CLASSIC, 2);
    const repeatPro = parseIntSafe(process.env.AFFILIATE_REPEAT_PERCENT_PRO, 5);
    const repeatFallback = tier.tier === 'pro' ? repeatPro : repeatClassic;
    const repeatFromTier = parseIntSafe((tier as any)?.recurring_percent, repeatFallback);
    const repeatPercent = clampInt(repeatFromTier, 0, 100);

    const firstPercent = clampInt(parseIntSafe((tier as any)?.percent, 0), 0, 100);
    const commissionPercent = isFirstPurchase ? firstPercent : repeatPercent;
    const commissionRub = Number((amountRub * commissionPercent / 100).toFixed(2));
    
    // 5. Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from('affiliate_earnings')
      .select('id')
      .eq('payment_id', paymentId)
      .single();
    
    if (existing) {
      return {
        success: false,
        message: 'Commission already processed for this payment',
      };
    }
    
    // 6. Save commission (with safe fallback if DB is not migrated yet)
    const baseInsert = {
      affiliate_user_id: referrerId,
      referral_user_id: userId,
      payment_id: paymentId,
      amount_rub: amountRub,
      commission_percent: commissionPercent,
      commission_rub: commissionRub,
      tariff_name: tariffName || 'Unknown',
      status: 'pending',
    } as Record<string, any>;

    const insertV2 = {
      ...baseInsert,
      is_first_purchase: isFirstPurchase,
      buyer_payment_index: buyerPaymentIndex,
      prior_payments_count: priorPaymentsCount,
    };

    let insertError: any = null;
    const { error: e1 } = await supabase.from('affiliate_earnings').insert(insertV2);
    insertError = e1;
    if (insertError && /column .* (is_first_purchase|buyer_payment_index|prior_payments_count) does not exist/i.test(insertError.message || '')) {
      // DB not migrated: retry without new fields
      const { error: e2 } = await supabase.from('affiliate_earnings').insert(baseInsert);
      insertError = e2;
    }
    if (insertError) throw insertError;
    
    console.log(
      `[Affiliate Commission] ${isFirstPurchase ? 'FIRST' : 'REPEAT'}: ${commissionRub}₽ (${commissionPercent}%) for partner ${referrerId}, buyer ${userId}, payment ${paymentId}`
    );
    
    return {
      success: true,
      message: `Commission ${commissionRub}₽ (${commissionPercent}%) saved (${isFirstPurchase ? 'first' : 'repeat'})`,
      commissionRub,
    };
    
  } catch (error) {
    console.error('[processAffiliateCommission] Error:', error);
    return {
      success: false,
      message: 'Failed to process commission',
    };
  }
}

