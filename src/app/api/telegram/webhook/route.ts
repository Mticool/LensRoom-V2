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
  answerInlineQuery,
  createInlineKeyboard,
  type TelegramUpdate,
  type TelegramMessage,
} from '@/lib/telegram/bot-client';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';
const BOT_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || '';

// Quick models for bot generation
const QUICK_MODELS = [
  { id: 'nano-banana', name: '🍌 Nano Banana', cost: 7, type: 'photo' },
  { id: 'flux-2-pro', name: '⚡ FLUX.2 Pro', cost: 9, type: 'photo' },
  { id: 'gpt-image', name: '🧠 GPT Image', cost: 17, type: 'photo' },
  { id: 'veo-3.1', name: '🎬 Veo 3.1', cost: 99, type: 'video' },
];

/**
 * POST /api/telegram/webhook
 * Handles incoming Telegram bot updates
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
  if (BOT_SECRET && secretToken !== BOT_SECRET) {
    console.error('[TG Webhook] Invalid secret token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    console.log('[TG Webhook] Received update:', update.update_id);

    // Handle different update types
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.inline_query) {
      await handleInlineQuery(update.inline_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TG Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const telegramId = message.from.id;

  // Commands
  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ');
    const prompt = args.join(' ');

    switch (command) {
      case '/start':
        await handleStart(chatId, message.from);
        break;

      case '/help':
        await handleHelp(chatId);
        break;

      case '/balance':
      case '/b':
        await handleBalance(chatId, telegramId);
        break;

      case '/generate':
      case '/g':
        if (prompt) {
          await handleGenerate(chatId, telegramId, prompt, 'nano-banana');
        } else {
          await sendMessage(chatId, '💡 Использование: /generate <промпт>\n\nПример: /generate космос неон планета');
        }
        break;

      case '/photo':
      case '/p':
        if (prompt) {
          await handleGenerate(chatId, telegramId, prompt, 'nano-banana');
        } else {
          await showModelSelector(chatId, 'photo');
        }
        break;

      case '/video':
      case '/v':
        if (prompt) {
          await handleGenerate(chatId, telegramId, prompt, 'veo-3.1');
        } else {
          await showModelSelector(chatId, 'video');
        }
        break;

      case '/models':
        await showModels(chatId);
        break;

      case '/app':
        await sendMessage(chatId, '🎨 Открыть полный редактор:', {
          replyMarkup: createInlineKeyboard([[
            { text: '🚀 Открыть LensRoom', web_app: { url: `${WEBAPP_URL}/tg` } }
          ]])
        });
        break;

      default:
        await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для списка команд.');
    }
  } else if (text) {
    // Non-command text - treat as prompt with default model
    await handleGenerate(chatId, telegramId, text, 'nano-banana');
  }
}

/**
 * Handle /start command
 */
