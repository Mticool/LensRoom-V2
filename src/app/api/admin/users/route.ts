import { NextResponse } from 'next/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/admin/users
 * Get all users with their notification status (admin only)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get all telegram profiles
    const { data: profiles, error } = await supabase
      .from('telegram_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Users] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get bot links for notification status
    const telegramIds = profiles?.map(p => p.telegram_id) || [];
    
    const { data: botLinks } = await supabase
      .from('telegram_bot_links')
      .select('telegram_id, can_notify')
      .in('telegram_id', telegramIds);

    // Create a map for quick lookup
    const notifyMap: Record<number, boolean> = {};
    botLinks?.forEach((link: any) => {
      notifyMap[link.telegram_id] = link.can_notify;
    });

    // Combine data
    const users = profiles?.map(p => ({
      ...p,
      can_notify: notifyMap[p.telegram_id] ?? false,
    })) || [];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

