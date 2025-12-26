import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getReferralStats, REFERRAL_REWARDS } from '@/lib/referrals/referral-helper';

/**
 * GET /api/referrals/me
 * 
 * Get current user's referral info (code, stats, attribution)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }
    
    const userId = session.profileId;
    const supabase = getSupabaseAdmin();
    
    // Get user's referral code, or create one if doesn't exist
    let { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('code, created_at')
      .eq('user_id', userId)
      .single();
    
    // If no code exists, create one
    if (!codeData && (!codeError || codeError.code === 'PGRST116')) {
      // Generate a unique code
      const newCode = generateReferralCode();
      
      const { data: insertedCode, error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: userId,
          code: newCode,
        })
        .select('code, created_at')
        .single();
      
      if (!insertError && insertedCode) {
        codeData = insertedCode;
      } else {
        console.error('[/api/referrals/me] Failed to create code:', insertError);
      }
    }
    
    // Get user's referral stats (as referrer)
    let stats = { referralsCount: 0, eventsCount: 0, totalRewards: 0 };
    try {
      stats = await getReferralStats(userId);
    } catch (e) {
      console.warn('[/api/referrals/me] Failed to get stats:', e);
    }
    
    // Get user's attribution (who referred them)
    let attributionData = null;
    try {
      const { data } = await supabase
        .from('referral_attributions')
        .select('referrer_user_id, code, created_at')
        .eq('invitee_user_id', userId)
        .single();
      attributionData = data;
    } catch (e) {
      // Table might not exist
    }
    
    // Build referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';
    const link = codeData?.code ? `${baseUrl}/?ref=${codeData.code}` : null;
    
    // Get bonus amounts
    const signupReward = REFERRAL_REWARDS.signup;
    const inviterBonus = signupReward?.referrer || 50;
    const inviteeBonus = signupReward?.invitee || 50;
    
    return NextResponse.json({
      code: codeData?.code || null,
      link,
      bonusTotal: inviterBonus + inviteeBonus,
      inviterBonus,
      inviteeBonus,
      invitedCount: stats.referralsCount || 0,
      stats,
      referredBy: attributionData ? {
        referrerId: attributionData.referrer_user_id,
        code: attributionData.code,
        claimedAt: attributionData.created_at,
      } : null,
    });
    
  } catch (error) {
    console.error('[/api/referrals/me] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get referral info' },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

