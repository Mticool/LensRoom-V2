import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { computePrice } from '@/lib/pricing/compute-price';
import { getKieClient } from '@/lib/api/kie-client';
import type { KieProvider } from '@/config/models';
import {
  sendMessage,
  sendPhoto,
  sendVideo,
  sendChatAction,
  answerCallbackQuery,
  editMessageText,
  createInlineKeyboard,
  type TelegramUpdate,
  type TelegramMessage,
} from '@/lib/telegram/bot-client';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';
const BOT_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || '';

// ===== MODELS CONFIG =====
const PHOTO_MODELS = [
  { id: 'nano-banana', apiModel: 'google/nano-banana', name: 'Nano Banana', emoji: '🍌', cost: 7, badge: 'Быстрый' },
  { id: 'nano-banana-pro', apiModel: 'nano-banana-pro', name: 'Nano Banana Pro', emoji: '⭐', cost: 30, badge: 'Премиум' },
  { id: 'flux-2-pro', apiModel: 'flux/pro-v1.1', name: 'FLUX.2 Pro', emoji: '⚡', cost: 9, badge: 'Популярный' },
  { id: 'gpt-image', apiModel: 'openai/gpt-image-1', name: 'GPT Image', emoji: '🧠', cost: 17, badge: 'OpenAI' },
  { id: 'grok-imagine', apiModel: 'grok/imagine', name: 'Grok Imagine', emoji: '🌶️', cost: 15, badge: 'xAI' },
  { id: 'seedream-4.5', apiModel: 'seedream/4.5', name: 'Seedream 4.5', emoji: '✨', cost: 11, badge: '4K' },
];

const VIDEO_MODELS = [
  { id: 'veo-3.1', apiModel: 'veo3_fast', name: 'Veo 3.1 Fast', emoji: '🎬', cost: 99, badge: 'Google', provider: 'kie_veo' as KieProvider },
  { id: 'veo-3.1-quality', apiModel: 'veo3', name: 'Veo 3.1 Quality', emoji: '🎬', cost: 490, badge: 'Google HD', provider: 'kie_veo' as KieProvider },
  { id: 'kling', apiModel: 'kling/v2.5-turbo', name: 'Kling 2.5', emoji: '⚡', cost: 105, badge: 'Trending', provider: 'kie_market' as KieProvider },
  { id: 'sora-2', apiModel: 'sora/v2', name: 'Sora 2', emoji: '🎥', cost: 50, badge: 'OpenAI', provider: 'kie_market' as KieProvider },
  { id: 'grok-video', apiModel: 'grok/video', name: 'Grok Video', emoji: '🌶️', cost: 25, badge: 'xAI', provider: 'kie_market' as KieProvider },
];

const AUDIO_MODELS = [
  { id: 'suno', apiModel: 'suno/v4', name: 'Suno AI', emoji: '🎵', cost: 12, badge: 'Музыка' },
];

// User state storage (in production use Redis/DB)
const userStates = new Map<number, { 
  mode?: 'photo' | 'video' | 'audio';
  model?: string;
  waitingForPrompt?: boolean;
}>();

/**
 * POST /api/telegram/webhook
 */
