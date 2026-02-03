/**
 * Callback Query Handlers
 *
 * Handles inline keyboard button clicks
 */

import { answerCallbackQuery, type TelegramCallbackQuery } from '../bot-client';
import {
  showMainMenu,
  showPhotoModels,
  showPhotoConfig,
  updatePhotoQuality,
  updatePhotoAspectRatio,
  switchToI2IMode,
  switchToT2IMode,
  handlePhotoSettingsCallback,
  handlePhotoBackCallback,
  handlePhotoSaveCallback,
  showVideoModels,
  showVideoConfig,
  updateVideoDuration,
  updateVideoResolution,
  updateVideoAspectRatio,
  toggleVideoAudio,
  switchToI2VMode,
  switchToT2VMode,
  showBalance,
  showPaymentOptions,
  handlePaymentSelection,
  showTransactionHistory,
  showAudioMenu,
  showTTSMenu,
  showVoiceCloning,
  showMusicMenu,
  showUserVoices,
} from '../menus';
import { startFlow } from '../state';

/**
 * Main callback query handler
 */
export async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const data = query.data || '';
  const telegramId = query.from.id;

  console.log('[TG Callback] Received:', { data, chatId, messageId, telegramId });

  // Always answer callback to remove loading state
  await answerCallbackQuery(query.id);

  if (!chatId || !messageId) {
    console.log('[TG Callback] Missing chatId or messageId');
    return;
  }

  const [action, ...params] = data.split(':');
  console.log('[TG Callback] Parsed:', { action, params });

  switch (action) {
    // ==================
    // Menu Navigation
    // ==================
    case 'menu':
      await handleMenuNavigation(chatId, telegramId, params[0], messageId, query.from);
      break;

    // ==================
    // Photo Generation
    // ==================
    case 'photo':
      await handlePhotoCallback(chatId, telegramId, params, messageId);
      break;

    // ==================
    // Video Generation
    // ==================
    case 'video':
      await handleVideoCallback(chatId, telegramId, params, messageId);
      break;

    // ==================
    // Audio/TTS
    // ==================
    case 'audio':
      await handleAudioCallback(chatId, telegramId, params[0], messageId);
      break;

    // ==================
    // Payments
    // ==================
    case 'pay':
      const [payType, payItemId] = params as ['sub' | 'pack', string];
      await handlePaymentSelection(chatId, telegramId, payType, payItemId, messageId);
      break;

    // ==================
    // Regenerate
    // ==================
    case 'regen':
      const [regenMode, regenModelId] = params as ['photo' | 'video', string];
      if (regenMode === 'photo') {
        await showPhotoConfig(chatId, telegramId, regenModelId, messageId);
      } else if (regenMode === 'video') {
        await showVideoConfig(chatId, telegramId, regenModelId, messageId);
      }
      break;

    // ==================
    // Reference-first flow (Photo uploaded → select action → config → prompt)
    // ==================
    case 'ref':
      await handleReferenceCallback(chatId, telegramId, params, messageId);
      break;

    // ==================
    // Favorites
    // ==================
    case 'fav':
      // TODO: Implement favorites handling
      await answerCallbackQuery(query.id, { text: '💾 Добавлено в избранное', showAlert: false });
      break;

    // ==================
    // No-op (for separators)
    // ==================
    case 'noop':
      // Do nothing
      break;
  }
}

/**
 * Handle menu navigation
 */
async function handleMenuNavigation(
  chatId: number,
  telegramId: number,
  menuType: string,
  messageId: number,
  from: { first_name: string; username?: string }
): Promise<void> {
  switch (menuType) {
    case 'main':
      await showMainMenu(chatId, from.first_name, telegramId, from.username);
      break;
    case 'photo':
      await showPhotoModels(chatId, messageId);
      break;
    case 'video':
      await showVideoModels(chatId, messageId);
      break;
    case 'audio':
      await showAudioMenu(chatId, messageId);
      break;
    case 'balance':
      await showBalance(chatId, telegramId, messageId);
      break;
    case 'buy':
      await showPaymentOptions(chatId, telegramId, messageId);
      break;
    case 'transactions':
      await showTransactionHistory(chatId, telegramId, messageId);
      break;
    case 'library':
      // TODO: Show library
      break;
    case 'settings':
      // TODO: Show settings
      break;
  }
}

