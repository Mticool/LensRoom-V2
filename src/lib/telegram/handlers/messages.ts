/**
 * Message Handlers
 *
 * Handles text messages and photo uploads
 */

import { type TelegramMessage, getFileUrl } from '../bot-client';
import { getUserState, hasActiveFlow, getCurrentFlow, clearFlow } from '../state';
import { showMainMenu, showHelp, showMiniApp, showPhotoModels, showVideoModels, showAudioMenu, showBalance } from '../menus';
import { executePhotoGeneration, handleReferenceImage, quickPhotoGenerate, executeVideoGeneration, handleStartFrame } from '../flows';
import { handleLoginCode } from './auth';

/**
 * Main message handler
 */
export async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const telegramId = message.from.id;

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, telegramId, text, message.from);
    return;
  }

  // Handle photos (for i2i/i2v)
  if (message.photo && message.photo.length > 0) {
    await handlePhotoUpload(chatId, telegramId, message);
    return;
  }

  // Check if user has an active flow
  const hasFlow = await hasActiveFlow(telegramId);

  if (hasFlow) {
    const flow = await getCurrentFlow(telegramId);

    if (flow) {
      switch (flow.flow) {
        case 'photo_generation':
          if (flow.step === 'configure' || flow.step === 'await_prompt') {
            await executePhotoGeneration(chatId, telegramId, text);
            return;
          }
          break;

        case 'video_generation':
          if (flow.step === 'configure' || flow.step === 'await_prompt') {
            await executeVideoGeneration(chatId, telegramId, text);
            return;
          }
          break;

        case 'tts_generation':
          if (flow.step === 'await_text') {
            // TODO: Handle TTS generation
            await clearFlow(telegramId);
          }
          break;

        case 'audio_generation':
          if (flow.step === 'await_prompt') {
            // TODO: Handle music generation
            await clearFlow(telegramId);
          }
          break;
      }
    }
  }

  // Default: treat as prompt for quick generation
  if (text.length > 2) {
    await quickPhotoGenerate(chatId, telegramId, text);
  }
}

/**
 * Handle commands
 */
async function handleCommand(
  chatId: number,
  telegramId: number,
  text: string,
  from: { id: number; first_name: string; last_name?: string; username?: string }
): Promise<void> {
  const command = text.split(' ')[0].split('@')[0]; // Handle /command@botname
  const args = text.split(' ').slice(1).join(' '); // Get arguments after command

  switch (command) {
    case '/start':
      // Check for login code: /start login_XXXX
      if (args.startsWith('login_')) {
        const loginCode = args.replace('login_', '');
        await handleLoginCode(chatId, telegramId, loginCode, from);
      } else if (args.startsWith('ref_')) {
        // TODO: Handle referral registration
        await showMainMenu(chatId, from.first_name, telegramId, from.username);
      } else {
        await showMainMenu(chatId, from.first_name, telegramId, from.username);
      }
      break;

    case '/help':
    case '/h':
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
    case '/a':
    case '/music':
      await showAudioMenu(chatId);
      break;

    case '/app':
      await showMiniApp(chatId);
      break;

    case '/library':
    case '/l':
      // TODO: Show library
      break;

    case '/settings':
      // TODO: Show settings
      break;

    case '/referral':
    case '/ref':
      // TODO: Show referral info
      break;

    case '/generate':
    case '/g':
      if (args) {
        await quickPhotoGenerate(chatId, telegramId, args);
      } else {
        const { sendMessage } = await import('../bot-client');
        await sendMessage(chatId, '❓ Укажите промпт после команды.\n\nПример: /g космос в стиле киберпанк');
      }
      break;

    default:
      const { sendMessage } = await import('../bot-client');
      await sendMessage(chatId, '❓ Неизвестная команда. Нажмите /start для главного меню.');
  }
}

/**
 * Handle photo uploads (for i2i/i2v reference images)
 *
 * Improved UX: когда пользователь отправляет фото БЕЗ активного flow,
 * сохраняем его и предлагаем выбрать действие (как в syntxaibot).
 */
