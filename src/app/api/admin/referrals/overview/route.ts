import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/telegram/auth';

/**
 * GET /api/admin/referrals/overview
 * 
 * Get referral system overview stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.profileId;
    
    const supabase = getSupabaseAdmin();
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get total referral codes
    const { count: totalCodes } = await supabase
      .from('referral_codes')
      .select('*', { count: 'exact', head: true });
    
    // Get total attributions (activated referrals)
    const { count: totalAttributions } = await supabase
      .from('referral_attributions')
      .select('*', { count: 'exact', head: true });
    
    // Get total events
    const { count: totalEvents } = await supabase
      .from('referral_events')
      .select('*', { count: 'exact', head: true });
    
    // Get events by type
    const { data: eventsByType } = await supabase
      .from('referral_events')
      .select('event_type')
      .order('event_type');
    
    const eventTypeCounts = eventsByType?.reduce((acc: Record<string, number>, e: any) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Get total rewards
    const { data: rewardsData } = await supabase
      .from('referral_rewards')
      .select('amount, reward_type');
    
    const totalStarsRewarded = rewardsData
      ?.filter((r: any) => r.reward_type === 'stars')
      .reduce((sum: number, r: any) => sum + r.amount, 0) || 0;
    
    // Get top referrers
    const { data: topReferrers } = await supabase
      .from('referral_attributions')
      .select('referrer_user_id, profiles!referral_attributions_referrer_user_id_fkey(display_name, username)')
      .limit(1000); // Fetch all for counting
    
    const referrerCounts = topReferrers?.reduce((acc: Record<string, number>, a: any) => {
      acc[a.referrer_user_id] = (acc[a.referrer_user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const topReferrersList = Object.entries(referrerCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 10)
      .map((entry: any) => {
        const [userId, count] = entry;
        const profile = topReferrers?.find((r: any) => r.referrer_user_id === userId)?.profiles;
        return {
          userId,
          displayName: profile?.display_name || profile?.username || 'Unknown',
          referralsCount: count,
        };
      });
    
    // Get affiliate stats
    const { count: totalAffiliateApps } = await supabase
      .from('affiliate_applications')
      .select('*', { count: 'exact', head: true });
    
    const { count: pendingAffiliateApps } = await supabase
      .from('affiliate_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    const { count: approvedAffiliates } = await supabase
      .from('affiliate_tiers')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      overview: {
        totalCodes: totalCodes || 0,
        totalAttributions: totalAttributions || 0,
        totalEvents: totalEvents || 0,
        totalStarsRewarded,
        eventsByType: eventTypeCounts,
        topReferrers: topReferrersList,
      },
      affiliate: {
        totalApplications: totalAffiliateApps || 0,
        pendingApplications: pendingAffiliateApps || 0,
        approvedAffiliates: approvedAffiliates || 0,
      },
    });
    
  } catch (error) {
    console.error('[/api/admin/referrals/overview] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}

