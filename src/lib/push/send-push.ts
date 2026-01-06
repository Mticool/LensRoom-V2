// Server-side Push Notification Sender
// Uses web-push library to send notifications

import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Configure VAPID keys
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@lensroom.ru';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Initialize web-push if keys are configured
let isConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  isConfigured = true;
  console.log('[Push] Web-push configured');
} else {
  console.warn('[Push] VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
  type?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isConfigured) {
    console.warn('[Push] Not configured, skipping notification');
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabaseAdmin();

  // Get user's push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    console.log('[Push] No subscriptions found for user:', userId);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: 'normal',
        }
      );
      sent++;
      console.log('[Push] Sent to:', sub.endpoint.substring(0, 50));
    } catch (err: any) {
      failed++;
      console.error('[Push] Failed to send:', err.statusCode || err.message);

      // Remove invalid subscriptions (410 Gone, 404 Not Found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
        console.log('[Push] Removed invalid subscription');
      }
    }
  }

  return { sent, failed };
}

/**
 * Send push notification when generation is complete
 */
export async function notifyGenerationComplete(
  userId: string,
  options: {
    generationId: string;
    modelName: string;
    type: 'photo' | 'video' | 'audio';
    imageUrl?: string;
  }
): Promise<void> {
  const typeNames: Record<string, string> = {
    photo: '📷 Фото',
    video: '🎬 Видео',
    audio: '🎵 Аудио',
  };

  const payload: PushPayload = {
    title: `${typeNames[options.type] || 'Контент'} готов!`,
    body: `Генерация с ${options.modelName} завершена`,
    url: `/library?highlight=${options.generationId}`,
    image: options.imageUrl,
    tag: `generation-${options.generationId}`,
    type: 'generation_complete',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Посмотреть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  };

  await sendPushToUser(userId, payload);
}

/**
 * Send push notification when generation fails
 */
export async function notifyGenerationFailed(
  userId: string,
  options: {
    generationId: string;
    modelName: string;
    error?: string;
  }
): Promise<void> {
  const payload: PushPayload = {
    title: '❌ Ошибка генерации',
    body: options.error || `Генерация с ${options.modelName} не удалась`,
    url: `/generator`,
    tag: `generation-failed-${options.generationId}`,
    type: 'generation_failed',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Попробовать снова' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  };

  await sendPushToUser(userId, payload);
}

/**
 * Send low credits warning
 */
export async function notifyLowCredits(
  userId: string,
  remainingCredits: number
): Promise<void> {
  const payload: PushPayload = {
    title: '⚠️ Мало звёзд',
    body: `Осталось ${remainingCredits} ⭐. Пополните баланс для продолжения генераций.`,
    url: '/pricing',
    tag: 'low-credits',
    type: 'credits_low',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Пополнить' },
      { action: 'dismiss', title: 'Позже' },
    ],
  };

  await sendPushToUser(userId, payload);
}







