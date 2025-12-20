import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getReferralStats } from '@/lib/referrals/referral-helper';

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
    
    // Get user's referral code
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code, created_at')
      .eq('user_id', userId)
      .single();
    
    // Get user's referral stats (as referrer)
    const stats = await getReferralStats(userId);
    
    // Get user's attribution (who referred them)
    const { data: attributionData } = await supabase
      .from('referral_attributions')
      .select('referrer_user_id, code, created_at')
      .eq('invitee_user_id', userId)
      .single();
    
    return NextResponse.json({
      code: codeData?.code || null,
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
