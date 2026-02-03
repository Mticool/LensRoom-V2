/**
 * Photo Generation Menu for Telegram Bot
 *
 * Full-featured photo generation with:
 * - Model selection
 * - Quality & aspect ratio settings
 * - T2I (text-to-image) and I2I (image-to-image) modes
 * - Settings persistence
 */

import {
  sendMessage,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';
import { getBotPhotoModels, findPhotoModel, getPhotoPrice } from '../bot-models';
import { getUserState, startFlow, updateFlow, updatePreferences } from '../state';

// ========================================
// Constants
// ========================================

const QUALITY_LABELS: Record<string, string> = {
  'turbo': '⚡ Turbo',
  'balanced': '⚖️ Balanced',
  'quality': '✨ Quality',
  'fast': '🚀 Fast',
  'ultra': '💎 Ultra',
  '1k': '📱 1K',
  '2k': '🖥️ 2K',
  '4k': '📺 4K',
  '8k': '🎬 8K',
  '1k_2k': '📐 1K-2K',
  'basic': '📝 Basic',
  'medium': '📋 Medium',
  'high': '📊 High',
};

const AR_LABELS: Record<string, string> = {
  '1:1': '◻️ 1:1',
  '16:9': '▬ 16:9',
  '9:16': '▮ 9:16',
  '4:3': '🖼️ 4:3',
  '3:4': '📱 3:4',
  '3:2': '📷 3:2',
  '2:3': '📸 2:3',
  '21:9': '🎬 21:9',
};

const QUALITY_DESCRIPTIONS: Record<string, string> = {
  'turbo': 'Быстрая генерация, базовое качество',
  'balanced': 'Оптимальный баланс скорости и качества',
  'quality': 'Максимальное качество, дольше генерация',
  'fast': 'Самая быстрая генерация',
  'ultra': 'Ультра-качество для профессионалов',
};

// ========================================
// Main Photo Menu
// ========================================

/**
 * Show photo models selection (2 columns layout)
 */
export async function showPhotoModels(chatId: number, messageId?: number): Promise<void> {
  const models = getBotPhotoModels();

  const text = `🎨 <b>Генерация фото</b>

Выберите модель:`;

  // Create 2-column layout
  const buttons: Array<Array<{ text: string; callback_data: string }>> = [];

  for (let i = 0; i < models.length; i += 2) {
    const row: Array<{ text: string; callback_data: string }> = [];

    // First model in row
    const m1 = models[i];
    row.push({
      text: `${m1.emoji} ${m1.name} ${m1.cost}⭐`,
      callback_data: `photo:model:${m1.id}`,
    });

    // Second model in row (if exists)
    if (i + 1 < models.length) {
      const m2 = models[i + 1];
      row.push({
        text: `${m2.emoji} ${m2.name} ${m2.cost}⭐`,
        callback_data: `photo:model:${m2.id}`,
      });
    }

    buttons.push(row);
  }

  // Navigation
  buttons.push([{ text: '⬅️ Назад', callback_data: 'menu:main' }]);

  console.log('[Photo Menu] Models:', models.map(m => ({ id: m.id, name: m.name })));
  console.log('[Photo Menu] Buttons:', JSON.stringify(buttons, null, 2));

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
 * Show model configuration - main entry point after model selection
 */
export async function showPhotoConfig(
  chatId: number,
  telegramId: number,
  modelId: string,
  messageId: number
): Promise<void> {
  console.log('[Photo Config] Called with modelId:', modelId);

  const model = findPhotoModel(modelId);
  console.log('[Photo Config] Found model:', model ? model.name : 'NOT FOUND');

  if (!model) {
    console.log('[Photo Config] Model not found, showing error');
    await editMessageText(chatId, messageId, '❌ Модель не найдена');
    return;
  }

  // Get user preferences for defaults
  const userState = await getUserState(telegramId);

  // Use user's saved preferences or model defaults
  const quality = userState.defaultQuality && model.qualityOptions.includes(userState.defaultQuality)
    ? userState.defaultQuality
    : model.qualityOptions[0] || 'balanced';

  const aspectRatio = userState.defaultAspectRatio && model.aspectRatios.includes(userState.defaultAspectRatio)
    ? userState.defaultAspectRatio
    : model.aspectRatios[0] || '1:1';

  // Start photo generation flow
  await startFlow(telegramId, 'photo_generation', 'configure', {
    modelId,
    quality,
    aspectRatio,
    mode: 't2i',
  });

  await renderPhotoHome(chatId, messageId, modelId, quality, aspectRatio, 't2i');
}

/**
 * Render main photo generation screen (like _home in Python)
 * Shows current settings and action buttons
 */
async function renderPhotoHome(
  chatId: number,
  messageId: number,
  modelId: string,
  quality: string,
  aspectRatio: string,
  mode: 't2i' | 'i2i',
  referenceUploaded: boolean = false
): Promise<void> {
  const model = findPhotoModel(modelId);
  if (!model) return;

  const cost = getPhotoPrice(modelId, quality, aspectRatio);
  const qualityLabel = QUALITY_LABELS[quality] || quality;
  const arLabel = AR_LABELS[aspectRatio] || aspectRatio;

  const modeText = mode === 'i2i'
    ? referenceUploaded
      ? '✅ Image-to-Image (референс загружен)'
      : '🖼️ Image-to-Image'
    : '📝 Text-to-Image';

  const text = `${model.emoji} <b>${model.name}</b>

💰 Стоимость: <b>${cost}⭐</b>

━━━ <b>Настройки</b> ━━━
⚙️ Качество: <b>${qualityLabel}</b>
📐 Формат: <b>${arLabel}</b>
🎯 Режим: <b>${modeText}</b>

━━━━━━━━━━━━━━━━

${mode === 't2i'
    ? '<b>Отправьте описание</b> для генерации:'
    : referenceUploaded
      ? '<b>Отправьте описание</b> для генерации с референсом:'
      : '<b>Отправьте изображение-референс</b> для начала:'
}`;

  const buttons: any[][] = [];

  // Quick settings row (like in Python example)
  buttons.push([
    { text: `${qualityLabel}`, callback_data: 'photo:settings:quality' },
    { text: `${arLabel}`, callback_data: 'photo:settings:ar' },
  ]);

  // Mode toggle (T2I / I2I)
  if (model.supportsI2i) {
    if (mode === 't2i') {
      buttons.push([
        { text: '🖼️ + Референс (I2I)', callback_data: 'photo:mode:i2i' },
      ]);
    } else {
      buttons.push([
        { text: '📝 Без референса (T2I)', callback_data: 'photo:mode:t2i' },
      ]);
    }
  }

  // All settings button
  buttons.push([
    { text: '⚙️ Все настройки', callback_data: 'photo:settings:all' },
  ]);

  // Navigation
  buttons.push([
    { text: '⬅️ Модели', callback_data: 'menu:photo' },
    { text: '🏠 Меню', callback_data: 'menu:main' },
  ]);

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard(buttons),
  });
}

