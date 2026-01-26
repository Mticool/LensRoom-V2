import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * GET /api/admin/referrals/overview
 * 
 * Get referral system overview stats
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
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
    const totalCodes = await safeCount("referral_codes");
    
    // Get total attributions (activated referrals)
    const totalAttributions = await safeCount("referral_attributions");
    
    // Get total events
    const totalEvents = await safeCount("referral_events");
    
    // Get events by type
    const eventsByType = await safeSelect<{ event_type: string }>("referral_events", "event_type");
    const eventTypeCounts = eventsByType.reduce((acc: Record<string, number>, e) => {
      acc[e.event_type] = (acc[e.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get total rewards
    const rewardsData = await safeSelect<{ amount: number; reward_type: string }>(
      "referral_rewards",
      "amount, reward_type"
    );
    const totalStarsRewarded = rewardsData
      .filter((r) => r.reward_type === "stars")
      .reduce((sum, r) => sum + r.amount, 0);
    
    // Get top referrers: count by referrer_user_id, then resolve names via telegram_profiles
    const attributions = await safeSelect<{ referrer_user_id: string }>(
      "referral_attributions",
      "referrer_user_id",
      { limit: 5000 }
    );
    const referrerCounts: Record<string, number> = {};
    for (const a of attributions) {
      const id = a.referrer_user_id;
      if (id) referrerCounts[id] = (referrerCounts[id] || 0) + 1;
    }
    const topIds = Object.entries(referrerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
    let profileMap: Record<string, { display_name: string; username?: string }> = {};
    if (topIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from("telegram_profiles")
          .select("auth_user_id, first_name, last_name, telegram_username")
          .in("auth_user_id", topIds);
        for (const p of profiles || []) {
          const aid = (p as any).auth_user_id;
          const name = [(p as any).first_name, (p as any).last_name].filter(Boolean).join(" ").trim();
          if (aid) profileMap[aid] = { display_name: name || (p as any).telegram_username || "—", username: (p as any).telegram_username };
        }
      } catch {
        /* ignore */
      }
    }
    const topReferrersList = topIds.map((refUserId) => {
      const p = profileMap[refUserId];
      return {
        userId: refUserId,
        displayName: p?.display_name || p?.username || "Unknown",
        referralsCount: referrerCounts[refUserId] || 0,
      };
    });
    
    // Get affiliate stats
    const totalAffiliateApps = await safeCount("affiliate_applications");
    const pendingAffiliateApps = await safeCount("affiliate_applications", { column: "status", value: "pending" });
    const approvedAffiliates = await safeCount("affiliate_tiers");
    
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
    console.error("[/api/admin/referrals/overview] Error:", error);
    return respondAuthError(error);
  }
}

