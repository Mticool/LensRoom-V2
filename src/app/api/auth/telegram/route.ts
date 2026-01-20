import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramHash, createSessionToken, setSessionCookie } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TelegramLoginPayload, TelegramSession } from '@/types/telegram';
import { env } from "@/lib/env";
import { integrationNotConfigured } from "@/lib/http/integration-error";

function tgEmail(telegramId: number) {
  // Deterministic pseudo-email so we can create a Supabase auth user for Telegram logins.
  // This is NOT used for email login; it's only an internal identifier.
  return `tg_${telegramId}@lensroom.local`;
}

export async function POST(request: NextRequest) {
  try {
    const payload: TelegramLoginPayload & { referralCode?: string } = await request.json();

    // 1. Validate required fields
    if (!payload.id || !payload.hash || !payload.auth_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure Telegram integration configured (return stable JSON instead of throwing in prod).
    const missing: string[] = [];
    if (!env.optional("TELEGRAM_BOT_TOKEN")) missing.push("TELEGRAM_BOT_TOKEN");
    if (missing.length) {
      console.error("[Telegram Auth] Integration is not configured:", missing.join(", "));
      return integrationNotConfigured("telegram", missing);
    }

    // Supabase is required for Telegram auth (profile + credits).
    if (!env.optional("NEXT_PUBLIC_SUPABASE_URL")) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!env.optional("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (missing.length) {
      console.error("[Telegram Auth] Integration is not configured:", missing.join(", "));
      return integrationNotConfigured("telegram", missing);
    }

    // 2. Validate Telegram hash (HMAC signature)
    const isValid = validateTelegramHash(payload);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Telegram authentication' },
        { status: 401 }
      );
    }

    // 3. Upsert profile in Supabase
    const supabase = getSupabaseAdmin() as any;
    
    const { data: profile, error: upsertError } = await supabase
      .from('telegram_profiles')
      .upsert(
        {
          telegram_id: payload.id,
          telegram_username: payload.username || null,
          first_name: payload.first_name || null,
          last_name: payload.last_name || null,
          photo_url: payload.photo_url || null,
          last_login_at: new Date().toISOString(),
        },
        {
          onConflict: 'telegram_id',
        }
      )
      .select('id, telegram_id, telegram_username, first_name, photo_url, is_admin, role')
      .single();

    if (upsertError) {
      console.error('[Telegram Auth] Upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    // 4. Create session
    const session: TelegramSession = {
      profileId: profile.id,
      telegramId: profile.telegram_id,
      username: profile.telegram_username,
      firstName: profile.first_name,
      photoUrl: profile.photo_url,
      isAdmin: profile.is_admin || false,
      role: (profile.role as 'user' | 'manager' | 'admin') || 'user',
    };

    // 5. Create JWT and set cookie
    const token = await createSessionToken(session);
    await setSessionCookie(token);

    // 5.1 Ensure auth.users entry exists for this Telegram user (single source of truth for credits/referrals)
    // Note: We rely on service role here; do not expose this to client.
    let authUserId: string | null = null;
    try {
      const email = tgEmail(payload.id);

      // Try to find existing auth user (by metadata OR deterministic email)
      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find(
        (u: any) => u.user_metadata?.telegram_id === payload.id || u.email === email
      );
      authUserId = found?.id || null;

      if (!authUserId) {
        // Create one if missing
        const randomPassword = cryptoRandomString(32);
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            telegram_id: payload.id,
            telegram_username: payload.username || null,
            first_name: payload.first_name || null,
            last_name: payload.last_name || null,
            photo_url: payload.photo_url || null,
          },
        });

        if (createError) {
          console.warn('[Telegram Auth] Failed to create auth user (ignored):', createError);
        } else {
          authUserId = created.user?.id || null;
        }
      }

      // Ensure credits row exists with 50⭐ bonus for new users
      if (authUserId) {
        const REGISTRATION_BONUS = 50;
        
        console.log(`[Telegram Auth] Processing registration bonus for user ${authUserId}`);
        
        // Check if credits already exist with balance (use maybeSingle to handle no-row case)
        const { data: existingCredits, error: creditsError } = await supabase
          .from('credits')
          .select('id, package_stars, subscription_stars, amount')
          .eq('user_id', authUserId)
          .maybeSingle();
        
        if (creditsError) {
          console.error('[Telegram Auth] Error checking credits:', creditsError);
        }
        
        // Check if credits don't exist OR exist but have 0 balance (bonus not yet applied)
        const currentTotal = existingCredits 
          ? (existingCredits.package_stars || 0) + (existingCredits.subscription_stars || 0) + (existingCredits.amount || 0)
          : 0;
        const needsBonus = !existingCredits || currentTotal === 0;
        
        console.log(`[Telegram Auth] Current balance for ${authUserId}: ${currentTotal}⭐, needsBonus: ${needsBonus}`);
        
        if (needsBonus) {
          // Upsert credits with bonus - handles both new records and 0-balance records
          const { error: upsertCreditsError } = await supabase
            .from('credits')
            .upsert({
              user_id: authUserId,
              amount: REGISTRATION_BONUS,
              subscription_stars: 0,
              package_stars: REGISTRATION_BONUS,
            }, { onConflict: 'user_id' });
          
          if (upsertCreditsError) {
            console.error('[Telegram Auth] Failed to upsert credits:', upsertCreditsError);
          } else {
            console.log(`[Telegram Auth] ✅ Successfully created credits with ${REGISTRATION_BONUS}⭐ bonus for ${authUserId}`);
          }
        } else {
          console.log(`[Telegram Auth] User ${authUserId} already has ${currentTotal}⭐, skipping bonus`);
        }
      }

      // Best-effort: persist mapping to telegram_profiles for fast lookups (migration 013).
      if (authUserId) {
        try {
          await supabase
            .from('telegram_profiles')
            .update({ auth_user_id: authUserId } as any)
            .eq('id', profile.id);
        } catch {
          // ignore if column doesn't exist yet
        }
      }
    } catch (e) {
      console.warn('[Telegram Auth] Ensure auth user failed (ignored):', e);
    }

    // 5.2 Apply referral bonus (best-effort, idempotent in DB)
    if (authUserId && payload.referralCode && typeof payload.referralCode === 'string' && payload.referralCode.trim()) {
      try {
        await supabase.rpc('claim_referral', {
          p_code: payload.referralCode.trim(),
          p_invitee_user_id: authUserId,
        });
      } catch (e) {
        console.warn('[Telegram Auth] Referral claim failed (ignored):', e);
      }
    }

    // 6. Check if user can receive notifications
    const { data: botLink } = await supabase
      .from('telegram_bot_links')
      .select('can_notify')
      .eq('telegram_id', payload.id)
      .single();

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.telegram_username,
        firstName: profile.first_name,
        photoUrl: profile.photo_url,
        isAdmin: profile.is_admin,
      },
      canNotify: botLink?.can_notify || false,
    });
  } catch (error) {
    console.error('[Telegram Auth] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function cryptoRandomString(len: number) {
  // Avoid adding new deps; deterministic enough for internal password.
  // This password is never used for login (Telegram uses our JWT cookie).
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Logout endpoint
export async function DELETE() {
  try {
    const { clearSessionCookie } = await import('@/lib/telegram/auth');
    await clearSessionCookie();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Telegram Auth] Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}



