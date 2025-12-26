import { env } from "@/lib/env";

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

export function getTelegramBotToken(): string | null {
  return env.optional("TELEGRAM_BOT_TOKEN") || null;
}

export function getTelegramWebhookSecret(): string | null {
  return env.optional("TELEGRAM_WEBHOOK_SECRET") || null;
}

export interface SendMessageOptions {
  chat_id: number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(options: SendMessageOptions): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) {
    console.error('[Telegram Bot] Integration is not configured (missing TELEGRAM_BOT_TOKEN)');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: options.chat_id,
        text: options.text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram Bot] Failed to send message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Bot] Error sending message:', error);
    return false;
  }
}

/**
 * Send bulk messages (with rate limiting)
 */
export async function sendBulkMessages(
  messages: SendMessageOptions[],
  delayMs = 50 // Telegram allows ~30 messages/second
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    const success = await sendTelegramMessage(msg);
    if (success) {
      sent++;
    } else {
      failed++;
    }
    
    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed };
}

/**
 * Get bot username from environment
 */
export function getTelegramBotUsername(): string {
  return env.optional("TELEGRAM_BOT_USERNAME") || 'LensRoom_bot';
}

/**
 * Generate deep link to start bot with parameter
 */
export function getBotStartLink(startParam?: string): string {
  const botUsername = getTelegramBotUsername();
  const base = `https://t.me/${botUsername}`;
  return startParam ? `${base}?start=${startParam}` : base;
}




