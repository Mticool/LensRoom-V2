import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSessionToken, setSessionCookie } from '@/lib/telegram/auth';

function tgEmail(telegramId: number) {
  // Deterministic pseudo-email so we can create a Supabase auth user for Telegram logins.
  // This is NOT used for email login; it's only an internal identifier.
  return `tg_${telegramId}@lensroom.local`;
}

function cryptoRandomString(len: number) {
  // Avoid adding deps; password is never used for login.
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * GET /api/auth/telegram/status?code=xxx
 * Check if a login code has been used and create session if so
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const referralCode = request.nextUrl.searchParams.get('ref');
    
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Check if the code was used
    const { data: loginCode, error } = await supabase
      .from('telegram_login_codes')
      .select('*, telegram_profiles(*)')
      .eq('code', code)
      .single();

    if (error || !loginCode) {
      return NextResponse.json({ 
        status: 'not_found',
        message: 'Code not found' 
      });
    }

    // Check if expired
    if (new Date(loginCode.expires_at) < new Date()) {
      return NextResponse.json({ 
        status: 'expired',
        message: 'Code expired' 
      });
    }

    // Check if used (login completed)
    if (loginCode.used && loginCode.telegram_id) {
      // Get profile data
      const { data: profile } = await supabase
        .from('telegram_profiles')
        .select('*')
        .eq('telegram_id', loginCode.telegram_id)
        .single();

      if (!profile) {
        return NextResponse.json({ 
          status: 'error',
          message: 'Profile not found' 
        });
      }

      // Check if user can receive notifications
      const { data: botLink } = await supabase
        .from('telegram_bot_links')
        .select('can_notify')
        .eq('telegram_id', loginCode.telegram_id)
        .single();

      // Ensure auth.users entry exists for this Telegram user so generations/credits work.
      // Bot-login flow previously did NOT create auth user, which caused:
      // - /api/generate/photo|video -> "User account not found"
      let authUserId: string | null = null;
      try {
        // Fast path: read mapping if present (migration 013)
        authUserId = (profile as any)?.auth_user_id || null;

        if (!authUserId) {
          const email = tgEmail(Number(loginCode.telegram_id));
          const { data: users } = await supabase.auth.admin.listUsers();
          const found = users?.users?.find(
            (u: any) => u.user_metadata?.telegram_id === loginCode.telegram_id || u.email === email
          );
          authUserId = found?.id || null;

          if (!authUserId) {
            const randomPassword = cryptoRandomString(32);
            const { data: created, error: createError } = await supabase.auth.admin.createUser({
              email,
              password: randomPassword,
              email_confirm: true,
              user_metadata: {
                telegram_id: loginCode.telegram_id,
                telegram_username: (profile as any)?.telegram_username || null,
                first_name: (profile as any)?.first_name || null,
                last_name: (profile as any)?.last_name || null,
                photo_url: (profile as any)?.photo_url || null,
              },
            });
            if (!createError) authUserId = created.user?.id || null;
          }
        }

        // Best-effort: persist mapping for fast future lookups
        if (authUserId) {
          try {
            await supabase.from('telegram_profiles').update({ auth_user_id: authUserId } as any).eq('id', profile.id);
          } catch {
            // ignore if column missing
          }

          // Ensure credits row exists
          try {
            await supabase.from('credits').upsert({ user_id: authUserId, amount: 0 }, { onConflict: 'user_id' });
          } catch {
            // ignore
          }
        }
      } catch (e) {
        console.warn('[Telegram Status] Ensure auth user failed (ignored):', e);
      }

      // Apply referral bonus (best-effort, idempotent)
      if (referralCode && referralCode.trim()) {
        try {
          const { data: users } = await supabase.auth.admin.listUsers();
          const authUser = users?.users?.find((u: any) => u.user_metadata?.telegram_id === loginCode.telegram_id);
          const authUserId = authUser?.id;
          if (authUserId) {
            await supabase.rpc('claim_referral', {
              p_code: referralCode.trim(),
              p_invitee_user_id: authUserId,
            });
          }
        } catch (e) {
          console.warn('[Telegram Status] Referral claim failed (ignored):', e);
        }
      }

      // Create session token
      const token = await createSessionToken({
        profileId: profile.id,
        telegramId: profile.telegram_id,
        username: profile.telegram_username,
        firstName: profile.first_name,
        photoUrl: profile.photo_url,
        isAdmin: profile.is_admin || false,
        role: (profile.role as 'user' | 'manager' | 'admin') || 'user',
      });

      // Create response
      const response = NextResponse.json({
        status: 'authenticated',
        user: {
          id: profile.id,
          telegramId: profile.telegram_id,
          username: profile.telegram_username,
          firstName: profile.first_name,
          lastName: profile.last_name,
          photoUrl: profile.photo_url,
          isAdmin: profile.is_admin,
        },
        canNotify: botLink?.can_notify ?? true,
      });

      // Set cookie on response using headers (proper way in Next.js App Router)
      const isProduction = process.env.NODE_ENV === 'production';
      const maxAge = 30 * 24 * 60 * 60; // 30 days
      
      response.cookies.set('lr_session', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: maxAge,
        path: '/',
      });
      
      console.log('[Telegram Status] Session created and cookie set for user:', profile.id);

      // Clean up old codes (optional, for hygiene)
      await supabase
        .from('telegram_login_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return response;
    }

    // Not yet used - still waiting
    return NextResponse.json({ 
      status: 'pending',
      message: 'Waiting for Telegram confirmation' 
    });

  } catch (error) {
    console.error('[Telegram Status] Error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}