/**
 * Handle photo-related callbacks
 */
async function handlePhotoCallback(
  chatId: number,
  telegramId: number,
  params: string[],
  messageId: number
): Promise<void> {
  const [subAction, value] = params;
  console.log('[TG Photo Callback]', { subAction, value, params });

  try {
    switch (subAction) {
      case 'model':
        // User selected a model
        console.log('[TG Photo Callback] Calling showPhotoConfig for model:', value);
        await showPhotoConfig(chatId, telegramId, value, messageId);
        break;

    case 'quality':
      // User changed quality
      await updatePhotoQuality(chatId, telegramId, value, messageId);
      break;

    case 'ar':
      // User changed aspect ratio
      await updatePhotoAspectRatio(chatId, telegramId, value, messageId);
      break;

    case 'mode':
      if (value === 'i2i') {
        await switchToI2IMode(chatId, telegramId, messageId);
      } else {
        await switchToT2IMode(chatId, telegramId, messageId);
      }
      break;

    case 'settings':
      // Open settings menus (photo:settings:quality, photo:settings:ar, photo:settings:all)
      await handlePhotoSettingsCallback(chatId, telegramId, value, messageId);
      break;

    case 'back':
      // Navigation back (photo:back:home)
      await handlePhotoBackCallback(chatId, telegramId, value, messageId);
      break;

    case 'save':
      // Save actions (photo:save:defaults)
      await handlePhotoSaveCallback(chatId, telegramId, value, messageId);
      break;

    default:
      console.log('[TG Photo Callback] Unknown subAction:', subAction);
    }
  } catch (error) {
    console.error('[TG Photo Callback] Error:', error);
    const { sendMessage } = await import('../bot-client');
    await sendMessage(chatId, '❌ Произошла ошибка. Попробуйте ещё раз.');
  }
}

/**
 * Handle video-related callbacks
 */
async function handleVideoCallback(
  chatId: number,
  telegramId: number,
  params: string[],
  messageId: number
): Promise<void> {
  const [subAction, value] = params;

  switch (subAction) {
    case 'model':
      // User selected a model
      await showVideoConfig(chatId, telegramId, value, messageId);
      break;

    case 'duration':
      // User changed duration
      const duration = parseInt(value) || value;
      await updateVideoDuration(chatId, telegramId, duration, messageId);
      break;

    case 'res':
      // User changed resolution
      await updateVideoResolution(chatId, telegramId, value, messageId);
      break;

    case 'ar':
      // User changed aspect ratio
      await updateVideoAspectRatio(chatId, telegramId, value, messageId);
      break;

    case 'audio':
      // User toggled audio
      await toggleVideoAudio(chatId, telegramId, value === 'on', messageId);
      break;

    case 'mode':
      if (value === 'i2v') {
        await switchToI2VMode(chatId, telegramId, messageId);
      } else {
        await switchToT2VMode(chatId, telegramId, messageId);
      }
      break;
  }
}

/**
 * Handle audio-related callbacks
 */
async function handleAudioCallback(
  chatId: number,
  telegramId: number,
  subAction: string,
  messageId: number
): Promise<void> {
  switch (subAction) {
    case 'tts':
      await showTTSMenu(chatId, telegramId, messageId);
      break;
    case 'clone':
      await showVoiceCloning(chatId, telegramId, messageId);
      break;
    case 'music':
      await showMusicMenu(chatId, telegramId, messageId);
      break;
    case 'voices':
      await showUserVoices(chatId, telegramId, messageId);
      break;
  }
}

/**
 * Handle reference-first flow callbacks
 * When user uploads photo first → selects action → configures → sends prompt
 */
