import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * GET /api/admin/stats
 * Get dashboard statistics (admin only)
 */
export async function GET() {
  try {
    await requireRole("admin");

    const supabase = getSupabaseAdmin();

    // Get total users
    const { count: totalUsers } = await supabase
      .from('telegram_profiles')
      .select('*', { count: 'exact', head: true });

    // Get users with notifications enabled
    const { count: usersWithNotifications } = await supabase
      .from('telegram_bot_links')
      .select('*', { count: 'exact', head: true })
      .eq('can_notify', true);

    // Get total waitlist subscriptions
    const { count: totalWaitlist } = await supabase
      .from('waitlist_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get recent logins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentLogins } = await supabase
      .from('telegram_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', sevenDaysAgo.toISOString());

    // Get waitlist stats by type
    const { data: waitlistData } = await supabase
      .from('waitlist_subscriptions')
      .select('type')
      .eq('status', 'active');

    const waitlistByType: Record<string, number> = {};
    waitlistData?.forEach((item: any) => {
      waitlistByType[item.type] = (waitlistByType[item.type] || 0) + 1;
    });

    return NextResponse.json({
      dashboard: {
        totalUsers: totalUsers || 0,
        usersWithNotifications: usersWithNotifications || 0,
        totalWaitlist: totalWaitlist || 0,
        recentLogins: recentLogins || 0,
      },
      waitlist: {
        byType: waitlistByType,
        totalCanNotify: usersWithNotifications || 0,
      },
    });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return respondAuthError(error);
  }
}