// ========================================
// Settings Menus
// ========================================

/**
 * Show quality selection menu
 */
export async function showQualitySettings(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
  };

  const model = findPhotoModel(data.modelId);
  if (!model) return;

  const currentQuality = data.quality || 'balanced';

  const text = `${model.emoji} <b>${model.name}</b>

⚙️ <b>Выберите качество:</b>

${model.qualityOptions.map(q => {
  const label = QUALITY_LABELS[q] || q;
  const desc = QUALITY_DESCRIPTIONS[q] || '';
  const isSelected = q === currentQuality ? ' ✓' : '';
  return `${label}${isSelected}${desc ? `\n<i>${desc}</i>` : ''}`;
}).join('\n\n')}`;

  const buttons: any[][] = [];

  // Quality buttons (2 per row)
  const qualityOptions = model.qualityOptions;
  for (let i = 0; i < qualityOptions.length; i += 2) {
    const row = qualityOptions.slice(i, i + 2).map(q => ({
      text: currentQuality === q
        ? `✓ ${QUALITY_LABELS[q] || q}`
        : QUALITY_LABELS[q] || q,
      callback_data: `photo:quality:${q}`,
    }));
    buttons.push(row);
  }

  buttons.push([{ text: '⬅️ Назад', callback_data: 'photo:back:home' }]);

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard(buttons),
  });
}

/**
 * Show aspect ratio selection menu
 */