async function handleReferenceCallback(
  chatId: number,
  telegramId: number,
  params: string[],
  messageId: number
): Promise<void> {
  const { getCurrentFlow, clearFlow, updateFlow } = await import('../state');
  const { sendMessage, editMessageText, createInlineKeyboard } = await import('../bot-client');
  const { getBotPhotoModels, getBotVideoModels, findPhotoModel, findVideoModel } = await import('../bot-models');

  const [subAction, value] = params;

  // Get current flow with pending reference
  const flow = await getCurrentFlow(telegramId);

  switch (subAction) {
    case 'cancel':
      // User cancelled - clear flow
      await clearFlow(telegramId);
      await editMessageText(chatId, messageId, '❌ Отменено.', {
        replyMarkup: createInlineKeyboard([
          [{ text: '🏠 Главное меню', callback_data: 'menu:main' }],
        ]),
      });
      break;

    case 'photo':
      if (value === 'select') {
        // Show photo model selection with reference already saved
        const models = getBotPhotoModels();
        const buttons = models.map(m => [{
          text: `${m.emoji} ${m.name} • ${m.cost}⭐`,
          callback_data: `ref:photo:model:${m.id}`,
        }]);
        buttons.push([{ text: '❌ Отмена', callback_data: 'ref:cancel' }]);

        await editMessageText(chatId, messageId, `🎨 <b>Фото I2I</b>

✅ Референс загружен!

Выберите модель для генерации:`, {
          replyMarkup: createInlineKeyboard(buttons),
        });
      } else if (value === 'model') {
        // Model selected for photo I2I
        const modelId = params[2];
        const model = findPhotoModel(modelId);

        if (!model) {
          await sendMessage(chatId, '❌ Модель не найдена');
          return;
        }

        // Get pending reference from flow
        const referenceUrl = flow?.data?.pendingReferenceUrl;
        if (!referenceUrl) {
          await sendMessage(chatId, '❌ Референс не найден. Отправьте фото ещё раз.');
          await clearFlow(telegramId);
          return;
        }

        // Update flow: set model, move reference, change step
        await updateFlow(telegramId, 'await_prompt', {
          modelId: modelId,
          quality: 'balanced',
          aspectRatio: '1:1',
          mode: 'i2i',
          referenceImageUrl: referenceUrl,
          pendingReferenceUrl: undefined, // Clear pending
        });

        await editMessageText(chatId, messageId, `${model.emoji} <b>${model.name}</b> (I2I)

✅ Референс загружен
💰 Стоимость: ${model.cost}⭐

<b>Отправьте описание для генерации:</b>

<i>Опишите, что хотите увидеть на изображении, учитывая загруженный референс.</i>`, {
          replyMarkup: createInlineKeyboard([
            [{ text: '⚙️ Настройки', callback_data: `ref:photo:config:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      } else if (value === 'config') {
        // Show config for photo I2I (quality, aspect ratio)
        const modelId = params[2];
        const model = findPhotoModel(modelId);
        const data = flow?.data || {};

        if (!model) {
          await sendMessage(chatId, '❌ Модель не найдена');
          return;
        }

        const currentQuality = data.quality || 'balanced';
        const currentAR = data.aspectRatio || '1:1';

        await editMessageText(chatId, messageId, `${model.emoji} <b>${model.name}</b> (I2I)

✅ Референс загружен
⚙️ <b>Настройки:</b>

Качество: <b>${currentQuality}</b>
Формат: <b>${currentAR}</b>`, {
          replyMarkup: createInlineKeyboard([
            // Quality row
            [
              { text: currentQuality === 'turbo' ? '⚡ Turbo ✓' : '⚡ Turbo', callback_data: `ref:photo:q:turbo:${modelId}` },
              { text: currentQuality === 'balanced' ? '⚖️ Balanced ✓' : '⚖️ Balanced', callback_data: `ref:photo:q:balanced:${modelId}` },
              { text: currentQuality === 'quality' ? '✨ Quality ✓' : '✨ Quality', callback_data: `ref:photo:q:quality:${modelId}` },
            ],
            // Aspect ratio row
            [
              { text: currentAR === '1:1' ? '◻️ 1:1 ✓' : '◻️ 1:1', callback_data: `ref:photo:ar:1:1:${modelId}` },
              { text: currentAR === '16:9' ? '▬ 16:9 ✓' : '▬ 16:9', callback_data: `ref:photo:ar:16:9:${modelId}` },
              { text: currentAR === '9:16' ? '▮ 9:16 ✓' : '▮ 9:16', callback_data: `ref:photo:ar:9:16:${modelId}` },
            ],
            [{ text: '✅ Готово - жду промпт', callback_data: `ref:photo:done:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      } else if (value === 'q') {
        // Quality change
        const quality = params[2];
        const modelId = params[3];
        await updateFlow(telegramId, flow?.step || 'await_prompt', { quality });
        // Re-show config
        await handleReferenceCallback(chatId, telegramId, ['photo', 'config', modelId], messageId);
      } else if (value === 'ar') {
        // Aspect ratio change
        const ar = `${params[2]}:${params[3]}`; // Reconstruct "16:9" from split
        const modelId = params[4];
        await updateFlow(telegramId, flow?.step || 'await_prompt', { aspectRatio: ar });
        // Re-show config
        await handleReferenceCallback(chatId, telegramId, ['photo', 'config', modelId], messageId);
      } else if (value === 'done') {
        // Config done, now wait for prompt
        const modelId = params[2];
        const model = findPhotoModel(modelId);
        const data = flow?.data || {};

        await updateFlow(telegramId, 'await_prompt', {});

        await editMessageText(chatId, messageId, `${model?.emoji || '🎨'} <b>${model?.name || 'Модель'}</b> (I2I)

✅ Референс: загружен
⚙️ Качество: ${data.quality || 'balanced'}
📐 Формат: ${data.aspectRatio || '1:1'}

<b>Отправьте описание для генерации:</b>`, {
          replyMarkup: createInlineKeyboard([
            [{ text: '⚙️ Изменить настройки', callback_data: `ref:photo:config:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      }
      break;

    case 'video':
      if (value === 'select') {
        // Show video model selection with reference already saved
        const models = getBotVideoModels();
        const buttons = models.map(m => [{
          text: `${m.emoji} ${m.name} • от ${m.baseCost}⭐`,
          callback_data: `ref:video:model:${m.id}`,
        }]);
        buttons.push([{ text: '❌ Отмена', callback_data: 'ref:cancel' }]);

        await editMessageText(chatId, messageId, `🎬 <b>Видео I2V</b>

✅ Стартовый кадр загружен!

Выберите модель для генерации:`, {
          replyMarkup: createInlineKeyboard(buttons),
        });
      } else if (value === 'model') {
        // Model selected for video I2V
        const modelId = params[2];
        const model = findVideoModel(modelId);

        if (!model) {
          await sendMessage(chatId, '❌ Модель не найдена');
          return;
        }

        // Get pending reference from flow
        const referenceUrl = flow?.data?.pendingReferenceUrl;
        if (!referenceUrl) {
          await sendMessage(chatId, '❌ Стартовый кадр не найден. Отправьте фото ещё раз.');
          await clearFlow(telegramId);
          return;
        }

        // Switch to video_generation flow
        const { startFlow: restartFlow } = await import('../state');
        await restartFlow(telegramId, 'video_generation', 'await_prompt', {
          modelId: modelId,
          duration: model.defaultDuration || 5,
          resolution: model.defaultResolution || '720p',
          aspectRatio: '16:9',
          withAudio: false,
          mode: 'i2v',
          referenceImageUrl: referenceUrl,
        });

        await editMessageText(chatId, messageId, `${model.emoji} <b>${model.name}</b> (I2V)

✅ Стартовый кадр загружен
💰 Стоимость: от ${model.baseCost}⭐

<b>Отправьте описание для генерации видео:</b>

<i>Опишите движение и сцену, которую хотите получить.</i>`, {
          replyMarkup: createInlineKeyboard([
            [{ text: '⚙️ Настройки', callback_data: `ref:video:config:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      } else if (value === 'config') {
        // Show config for video I2V
        const modelId = params[2];
        const model = findVideoModel(modelId);
        const data = flow?.data || {};

        if (!model) {
          await sendMessage(chatId, '❌ Модель не найдена');
          return;
        }

        const currentDuration = data.duration || 5;
        const currentAR = data.aspectRatio || '16:9';
        const audioEnabled = data.withAudio || false;

        await editMessageText(chatId, messageId, `${model.emoji} <b>${model.name}</b> (I2V)

✅ Стартовый кадр загружен
⚙️ <b>Настройки:</b>

Длительность: <b>${currentDuration}s</b>
Формат: <b>${currentAR}</b>
Звук: <b>${audioEnabled ? '✅ Вкл' : '❌ Выкл'}</b>`, {
          replyMarkup: createInlineKeyboard([
            // Duration row
            [
              { text: currentDuration === 5 ? '5s ✓' : '5s', callback_data: `ref:video:dur:5:${modelId}` },
              { text: currentDuration === 10 ? '10s ✓' : '10s', callback_data: `ref:video:dur:10:${modelId}` },
            ],
            // Aspect ratio row
            [
              { text: currentAR === '16:9' ? '▬ 16:9 ✓' : '▬ 16:9', callback_data: `ref:video:ar:16:9:${modelId}` },
              { text: currentAR === '9:16' ? '▮ 9:16 ✓' : '▮ 9:16', callback_data: `ref:video:ar:9:16:${modelId}` },
              { text: currentAR === '1:1' ? '◻️ 1:1 ✓' : '◻️ 1:1', callback_data: `ref:video:ar:1:1:${modelId}` },
            ],
            // Audio toggle
            [{ text: audioEnabled ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ', callback_data: `ref:video:audio:${modelId}` }],
            [{ text: '✅ Готово - жду промпт', callback_data: `ref:video:done:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      } else if (value === 'dur') {
        // Duration change
        const duration = parseInt(params[2]);
        const modelId = params[3];
        await updateFlow(telegramId, flow?.step || 'await_prompt', { duration });
        await handleReferenceCallback(chatId, telegramId, ['video', 'config', modelId], messageId);
      } else if (value === 'ar') {
        // Aspect ratio change for video
        const ar = `${params[2]}:${params[3]}`;
        const modelId = params[4];
        await updateFlow(telegramId, flow?.step || 'await_prompt', { aspectRatio: ar });
        await handleReferenceCallback(chatId, telegramId, ['video', 'config', modelId], messageId);
      } else if (value === 'audio') {
        // Toggle audio
        const modelId = params[2];
        const currentAudio = flow?.data?.withAudio || false;
        await updateFlow(telegramId, flow?.step || 'await_prompt', { withAudio: !currentAudio });
        await handleReferenceCallback(chatId, telegramId, ['video', 'config', modelId], messageId);
      } else if (value === 'done') {
        // Config done, now wait for prompt
        const modelId = params[2];
        const model = findVideoModel(modelId);
        const data = flow?.data || {};

        await updateFlow(telegramId, 'await_prompt', {});

        await editMessageText(chatId, messageId, `${model?.emoji || '🎬'} <b>${model?.name || 'Модель'}</b> (I2V)

✅ Стартовый кадр: загружен
⏱ Длительность: ${data.duration || 5}s
📐 Формат: ${data.aspectRatio || '16:9'}
🔊 Звук: ${data.withAudio ? 'ВКЛ' : 'ВЫКЛ'}

<b>Отправьте описание для генерации видео:</b>`, {
          replyMarkup: createInlineKeyboard([
            [{ text: '⚙️ Изменить настройки', callback_data: `ref:video:config:${modelId}` }],
            [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
          ]),
        });
      }
      break;
  }
}
