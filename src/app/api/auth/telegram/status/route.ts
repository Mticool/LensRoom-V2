import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSessionToken, setSessionCookie } from '@/lib/telegram/auth';

/**
 * GET /api/auth/telegram/status?code=xxx
 * Check if a login code has been used and create session if so
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

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

