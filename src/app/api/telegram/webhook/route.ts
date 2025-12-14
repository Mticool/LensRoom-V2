import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendTelegramMessage } from '@/lib/telegram/bot';
import { TelegramUpdate } from '@/types/telegram';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * POST /api/telegram/webhook
 * Handles incoming Telegram bot updates
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
      console.warn('[Telegram Webhook] Invalid secret token');
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    // 2. Parse update
    const update: TelegramUpdate = await request.json();
    
    if (!update.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const { message } = update;
    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = (message.text || '').trim();
    const username = message.from.username;
    const firstName = message.from.first_name;

    const supabase = getSupabaseAdmin();

    // 3. Handle commands
    if (text.startsWith('/start')) {
      // Extract start parameter if any
      const startParam = text.split(' ')[1] || null;

      // Upsert bot link with can_notify = true
      const { error } = await supabase
        .from('telegram_bot_links')
        .upsert(
          {
            telegram_id: telegramId,
            can_notify: true,
            chat_id: chatId,
            linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'telegram_id',
          }
        );

      if (error) {
        console.error('[Telegram Webhook] Error upserting bot link:', error);
      }

      // Also create/update profile if doesn't exist
      await supabase
        .from('profiles')
        .upsert(
          {
            telegram_id: telegramId,
            telegram_username: username || null,
            first_name: firstName || null,
          },
          {
            onConflict: 'telegram_id',
            ignoreDuplicates: false,
          }
        );

      // Send welcome message
      await sendTelegramMessage({
        chat_id: chatId,
        text: `👋 Привет${firstName ? `, ${firstName}` : ''}!\n\n` +
          `Теперь вы будете получать уведомления от LensRoom:\n` +
          `• О запуске новых функций\n` +
          `• О старте Академии\n` +
          `• О специальных предложениях\n\n` +
          `🔕 Чтобы отписаться, отправьте /stop`,
      });

      return NextResponse.json({ ok: true });
    }

    if (text === '/stop') {
      // Disable notifications
      const { error } = await supabase
        .from('telegram_bot_links')
        .update({
          can_notify: false,
          updated_at: new Date().toISOString(),
        })
        .eq('telegram_id', telegramId);

      if (error) {
        console.error('[Telegram Webhook] Error updating bot link:', error);
      }

      await sendTelegramMessage({
        chat_id: chatId,
        text: '🔕 Уведомления отключены.\n\nЧтобы снова включить их, отправьте /start',
      });

      return NextResponse.json({ ok: true });
    }

    if (text === '/status') {
      // Check subscription status
      const { data: botLink } = await supabase
        .from('telegram_bot_links')
        .select('can_notify')
        .eq('telegram_id', telegramId)
        .single();

      const { data: subscriptions } = await supabase
        .from('waitlist_subscriptions')
        .select('type, status')
        .eq('profile_id', (
          await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', telegramId)
            .single()
        ).data?.id)
        .eq('status', 'active');

      const notifyStatus = botLink?.can_notify ? '✅ Включены' : '❌ Отключены';
      const waitlistCount = subscriptions?.length || 0;

      await sendTelegramMessage({
        chat_id: chatId,
        text: `📊 <b>Ваш статус:</b>\n\n` +
          `Уведомления: ${notifyStatus}\n` +
          `Подписки на waitlist: ${waitlistCount}\n\n` +
          `Команды:\n` +
          `/start — включить уведомления\n` +
          `/stop — отключить уведомления`,
      });

      return NextResponse.json({ ok: true });
    }

    // Unknown command - send help
    await sendTelegramMessage({
      chat_id: chatId,
      text: `🤖 LensRoom Bot\n\n` +
        `Доступные команды:\n` +
        `/start — включить уведомления\n` +
        `/stop — отключить уведомления\n` +
        `/status — проверить статус\n\n` +
        `Сайт: lensroom.ru`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

