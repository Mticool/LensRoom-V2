import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { validateWebAppData } from '@/lib/telegram/bot-client';

/**
 * POST /api/telegram/auth
 * Authenticates a user via Telegram Mini App init data
 */
export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    // Validate Telegram WebApp data
    const validation = validateWebAppData(initData);
    
    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    const telegramUser = validation.user;
    if (!telegramUser) {
      return NextResponse.json({ error: 'No user in initData' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get or create telegram profile
    const { data: profileId, error: profileError } = await supabase.rpc(
      'get_or_create_telegram_profile',
      {
        p_telegram_id: telegramUser.id,
        p_first_name: telegramUser.first_name,
        p_last_name: telegramUser.last_name || null,
        p_username: telegramUser.username || null,
        p_language_code: telegramUser.language_code || 'ru',
        p_is_premium: telegramUser.is_premium || false,
      }
    );

    if (profileError) {
      console.error('[TG Auth] Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to get/create profile' }, { status: 500 });
    }

    // Fetch balance
    const { data: credits } = await supabase
      .from('credits')
      .select('amount, subscription_stars, package_stars')
      .eq('user_id', profileId)
      .single();

    // Create session token (simple JWT alternative for Mini App)
    const sessionData = {
      profileId,
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      username: telegramUser.username,
      balance: credits?.amount || 0,
      subscriptionStars: credits?.subscription_stars || 0,
      packageStars: credits?.package_stars || 0,
    };

    // Return session info
    return NextResponse.json({
      success: true,
      session: sessionData,
    });

  } catch (error) {
    console.error('[TG Auth] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/telegram/auth
 * Get current session from cookie or query
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');

  if (!telegramId) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Find telegram profile
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select(`
      id,
      telegram_id,
      first_name,
      last_name,
      username,
      user_id
    `)
    .eq('telegram_id', parseInt(telegramId))
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Fetch balance
  const { data: credits } = await supabase
    .from('credits')
    .select('amount, subscription_stars, package_stars')
    .eq('user_id', profile.id)
    .single();

  return NextResponse.json({
    profile,
    balance: credits?.amount || 0,
    subscriptionStars: credits?.subscription_stars || 0,
    packageStars: credits?.package_stars || 0,
  });
}

