/**
 * Photo Generation Flow
 *
 * Handles the execution of photo generation after user provides prompt.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { getKieClient, pickKieKeySlot } from '@/lib/api/kie-client';
import {
  sendMessage,
  sendPhoto,
  sendChatAction,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';
import { findPhotoModel, getPhotoPrice, getOriginalPhotoModel } from '../bot-models';
import { getUserState, clearFlow, addToFavorites } from '../state';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

interface PhotoGenerationData {
  modelId: string;
  quality: string;
  aspectRatio: string;
  mode: 't2i' | 'i2i';
  referenceImageUrl?: string;
}

/**
 * Execute photo generation
 */
export async function executePhotoGeneration(
  chatId: number,
  telegramId: number,
  prompt: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get user state with generation params
  const userState = await getUserState(telegramId);
  const data = userState.conversation.data as PhotoGenerationData;

  if (!data.modelId) {
    await sendMessage(chatId, '❌ Не выбрана модель. Используйте /photo для выбора.');
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
  const model = findPhotoModel(data.modelId);
  const originalModel = getOriginalPhotoModel(data.modelId);

  if (!model || !originalModel) {
    await sendMessage(chatId, '❌ Модель не найдена');
    await clearFlow(telegramId);
    return;
  }

  // Calculate cost
  const cost = getPhotoPrice(data.modelId, data.quality, data.aspectRatio);

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
  await sendChatAction(chatId, 'upload_photo');
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
    const pool = String(process.env.KIE_API_KEY_PHOTO_POOL || "").trim();
    const poolSize = pool ? pool.split(/[\s,]+/).filter(Boolean).length : 0;
    const slot = pickKieKeySlot("photo", poolSize);
    const kieClient = getKieClient({ scope: "photo", slot });
    if (!kieClient) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Сервис временно недоступен');
      return;
    }

    // Build generation params
    const generateParams: Parameters<typeof kieClient.generateImage>[0] = {
      model: originalModel.apiId,
      prompt,
      aspectRatio: data.aspectRatio || '1:1',
      quality: data.quality as 'fast' | 'turbo' | 'balanced' | 'quality' | 'ultra' | undefined,
    };

    // Add reference image for I2I mode
    if (data.mode === 'i2i' && data.referenceImageUrl) {
      generateParams.imageInputs = [data.referenceImageUrl];
    }

    const photoResult = await kieClient.generateImage(generateParams);

    let resultUrl: string | undefined;

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

    // Send result
    if (resultUrl) {
      const caption = `✅ <b>Готово!</b> (-${cost}⭐)\n\n📝 ${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}`;

      // Store generation ID for favorites (if available from result)
      const generationId = (photoResult as any).generationId || photoResult.id;

      await sendPhoto(chatId, resultUrl, {
        caption,
        replyMarkup: createInlineKeyboard([
          [
            { text: '🔄 Ещё раз', callback_data: `regen:photo:${data.modelId}` },
            { text: '💾 В избранное', callback_data: `fav:add:${generationId || 'unknown'}` },
          ],
          [{ text: '🎨 Новая генерация', callback_data: 'menu:photo' }],
        ]),
      });

      // Delete status message
      try {
        await editMessageText(chatId, statusMsg!.message_id, '✅ Генерация завершена!');
      } catch {}
    } else {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Не удалось создать изображение. Попробуйте другой промпт.');
    }

  } catch (error) {
    console.error('[TG Photo Flow] Generate error:', error);
    await editMessageText(chatId, statusMsg!.message_id, '❌ Произошла ошибка. Попробуйте позже.');
  }

  // Clear flow
  await clearFlow(telegramId);
}

/**
 * Handle reference image upload for I2I
 */
export async function handleReferenceImage(
  chatId: number,
  telegramId: number,
  imageUrl: string
): Promise<void> {
  const userState = await getUserState(telegramId);
  const data = userState.conversation.data as PhotoGenerationData;
  const model = findPhotoModel(data.modelId);

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
${model.emoji} <b>${model.name}</b> (Image-to-Image)

✅ Референс получен!

Теперь отправьте описание для генерации:
`, {
    replyMarkup: createInlineKeyboard([
      [{ text: '❌ Отмена', callback_data: 'menu:photo' }],
    ]),
  });
}

/**
 * Quick generate with default model
 */
export async function quickPhotoGenerate(
  chatId: number,
  telegramId: number,
  prompt: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find user
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    await sendMessage(chatId, '❌ Напишите /start чтобы начать.');
    return;
  }

  const userId = profile.auth_user_id || profile.id;
  const model = findPhotoModel('nano-banana');
  const originalModel = getOriginalPhotoModel('nano-banana');

  if (!model || !originalModel) {
    await sendMessage(chatId, '❌ Модель по умолчанию недоступна');
    return;
  }

  const cost = model.cost;

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
  await sendChatAction(chatId, 'upload_photo');
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
      await editMessageText(chatId, statusMsg!.message_id, '❌ Ошибка списания звёзд.');
      return;
    }

    // Generate
    const pool = String(process.env.KIE_API_KEY_PHOTO_POOL || "").trim();
    const poolSize = pool ? pool.split(/[\s,]+/).filter(Boolean).length : 0;
    const slot = pickKieKeySlot("photo", poolSize);
    const kieClient = getKieClient({ scope: "photo", slot });
    if (!kieClient) {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Сервис недоступен');
      return;
    }

    const photoResult = await kieClient.generateImage({
      model: originalModel.apiId,
      prompt,
      aspectRatio: '1:1',
    });

    let resultUrl: string | undefined;

    if (photoResult.status === 'completed' && photoResult.outputs?.[0]?.url) {
      resultUrl = photoResult.outputs[0].url;
    } else if (photoResult.id) {
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

    if (resultUrl) {
      const caption = `✅ <b>Готово!</b> (-${cost}⭐)\n\n📝 ${prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}`;

      await sendPhoto(chatId, resultUrl, {
        caption,
        replyMarkup: createInlineKeyboard([
          [
            { text: '🔄 Ещё раз', callback_data: 'regen:photo:nano-banana' },
            { text: '💾 В избранное', callback_data: `fav:add:${photoResult.id || 'unknown'}` },
          ],
          [{ text: '🎨 Выбрать модель', callback_data: 'menu:photo' }],
        ]),
      });

      try {
        await editMessageText(chatId, statusMsg!.message_id, '✅ Генерация завершена!');
      } catch {}
    } else {
      await editMessageText(chatId, statusMsg!.message_id, '❌ Не удалось создать изображение.');
    }
  } catch (error) {
    console.error('[TG Quick Photo] Error:', error);
    await editMessageText(chatId, statusMsg!.message_id, '❌ Произошла ошибка.');
  }
}