export async function showAspectRatioSettings(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
  };

  const model = findPhotoModel(data.modelId);
  if (!model) return;

  const currentAR = data.aspectRatio || '1:1';

  const text = `${model.emoji} <b>${model.name}</b>

📐 <b>Выберите формат:</b>

◻️ <b>1:1</b> - Квадрат (Instagram, аватары)
▬ <b>16:9</b> - Широкий (YouTube, презентации)
▮ <b>9:16</b> - Вертикальный (Stories, Reels)
🖼️ <b>4:3</b> - Классический (фото)
📱 <b>3:4</b> - Портрет`;

  const buttons: any[][] = [];

  // AR buttons (3 per row)
  const arOptions = model.aspectRatios;
  for (let i = 0; i < arOptions.length; i += 3) {
    const row = arOptions.slice(i, i + 3).map(ar => ({
      text: currentAR === ar
        ? `✓ ${AR_LABELS[ar] || ar}`
        : AR_LABELS[ar] || ar,
      callback_data: `photo:ar:${ar}`,
    }));
    buttons.push(row);
  }

  buttons.push([{ text: '⬅️ Назад', callback_data: 'photo:back:home' }]);

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard(buttons),
  });
}

/**
 * Show all settings page (like _parameters_page in Python)
 */
export async function showAllSettings(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
    mode: string;
  };

  const model = findPhotoModel(data.modelId);
  if (!model) return;

  const qualityLabel = QUALITY_LABELS[data.quality] || data.quality;
  const arLabel = AR_LABELS[data.aspectRatio] || data.aspectRatio;
  const cost = getPhotoPrice(data.modelId, data.quality, data.aspectRatio);

  const text = `${model.emoji} <b>${model.name}</b>
💰 Стоимость: ${cost}⭐

━━━ <b>Все настройки</b> ━━━

Нажмите на параметр для изменения:`;

  const buttons: any[][] = [
    [{ text: `⚙️ Качество: ${qualityLabel}`, callback_data: 'photo:settings:quality' }],
    [{ text: `📐 Формат: ${arLabel}`, callback_data: 'photo:settings:ar' }],
  ];

  // Mode toggle
  if (model.supportsI2i) {
    const modeLabel = data.mode === 'i2i' ? '🖼️ Image-to-Image' : '📝 Text-to-Image';
    buttons.push([{ text: `🎯 Режим: ${modeLabel}`, callback_data: `photo:mode:${data.mode === 'i2i' ? 't2i' : 'i2i'}` }]);
  }

  // Save as default
  buttons.push([{ text: '💾 Сохранить как по умолчанию', callback_data: 'photo:save:defaults' }]);

  buttons.push([{ text: '⬅️ Назад', callback_data: 'photo:back:home' }]);

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard(buttons),
  });
}

// ========================================
// Settings Updates
// ========================================

/**
 * Update quality selection
 */
export async function updatePhotoQuality(
  chatId: number,
  telegramId: number,
  quality: string,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    aspectRatio: string;
    mode: string;
    referenceImageUrl?: string;
  };

  await updateFlow(telegramId, 'configure', { quality });

  // Return to home screen with updated quality
  const hasReference = !!data.referenceImageUrl;
  await renderPhotoHome(
    chatId,
    messageId,
    data.modelId,
    quality,
    data.aspectRatio,
    (data.mode || 't2i') as 't2i' | 'i2i',
    hasReference
  );
}

/**
 * Update aspect ratio selection
 */
export async function updatePhotoAspectRatio(
  chatId: number,
  telegramId: number,
  aspectRatio: string,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    mode: string;
    referenceImageUrl?: string;
  };

  await updateFlow(telegramId, 'configure', { aspectRatio });

  // Return to home screen with updated AR
  const hasReference = !!data.referenceImageUrl;
  await renderPhotoHome(
    chatId,
    messageId,
    data.modelId,
    data.quality,
    aspectRatio,
    (data.mode || 't2i') as 't2i' | 'i2i',
    hasReference
  );
}

/**
 * Save current settings as user defaults
 */
