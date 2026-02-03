/**
 * Video Generation Menu for Telegram Bot
 */

import {
  sendMessage,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';
import { getBotVideoModels, findVideoModel, getVideoPrice } from '../bot-models';
import { getUserState, startFlow, updateFlow } from '../state';

/**
 * Show video models selection
 */
export async function showVideoModels(chatId: number, messageId?: number): Promise<void> {
  const models = getBotVideoModels();

  const text = `
🎬 <b>Генерация видео</b>

Выберите модель:
`;

  const buttons = models.map(m => [{
    text: `${m.emoji} ${m.name} • ${m.cost}⭐`,
    callback_data: `video:model:${m.id}`,
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
 * Show model configuration (duration, resolution, aspect ratio)
 */
export async function showVideoConfig(
  chatId: number,
  telegramId: number,
  modelId: string,
  messageId: number
): Promise<void> {
  const model = findVideoModel(modelId);
  if (!model) {
    await editMessageText(chatId, messageId, '❌ Модель не найдена');
    return;
  }

  // Get user state for defaults
  const userState = await getUserState(telegramId);

  // Default values
  const duration = model.durationOptions[0] || 5;
  const resolution = model.resolutionOptions?.[0] || '720p';
  const aspectRatio = model.aspectRatios[0] || '16:9';
  const withAudio = model.supportsAudio;

  // Start video flow
  await startFlow(telegramId, 'video_generation', 'configure', {
    modelId,
    duration,
    resolution,
    aspectRatio,
    withAudio,
    mode: 't2v',
  });

  await renderVideoConfig(chatId, messageId, modelId, duration, resolution, aspectRatio, withAudio);
}

/**
 * Render configuration message
 */
async function renderVideoConfig(
  chatId: number,
  messageId: number,
  modelId: string,
  duration: number | string,
  resolution: string,
  aspectRatio: string,
  withAudio: boolean
): Promise<void> {
  const model = findVideoModel(modelId);
  if (!model) return;

  const cost = getVideoPrice(modelId, duration, resolution, withAudio);

  const text = `
${model.emoji} <b>${model.name}</b>
💰 Стоимость: ${cost}⭐

<b>Длительность:</b> ${duration}s
<b>Разрешение:</b> ${resolution}
<b>Формат:</b> ${aspectRatio}
${model.supportsAudio ? `<b>Звук:</b> ${withAudio ? '✓ Включён' : '✗ Выключен'}` : ''}

Отправьте описание для генерации:
`;

  const buttons: any[][] = [];

  // Duration options
  if (model.durationOptions.length > 1) {
    const durationRow = model.durationOptions.slice(0, 4).map(d => ({
      text: duration == d ? `✓ ${d}s` : `${d}s`,
      callback_data: `video:duration:${d}`,
    }));
    buttons.push(durationRow);
  }

  // Resolution options
  if (model.resolutionOptions && model.resolutionOptions.length > 1) {
    const resRow = model.resolutionOptions.slice(0, 3).map(r => ({
      text: resolution === r ? `✓ ${r}` : r,
      callback_data: `video:res:${r}`,
    }));
    buttons.push(resRow);
  }

  // Aspect ratio options
  const arOptions = model.aspectRatios.slice(0, 4);
  const arRow = arOptions.map(ar => ({
    text: aspectRatio === ar ? `✓ ${ar}` : ar,
    callback_data: `video:ar:${ar}`,
  }));
  buttons.push(arRow);

  // Audio toggle if supported
  if (model.supportsAudio) {
    buttons.push([{
      text: withAudio ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ',
      callback_data: `video:audio:${withAudio ? 'off' : 'on'}`,
    }]);
  }

  // I2V toggle if supported
  if (model.supportsI2v) {
    buttons.push([
      { text: '🖼️ Добавить стартовый кадр', callback_data: 'video:mode:i2v' },
    ]);
  }

  buttons.push([
    { text: '⬅️ Модели', callback_data: 'menu:video' },
    { text: '❌ Отмена', callback_data: 'menu:main' },
  ]);

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard(buttons),
  });
}

/**
 * Update duration selection
 */
export async function updateVideoDuration(
  chatId: number,
  telegramId: number,
  duration: number | string,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    resolution: string;
    aspectRatio: string;
    withAudio: boolean;
  };

  await updateFlow(telegramId, 'configure', { duration });

  await renderVideoConfig(chatId, messageId, data.modelId, duration, data.resolution, data.aspectRatio, data.withAudio);
}

/**
 * Update resolution selection
 */
export async function updateVideoResolution(
  chatId: number,
  telegramId: number,
  resolution: string,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    duration: number | string;
    aspectRatio: string;
    withAudio: boolean;
  };

  await updateFlow(telegramId, 'configure', { resolution });

  await renderVideoConfig(chatId, messageId, data.modelId, data.duration, resolution, data.aspectRatio, data.withAudio);
}

/**
 * Update aspect ratio selection
 */
export async function updateVideoAspectRatio(
  chatId: number,
  telegramId: number,
  aspectRatio: string,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    duration: number | string;
    resolution: string;
    withAudio: boolean;
  };

  await updateFlow(telegramId, 'configure', { aspectRatio });

  await renderVideoConfig(chatId, messageId, data.modelId, data.duration, data.resolution, aspectRatio, data.withAudio);
}

/**
 * Toggle audio
 */
export async function toggleVideoAudio(
  chatId: number,
  telegramId: number,
  enable: boolean,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    duration: number | string;
    resolution: string;
    aspectRatio: string;
  };

  await updateFlow(telegramId, 'configure', { withAudio: enable });

  await renderVideoConfig(chatId, messageId, data.modelId, data.duration, data.resolution, data.aspectRatio, enable);
}

/**
 * Switch to I2V mode
 */
export async function switchToI2VMode(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as { modelId: string };
  const model = findVideoModel(data.modelId);

  if (!model) return;

  await updateFlow(telegramId, 'await_reference', { mode: 'i2v' });

  const text = `
${model.emoji} <b>${model.name}</b> (Image-to-Video)

Отправьте стартовый кадр:

<i>Поддерживаемые форматы: JPG, PNG, WebP
Максимальный размер: 10 МБ</i>
`;

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '⬅️ Без стартового кадра', callback_data: `video:mode:t2v` }],
      [{ text: '❌ Отмена', callback_data: 'menu:main' }],
    ]),
  });
}

/**
 * Switch back to T2V mode
 */
export async function switchToT2VMode(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    duration: number | string;
    resolution: string;
    aspectRatio: string;
    withAudio: boolean;
  };

  await updateFlow(telegramId, 'configure', { mode: 't2v', referenceImageUrl: undefined });

  await renderVideoConfig(chatId, messageId, data.modelId, data.duration, data.resolution, data.aspectRatio, data.withAudio);
}
