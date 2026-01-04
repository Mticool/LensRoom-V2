import { NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance } from '@/lib/credits/split-credits';

/**
 * GET /api/auth/session
 * Returns current session info for the logged-in user
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ 
        user: null, 
        balance: 0,
        subscriptionStars: 0,
        packageStars: 0,
      });
    }

    // Get fresh profile data
    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from('telegram_profiles')
      .select('id, telegram_id, telegram_username, first_name, last_name, photo_url, is_admin, role')
      .eq('id', session.profileId)
      .single();
    const p = profile as
      | {
          id: string;
          telegram_id: number;
          telegram_username: string | null;
          first_name: string | null;
          last_name: string | null;
          photo_url: string | null;
          is_admin: boolean | null;
          role: string | null;
        }
      | null;

    // Check notification capability
    const { data: botLink } = await supabase
      .from('telegram_bot_links')
      .select('can_notify')
      .eq('telegram_id', session.telegramId)
      .single();

    // Get split balance (subscription + package stars)
    let balance = 0;
    let subscriptionStars = 0;
    let packageStars = 0;
    
    try {
      const userId = await getAuthUserId(session);
      if (userId) {
        const creditBalance = await getCreditBalance(supabase, userId);
        balance = creditBalance.totalBalance;
        subscriptionStars = creditBalance.subscriptionStars;
        packageStars = creditBalance.packageStars;
      }
    } catch (error) {
      console.error('[Session] Error fetching balance:', error);
    }

    return NextResponse.json({
      user: p
        ? {
            id: p.id,
            telegramId: p.telegram_id,
            username: p.telegram_username,
            firstName: p.first_name,
            lastName: p.last_name,
            photoUrl: p.photo_url,
            isAdmin: !!p.is_admin || p.role === "admin",
            role: (p.role as 'user' | 'manager' | 'admin') || 'user',
            canNotify: (botLink as any)?.can_notify || false,
          }
        : null,
      balance,
      subscriptionStars,
      packageStars,
    });
  } catch (error) {
    console.error('[Session] Error:', error);
    return NextResponse.json({ 
      user: null, 
      balance: 0,
      subscriptionStars: 0,
      packageStars: 0,
    });
  }
}