export async function saveAsDefaults(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
  };

  // Save to user preferences
  await updatePreferences(telegramId, {
    defaultPhotoModel: data.modelId,
    defaultQuality: data.quality,
    defaultAspectRatio: data.aspectRatio,
  });

  // Show confirmation and return to settings
  const model = findPhotoModel(data.modelId);
  const qualityLabel = QUALITY_LABELS[data.quality] || data.quality;
  const arLabel = AR_LABELS[data.aspectRatio] || data.aspectRatio;

  const text = `✅ <b>Настройки сохранены!</b>

Теперь по умолчанию:
• Модель: ${model?.name || data.modelId}
• Качество: ${qualityLabel}
• Формат: ${arLabel}`;

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '⬅️ Назад к генерации', callback_data: 'photo:back:home' }],
    ]),
  });
}

// ========================================
// Mode Switching
// ========================================

/**
 * Switch to I2I mode (request reference image)
 */
export async function switchToI2IMode(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
  };

  const model = findPhotoModel(data.modelId);
  if (!model) return;

  await updateFlow(telegramId, 'await_reference', { mode: 'i2i' });

  const text = `${model.emoji} <b>${model.name}</b>
🖼️ <b>Режим Image-to-Image</b>

Отправьте изображение-референс.

<i>Бот создаст новое изображение, сохраняя стиль и композицию референса.</i>

📎 Форматы: JPG, PNG, WebP
📏 Макс. размер: 10 МБ`;

  await editMessageText(chatId, messageId, text, {
    replyMarkup: createInlineKeyboard([
      [{ text: '📝 Без референса (T2I)', callback_data: 'photo:mode:t2i' }],
      [{ text: '⬅️ Назад', callback_data: 'photo:back:home' }],
    ]),
  });
}

/**
 * Switch to T2I mode (text only)
 */
export async function switchToT2IMode(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
  };

  await updateFlow(telegramId, 'configure', {
    mode: 't2i',
    referenceImageUrl: undefined,
  });

  await renderPhotoHome(
    chatId,
    messageId,
    data.modelId,
    data.quality,
    data.aspectRatio,
    't2i'
  );
}

/**
 * Go back to home screen
 */
export async function backToPhotoHome(
  chatId: number,
  telegramId: number,
  messageId: number
): Promise<void> {
  const state = await getUserState(telegramId);
  const data = state.conversation.data as {
    modelId: string;
    quality: string;
    aspectRatio: string;
    mode: string;
    referenceImageUrl?: string;
  };

  // Make sure we're in configure state
  await updateFlow(telegramId, 'configure', {});

  const hasReference = !!data.referenceImageUrl;
  await renderPhotoHome(
    chatId,
    messageId,
    data.modelId,
    data.quality,
    data.aspectRatio,
    (data.mode || 't2i') as 't2i' | 'i2i',
    hasReference
  );
}

// ========================================
// Callback Router
// ========================================

/**
 * Handle photo settings callbacks
 * Called from callbacks.ts for photo:settings:* routes
 */
export async function handlePhotoSettingsCallback(
  chatId: number,
  telegramId: number,
  settingType: string,
  messageId: number
): Promise<void> {
  switch (settingType) {
    case 'quality':
      await showQualitySettings(chatId, telegramId, messageId);
      break;
    case 'ar':
      await showAspectRatioSettings(chatId, telegramId, messageId);
      break;
    case 'all':
      await showAllSettings(chatId, telegramId, messageId);
      break;
  }
}

/**
 * Handle photo:back:* callbacks
 */
export async function handlePhotoBackCallback(
  chatId: number,
  telegramId: number,
  target: string,
  messageId: number
): Promise<void> {
  switch (target) {
    case 'home':
      await backToPhotoHome(chatId, telegramId, messageId);
      break;
  }
}

/**
 * Handle photo:save:* callbacks
 */
export async function handlePhotoSaveCallback(
  chatId: number,
  telegramId: number,
  action: string,
  messageId: number
): Promise<void> {
  switch (action) {
    case 'defaults':
      await saveAsDefaults(chatId, telegramId, messageId);
      break;
  }
}

// ========================================
// Exports for backward compatibility
// ========================================

// Re-export formatQuality for use in other modules
export function formatQuality(quality: string): string {
  return QUALITY_LABELS[quality] || quality;
}

export function formatAspectRatio(ar: string): string {
  return AR_LABELS[ar] || ar;
}
