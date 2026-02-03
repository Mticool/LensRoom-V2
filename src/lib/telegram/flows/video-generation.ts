/**
 * Video Generation Flow
 *
 * Handles the execution of video generation after user provides prompt.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { getKieClient } from '@/lib/api/kie-client';
import {
  sendMessage,
  sendVideo,
  sendChatAction,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';
import { findVideoModel, getVideoPrice, getOriginalVideoModel } from '../bot-models';
import { getUserState, clearFlow } from '../state';

interface VideoGenerationData {
  modelId: string;
  duration: number | string;
  resolution: string;
  aspectRatio: string;
  withAudio: boolean;
  mode: 't2v' | 'i2v';
  referenceImageUrl?: string;
}

/**
 * Execute video generation
 */
export async function executeVideoGeneration(
  chatId: number,
  telegramId: number,
  prompt: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get user state with generation params
  const userState = await getUserState(telegramId);
  const data = userState.conversation.data as VideoGenerationData;

  if (!data.modelId) {
    await sendMessage(chatId, '❌ Не выбрана модель. Используйте /video для выбора.');
    await clearFlow(telegramId);
    return;
  }

  // Find user
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    await sendMessage(chatId, '❌ Напишите /start чтобы начать.', {
      replyMarkup: createInlineKeyboard([
        [{ text: '🚀 Начать', callback_data: 'menu:main' }],
      ]),
    });
    await clearFlow(telegramId);
    return;
  }

  const userId = profile.auth_user_id || profile.id;

  // Get model info
  const model = findVideoModel(data.modelId);
  const originalModel = getOriginalVideoModel(data.modelId);

  if (!model || !originalModel) {
    await sendMessage(chatId, '❌ Модель не найдена');
    await clearFlow(telegramId);
    return;
  }

  // Calculate cost
  const cost = getVideoPrice(data.modelId, data.duration, data.resolution, data.withAudio);

  // Check balance
  const balance = await getCreditBalance(supabase, userId);
  if (balance.totalBalance < cost) {
    await sendMessage(chatId, `❌ Недостаточно звёзд.\n\nНужно: ${cost}⭐\nУ вас: ${balance.totalBalance}⭐`, {
      replyMarkup: createInlineKeyboard([
        [{ text: '💳 Пополнить', callback_data: 'menu:buy' }],
      ]),
    });
    return;
  }

  // Send status
  await sendChatAction(chatId, 'upload_video');
  const statusMsg = await sendMessage(chatId, `
⏳ <b>Генерирую видео...</b>

${model.emoji} ${model.name}
💰 ${cost}⭐
⏱ ${data.duration}s | ${data.resolution}

📝 <i>${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}</i>

<i>Генерация видео может занять несколько минут...</i>
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

    const videoResult = await kieClient.generateVideo({
      model: originalModel.apiId,
      provider: originalModel.provider,
      prompt,
      aspectRatio: data.aspectRatio || '16:9',
      duration: typeof data.duration === 'number' ? data.duration : parseInt(String(data.duration)) || 5,
    });

    let resultUrl: string | undefined;

    if (videoResult.status === 'completed' && videoResult.outputs?.[0]?.url) {
      resultUrl = videoResult.outputs[0].url;
    } else if (videoResult.id) {
      // Poll for completion (video takes longer)
      let lastStatus = '';
      for (let i = 0; i < 120; i++) { // 10 minutes max
        await new Promise(r => setTimeout(r, 5000));
        const status = await kieClient.getVideoGenerationStatus(videoResult.id);

        // Update status message periodically
        if (i % 6 === 0 && status.status !== lastStatus) {
          lastStatus = status.status;
          try {
            await editMessageText(chatId, statusMsg!.message_id, `
⏳ <b>Генерирую видео...</b>

${model.emoji} ${model.name}
💰 ${cost}⭐

📝 <i>${prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt}</i>

<i>Статус: ${translateStatus(status.status)}...</i>
`);
          } catch {}
        }

        if (status.status === 'completed' && status.outputs?.[0]?.url) {
          resultUrl = status.outputs[0].url;
          break;
        } else if (status.status === 'failed') {
          break;
        }
      }
    }

    // Send result
    if (resultUrl) {
      const caption = `✅ <b>Готово!</b> (-${cost}⭐)\n\n📝 ${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}`;

      await sendVideo(chatId, resultUrl, {
        caption,
        replyMarkup: createInlineKeyboard([
          [
            { text: '🔄 Ещё раз', callback_data: `regen:video:${data.modelId}` },
            { text: '💾 В избранное', callback_data: `fav:add:${videoResult.id || 'unknown'}` },
          ],
          [{ text: '🎬 Новая генерация', callback_data: 'menu:video' }],
        ]),
      });

      // Delete status message
      try {
        await editMessageText(chatId, statusMsg!.message_id, '✅ Генерация завершена!');
      } catch {}
    } else {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Не удалось создать видео. Попробуйте другой промпт или модель.');
    }

  } catch (error) {
    console.error('[TG Video Flow] Generate error:', error);
    await editMessageText(chatId, statusMsg!.message_id, '❌ Произошла ошибка. Попробуйте позже.');
  }

  // Clear flow
  await clearFlow(telegramId);
}

/**
 * Handle reference image upload for I2V
 */
export async function handleStartFrame(
  chatId: number,
  telegramId: number,
  imageUrl: string
): Promise<void> {
  const userState = await getUserState(telegramId);
  const data = userState.conversation.data as VideoGenerationData;
  const model = findVideoModel(data.modelId);

  if (!model) {
    await sendMessage(chatId, '❌ Модель не найдена');
    await clearFlow(telegramId);
    return;
  }

  // Update state with reference image
  const supabase = getSupabaseAdmin();
  await supabase
    .from('telegram_user_settings')
    .update({
      conversation_state: {
        ...userState.conversation,
        data: { ...data, referenceImageUrl: imageUrl },
        step: 'await_prompt',
      },
    })
    .eq('telegram_id', telegramId);

  await sendMessage(chatId, `
${model.emoji} <b>${model.name}</b> (Image-to-Video)

✅ Стартовый кадр получен!

Теперь отправьте описание для генерации:
`, {
    replyMarkup: createInlineKeyboard([
      [{ text: '❌ Отмена', callback_data: 'menu:video' }],
    ]),
  });
}

/**
 * Translate status to Russian
 */
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'queued': 'В очереди',
    'processing': 'Обработка',
    'generating': 'Генерация',
    'rendering': 'Рендеринг',
    'uploading': 'Загрузка',
    'completed': 'Завершено',
    'failed': 'Ошибка',
  };
  return map[status] || status;
}