export async function POST(request: NextRequest) {
  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
  if (BOT_SECRET && secretToken !== BOT_SECRET) {
    console.error('[TG Webhook] Invalid secret token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    console.log('[TG Webhook] Update:', update.update_id);

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TG Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Handle messages
 */
async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const telegramId = message.from.id;
  const userState = userStates.get(telegramId) || {};

  // Commands
  if (text.startsWith('/')) {
    const command = text.split(' ')[0].split('@')[0]; // Handle /command@botname
    const args = text.split(' ').slice(1).join(' '); // Get arguments after command
    
    switch (command) {
      case '/start':
        // Check for login code: /start login_XXXX
        if (args.startsWith('login_')) {
          const loginCode = args.replace('login_', '');
          await handleLoginCode(chatId, telegramId, loginCode, message.from);
        } else {
          await showMainMenu(chatId, message.from.first_name, telegramId, message.from.username);
        }
        break;
      case '/help':
        await showHelp(chatId);
        break;
      case '/balance':
      case '/b':
        await showBalance(chatId, telegramId);
        break;
      case '/photo':
      case '/p':
        await showPhotoModels(chatId);
        break;
      case '/video':
      case '/v':
        await showVideoModels(chatId);
        break;
      case '/audio':
      case '/music':
        await showAudioModels(chatId);
        break;
      case '/app':
        await showMiniApp(chatId);
        break;
      default:
        // Check if it's /generate or prompt after /model
        if (text.startsWith('/generate ') || text.startsWith('/g ')) {
          const prompt = text.replace(/^\/(generate|g)\s+/, '');
          if (prompt) {
            await handleGeneration(chatId, telegramId, prompt, 'nano-banana', 'photo');
          }
  } else {
          await sendMessage(chatId, '❓ Неизвестная команда. Нажмите /start для главного меню.');
        }
    }
    return;
  }

  // Check if waiting for prompt
  if (userState.waitingForPrompt && userState.model && userState.mode) {
    userStates.set(telegramId, { ...userState, waitingForPrompt: false });
    await handleGeneration(chatId, telegramId, text, userState.model, userState.mode);
    return;
  }

  // Default: treat as prompt for quick generation
  if (text.length > 2) {
    await handleGeneration(chatId, telegramId, text, 'nano-banana', 'photo');
  }
}

/**
 * Handle login code from website
 */
async function handleLoginCode(
  chatId: number, 
  telegramId: number, 
  code: string,
  from: { id: number; first_name: string; last_name?: string; username?: string }
) {
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
        used_at: new Date().toISOString()
      })
      .eq('code', code);

    // Upsert telegram profile
    const { data: profile } = await supabase
      .from('telegram_profiles')
      .upsert({
        telegram_id: telegramId,
        first_name: from.first_name,
        last_name: from.last_name || null,
        telegram_username: from.username || null,
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'telegram_id' })
      .select('id, auth_user_id')
      .single();

    // Create auth user if needed
    let authUserId = profile?.auth_user_id;
    if (!authUserId) {
      const fakeEmail = `tg_${telegramId}@lensroom.local`;
      const randomPassword = Array.from({ length: 32 }, () => 
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
      ).join('');

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: { email?: string; user_metadata?: { telegram_id?: number } }) => 
        u.email === fakeEmail || u.user_metadata?.telegram_id === telegramId
      );

      if (existing) {
        authUserId = existing.id;
      } else {
        const { data: newUser } = await supabase.auth.admin.createUser({
          email: fakeEmail,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { telegram_id: telegramId, first_name: from.first_name }
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

      // Ensure credits row
      if (authUserId) {
        await supabase
          .from('credits')
          .upsert({ user_id: authUserId, amount: 50 }, { onConflict: 'user_id' });
      }
    }

    // Success message
    await sendMessage(
      chatId,
      '✅ *Авторизация успешна!*\n\n' +
      '🎉 Вы вошли в LensRoom через Telegram.\n\n' +
      'Вернитесь на сайт — страница обновится автоматически.\n\n' +
      '🌐 [Открыть LensRoom](https://lensroom.ru/generator)',
      {
        parseMode: 'Markdown',
        replyMarkup: createInlineKeyboard([
          [{ text: '🌐 Открыть сайт', url: 'https://lensroom.ru/generator' }],
          [{ text: '📱 Мини-приложение', web_app: { url: `${WEBAPP_URL}/tg` } }]
        ])
      }
    );

    console.log('[TG Webhook] Login success for user:', telegramId);
  } catch (error) {
    console.error('[TG Webhook] Login error:', error);
    await sendMessage(chatId, '❌ Произошла ошибка. Попробуйте снова.');
  }
}

/**
 * Show main menu - with auto-registration
 */
