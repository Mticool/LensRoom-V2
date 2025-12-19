import crypto from 'crypto';
import { TelegramLoginPayload, TelegramSession } from '@/types/telegram';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { env } from "@/lib/env";

const COOKIE_NAME = 'lr_session';
const MAX_AUTH_AGE = 24 * 60 * 60; // 24 hours in seconds
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

function getTelegramBotToken(): string {
  // No import-time env reads; only when auth is used.
  return env.required("TELEGRAM_BOT_TOKEN");
}

function getJwtSecret(): string {
  const s = env.required("JWT_SECRET");
  // In dev we allow empty and fall back to a local-only secret.
  return s || "dev-secret-change-me";
}

/**
 * Validate Telegram Login Widget hash
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramHash(payload: TelegramLoginPayload): boolean {
  const token = getTelegramBotToken();
  if (!token) {
    console.error('[Telegram Auth] Integration is not configured (missing TELEGRAM_BOT_TOKEN)');
    return false;
  }

  const { hash, ...data } = payload;

  // Check auth_date is not too old (24 hours)
  const authDate = data.auth_date;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE) {
    console.error('[Telegram Auth] Auth date too old:', now - authDate, 'seconds');
    return false;
  }

  // Create data-check-string: sort keys alphabetically, join as "key=value" with "\n"
  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key as keyof typeof data]}`)
    .join('\n');

  // secret_key = SHA256(bot_token)
  const secretKey = crypto
    .createHash('sha256')
    .update(token)
    .digest();

  // computed_hash = HMAC_SHA256(data_check_string, secret_key)
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Create JWT session token
 */
export async function createSessionToken(session: TelegramSession): Promise<string> {
  const secret = new TextEncoder().encode(getJwtSecret());
  
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  return token;
}

/**
 * Verify and decode JWT session token
 */
export async function verifySessionToken(token: string): Promise<TelegramSession | null> {
  try {
    const secret = new TextEncoder().encode(getJwtSecret());
    const { payload } = await jwtVerify(token, secret);
    
    return {
      profileId: payload.profileId as string,
      telegramId: payload.telegramId as number,
      username: payload.username as string | null,
      firstName: payload.firstName as string | null,
      photoUrl: payload.photoUrl as string | null,
      isAdmin: payload.isAdmin as boolean,
      role: (payload.role as 'user' | 'manager' | 'admin') || 'user',
    };
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<TelegramSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifySessionToken(token);
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get cookie name (for client-side checks)
 */
export function getSessionCookieName() {
  return COOKIE_NAME;
}

/**
 * Get auth.users.id from Telegram session
 * Maps telegram_profiles.id -> auth.users.id
 */
export async function getAuthUserId(telegramSession: TelegramSession): Promise<string | null> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    const supabase = getSupabaseAdmin();

    // Fast path: if telegram_profiles has auth_user_id, use it (avoids listing all users).
    try {
      const { data: profile, error: pErr } = await supabase
        .from('telegram_profiles')
        .select('auth_user_id')
        .eq('id', telegramSession.profileId)
        .single();

      const mapped = (profile as any)?.auth_user_id as string | null | undefined;
      if (!pErr && mapped) return mapped;
    } catch {
      // ignore (column may not exist yet)
    }

    // Fallback: Find auth user by telegram_id in user_metadata (slow on large userbases)
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('[Telegram Auth] Failed to list users:', error);
      return null;
    }

    const authUser = authUsers.users.find((u: any) => u.user_metadata?.telegram_id === telegramSession.telegramId);
    const authUserId = authUser?.id || null;

    // Best-effort: persist mapping for future requests
    if (authUserId) {
      try {
        await supabase
          .from('telegram_profiles')
          .update({ auth_user_id: authUserId } as any)
          .eq('id', telegramSession.profileId);
      } catch {
        // ignore
      }
    }

    return authUserId;
  } catch (error) {
    console.error('[Telegram Auth] Error getting auth user ID:', error);
    return null;
  }
}



