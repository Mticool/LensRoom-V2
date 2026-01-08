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
    
    // Check if user is admin from session
    if (!session.isAdmin && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Safe query helper - returns 0 or empty if table doesn't exist
    const safeCount = async (table: string, filter?: { column: string; value: string }) => {
      try {
        let query = supabase.from(table).select('*', { count: 'exact', head: true });
        if (filter) {
          query = query.eq(filter.column, filter.value);
        }
        const { count, error } = await query;
        if (error) {
          console.warn(`[admin/referrals] Table ${table} query error:`, error.message);
          return 0;
        }
        return count || 0;
      } catch (e) {
        return 0;
      }
    };
    
    const safeSelect = async <T>(table: string, columns: string, options?: { limit?: number }) => {
      try {
        let query = supabase.from(table).select(columns);
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        const { data, error } = await query;
        if (error) {
          console.warn(`[admin/referrals] Table ${table} select error:`, error.message);
          return [] as T[];
        }
        return (data || []) as T[];
      } catch (e) {
        return [] as T[];
      }
    };
    
    // Get total referral codes
    const totalCodes = await safeCount('referral_codes');
    
    // Get total attributions (activated referrals)
    const totalAttributions = await safeCount('referral_attributions');
    
    // Get total events
    const totalEvents = await safeCount('referral_events');
    
    // Get events by type
    const eventsByType = await safeSelect<{ event_type: string }>('referral_events', 'event_type');
    const eventTypeCounts = eventsByType.reduce((acc: Record<string, number>, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get total rewards
    const rewardsData = await safeSelect<{ amount: number; reward_type: string }>('referral_rewards', 'amount, reward_type');
    const totalStarsRewarded = rewardsData
      .filter((r) => r.reward_type === 'stars')
      .reduce((sum, r) => sum + r.amount, 0);
    
    // Get top referrers
    const topReferrers = await safeSelect<{ referrer_user_id: string; profiles: any }>(
      'referral_attributions',
      'referrer_user_id, profiles!referral_attributions_referrer_user_id_fkey(display_name, username)',
      { limit: 1000 }
    );
    
    const referrerCounts = topReferrers.reduce((acc: Record<string, number>, a) => {
      acc[a.referrer_user_id] = (acc[a.referrer_user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topReferrersList = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map((entry) => {
        const [refUserId, count] = entry;
        const refProfile = topReferrers.find((r) => r.referrer_user_id === refUserId)?.profiles;
        return {
          userId: refUserId,
          displayName: refProfile?.display_name || refProfile?.username || 'Unknown',
          referralsCount: count,
        };
      });
    
    // Get affiliate stats
    const totalAffiliateApps = await safeCount('affiliate_applications');
    const pendingAffiliateApps = await safeCount('affiliate_applications', { column: 'status', value: 'pending' });
    const approvedAffiliates = await safeCount('affiliate_tiers');
    
    return NextResponse.json({
      overview: {
        totalCodes,
        totalAttributions,
        totalEvents,
        totalStarsRewarded,
        eventsByType: eventTypeCounts,
        topReferrers: topReferrersList,
      },
      affiliate: {
        totalApplications: totalAffiliateApps,
        pendingApplications: pendingAffiliateApps,
        approvedAffiliates,
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

