import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/admin/waitlist
 * Get waitlist subscriptions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'active';

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('waitlist_subscriptions')
      .select(`
        id,
        profile_id,
        type,
        source,
        status,
        created_at,
        notified_at,
        telegram_profiles (
          telegram_id,
          telegram_username,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: subscriptions, error } = await query.limit(100);

    if (error) {
      console.error('[Admin Waitlist] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error('[Admin Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

