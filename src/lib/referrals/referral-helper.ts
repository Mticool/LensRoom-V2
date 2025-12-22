/**
 * Server-side helper for referral system
 * 
 * - recordReferralEventAndReward: creates event + rewards (idempotent)
 * - getReferralAttribution: get referrer for invitee
 * - claimReferral: attach invitee to referrer (first-touch)
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ======================================
// REWARD CONFIGURATION
// ======================================

export const REFERRAL_REWARDS = {
  signup: {
    referrer: 50, // ⭐ for referrer when invitee signs up
    invitee: 25,  // ⭐ welcome bonus for invitee
  },
  first_generation: {
    referrer: 100, // ⭐ for referrer when invitee completes first generation
    invitee: 0,    // no bonus for invitee on this event
  },
} as const;

export type ReferralEventType = keyof typeof REFERRAL_REWARDS;

// ======================================
// TYPES
// ======================================

interface ReferralAttribution {
  invitee_user_id: string;
  referrer_user_id: string;
  code: string;
  created_at: string;
}

interface ReferralEvent {
  id: string;
  invitee_user_id: string;
  referrer_user_id: string;
  event_type: string;
  event_key: string;
  metadata: Record<string, any>;
  created_at: string;
}

// ======================================
// HELPERS
// ======================================

/**
 * Get referral attribution for invitee
 */
export async function getReferralAttribution(
  inviteeUserId: string
): Promise<ReferralAttribution | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('referral_attributions')
    .select('*')
    .eq('invitee_user_id', inviteeUserId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  
  return data;
}

/**
 * Claim referral: attach invitee to referrer (first-touch)
 * Returns true if attribution was created, false if already exists
 */
export async function claimReferral(
  inviteeUserId: string,
  referralCode: string
): Promise<{ success: boolean; alreadyClaimed: boolean; referrerId?: string }> {
  const supabase = getSupabaseAdmin();
  
  // Check if already claimed
  const existing = await getReferralAttribution(inviteeUserId);
  if (existing) {
    return { success: false, alreadyClaimed: true, referrerId: existing.referrer_user_id };
  }
  
  // Get referrer by code
  const { data: codeData, error: codeError } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', referralCode)
    .single();
  
  if (codeError || !codeData) {
    return { success: false, alreadyClaimed: false };
  }
  
  const referrerId = codeData.user_id;
  
  // Can't refer yourself
  if (referrerId === inviteeUserId) {
    return { success: false, alreadyClaimed: false };
  }
  
  // Create attribution (first-touch)
  const { error: attrError } = await supabase
    .from('referral_attributions')
    .insert({
      invitee_user_id: inviteeUserId,
      referrer_user_id: referrerId,
      code: referralCode,
    });
  
  if (attrError) {
    // Likely duplicate - race condition
    if (attrError.code === '23505') {
      return { success: false, alreadyClaimed: true };
    }
    throw attrError;
  }
  
  return { success: true, alreadyClaimed: false, referrerId };
}

/**
 * Record referral event and reward (idempotent)
 * 
 * This is the main function to call when a referral event occurs.
 * It will:
 * 1. Insert event (on conflict do nothing by event_key)
 * 2. If event was inserted, reward referrer (and optionally invitee)
 */
export async function recordReferralEventAndReward(
  inviteeUserId: string,
  eventType: ReferralEventType,
  eventKey: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; eventId?: string; message?: string }> {
  const supabase = getSupabaseAdmin();
  
  // Get attribution
  const attribution = await getReferralAttribution(inviteeUserId);
  if (!attribution) {
    return { success: false, message: 'No referral attribution found' };
  }
  
  const referrerId = attribution.referrer_user_id;
  
  // Insert event (idempotent)
  const { data: eventData, error: eventError } = await supabase
    .from('referral_events')
    .insert({
      invitee_user_id: inviteeUserId,
      referrer_user_id: referrerId,
      event_type: eventType,
      event_key: eventKey,
      metadata,
    })
    .select('id')
    .single();
  
  if (eventError) {
    // Duplicate event_key - already processed
    if (eventError.code === '23505') {
      return { success: false, message: 'Event already processed (duplicate event_key)' };
    }
    throw eventError;
  }
  
  const eventId = eventData.id;
  
  // Check if referrer is an affiliate partner
  const { data: affiliateTier } = await supabase
    .from('affiliate_tiers')
    .select('tier')
    .eq('user_id', referrerId)
    .single();
  
  const isAffiliate = !!affiliateTier;
  
  // Get reward amounts
  const rewards = REFERRAL_REWARDS[eventType];
  
  // Reward referrer (ONLY if NOT an affiliate partner)
  // Affiliates get % from sales, not stars
  if (rewards.referrer > 0 && !isAffiliate) {
    await supabase.from('referral_rewards').insert({
      user_id: referrerId,
      reward_type: 'stars',
      amount: rewards.referrer,
      reason: `Referral event: ${eventType}`,
      event_id: eventId,
    });
    
    // Add stars to referrer's balance
    await supabase.rpc('add_stars', {
      p_user_id: referrerId,
      p_amount: rewards.referrer,
    });
  }
  
  // Reward invitee (welcome bonus) - always give stars to new users
  if (rewards.invitee > 0) {
    await supabase.from('referral_rewards').insert({
      user_id: inviteeUserId,
      reward_type: 'stars',
      amount: rewards.invitee,
      reason: `Welcome bonus: ${eventType}`,
      event_id: eventId,
    });
    
    // Add stars to invitee's balance
    await supabase.rpc('add_stars', {
      p_user_id: inviteeUserId,
      p_amount: rewards.invitee,
    });
  }
  
  const message = isAffiliate 
    ? `Event recorded (affiliate partner - no stars bonus)`
    : 'Event recorded and rewards granted';
  
  return { success: true, eventId, message };
}

/**
 * Get referral stats for user (how many people they referred, events, rewards)
 */
export async function getReferralStats(userId: string) {
  const supabase = getSupabaseAdmin();
  
  // Get referrals count
  const { count: referralsCount } = await supabase
    .from('referral_attributions')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_user_id', userId);
  
  // Get events count
  const { count: eventsCount } = await supabase
    .from('referral_events')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_user_id', userId);
  
  // Get total rewards
  const { data: rewardsData } = await supabase
    .from('referral_rewards')
    .select('amount')
    .eq('user_id', userId);
  
  const totalRewards = rewardsData?.reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
  
  return {
    referralsCount: referralsCount || 0,
    eventsCount: eventsCount || 0,
    totalRewards,
  };
}