async function handleStart(chatId: number, user: TelegramMessage['from']) {
  const firstName = user.first_name || 'друг';
  
  const welcomeText = `
👋 Привет, <b>${firstName}</b>!

Я — бот <b>LensRoom</b> для генерации изображений и видео с помощью ИИ.

🎨 <b>Быстрые команды:</b>
• Просто напиши промпт — и я создам изображение
• /photo — генерация фото
• /video — генерация видео
• /balance — проверить баланс

🚀 <b>Полный редактор:</b>
Нажми кнопку ниже чтобы открыть полноценный редактор с настройками.

💡 <b>Пример:</b>
<code>космическая станция в стиле киберпанк, неоновые огни</code>
`;

  await sendMessage(chatId, welcomeText, {
    replyMarkup: createInlineKeyboard([
      [{ text: '🎨 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
      [{ text: '📊 Баланс', callback_data: 'balance' }, { text: '📋 Модели', callback_data: 'models' }],
    ]),
  });
}

/**
 * Handle /help command
 */
async function handleHelp(chatId: number) {
  const helpText = `
📚 <b>Команды LensRoom Bot</b>

<b>Генерация:</b>
• /generate &lt;промпт&gt; — быстрая генерация (Nano Banana)
• /photo &lt;промпт&gt; — генерация фото
• /video &lt;промпт&gt; — генерация видео
• Или просто напиши промпт!

<b>Информация:</b>
• /balance — проверить баланс ⭐
• /models — список доступных моделей
• /app — открыть полный редактор

<b>Сокращения:</b>
• /g = /generate
• /p = /photo  
• /v = /video
• /b = /balance

💡 <b>Совет:</b> Используй мини-приложение для доступа ко всем настройкам и моделям!
`;

  await sendMessage(chatId, helpText, {
    replyMarkup: createInlineKeyboard([[
      { text: '🎨 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }
    ]]),
  });
}

/**
 * Handle /balance command
 */
async function handleBalance(chatId: number, telegramId: number) {
  const supabase = getSupabaseAdmin();

  // Find user by telegram_id
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    await sendMessage(chatId, '❌ Аккаунт не найден. Пожалуйста, авторизуйтесь через приложение.', {
      replyMarkup: createInlineKeyboard([[
        { text: '🔐 Войти', web_app: { url: `${WEBAPP_URL}/tg` } }
      ]]),
    });
    return;
  }

  // Get balance
  const balance = await getCreditBalance(supabase, profile.id);

  const balanceText = `
💰 <b>Ваш баланс</b>

Всего: <b>${balance.totalBalance}⭐</b>

├ 📅 Подписка: ${balance.subscriptionStars}⭐ <i>(сгорают в конце месяца)</i>
└ 📦 Пакеты: ${balance.packageStars}⭐ <i>(навсегда)</i>

<b>Примерно хватит на:</b>
• ~${Math.floor(balance.totalBalance / 7)} фото (Nano Banana)
• ~${Math.floor(balance.totalBalance / 99)} видео (Veo Fast)
`;

  await sendMessage(chatId, balanceText, {
    replyMarkup: createInlineKeyboard([[
      { text: '💳 Пополнить', url: `${WEBAPP_URL}/pricing` },
      { text: '🎨 Генерировать', web_app: { url: `${WEBAPP_URL}/tg` } },
    ]]),
  });
}

/**
 * Show model selector
 */
async function showModelSelector(chatId: number, type: 'photo' | 'video') {
  const models = QUICK_MODELS.filter(m => m.type === type);
  
  const buttons = models.map(m => [{
    text: `${m.name} (${m.cost}⭐)`,
    callback_data: `select_model:${m.id}`,
  }]);

  buttons.push([{ text: '🔙 Назад', callback_data: 'back' }]);

  await sendMessage(
    chatId,
    `Выберите модель для генерации ${type === 'photo' ? 'фото' : 'видео'}:`,
    { replyMarkup: createInlineKeyboard(buttons) }
  );
}

/**
 * Show available models
 */
async function showModels(chatId: number) {
  const modelsText = `
🎨 <b>Доступные модели</b>

<b>📸 Фото:</b>
• 🍌 Nano Banana — 7⭐ (быстро)
• ⚡ FLUX.2 Pro — 9-12⭐
• 🧠 GPT Image — 17-67⭐
• 🌶️ Grok Imagine — 15⭐

<b>🎬 Видео:</b>
• 🎬 Veo 3.1 — 99-490⭐
• ⚡ Kling AI — 105-400⭐
• 🎥 Sora 2 — 50⭐

Для полного списка и настроек откройте редактор:
`;

  await sendMessage(chatId, modelsText, {
    replyMarkup: createInlineKeyboard([
      [{ text: '🎨 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
      [{ text: '📊 Мой баланс', callback_data: 'balance' }],
    ]),
  });
}

/**
 * Handle generation request
 */
async function handleGenerate(
  chatId: number,
  telegramId: number,
  prompt: string,
  modelId: string
) {
  const supabase = getSupabaseAdmin();

  // Find user
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    await sendMessage(chatId, '❌ Для генерации нужно авторизоваться.', {
      replyMarkup: createInlineKeyboard([[
        { text: '🔐 Войти', web_app: { url: `${WEBAPP_URL}/tg` } }
      ]]),
    });
    return;
  }

  // Calculate cost
  const price = computePrice(modelId, {});
  const cost = price.stars;

  // Check balance
  const balance = await getCreditBalance(supabase, profile.id);
  if (balance.totalBalance < cost) {
    await sendMessage(chatId, `❌ Недостаточно звёзд. Нужно ${cost}⭐, у вас ${balance.totalBalance}⭐`, {
      replyMarkup: createInlineKeyboard([[
        { text: '💳 Пополнить', url: `${WEBAPP_URL}/pricing` }
      ]]),
    });
    return;
  }

  // Send "generating" status
  await sendChatAction(chatId, 'upload_photo');
  const statusMsg = await sendMessage(chatId, `⏳ Генерирую... (${cost}⭐)\n\n📝 <i>${prompt}</i>`);

  try {
    // Deduct credits
    const deductResult = await deductCredits(supabase, profile.id, cost);
    if (!deductResult.success) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Ошибка списания звёзд');
      return;
    }

    // Generate
    const kieClient = getKieClient();
    if (!kieClient) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Сервис временно недоступен');
      return;
    }

    // Create task
    const model = QUICK_MODELS.find(m => m.id === modelId);
    const isVideo = model?.type === 'video';

    let resultUrl: string | undefined;
    
    if (isVideo) {
      // Video generation using public API
      const videoResult = await kieClient.generateVideo({
        model: modelId,
        provider: (modelId === 'veo-3.1' ? 'kie_veo' : 'kie_market') as KieProvider,
        prompt,
        aspectRatio: '16:9',
        quality: 'fast',
        duration: 8,
      });

      if (videoResult.status === 'completed' && videoResult.outputs?.[0]?.url) {
        resultUrl = videoResult.outputs[0].url;
      } else if (videoResult.id && videoResult.status === 'processing') {
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec delay
          const status = await kieClient.getVideoGenerationStatus(videoResult.id);
          if (status.status === 'completed' && status.outputs?.[0]?.url) {
            resultUrl = status.outputs[0].url;
            break;
          } else if (status.status === 'failed') {
            break;
          }
          attempts++;
        }
      }
    } else {
      // Photo generation
      const photoResult = await kieClient.generateImage({
        model: modelId === 'nano-banana' ? 'nano-banana' : modelId,
        prompt,
        aspectRatio: '1:1',
      });

      if (photoResult.status === 'completed' && photoResult.outputs?.[0]?.url) {
        resultUrl = photoResult.outputs[0].url;
      } else if (photoResult.id && photoResult.status === 'processing') {
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 30; // 2.5 minutes max for images
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec delay
          const status = await kieClient.getGenerationStatus(photoResult.id);
          if (status.status === 'completed' && status.outputs?.[0]?.url) {
            resultUrl = status.outputs[0].url;
            break;
          } else if (status.status === 'failed') {
            break;
          }
          attempts++;
        }
      }
    }
    
    const result = resultUrl ? { success: true, data: { url: resultUrl } } : undefined;

    // Send result
    if (result?.success && result?.data?.url) {
      const resultUrl = result.data.url;
      
      if (isVideo) {
        await sendVideo(chatId, resultUrl, {
          caption: `✅ Готово! (-${cost}⭐)\n\n📝 ${prompt}`,
          replyMarkup: createInlineKeyboard([
            [{ text: '🔄 Ещё', callback_data: `regenerate:${modelId}:${encodeURIComponent(prompt)}` }],
            [{ text: '🎨 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
          ]),
        });
      } else {
        await sendPhoto(chatId, resultUrl, {
          caption: `✅ Готово! (-${cost}⭐)\n\n📝 ${prompt}`,
          replyMarkup: createInlineKeyboard([
            [{ text: '🔄 Ещё', callback_data: `regenerate:${modelId}:${encodeURIComponent(prompt)}` }],
            [{ text: '🎨 Открыть редактор', web_app: { url: `${WEBAPP_URL}/tg` } }],
          ]),
        });
      }

      // Delete status message
      if (statusMsg) {
        // Delete not implemented, just edit
        await editMessageText(chatId, statusMsg.message_id, '✅ Генерация завершена!');
      }
    } else {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Ошибка генерации. Попробуйте позже.');
    }

  } catch (error) {
    console.error('[TG Webhook] Generate error:', error);
    if (statusMsg) {
      await editMessageText(chatId, statusMsg.message_id, '❌ Произошла ошибка. Попробуйте позже.');
    }
  }
}

/**
 * Handle callback queries (button clicks)
 */
async function handleCallbackQuery(query: TelegramUpdate['callback_query']) {
  if (!query) return;

  const chatId = query.message?.chat.id;
  const data = query.data || '';
  const telegramId = query.from.id;

  await answerCallbackQuery(query.id);

  if (!chatId) return;

  if (data === 'balance') {
    await handleBalance(chatId, telegramId);
  } else if (data === 'models') {
    await showModels(chatId);
  } else if (data === 'back') {
    await handleStart(chatId, query.from);
  } else if (data.startsWith('select_model:')) {
    const modelId = data.split(':')[1];
    await sendMessage(chatId, `Модель выбрана: ${modelId}\n\nТеперь отправьте промпт для генерации.`);
  } else if (data.startsWith('regenerate:')) {
    const [, modelId, encodedPrompt] = data.split(':');
    const prompt = decodeURIComponent(encodedPrompt);
    await handleGenerate(chatId, telegramId, prompt, modelId);
  }
}

/**
 * Handle inline queries
 */
async function handleInlineQuery(query: TelegramUpdate['inline_query']) {
  if (!query) return;

  const prompt = query.query.trim();
  
  if (!prompt) {
    // Show button to open WebApp
    await answerInlineQuery(query.id, [], {
      button: {
        text: '🎨 Открыть LensRoom',
        web_app: { url: `${WEBAPP_URL}/tg` },
      },
    });
    return;
  }

  // Show quick generation options
  const results = QUICK_MODELS.filter(m => m.type === 'photo').map((model, index) => ({
    type: 'article',
    id: `${index}`,
    title: `${model.name} (${model.cost}⭐)`,
    description: `Сгенерировать: "${prompt}"`,
    input_message_content: {
      message_text: `/generate ${prompt}`,
    },
    reply_markup: createInlineKeyboard([[
      { text: '🎨 Открыть в редакторе', web_app: { url: `${WEBAPP_URL}/tg?prompt=${encodeURIComponent(prompt)}` } }
    ]]),
  }));

  await answerInlineQuery(query.id, results, {
    cacheTime: 0,
    isPersonal: true,
    button: {
      text: '🎨 Полный редактор',
      web_app: { url: `${WEBAPP_URL}/tg?prompt=${encodeURIComponent(prompt)}` },
    },
  });
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
      allowedUpdates: ['message', 'callback_query', 'inline_query'],
    });

    const info = await getWebhookInfo();
    
    return NextResponse.json({ 
      success, 
      webhookUrl,
      info,
    });
  }

  if (action === 'info') {
    const { getWebhookInfo } = await import('@/lib/telegram/bot-client');
    const info = await getWebhookInfo();
    return NextResponse.json({ info });
  }

  return NextResponse.json({ 
    status: 'ok',
    message: 'Telegram webhook endpoint',
    actions: ['?action=setup', '?action=info'],
  });
}
