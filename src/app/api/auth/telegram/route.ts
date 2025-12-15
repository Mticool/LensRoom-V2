import { NextRequest, NextResponse } from 'next/server';
import { validateTelegramHash, createSessionToken, setSessionCookie } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TelegramLoginPayload, TelegramSession } from '@/types/telegram';

export async function POST(request: NextRequest) {
  try {
    const payload: TelegramLoginPayload = await request.json();

    // 1. Validate required fields
    if (!payload.id || !payload.hash || !payload.auth_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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
    const supabase = getSupabaseAdmin();
    
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
      .select('id, telegram_id, telegram_username, first_name, photo_url, is_admin')
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
    };

    // 5. Create JWT and set cookie
    const token = await createSessionToken(session);
    await setSessionCookie(token);

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


