/**
 * Balance and Payment Menu for Telegram Bot
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance } from '@/lib/credits/split-credits';
import {
  sendMessage,
  editMessageText,
  createInlineKeyboard,
} from '../bot-client';

const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

// Pricing tiers (sync with pricing.ts)
const SUBSCRIPTION_TIERS = [
  { id: 'start', name: 'START', stars: 1100, price: 990, popular: false },
  { id: 'pro', name: 'PRO', stars: 2400, price: 1990, popular: true },
  { id: 'max', name: 'MAX', stars: 4000, price: 2990, popular: false },
];

const STAR_PACKS = [
  { id: 'mini', stars: 1400, price: 990, popular: false },
  { id: 'plus', stars: 2200, price: 1490, popular: false },
  { id: 'max', stars: 3000, price: 1990, popular: true },
  { id: 'mega', stars: 5000, price: 2990, popular: false },
];

/**
 * Show balance with breakdown
 */
export async function showBalance(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('id, auth_user_id, first_name')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile) {
    const text = `
❌ <b>Аккаунт не найден</b>

Напишите /start чтобы зарегистрироваться и получить 50⭐ бонус!
`;
    if (messageId) {
      await editMessageText(chatId, messageId, text, {
        replyMarkup: createInlineKeyboard([
          [{ text: '🚀 Начать', callback_data: 'menu:main' }],
        ]),
      });
    } else {
      await sendMessage(chatId, text);
    }
    return;
  }

  // Use auth_user_id if linked, otherwise profile.id
  const userId = profile.auth_user_id || profile.id;
  const balance = await getCreditBalance(supabase, userId);

  const text = `
💰 <b>Ваш баланс</b>

Всего: <b>${balance.totalBalance}⭐</b>

├ 📅 Подписка: ${balance.subscriptionStars}⭐
└ 📦 Пакеты: ${balance.packageStars}⭐

<b>Хватит на:</b>
• ~${Math.floor(balance.totalBalance / 9)} фото (Nano Banana)
• ~${Math.floor(balance.totalBalance / 50)} видео (Veo Fast)
`;

  const buttons = [
    [{ text: '💳 Пополнить баланс', callback_data: 'menu:buy' }],
    [{ text: '📜 История', callback_data: 'menu:transactions' }],
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
 * Show payment options
 */
export async function showPaymentOptions(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  const text = `
💳 <b>Пополнение баланса</b>

<b>Подписки (ежемесячно):</b>
Получайте звёзды каждый месяц

<b>Пакеты (разово):</b>
Пополните баланс один раз
`;

  const buttons: any[][] = [];

  // Subscriptions section header
  buttons.push([{ text: '━━━ Подписки ━━━', callback_data: 'noop' }]);

  // Subscription options
  SUBSCRIPTION_TIERS.forEach(tier => {
    const badge = tier.popular ? ' ⭐' : '';
    buttons.push([{
      text: `${tier.name} • ${tier.stars}⭐ • ${tier.price}₽${badge}`,
      callback_data: `pay:sub:${tier.id}`,
    }]);
  });

  // Packages section header
  buttons.push([{ text: '━━━ Пакеты ━━━', callback_data: 'noop' }]);

  // Star pack options
  STAR_PACKS.forEach(pack => {
    const badge = pack.popular ? ' ⭐' : '';
    buttons.push([{
      text: `${pack.id.toUpperCase()} • ${pack.stars}⭐ • ${pack.price}₽${badge}`,
      callback_data: `pay:pack:${pack.id}`,
    }]);
  });

  buttons.push([{ text: '⬅️ Назад', callback_data: 'menu:balance' }]);

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
 * Handle payment selection - show payment link
 */
export async function handlePaymentSelection(
  chatId: number,
  telegramId: number,
  type: 'sub' | 'pack',
  itemId: string,
  messageId?: number
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get user
  const { data: profile } = await supabase
    .from('telegram_profiles')
    .select('auth_user_id')
    .eq('telegram_id', telegramId)
    .single();

  if (!profile?.auth_user_id) {
    await sendMessage(chatId, '❌ Аккаунт не найден. Напишите /start для регистрации.');
    return;
  }

  // Find item details
  let item: { name: string; stars: number; price: number } | undefined;

  if (type === 'sub') {
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === itemId);
    if (tier) {
      item = { name: `Подписка ${tier.name}`, stars: tier.stars, price: tier.price };
    }
  } else {
    const pack = STAR_PACKS.find(p => p.id === itemId);
    if (pack) {
      item = { name: `Пакет ${pack.id.toUpperCase()}`, stars: pack.stars, price: pack.price };
    }
  }

  if (!item) {
    await sendMessage(chatId, '❌ Тариф не найден.');
    return;
  }

  // Build payment URL with parameters
  const paymentUrl = `${WEBAPP_URL}/pricing?type=${type}&plan=${itemId}&from=bot`;

  const text = `
💳 <b>Оформление покупки</b>

<b>${item.name}</b>
⭐ ${item.stars} звёзд
💵 ${item.price}₽

Выберите способ оплаты:
`;

  const buttons = [
    // Website payment (Robokassa/Prodamus)
    [{ text: '💳 Оплатить на сайте', url: paymentUrl }],
    // Telegram Stars (future)
    // [{ text: '⭐ Telegram Stars', callback_data: `tgstars:${type}:${itemId}` }],
    [{ text: '⬅️ Назад', callback_data: 'menu:buy' }],
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
 * Show transaction history (placeholder)
 */
export async function showTransactionHistory(
  chatId: number,
  telegramId: number,
  messageId?: number
): Promise<void> {
  const text = `
📜 <b>История транзакций</b>

Полная история доступна в Mini App.
`;

  const buttons = [
    [{ text: '📊 Открыть историю', web_app: { url: `${WEBAPP_URL}/profile?tab=history` } }],
    [{ text: '⬅️ Назад', callback_data: 'menu:balance' }],
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
