/**
 * Authentication Handlers
 *
 * Handles login codes and account linking
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendMessage, createInlineKeyboard } from '../bot-client';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

/**
 * Handle login code from website
 */
export async function handleLoginCode(
  chatId: number,
  telegramId: number,
  code: string,
  from: { id: number; first_name: string; last_name?: string; username?: string }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // Find and validate the login code
    const { data: loginCode, error } = await supabase
      .from('telegram_login_codes')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .single();

    if (error || !loginCode) {
      await sendMessage(chatId, '❌ Код авторизации недействителен или истёк.\n\nПопробуйте войти снова на сайте.');
      return;
    }

    // Check if expired
    if (new Date(loginCode.expires_at) < new Date()) {
      await sendMessage(chatId, '⏰ Код авторизации истёк.\n\nПопробуйте войти снова на сайте.');
      return;
    }

    // Mark code as used and link to telegram user
    await supabase
      .from('telegram_login_codes')
      .update({
        used: true,
        telegram_id: telegramId,
        used_at: new Date().toISOString(),
      })
      .eq('code', code);

    // Upsert telegram profile
    const { data: profile } = await supabase
      .from('telegram_profiles')
      .upsert(
        {
          telegram_id: telegramId,
          first_name: from.first_name,
          last_name: from.last_name || null,
          telegram_username: from.username || null,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: 'telegram_id' }
      )
      .select('id, auth_user_id')
      .single();

    // Create auth user if needed
    let authUserId = profile?.auth_user_id;
    if (!authUserId) {
      const fakeEmail = `tg_${telegramId}@lensroom.local`;
      const randomPassword = Array.from(
        { length: 32 },
        () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
      ).join('');

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(
        (u: { email?: string; user_metadata?: { telegram_id?: number } }) =>
          u.email === fakeEmail || u.user_metadata?.telegram_id === telegramId
      );

      if (existing) {
        authUserId = existing.id;
      } else {
        const { data: newUser } = await supabase.auth.admin.createUser({
          email: fakeEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { telegram_id: telegramId, first_name: from.first_name },
        });
        authUserId = newUser?.user?.id;
      }

      // Update profile with auth_user_id
      if (authUserId && profile?.id) {
        await supabase
          .from('telegram_profiles')
          .update({ auth_user_id: authUserId })
          .eq('id', profile.id);
      }

      // Ensure credits row with bonus
      if (authUserId) {
        await supabase
          .from('credits')
          .upsert({ user_id: authUserId, amount: 50, package_stars: 50, subscription_stars: 0 }, { onConflict: 'user_id' });
      }
    }

    // Success message
    await sendMessage(
      chatId,
      '✅ <b>Авторизация успешна!</b>\n\n' +
        '🎉 Вы вошли в LensRoom через Telegram.\n\n' +
        'Вернитесь на сайт — страница обновится автоматически.\n\n' +
        '🌐 <a href="https://lensroom.ru/create/studio?section=photo">Открыть LensRoom</a>',
      {
        replyMarkup: createInlineKeyboard([
          [{ text: '🌐 Открыть сайт', url: 'https://lensroom.ru/create/studio' }],
          [{ text: '📱 Мини-приложение', web_app: { url: `${WEBAPP_URL}/tg` } }],
        ]),
      }
    );

    console.log('[TG Auth] Login success for user:', telegramId);
  } catch (error) {
    console.error('[TG Auth] Login error:', error);
    await sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
  }
}
