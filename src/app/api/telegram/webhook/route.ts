/**
 * Telegram Bot Webhook Handler
 *
 * Main entry point for Telegram bot updates.
 * Uses modular handlers from /src/lib/telegram/
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type TelegramUpdate,
  setWebhook,
  getWebhookInfo,
} from '@/lib/telegram/bot-client';
import { handleMessage, handleCallbackQuery } from '@/lib/telegram/handlers';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';
const BOT_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || '';

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram
 */
export async function POST(request: NextRequest) {
  // Validate secret token
  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
  if (BOT_SECRET && secretToken !== BOT_SECRET) {
    console.error('[TG Webhook] Invalid secret token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    console.log('[TG Webhook] Update:', update.update_id);

    // Route to appropriate handler
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TG Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/telegram/webhook
 * Webhook setup and info endpoints
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'setup') {
    const webhookUrl = `${WEBAPP_URL}/api/telegram/webhook`;

    const success = await setWebhook(webhookUrl, {
      secretToken: BOT_SECRET,
      allowedUpdates: ['message', 'callback_query'],
    });

    const info = await getWebhookInfo();

    return NextResponse.json({ success, webhookUrl, info });
  }

  if (action === 'info') {
    const info = await getWebhookInfo();
    return NextResponse.json({ info });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Telegram webhook endpoint',
    endpoints: {
      setup: '?action=setup',
      info: '?action=info',
    },
  });
}
