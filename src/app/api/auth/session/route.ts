import { NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/auth/session
 * Returns current session info for the logged-in user
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ user: null, balance: 0 });
    }

    // Get fresh profile data
    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from('telegram_profiles')
      .select('id, telegram_id, telegram_username, first_name, last_name, photo_url, is_admin, role')
      .eq('id', session.profileId)
      .single();

    // Check notification capability
    const { data: botLink } = await supabase
      .from('telegram_bot_links')
      .select('can_notify')
      .eq('telegram_id', session.telegramId)
      .single();

    // Get balance
    let balance = 0;
    try {
      const userId = await getAuthUserId(session);
      if (userId) {
        const { data: creditsData } = await supabase
          .from('credits')
          .select('amount')
          .eq('user_id', userId)
          .single();
        
        balance = creditsData?.amount || 0;
      }
    } catch (error) {
      console.error('[Session] Error fetching balance:', error);
    }

    return NextResponse.json({
      user: profile ? {
        id: profile.id,
        telegramId: profile.telegram_id,
        username: profile.telegram_username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        photoUrl: profile.photo_url,
        isAdmin: profile.is_admin || profile.role === 'admin',
        role: (profile.role as 'user' | 'manager' | 'admin') || 'user',
        canNotify: botLink?.can_notify || false,
      } : null,
      balance,
    });
  } catch (error) {
    console.error('[Session] Error:', error);
    return NextResponse.json({ user: null, balance: 0 });
  }
}


