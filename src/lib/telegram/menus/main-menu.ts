/**
 * Main Menu for Telegram Bot
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance } from '@/lib/credits/split-credits';
import {
  sendMessage,
  createInlineKeyboard,
} from '../bot-client';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

/**
 * Show main menu with auto-registration
 */
export async function showMainMenu(
  chatId: number,
  firstName: string,
  telegramId: number,
  username?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Check if user exists
  const { data: existingProfile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id, first_name')
    .eq('telegram_id', telegramId)
    .single();

  let isNewUser = false;
  let bonusStars = 0;
  let userId: string | null = existingProfile?.auth_user_id || null;
  let balance = { totalBalance: 0, subscriptionStars: 0, packageStars: 0 };

  // Auto-register if profile doesn't exist or has no auth_user_id
  if (!existingProfile || !existingProfile.auth_user_id) {
    console.log(`[TG Bot] Auto-registering user: ${telegramId} (${firstName})`);

    try {
      // Create auth user first (anonymous with telegram email)
      const fakeEmail = `tg_${telegramId}@telegram.lensroom.ru`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          first_name: firstName,
          username: username,
          provider: 'telegram_bot',
        },
      });

      if (authError) {
        // User might already exist
        console.log('[TG Bot] Auth user creation failed (might exist):', authError.message);

        // Try to find existing user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAuth = existingUsers?.users?.find((u: { email?: string }) => u.email === fakeEmail);
        if (existingAuth) {
          userId = existingAuth.id;
        }
      } else if (authData.user) {
        userId = authData.user.id;
        console.log(`[TG Bot] Created auth user: ${userId}`);
      }

      if (userId) {
        // Create or update telegram profile with auth_user_id
        if (existingProfile) {
          await supabase
            .from('telegram_profiles')
            .update({ auth_user_id: userId })
            .eq('telegram_id', telegramId);
        } else {
          await supabase
            .from('telegram_profiles')
            .insert({
              telegram_id: telegramId,
              telegram_username: username || null,
              first_name: firstName,
              role: 'user',
              is_admin: false,
              auth_user_id: userId,
            });
        }

        // Check if credits already exist with balance
        const { data: existingCredits } = await supabase
          .from('credits')
          .select('id, package_stars, subscription_stars, amount')
          .eq('user_id', userId)
          .single();

        // Check if credits don't exist OR exist but have 0 balance
        const needsBonus = !existingCredits ||
          (existingCredits.package_stars === 0 &&
           existingCredits.subscription_stars === 0 &&
           (existingCredits.amount || 0) === 0);

        if (needsBonus) {
          // Upsert credits with 50 bonus stars
          bonusStars = 50;
          const { error: creditsError } = await supabase
            .from('credits')
            .upsert({
              user_id: userId,
              amount: bonusStars,
              subscription_stars: 0,
              package_stars: bonusStars,
            }, { onConflict: 'user_id' });

          if (creditsError) {
            console.error('[TG Bot] Failed to create/update credits:', creditsError);
          } else {
            isNewUser = true;
            console.log(`[TG Bot] Created/updated credits for ${telegramId} with ${bonusStars}⭐ bonus`);
          }
        }
      }
    } catch (error) {
      console.error('[TG Bot] Auto-registration error:', error);
    }
  }

  // Get balance
  if (userId) {
    try {
      balance = await getCreditBalance(supabase, userId);
    } catch {}
  }

  // Welcome message
  let text: string;

  if (isNewUser) {
    text = `
🎉 <b>Добро пожаловать, ${firstName}!</b>

Вы получили <b>${bonusStars}⭐</b> в подарок!

Этого хватит на:
• ~5 фото (Nano Banana)
• или 1 видео (Grok Video)

Выберите раздел:
`;
  } else {
    text = `
👋 <b>Привет, ${firstName}!</b>

💰 Баланс: <b>${balance.totalBalance}⭐</b>

Выберите раздел:
`;
  }

  await sendMessage(chatId, text, {
    replyMarkup: createInlineKeyboard([
      [
        { text: '🎨 Фото', callback_data: 'menu:photo' },
        { text: '🎬 Видео', callback_data: 'menu:video' },
      ],
      [
        { text: '🎵 Аудио', callback_data: 'menu:audio' },
        { text: '💰 Баланс', callback_data: 'menu:balance' },
      ],
      [
        { text: '📚 Библиотека', callback_data: 'menu:library' },
        { text: '⚙️ Настройки', callback_data: 'menu:settings' },
      ],
      [{ text: '🚀 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
    ]),
  });
}

/**
 * Show help message
 */
export async function showHelp(chatId: number): Promise<void> {
  const text = `
📚 <b>Справка LensRoom Bot</b>

<b>Команды:</b>
• /start — главное меню
• /photo, /p — генерация фото
• /video, /v — генерация видео
• /audio, /a — TTS и музыка
• /balance, /b — проверить баланс
• /library, /l — ваши генерации
• /settings — настройки
• /referral — реферальная ссылка

<b>Быстрая генерация:</b>
Просто напишите описание — бот создаст фото через Nano Banana (9⭐)

<b>Примеры:</b>
<code>космос в стиле киберпанк</code>
<code>милый котик на радуге</code>
<code>футуристический город ночью</code>

💡 Для полного функционала используйте Mini App!
`;

  await sendMessage(chatId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '🚀 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
      [{ text: '⬅️ Главное меню', callback_data: 'menu:main' }],
    ]),
  });
}

/**
 * Show Mini App button
 */
export async function showMiniApp(chatId: number): Promise<void> {
  await sendMessage(chatId, '🎨 Откройте полный редактор:', {
    replyMarkup: createInlineKeyboard([[
      { text: '🚀 Открыть LensRoom', web_app: { url: `${WEBAPP_URL}/tg` } }
    ]]),
  });
}
