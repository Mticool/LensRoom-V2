import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { validateWebAppData } from '@/lib/telegram/bot-client';
import { createSessionToken, setSessionCookie } from '@/lib/telegram/auth';
import { getCreditBalance } from '@/lib/credits/split-credits';
import { REGISTRATION_BONUS } from '@/config/pricing';

/**
 * Helper: Create auth user and credits with bonus for Telegram user
 */
async function ensureAuthUserWithBonus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  telegramId: number,
  firstName: string,
  lastName?: string | null,
  username?: string | null
): Promise<{ authUserId: string | null; isNewUser: boolean; bonusGiven: number }> {
  const fakeEmail = `tg_${telegramId}@telegram.lensroom.ru`;
  let authUserId: string | null = null;
  let isNewUser = false;
  let bonusGiven = 0;

  try {
    // Check if auth user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuth = existingUsers?.users?.find(
      (u: any) => u.user_metadata?.telegram_id === telegramId || u.email === fakeEmail
    );

    if (existingAuth) {
      authUserId = existingAuth.id;
    } else {
      // Create new auth user
      const randomPassword = Array.from({ length: 32 }, () => 
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
      ).join('');

      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          telegram_username: username || null,
          first_name: firstName,
          last_name: lastName || null,
          provider: 'telegram_miniapp',
        },
      });

      if (createError) {
        console.warn('[TG MiniApp Auth] Failed to create auth user:', createError);
      } else {
        authUserId = created.user?.id || null;
        isNewUser = true;
        console.log(`[TG MiniApp Auth] Created auth user: ${authUserId}`);
      }
    }

    // Ensure credits exist with bonus for new users
    if (authUserId) {
      const { data: existingCredits } = await supabase
        .from('credits')
        .select('id, package_stars, subscription_stars, amount')
        .eq('user_id', authUserId)
        .single();

      // Check if credits don't exist OR exist but have 0 balance (created by adjust_credits)
      const needsBonus = !existingCredits || 
        (existingCredits.package_stars === 0 && 
         existingCredits.subscription_stars === 0 && 
         (existingCredits.amount || 0) === 0);

      if (needsBonus) {
        // Upsert credits with bonus - handles both new records and 0-balance records
        await supabase
          .from('credits')
          .upsert({
            user_id: authUserId,
            amount: REGISTRATION_BONUS,
            subscription_stars: 0,
            package_stars: REGISTRATION_BONUS,
          }, { onConflict: 'user_id' });
        bonusGiven = REGISTRATION_BONUS;
        console.log(`[TG MiniApp Auth] Created/updated credits with ${REGISTRATION_BONUS}⭐ bonus for ${authUserId}`);
      }
    }
  } catch (e) {
    console.error('[TG MiniApp Auth] ensureAuthUserWithBonus error:', e);
  }

  return { authUserId, isNewUser, bonusGiven };
}

/**
 * POST /api/telegram/auth
 * Authenticates a user via Telegram Mini App init data
 * Auto-creates auth user and grants 50⭐ bonus for new users
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

    // Check if telegram profile exists
    const { data: existingProfile } = await supabase
      .from('telegram_profiles')
      .select('id, auth_user_id, first_name, telegram_username, photo_url, is_admin, role')
      .eq('telegram_id', telegramUser.id)
      .single();

    let profileId = existingProfile?.id || null;
    let authUserId = existingProfile?.auth_user_id || null;

    // If profile doesn't exist or has no auth_user_id, auto-register
    if (!existingProfile || !existingProfile.auth_user_id) {
      // Create/find auth user with bonus
      const { authUserId: newAuthUserId, bonusGiven } = await ensureAuthUserWithBonus(
        supabase,
        telegramUser.id,
        telegramUser.first_name,
        telegramUser.last_name,
        telegramUser.username
      );
      authUserId = newAuthUserId;

      if (!existingProfile) {
        // Create telegram profile with auth_user_id
        const { data: newProfile, error: insertError } = await supabase
          .from('telegram_profiles')
          .insert({
            telegram_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            telegram_username: telegramUser.username || null,
            auth_user_id: authUserId,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('[TG MiniApp Auth] Insert profile error:', insertError);
        }
        profileId = newProfile?.id || null;
      } else if (authUserId) {
        // Update existing profile with auth_user_id
        await supabase
          .from('telegram_profiles')
          .update({ auth_user_id: authUserId })
          .eq('id', existingProfile.id);
        profileId = existingProfile.id;
      }

      if (bonusGiven > 0) {
        console.log(`[TG MiniApp Auth] New user ${telegramUser.id} (${telegramUser.first_name}) got ${bonusGiven}⭐ bonus`);
      }
    }

    // Fetch balance
    let balance = 0;
    let subscriptionStars = 0;
    let packageStars = 0;

    if (authUserId) {
      try {
        const creditBalance = await getCreditBalance(supabase, authUserId);
        balance = creditBalance.totalBalance;
        subscriptionStars = creditBalance.subscriptionStars;
        packageStars = creditBalance.packageStars;
      } catch {
        // ignore
      }
    }

    // Set lr_session cookie so the normal web app (and /api/auth/me) sees the user as authenticated.
    // This is critical for enabling the Generate button on /create.
    try {
      const token = await createSessionToken({
        profileId: profileId || existingProfile?.id || '',
        telegramId: telegramUser.id,
        username: existingProfile?.telegram_username || telegramUser.username || null,
        firstName: existingProfile?.first_name || telegramUser.first_name || null,
        photoUrl: (existingProfile as any)?.photo_url || null,
        isAdmin: !!(existingProfile as any)?.is_admin || (existingProfile as any)?.role === 'admin',
        role: ((existingProfile as any)?.role as any) || 'user',
      });
      await setSessionCookie(token);
    } catch (e) {
      console.warn('[TG MiniApp Auth] Failed to set session cookie (ignored):', e);
    }

    return NextResponse.json({
      success: true,
      session: {
        profileId,
        authUserId,
        telegramId: telegramUser.id,
        firstName: existingProfile?.first_name || telegramUser.first_name,
        username: existingProfile?.telegram_username || telegramUser.username,
        balance,
        subscriptionStars,
        packageStars,
        needsAuth: !authUserId, // Only true if auth creation failed
      },
    });

  } catch (error) {
    console.error('[TG MiniApp Auth] Error:', error);
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
      user_id,
      auth_user_id
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
    .eq('user_id', (profile as any).auth_user_id || (profile as any).user_id || profile.id)
    .single();

  return NextResponse.json({
    profile,
    balance: credits?.amount || 0,
    subscriptionStars: credits?.subscription_stars || 0,
    packageStars: credits?.package_stars || 0,
  });
}
