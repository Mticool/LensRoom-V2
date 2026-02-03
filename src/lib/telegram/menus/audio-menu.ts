/**
 * Audio/TTS Menu for Telegram Bot
 */

import {
  sendMessage,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';
import { getBotAudioModels } from '../bot-models';
import { startFlow } from '../state';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

/**
 * Show audio options
 */
export async function showAudioMenu(chatId: number, messageId?: number): Promise<void> {
  const text = `
🎵 <b>Аудио генерация</b>

Выберите тип:
`;

  const buttons = [
    [{ text: '🗣️ Озвучка текста (TTS)', callback_data: 'audio:tts' }],
    [{ text: '🎤 Клонировать голос', callback_data: 'audio:clone' }],
    [{ text: '🎶 Сгенерировать музыку', callback_data: 'audio:music' }],
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
 * Show TTS options
 */
export async function showTTSMenu(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  await startFlow(telegramId, 'tts_generation', 'await_text', {});

  const text = `
🗣️ <b>Озвучка текста (TTS)</b>

Отправьте текст для озвучки:

<i>Максимум: 5000 символов
Стоимость: 1⭐ за 100 символов</i>
`;

  const buttons = [
    [{ text: '🎤 Мои голоса', callback_data: 'audio:voices' }],
    [{ text: '🆕 Клонировать голос', callback_data: 'audio:clone' }],
    [{ text: '⬅️ Назад', callback_data: 'menu:audio' }],
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
 * Show voice cloning instructions
 */
export async function showVoiceCloning(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  await startFlow(telegramId, 'voice_clone', 'await_audio', {});

  const text = `
🎤 <b>Клонирование голоса</b>

Отправьте аудио файл (10-120 секунд) с голосом, который хотите клонировать.

<b>Требования:</b>
• Чистая речь без музыки и шумов
• MP3, WAV или OGG формат
• 10-120 секунд
• Стоимость: 15⭐
`;

  const buttons = [
    [{ text: '❌ Отмена', callback_data: 'menu:audio' }],
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
 * Show music generation options
 */
export async function showMusicMenu(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  const models = getBotAudioModels();
  const suno = models.find(m => m.id === 'suno');

  await startFlow(telegramId, 'audio_generation', 'await_prompt', { modelId: 'suno' });

  const text = `
🎶 <b>Генерация музыки</b>

${suno ? `${suno.emoji} ${suno.name} • ${suno.cost}⭐` : '🎵 Suno AI • 12⭐'}

Отправьте описание трека:

<b>Примеры:</b>
<code>веселая поп музыка для видео</code>
<code>эпический оркестр в стиле киноматографии</code>
<code>lo-fi хип-хоп для учёбы</code>
`;

  const buttons = [
    [{ text: '⬅️ Назад', callback_data: 'menu:audio' }],
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
 * Show user's cloned voices (placeholder - full in Mini App)
 */
export async function showUserVoices(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  const text = `
🎤 <b>Ваши голоса</b>

Полное управление голосами доступно в Mini App.
`;

  const buttons = [
    [{ text: '🎤 Открыть голоса', web_app: { url: `${WEBAPP_URL}/create?section=audio` } }],
    [{ text: '🆕 Клонировать голос', callback_data: 'audio:clone' }],
    [{ text: '⬅️ Назад', callback_data: 'audio:tts' }],
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
