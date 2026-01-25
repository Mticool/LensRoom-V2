import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

type EarningRow = {
  id: string;
  referral_user_id: string;
  payment_id: string;
  amount_rub: number;
  commission_percent: number;
  commission_rub: number;
  tariff_name: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  is_first_purchase?: boolean | null;
  buyer_payment_index?: number | null;
};

/**
 * GET /api/affiliate/earnings/me
 *
 * Returns partner earnings for the current user (if they are an affiliate).
 * Used in the user's profile to show earnings and latest transactions.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getAuthUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1), 100);

    const supabase = getSupabaseAdmin();

    // Tier (if not found, user is not an affiliate partner)
    const { data: tierData } = await supabase
      .from('affiliate_tiers')
      .select('tier, percent, recurring_percent, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    const isAffiliate = !!tierData;

    // Earnings list (if table missing, return empty)
    const { data: earnings, error: eErr } = await supabase
      .from('affiliate_earnings')
      .select(
        'id, referral_user_id, payment_id, amount_rub, commission_percent, commission_rub, tariff_name, status, paid_at, notes, created_at, is_first_purchase, buyer_payment_index'
      )
      .eq('affiliate_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eErr) {
      if ((eErr as any)?.code === '42P01') {
        return NextResponse.json({
          isAffiliate,
          tier: tierData || null,
          totals: { pendingRub: 0, paidRub: 0, totalRub: 0 },
          earnings: [],
        });
      }
      throw eErr;
    }

    const list = (earnings || []) as unknown as EarningRow[];

    // Enrich with referral telegram profiles
    const referralIds = [...new Set(list.map((e) => e.referral_user_id).filter(Boolean))];
    let profilesMap: Record<string, any> = {};
    if (referralIds.length > 0) {
      const { data: profiles } = await supabase
        .from('telegram_profiles')
        .select('auth_user_id, first_name, last_name, telegram_username')
        .in('auth_user_id', referralIds);

      profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.auth_user_id] = p;
        return acc;
      }, {});
    }

    const totals = list.reduce(
      (acc, e) => {
        const rub = Number(e.commission_rub || 0);
        acc.totalRub += rub;
        if (e.status === 'pending') acc.pendingRub += rub;
        if (e.status === 'paid') acc.paidRub += rub;
        return acc;
      },
      { pendingRub: 0, paidRub: 0, totalRub: 0 }
    );

    const enriched = list.map((e) => {
      const p = profilesMap[e.referral_user_id];
      const displayName = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : null;
      return {
        ...e,
        referral: {
          username: p?.telegram_username || null,
          displayName: displayName || null,
        },
      };
    });

    return NextResponse.json({
      isAffiliate,
      tier: tierData || null,
      totals: {
        pendingRub: Number(totals.pendingRub.toFixed(2)),
        paidRub: Number(totals.paidRub.toFixed(2)),
        totalRub: Number(totals.totalRub.toFixed(2)),
      },
      earnings: enriched,
    });
  } catch (error) {
    console.error('[/api/affiliate/earnings/me] Error:', error);
    return NextResponse.json({ error: 'Failed to load earnings' }, { status: 500 });
  }
}