async function showMainMenu(chatId: number, firstName: string, telegramId: number, username?: string) {
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

        // Check if credits don't exist OR exist but have 0 balance (created by adjust_credits)
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

  // Welcome message
  let text: string;
  
  if (isNewUser) {
    text = `
🎉 <b>Добро пожаловать, ${firstName}!</b>

Вы получили <b>${bonusStars}⭐</b> в подарок!

Этого хватит на:
• ~7 фото (Nano Banana)
• или 1 видео (Grok Video)

Выберите раздел:
`;
    } else {
    text = `
👋 Привет, <b>${firstName}</b>!

Я — бот <b>LensRoom</b> для создания контента с помощью ИИ.

Выбери раздел:
`;
  }

  await sendMessage(chatId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '🎨 Фото', callback_data: 'menu:photo' }, { text: '🎬 Видео', callback_data: 'menu:video' }],
      [{ text: '🎵 Музыка', callback_data: 'menu:audio' }, { text: '💰 Баланс', callback_data: 'menu:balance' }],
      [{ text: '🚀 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
    ]),
  });
}

/**
 * Show photo models
 */
async function showPhotoModels(chatId: number, messageId?: number) {
  const text = `
🎨 <b>Генерация фото</b>

Выберите модель:
`;

  const buttons = PHOTO_MODELS.map(m => [{
    text: `${m.emoji} ${m.name} • ${m.cost}⭐`,
    callback_data: `select:photo:${m.id}`,
  }]);
  
  buttons.push([{ text: '⬅️ Назад', callback_data: 'menu:main' }]);

  if (messageId) {
    await editMessageText(chatId, messageId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  } else {
    await sendMessage(chatId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  }
}

/**
 * Show video models
 */
async function showVideoModels(chatId: number, messageId?: number) {
  const text = `
🎬 <b>Генерация видео</b>

Выберите модель:
`;

  const buttons = VIDEO_MODELS.map(m => [{
    text: `${m.emoji} ${m.name} • ${m.cost}⭐`,
    callback_data: `select:video:${m.id}`,
  }]);
  
  buttons.push([{ text: '⬅️ Назад', callback_data: 'menu:main' }]);

  if (messageId) {
    await editMessageText(chatId, messageId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  } else {
    await sendMessage(chatId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  }
}

/**
 * Show audio models
 */
async function showAudioModels(chatId: number, messageId?: number) {
  const text = `
🎵 <b>Генерация музыки</b>

Выберите модель:
`;

  const buttons = AUDIO_MODELS.map(m => [{
    text: `${m.emoji} ${m.name} • ${m.cost}⭐`,
    callback_data: `select:audio:${m.id}`,
  }]);
  
  buttons.push([{ text: '⬅️ Назад', callback_data: 'menu:main' }]);

  if (messageId) {
    await editMessageText(chatId, messageId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  } else {
    await sendMessage(chatId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  }
}

/**
 * Show balance
 */
async function showBalance(chatId: number, telegramId: number, messageId?: number) {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id, first_name')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    const text = `
❌ <b>Аккаунт не найден</b>

Напишите /start чтобы зарегистрироваться и получить 50⭐ бонус!
`;
    if (messageId) {
      await editMessageText(chatId, messageId, text, {
        replyMarkup: createInlineKeyboard([
          [{ text: '🚀 Начать', callback_data: 'menu:main' }],
        ]),
      });
    } else {
      await sendMessage(chatId, text);
    }
    return;
  }

  // Use auth_user_id if linked, otherwise profile.id
  const userId = profile.auth_user_id || profile.id;
  const balance = await getCreditBalance(supabase, userId);

  const text = `
💰 <b>Ваш баланс</b>

Всего: <b>${balance.totalBalance}⭐</b>

├ 📅 Подписка: ${balance.subscriptionStars}⭐
└ 📦 Пакеты: ${balance.packageStars}⭐

<b>Хватит на:</b>
• ~${Math.floor(balance.totalBalance / 7)} фото (Nano Banana)
• ~${Math.floor(balance.totalBalance / 99)} видео (Veo Fast)
`;

  const buttons = [
    [{ text: '💳 Пополнить', url: `${WEBAPP_URL}/pricing` }],
    [{ text: '⬅️ Назад', callback_data: 'menu:main' }],
  ];

  if (messageId) {
    await editMessageText(chatId, messageId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  } else {
    await sendMessage(chatId, text, {
      replyMarkup: createInlineKeyboard(buttons),
    });
  }
}

/**
 * Show help
 */
async function showHelp(chatId: number) {
  const text = `
📚 <b>Справка LensRoom Bot</b>

<b>Разделы:</b>
• 🎨 /photo — генерация фото
• 🎬 /video — генерация видео
• 🎵 /audio — генерация музыки
• 💰 /balance — проверить баланс

<b>Быстрая генерация:</b>
Просто напишите описание — бот создаст фото через Nano Banana (7⭐)

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
 * Show Mini App
 */
async function showMiniApp(chatId: number) {
  await sendMessage(chatId, '🎨 Откройте полный редактор:', {
    replyMarkup: createInlineKeyboard([[
      { text: '🚀 Открыть LensRoom', web_app: { url: `${WEBAPP_URL}/tg` } }
    ]]),
  });
}

/**
 * Handle model selection - ask for prompt
 */
async function askForPrompt(chatId: number, telegramId: number, modelId: string, mode: 'photo' | 'video' | 'audio', messageId: number) {
  const allModels = [...PHOTO_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS];
  const model = allModels.find(m => m.id === modelId);
  
  if (!model) {
    await sendMessage(chatId, '❌ Модель не найдена');
    return;
  }

  // Save state
  userStates.set(telegramId, { mode, model: modelId, waitingForPrompt: true });

  const modeText = mode === 'photo' ? 'изображения' : mode === 'video' ? 'видео' : 'музыки';
  
  const text = `
${model.emoji} <b>${model.name}</b>
💰 Стоимость: ${model.cost}⭐

Отправьте описание для генерации ${modeText}:
`;

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '❌ Отмена', callback_data: `menu:${mode}` }],
    ]),
  });
}

/**
 * Handle generation
 */
async function handleGeneration(
  chatId: number,
  telegramId: number,
  prompt: string,
  modelId: string,
  mode: 'photo' | 'video' | 'audio'
) {
          const supabase = getSupabaseAdmin();

  // Find user
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    // Auto-register if somehow not registered
    await sendMessage(chatId, '❌ Напишите /start чтобы начать.', {
      replyMarkup: createInlineKeyboard([
        [{ text: '🚀 Начать', callback_data: 'menu:main' }],
      ]),
    });
    return;
  }

  // Use auth_user_id if linked to site, otherwise use telegram profile id
  const userId = profile.auth_user_id || profile.id;

  // Find model
  const allModels = [...PHOTO_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS];
  const model = allModels.find(m => m.id === modelId);
  
  if (!model) {
    await sendMessage(chatId, '❌ Модель не найдена');
    return;
  }

  const cost = model.cost;

  // Check balance
  const balance = await getCreditBalance(supabase, userId);
  if (balance.totalBalance < cost) {
    await sendMessage(chatId, `❌ Недостаточно звёзд.\n\nНужно: ${cost}⭐\nУ вас: ${balance.totalBalance}⭐`, {
      replyMarkup: createInlineKeyboard([
        [{ text: '💳 Пополнить', url: `${WEBAPP_URL}/pricing` }],
      ]),
    });
    return;
  }

  // Send status
  await sendChatAction(chatId, mode === 'video' ? 'upload_video' : 'upload_photo');
  const statusMsg = await sendMessage(chatId, `
⏳ <b>Генерирую...</b>

${model.emoji} ${model.name}
💰 ${cost}⭐

📝 <i>${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}</i>
`);

  try {
    // Deduct credits
    const deductResult = await deductCredits(supabase, userId, cost);
    if (!deductResult.success) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Ошибка списания звёзд. Попробуйте позже.');
      return;
    }

    // Generate
    const kieClient = getKieClient();
    if (!kieClient) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Сервис временно недоступен');
      return;
    }

    let resultUrl: string | undefined;

    if (mode === 'video') {
      const videoModel = VIDEO_MODELS.find(m => m.id === modelId);
      const videoResult = await kieClient.generateVideo({
        model: model.apiModel,
        provider: videoModel?.provider || 'kie_market',
        prompt,
        aspectRatio: '16:9',
        duration: 8,
      });

      if (videoResult.status === 'completed' && videoResult.outputs?.[0]?.url) {
        resultUrl = videoResult.outputs[0].url;
      } else if (videoResult.id) {
        // Poll for completion
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const status = await kieClient.getVideoGenerationStatus(videoResult.id);
          if (status.status === 'completed' && status.outputs?.[0]?.url) {
            resultUrl = status.outputs[0].url;
            break;
          } else if (status.status === 'failed') {
            break;
          }
        }
      }
    } else if (mode === 'photo') {
      const photoResult = await kieClient.generateImage({
        model: model.apiModel,
        prompt,
        aspectRatio: '1:1',
      });

      if (photoResult.status === 'completed' && photoResult.outputs?.[0]?.url) {
        resultUrl = photoResult.outputs[0].url;
      } else if (photoResult.id) {
        // Poll for completion
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const status = await kieClient.getGenerationStatus(photoResult.id);
          if (status.status === 'completed' && status.outputs?.[0]?.url) {
            resultUrl = status.outputs[0].url;
            break;
          } else if (status.status === 'failed') {
            break;
          }
        }
      }
    }

    // Send result
    if (resultUrl) {
      const caption = `✅ <b>Готово!</b> (-${cost}⭐)\n\n📝 ${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}`;
      
      if (mode === 'video') {
        await sendVideo(chatId, resultUrl, {
          caption,
          replyMarkup: createInlineKeyboard([
            [{ text: '🔄 Ещё раз', callback_data: `regen:${mode}:${modelId}` }],
            [{ text: '🎨 Новая генерация', callback_data: `menu:${mode}` }],
          ]),
        });
      } else {
        await sendPhoto(chatId, resultUrl, {
          caption,
          replyMarkup: createInlineKeyboard([
            [{ text: '🔄 Ещё раз', callback_data: `regen:${mode}:${modelId}` }],
            [{ text: '🎨 Новая генерация', callback_data: `menu:${mode}` }],
          ]),
        });
      }

      // Delete status message
      try {
        await editMessageText(chatId, statusMsg!.message_id, '✅ Генерация завершена!');
      } catch {}
    } else {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Не удалось создать контент. Попробуйте другой промпт.');
    }

  } catch (error) {
    console.error('[TG Webhook] Generate error:', error);
    await editMessageText(chatId, statusMsg!.message_id, '❌ Произошла ошибка. Попробуйте позже.');
  }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(query: TelegramUpdate['callback_query']) {
  if (!query) return;

  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const data = query.data || '';
  const telegramId = query.from.id;

  await answerCallbackQuery(query.id);

  if (!chatId || !messageId) return;

  const [action, ...params] = data.split(':');

  switch (action) {
    case 'menu':
      const menuType = params[0];
      if (menuType === 'main') {
        await showMainMenu(chatId, query.from.first_name, telegramId, query.from.username);
      } else if (menuType === 'photo') {
        await showPhotoModels(chatId, messageId);
      } else if (menuType === 'video') {
        await showVideoModels(chatId, messageId);
      } else if (menuType === 'audio') {
        await showAudioModels(chatId, messageId);
      } else if (menuType === 'balance') {
        await showBalance(chatId, telegramId, messageId);
      }
      break;

    case 'select':
      const [mode, modelId] = params as ['photo' | 'video' | 'audio', string];
      await askForPrompt(chatId, telegramId, modelId, mode, messageId);
      break;

    case 'regen':
      const [regenMode, regenModelId] = params as ['photo' | 'video' | 'audio', string];
      // Ask for new prompt
      await askForPrompt(chatId, telegramId, regenModelId, regenMode, messageId);
      break;
  }
}

/**
 * GET - Setup webhook
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'setup') {
    const { setWebhook, getWebhookInfo } = await import('@/lib/telegram/bot-client');
    const webhookUrl = `${WEBAPP_URL}/api/telegram/webhook`;
    
    const success = await setWebhook(webhookUrl, {
      secretToken: BOT_SECRET,
      allowedUpdates: ['message', 'callback_query'],
    });

    const info = await getWebhookInfo();
    
    return NextResponse.json({ success, webhookUrl, info });
  }

  if (action === 'info') {
    const { getWebhookInfo } = await import('@/lib/telegram/bot-client');
    const info = await getWebhookInfo();
    return NextResponse.json({ info });
  }

  return NextResponse.json({ 
    status: 'ok',
    message: 'Telegram webhook endpoint',
  });
}
