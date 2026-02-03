/**
 * Telegram Bot API Client
 * 
 * Handles bot commands, inline queries, and Mini App integration
 */

import crypto from 'crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
  }>;
  caption?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: TelegramInlineQuery;
}

/**
 * Send a message to a chat
 */
export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    disableWebPagePreview?: boolean;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
        disable_web_page_preview: options?.disableWebPagePreview,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] sendMessage error:', error);
    return null;
  }
}

/**
 * Send a photo to a chat
 */
export async function sendPhoto(
  chatId: number | string,
  photo: string, // URL or file_id
  options?: {
    caption?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo,
        caption: options?.caption,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] sendPhoto error:', error);
    return null;
  }
}

/**
 * Send a video to a chat
 */
export async function sendVideo(
  chatId: number | string,
  video: string, // URL or file_id
  options?: {
    caption?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    duration?: number;
    width?: number;
    height?: number;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        video,
        caption: options?.caption,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
        duration: options?.duration,
        width: options?.width,
        height: options?.height,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] sendVideo error:', error);
    return null;
  }
}

/**
 * Answer callback query (button click)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  options?: {
    text?: string;
    showAlert?: boolean;
    url?: string;
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: options?.text,
        show_alert: options?.showAlert,
        url: options?.url,
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('[TG Bot] answerCallbackQuery error:', error);
    return false;
  }
}

/**
 * Edit message text
 */
export async function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] editMessageText error:', error);
    return null;
  }
}

/**
 * Send chat action (typing, uploading, etc.)
 */
export async function sendChatAction(
  chatId: number | string,
  action: 'typing' | 'upload_photo' | 'upload_video' | 'upload_document'
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action,
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('[TG Bot] sendChatAction error:', error);
    return false;
  }
}

/**
 * Answer inline query
 */
export async function answerInlineQuery(
  inlineQueryId: string,
  results: any[],
  options?: {
    cacheTime?: number;
    isPersonal?: boolean;
    nextOffset?: string;
    button?: {
      text: string;
      web_app?: { url: string };
      start_parameter?: string;
    };
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/answerInlineQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inline_query_id: inlineQueryId,
        results,
        cache_time: options?.cacheTime ?? 0,
        is_personal: options?.isPersonal ?? true,
        next_offset: options?.nextOffset,
        button: options?.button,
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('[TG Bot] answerInlineQuery error:', error);
    return false;
  }
}

/**
 * Set webhook URL
 */
export async function setWebhook(
  url: string,
  options?: {
    secretToken?: string;
    allowedUpdates?: string[];
  }
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: options?.secretToken,
        allowed_updates: options?.allowedUpdates || ['message', 'callback_query', 'inline_query'],
      }),
    });

    const data = await response.json();
    console.log('[TG Bot] setWebhook response:', data);
    return data.ok;
  } catch (error) {
    console.error('[TG Bot] setWebhook error:', error);
    return false;
  }
}

/**
 * Delete webhook
 */
export async function deleteWebhook(): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/deleteWebhook`, {
      method: 'POST',
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('[TG Bot] deleteWebhook error:', error);
    return false;
  }
}

/**
 * Get webhook info
 */
export async function getWebhookInfo(): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] getWebhookInfo error:', error);
    return null;
  }
}

/**
 * Validate Telegram WebApp init data
 */
export function validateWebAppData(initData: string): { valid: boolean; user?: TelegramUser } {
  if (!BOT_TOKEN) {
    console.error('[TG Bot] BOT_TOKEN not configured');
    return { valid: false };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Sort parameters
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    // Calculate hash
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    // Parse user
    const userStr = params.get('user');
    if (userStr) {
      const user = JSON.parse(userStr) as TelegramUser;
      return { valid: true, user };
    }

    return { valid: true };
  } catch (error) {
    console.error('[TG Bot] validateWebAppData error:', error);
    return { valid: false };
  }
}

/**
 * Create inline keyboard
 */
export function createInlineKeyboard(buttons: Array<Array<{
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}>>): { inline_keyboard: typeof buttons } {
  return { inline_keyboard: buttons };
}

/**
 * Create reply keyboard
 */
export function createReplyKeyboard(
  buttons: string[][],
  options?: {
    resizeKeyboard?: boolean;
    oneTimeKeyboard?: boolean;
    inputFieldPlaceholder?: string;
  }
): any {
  return {
    keyboard: buttons.map(row => row.map(text => ({ text }))),
    resize_keyboard: options?.resizeKeyboard ?? true,
    one_time_keyboard: options?.oneTimeKeyboard ?? false,
    input_field_placeholder: options?.inputFieldPlaceholder,
  };
}

/**
 * Remove reply keyboard
 */
export function removeKeyboard(): { remove_keyboard: true } {
  return { remove_keyboard: true };
}

/**
 * Get file info
 */
export async function getFile(fileId: string): Promise<{ file_path?: string } | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] getFile error:', error);
    return null;
  }
}

/**
 * Get file URL from file_id
 */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const file = await getFile(fileId);
  if (!file?.file_path) return null;

  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
}

/**
 * Send audio to a chat
 */
export async function sendAudio(
  chatId: number | string,
  audio: string, // URL or file_id
  options?: {
    caption?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    duration?: number;
    performer?: string;
    title?: string;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendAudio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        audio,
        caption: options?.caption,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
        duration: options?.duration,
        performer: options?.performer,
        title: options?.title,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] sendAudio error:', error);
    return null;
  }
}

/**
 * Send voice message
 */
export async function sendVoice(
  chatId: number | string,
  voice: string, // URL or file_id
  options?: {
    caption?: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
    duration?: number;
  }
): Promise<TelegramMessage | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendVoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        voice,
        caption: options?.caption,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
        duration: options?.duration,
      }),
    });

    const data = await response.json();
    return data.ok ? data.result : null;
  } catch (error) {
    console.error('[TG Bot] sendVoice error:', error);
    return null;
  }
}