async function handlePhotoUpload(
  chatId: number,
  telegramId: number,
  message: TelegramMessage
): Promise<void> {
  const photo = message.photo;
  if (!photo || photo.length === 0) return;

  // Get largest photo
  const largestPhoto = photo[photo.length - 1];

  // Get file URL first
  const fileUrl = await getFileUrl(largestPhoto.file_id);
  if (!fileUrl) {
    const { sendMessage } = await import('../bot-client');
    await sendMessage(chatId, '❌ Не удалось получить изображение. Попробуйте ещё раз.');
    return;
  }

  // Check if user is in a flow expecting a reference image
  const flow = await getCurrentFlow(telegramId);

  if (!flow) {
    // No active flow - save reference and show options (like professional bots)
    const { sendMessage, createInlineKeyboard } = await import('../bot-client');
    const { startFlow } = await import('../state');

    // Save the reference image in a special "pending_reference" flow
    await startFlow(telegramId, 'photo_generation', 'select_action', {
      pendingReferenceUrl: fileUrl,
      referenceMessageId: message.message_id,
    }, 15); // 15 min expiration

    await sendMessage(chatId, `🖼️ <b>Изображение загружено!</b>

Что хотите сделать с этой фотографией?`, {
      replyMarkup: createInlineKeyboard([
        [
          { text: '🎨 Фото I2I', callback_data: 'ref:photo:select' },
          { text: '🎬 Видео I2V', callback_data: 'ref:video:select' },
        ],
        [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
      ]),
    });
    return;
  }

  // Handle based on current flow
  if (flow.flow === 'photo_generation') {
    if (flow.step === 'await_reference') {
      await handleReferenceImage(chatId, telegramId, fileUrl);
    } else if (flow.step === 'configure' || flow.step === 'await_prompt') {
      // User sent photo while in prompt step - replace reference
      const { sendMessage, createInlineKeyboard } = await import('../bot-client');
      const { updateFlow } = await import('../state');

      await updateFlow(telegramId, 'await_prompt', { referenceImageUrl: fileUrl });

      await sendMessage(chatId, `✅ <b>Референс обновлён!</b>

Теперь отправьте описание для генерации:`, {
        replyMarkup: createInlineKeyboard([
          [{ text: '❌ Отмена', callback_data: 'menu:photo' }],
        ]),
      });
    } else if (flow.step === 'select_action') {
      // User sent another photo while choosing action - replace it
      const { sendMessage, createInlineKeyboard } = await import('../bot-client');
      const { updateFlow } = await import('../state');

      await updateFlow(telegramId, 'select_action', { pendingReferenceUrl: fileUrl });

      await sendMessage(chatId, `🖼️ <b>Изображение обновлено!</b>

Что хотите сделать с этой фотографией?`, {
        replyMarkup: createInlineKeyboard([
          [
            { text: '🎨 Фото I2I', callback_data: 'ref:photo:select' },
            { text: '🎬 Видео I2V', callback_data: 'ref:video:select' },
          ],
          [{ text: '❌ Отмена', callback_data: 'ref:cancel' }],
        ]),
      });
    }
  } else if (flow.flow === 'video_generation') {
    if (flow.step === 'await_reference') {
      await handleStartFrame(chatId, telegramId, fileUrl);
    } else if (flow.step === 'configure' || flow.step === 'await_prompt') {
      // User sent photo while in prompt step - replace reference
      const { sendMessage, createInlineKeyboard } = await import('../bot-client');
      const { updateFlow } = await import('../state');

      await updateFlow(telegramId, 'await_prompt', { referenceImageUrl: fileUrl });

      await sendMessage(chatId, `✅ <b>Стартовый кадр обновлён!</b>

Теперь отправьте описание для генерации видео:`, {
        replyMarkup: createInlineKeyboard([
          [{ text: '❌ Отмена', callback_data: 'menu:video' }],
        ]),
      });
    }
  } else {
    // Unexpected photo in different flow type
    const { sendMessage } = await import('../bot-client');
    await sendMessage(chatId, '📷 Изображение получено, но сейчас оно не требуется.\n\nОтправьте текст или нажмите ❌ Отмена.');
  }
}
