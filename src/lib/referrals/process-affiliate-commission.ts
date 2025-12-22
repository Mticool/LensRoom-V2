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

/**
 * Process affiliate commission after successful payment
 * 
 * 1. Check if buyer has a referrer
 * 2. Check if referrer is an affiliate (has tier)
 * 3. Calculate commission based on tier percent
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
      .select('tier, percent')
      .eq('user_id', referrerId)
      .single();
    
    if (tierError || !tier) {
      return { 
        success: false, 
        message: 'Referrer is not an affiliate partner' 
      };
    }
    
    // 3. Calculate commission
    const commissionPercent = tier.percent;
    const commissionRub = Number((amountRub * commissionPercent / 100).toFixed(2));
    
    // 4. Check if already processed (idempotency)
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
    
    // 5. Save commission
    const { error: insertError } = await supabase
      .from('affiliate_earnings')
      .insert({
        affiliate_user_id: referrerId,
        referral_user_id: userId,
        payment_id: paymentId,
        amount_rub: amountRub,
        commission_percent: commissionPercent,
        commission_rub: commissionRub,
        tariff_name: tariffName || 'Unknown',
        status: 'pending',
      });
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`[Affiliate Commission] Processed: ${commissionRub}₽ for partner ${referrerId}, payment ${paymentId}`);
    
    return {
      success: true,
      message: `Commission ${commissionRub}₽ (${commissionPercent}%) saved`,
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

