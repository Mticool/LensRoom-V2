import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { claimReferral, recordReferralEventAndReward } from '@/lib/referrals/referral-helper';

/**
 * POST /api/referrals/claim
 * 
 * Claim a referral code (attach invitee to referrer)
 * Body: { code: string }
 * 
 * Returns: { success: boolean, alreadyClaimed: boolean, referrerId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }
    
    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(session);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { code } = body;
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }
    
    // Claim referral
    const result = await claimReferral(userId, code.toUpperCase());
    
    if (result.success) {
      // Record signup event + rewards (idempotent). Ensures bonuses are granted even if
      // ensure-profile signup never runs (e.g. profile created before claim).
      try {
        await recordReferralEventAndReward(
          userId,
          'signup',
          `signup:${userId}`,
          { source: 'claim' }
        );
      } catch (e) {
        console.warn('[/api/referrals/claim] Signup event failed (non-fatal):', e);
      }
      return NextResponse.json({
        success: true,
        message: 'Referral claimed successfully',
        referrerId: result.referrerId,
      });
    }
    
    if (result.alreadyClaimed) {
      return NextResponse.json({
        success: false,
        alreadyClaimed: true,
        message: 'You already have a referrer',
        referrerId: result.referrerId,
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid referral code',
    });
    
  } catch (error) {
    console.error('[/api/referrals/claim] Error:', error);
    return NextResponse.json(
      { error: 'Failed to claim referral' },
      { status: 500 }
    );
  }
}

