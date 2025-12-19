import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

/**
 * GET /api/admin/payments
 * Get payments and subscriptions data (admin only)
 */
export async function GET() {
  try {
    await requireRole("admin");

    const supabase = getSupabaseAdmin();

    // Get all subscriptions with user info
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          plan
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (subError) {
      console.error('[Admin Payments] Subscriptions error:', subError);
    }

    // Get recent payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (payError) {
      console.error('[Admin Payments] Payments error:', payError);
    }

    // Get stats
    const { count: totalActiveSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Calculate revenue (sum of completed payments)
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const revenueAny = (revenueData as any[]) || [];
    const totalRevenue = revenueAny.reduce((sum, p) => sum + Number(p?.amount || 0), 0);

    // Get plan distribution
    const { data: planData } = await supabase
      .from('profiles')
      .select('plan')
      .not('plan', 'is', null);

    const planCounts: Record<string, number> = {};
    const planAny = (planData as any[]) || [];
    planAny.forEach((p: any) => {
      if (p.plan) {
        planCounts[p.plan] = (planCounts[p.plan] || 0) + 1;
      }
    });

    return NextResponse.json({
      subscriptions: subscriptions || [],
      payments: payments || [],
      stats: {
        totalActiveSubscriptions: totalActiveSubscriptions || 0,
        totalPayments: totalPayments || 0,
        totalRevenue,
        planCounts,
      },
    });
  } catch (error) {
    console.error('[Admin Payments] Error:', error);
    return respondAuthError(error);
  }
}


