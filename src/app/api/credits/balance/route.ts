import { NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance } from '@/lib/credits/split-credits';

export async function GET() {
  try {
    // Check Telegram auth
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    // Fetch split balance (subscription + package stars)
    const supabase = getSupabaseAdmin();
    const creditBalance = await getCreditBalance(supabase, userId);

    return NextResponse.json({
      balance: creditBalance.totalBalance,
      subscriptionStars: creditBalance.subscriptionStars,
      packageStars: creditBalance.packageStars,
    });
  } catch (error) {
    console.error('[API] Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}


