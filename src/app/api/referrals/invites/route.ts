import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/referrals/invites
 *
 * Returns the list of users invited by current user (as referrer).
 * This is used in the user's profile to show "my referrals".
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
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);

    const supabase = getSupabaseAdmin();

    // Fetch attributions (referrals)
    const { data: attributions, error: attrErr, count } = await supabase
      .from('referral_attributions')
      .select('invitee_user_id, created_at', { count: 'exact' })
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (attrErr) {
      // Table might not exist in some environments
      if ((attrErr as any)?.code === '42P01') {
        return NextResponse.json({ total: 0, invites: [] });
      }
      throw attrErr;
    }

    const inviteeIds = [...new Set((attributions || []).map((a: any) => a.invitee_user_id).filter(Boolean))];

    // Fetch telegram profiles for display
    let profilesMap: Record<string, any> = {};
    if (inviteeIds.length > 0) {
      const { data: profiles } = await supabase
        .from('telegram_profiles')
        .select('auth_user_id, first_name, last_name, telegram_username')
        .in('auth_user_id', inviteeIds);

      profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.auth_user_id] = p;
        return acc;
      }, {});
    }

    const invites = (attributions || []).map((a: any) => {
      const p = profilesMap[a.invitee_user_id];
      const displayName = p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : null;
      return {
        inviteeUserId: a.invitee_user_id,
        claimedAt: a.created_at,
        username: p?.telegram_username || null,
        displayName: displayName || null,
      };
    });

    return NextResponse.json({
      total: count || invites.length || 0,
      invites,
    });
  } catch (error) {
    console.error('[/api/referrals/invites] Error:', error);
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
}


