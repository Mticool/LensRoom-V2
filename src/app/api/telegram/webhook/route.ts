import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { answerCallbackQuery, editMessage, sendMessage } from "@/lib/telegram/bot-client";
import type { TelegramUpdate } from "@/types/telegram";

function getSiteUrl(): string {
  return env.required("SITE_URL").replace(/\/$/, "");
}

function menuKeyboard(site: string) {
  return [
    [
      { text: "🎨 Создать фото", callback_data: "gen:photo" },
      { text: "🎬 Создать видео", callback_data: "gen:video" },
    ],
    [
      { text: "📚 Мои работы", callback_data: "lib" },
      { text: "⭐ Баланс", callback_data: "bal" },
    ],
    [
      { text: "🤝 Рефералы", callback_data: "ref" },
      { text: "💳 Купить ⭐", url: `${site}/pricing#stars` },
    ],
    [
      { text: "🎓 Академия", callback_data: "aca" },
      { text: "⚙️ Настройки", callback_data: "set" },
    ],
    [
      { text: "🆘 Поддержка", callback_data: "sup" },
      { text: "🌐 Открыть сайт", url: site },
    ],
  ] as const;
}

async function resolveUserIdByTelegramId(telegramId: number): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("telegram_profiles")
      .select("auth_user_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();
    if (error) return null;
    const v = String((data as any)?.auth_user_id || "").trim();
    return v || null;
  } catch {
    return null;
  }
}

async function ensureSettings(userId: string | null, telegramId: number) {
  if (!userId) {
    return { notify_enabled: true, notify_success: true, notify_error: true };
  }

  const supabase = getSupabaseAdmin();
  try {
    await supabase
      .from("telegram_user_settings")
      .upsert({ user_id: userId, telegram_id: telegramId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    // ignore
  }

  try {
    const { data } = await supabase
      .from("telegram_user_settings")
      .select("notify_enabled, notify_success, notify_error")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      notify_enabled: (data as any)?.notify_enabled ?? true,
      notify_success: (data as any)?.notify_success ?? true,
      notify_error: (data as any)?.notify_error ?? true,
    };
  } catch {
    return { notify_enabled: true, notify_success: true, notify_error: true };
  }
}

async function setSetting(userId: string | null, patch: Partial<{ notify_enabled: boolean; notify_success: boolean; notify_error: boolean }>) {
  if (!userId) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("telegram_user_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

async function sendMainMenu(chatId: number, firstName: string | null) {
  const site = getSiteUrl();
  const hi = firstName ? `${firstName}` : "друг";
  const text = 
    `🎨 <b>LensRoom — AI-студия в Telegram</b>\n\n` +
    `Привет, ${hi}! 👋\n\n` +
    `Создавайте профессиональные фото и видео с помощью ИИ прямо в боте.\n\n` +
    `✨ <b>Что умеет бот:</b>\n` +
    `🎨 Генерация фото (Nano Banana, FLUX, Imagen)\n` +
    `🎬 Генерация видео (Kling, Veo 2)\n` +
    `📚 Просмотр всех ваших работ\n` +
    `⭐ Управление балансом и тарифами\n` +
    `🤝 Реферальная программа\n\n` +
    `Выберите действие:`;
  
  await sendMessage({
    chatId,
    text,
    keyboard: menuKeyboard(site) as any,
  });
}

async function showMenuInMessage(chatId: number, messageId: number | null) {
  const site = getSiteUrl();
  if (messageId) {
    await editMessage({ chatId, messageId, text: "Выберите действие:", keyboard: menuKeyboard(site) as any });
  } else {
    await sendMessage({ chatId, text: "Выберите действие:", keyboard: menuKeyboard(site) as any });
  }
}

async function renderSettings(chatId: number, messageId: number | null, userId: string | null, telegramId: number) {
  const s = await ensureSettings(userId, telegramId);
  const on = (v: boolean) => (v ? "✅" : "❌");
  const text =
    `⚙️ <b>Настройки уведомлений</b>\n\n` +
    `Уведомления: ${on(s.notify_enabled)}\n` +
    `Успех: ${on(s.notify_success)}\n` +
    `Ошибки: ${on(s.notify_error)}\n\n` +
    `Нажмите на кнопку, чтобы переключить:`;

  const kb = [
    [
      { text: `Уведомления ${on(s.notify_enabled)}`, callback_data: "te" },
      { text: `Успех ${on(s.notify_success)}`, callback_data: "ts" },
    ],
    [{ text: `Ошибки ${on(s.notify_error)}`, callback_data: "tr" }],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });
}

async function renderBalance(chatId: number, messageId: number | null, userId: string | null) {
  const site = getSiteUrl();
  if (!userId) {
    const text = `⭐ <b>Баланс</b>\n\nЧтобы показать баланс, сначала войдите на сайт через Telegram.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
    return;
  }

  let balance = 0;
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("credits").select("amount").eq("user_id", userId).maybeSingle();
    balance = Number((data as any)?.amount || 0);
  } catch {
    balance = 0;
  }

  const text = `⭐ <b>Баланс</b>\n\nБаланс: <b>${balance}</b> ⭐`;
  const kb = [
    [{ text: "💳 Купить ⭐", url: `${site}/pricing#stars` }],
    [{ text: "📚 Открыть Library", url: `${site}/library` }],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });
}

async function renderReferrals(chatId: number, messageId: number | null, userId: string | null) {
  const site = getSiteUrl();
  if (!userId) {
    const text = `🤝 <b>Рефералы</b>\n\nЧтобы получить персональную ссылку, сначала войдите на сайт через Telegram.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
    return;
  }

  const supabase = getSupabaseAdmin();

  let code: string | null = null;
  try {
    const { data, error } = await supabase.rpc("ensure_referral_code", { p_user_id: userId });
    if (!error) code = (data as any) || null;
  } catch {
    code = null;
  }

  const link = code ? `${site}/?ref=${encodeURIComponent(code)}` : null;

  let invitedCount: number | null = null;
  try {
    const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("inviter_user_id", userId);
    invitedCount = typeof count === "number" ? count : null;
  } catch {
    invitedCount = null;
  }

  const text =
    `🤝 <b>Рефералы</b>\n\n` +
    (link ? `Ваша ссылка:\n${link}\n\n` : `Рефералка пока не настроена (нет миграции 012).\n\n`) +
    (invitedCount === null ? `Статистика: скоро будет.\n` : `Приглашено: <b>${invitedCount}</b>\n`);

  const kb = [[{ text: "⬅️ В меню", callback_data: "m" }]] as const;
  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });
}

async function renderAcademy(chatId: number, messageId: number | null) {
  const text = `🎓 <b>Академия LensRoom</b>\n\nВыберите интерес (мы запишем вас в лист ожидания):`;
  const kb = [
    [
      { text: "UGC", callback_data: "ai:u" },
      { text: "Ads", callback_data: "ai:a" },
    ],
    [
      { text: "Marketplaces", callback_data: "ai:m" },
      { text: "Monetization", callback_data: "ai:n" },
    ],
    [{ text: "Other", callback_data: "ai:o" }],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });
}

async function renderSupport(chatId: number, messageId: number | null) {
  const text = `🆘 <b>Поддержка</b>\n\nВыберите тему:`;
  const kb = [
    [
      { text: "🎬 Генерации", callback_data: "st:g" },
      { text: "💳 Платежи", callback_data: "st:p" },
    ],
    [
      { text: "👤 Аккаунт", callback_data: "st:a" },
      { text: "Другое", callback_data: "st:o" },
    ],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });
}

async function renderLibrary(chatId: number, messageId: number | null, userId: string | null) {
  const site = getSiteUrl();
  
  if (!userId) {
    const text = `📚 <b>Мои работы</b>\n\nЧтобы просмотреть работы, войдите на сайт через Telegram.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
    return;
  }

  const supabase = getSupabaseAdmin();
  
  try {
    const { data: generations } = await supabase
      .from("generations")
      .select("id, type, model_name, status, asset_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const count = generations?.length || 0;
    
    let text = `📚 <b>Мои работы</b>\n\n`;
    
    if (count === 0) {
      text += `У вас пока нет работ.\n\nСоздайте первое фото или видео! 🎨`;
    } else {
      text += `Последние ${count} работ:\n\n`;
      
      for (const gen of generations || []) {
        const icon = (gen as any).type === "photo" ? "🖼️" : "🎬";
        const status = (gen as any).status === "success" ? "✅" : (gen as any).status === "generating" ? "⏳" : "❌";
        const date = new Date((gen as any).created_at).toLocaleDateString("ru-RU");
        text += `${icon} ${status} ${(gen as any).model_name} — ${date}\n`;
      }
      
      text += `\n📌 Полная библиотека на сайте:`;
    }

    const kb = [
      [{ text: "📚 Открыть Library", url: `${site}/library` }],
      [
        { text: "🎨 Создать фото", callback_data: "gen:photo" },
        { text: "🎬 Создать видео", callback_data: "gen:video" },
      ],
      [{ text: "⬅️ В меню", callback_data: "m" }],
    ] as const;

    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
  } catch (error) {
    const text = `📚 <b>Мои работы</b>\n\nОшибка загрузки. Попробуйте позже.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
  }
}

async function startPhotoGeneration(chatId: number, messageId: number | null, userId: string | null) {
  const site = getSiteUrl();
  
  if (!userId) {
    const text = `🎨 <b>Создать фото</b>\n\nЧтобы создавать фото, войдите на сайт через Telegram.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
    return;
  }

  const text =
    `🎨 <b>Создание фото</b>\n\n` +
    `Отправьте промпт на английском языке одним сообщением.\n\n` +
    `<b>Примеры:</b>\n` +
    `• <code>beautiful sunset over mountains</code>\n` +
    `• <code>futuristic city at night, neon lights</code>\n` +
    `• <code>cute cat in space suit, realistic</code>\n\n` +
    `💡 <i>Используется модель Nano Banana (4 ⭐)</i>`;

  const kb = [
    [{ text: "🌐 Открыть студию", url: `${site}/create/studio` }],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });

  // Mark that user is in "photo generation" mode
  const supabase = getSupabaseAdmin();
  try {
    await supabase
      .from("telegram_user_settings")
      .upsert({ user_id: userId, telegram_id: chatId, bot_mode: "gen_photo", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    // ignore
  }
}

async function startVideoGeneration(chatId: number, messageId: number | null, userId: string | null) {
  const site = getSiteUrl();
  
  if (!userId) {
    const text = `🎬 <b>Создать видео</b>\n\nЧтобы создавать видео, войдите на сайт через Telegram.\n\n📌 Открыть сайт: ${site}`;
    const kb = [[{ text: "🌐 Открыть сайт", url: site }], [{ text: "⬅️ В меню", callback_data: "m" }]] as const;
    if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
    else await sendMessage({ chatId, text, keyboard: kb as any });
    return;
  }

  const text =
    `🎬 <b>Создание видео</b>\n\n` +
    `Отправьте промпт на английском языке одним сообщением.\n\n` +
    `<b>Примеры:</b>\n` +
    `• <code>drone shot of ocean waves</code>\n` +
    `• <code>time-lapse of city traffic at sunset</code>\n` +
    `• <code>slow motion of coffee pouring</code>\n\n` +
    `💡 <i>Используется модель Kling (20 ⭐)</i>`;

  const kb = [
    [{ text: "🌐 Открыть студию", url: `${site}/create/studio` }],
    [{ text: "⬅️ В меню", callback_data: "m" }],
  ] as const;

  if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
  else await sendMessage({ chatId, text, keyboard: kb as any });

  // Mark that user is in "video generation" mode
  const supabase = getSupabaseAdmin();
  try {
    await supabase
      .from("telegram_user_settings")
      .upsert({ user_id: userId, telegram_id: chatId, bot_mode: "gen_video", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  } catch {
    // ignore
  }
}

async function startSupportDraft(params: { chatId: number; telegramId: number; userId: string | null; topic: string; generationId?: string | null }) {
  const supabase = getSupabaseAdmin();

  // Close any previous draft (best-effort)
  try {
    await supabase.from("support_tickets").update({ status: "open" }).eq("telegram_id", params.telegramId).eq("status", "draft");
  } catch {
    // ignore
  }

  const { data } = await supabase
    .from("support_tickets")
    .insert({
      user_id: params.userId,
      telegram_id: params.telegramId,
      topic: params.topic,
      generation_id: params.generationId || null,
      message: null,
      status: "draft",
    })
    .select("id")
    .single();

  const ticketId = Number((data as any)?.id || 0);
  await sendMessage({
    chatId: params.chatId,
    text:
      `🆘 <b>Поддержка</b>\n\n` +
      `Опишите проблему одним сообщением (1 строка).\n\n` +
      (ticketId ? `Тикет: #${ticketId} (черновик)` : ""),
  });
}

/**
 * POST /api/telegram/webhook
 * Handles incoming Telegram bot updates
 */
export async function POST(request: NextRequest) {
  try {
    // Optional secret check
    const webhookSecret = env.optional("TELEGRAM_WEBHOOK_SECRET") || "";
    const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (webhookSecret && secretHeader !== webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update: TelegramUpdate = await request.json();

    // --- Callback queries ---
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id || null;
      const messageId = cq.message?.message_id || null;
      const telegramId = cq.from.id;
      const data = String(cq.data || "");
      const userId = await resolveUserIdByTelegramId(telegramId);

      if (cq.id) {
        try {
          await answerCallbackQuery({ callbackQueryId: cq.id });
        } catch {
          // ignore
        }
      }

      if (!chatId) return NextResponse.json({ ok: true });

      if (data === "m") {
        await showMenuInMessage(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "set") {
        await renderSettings(chatId, messageId, userId, telegramId);
        return NextResponse.json({ ok: true });
      }

      if (data === "bal") {
        await renderBalance(chatId, messageId, userId);
        return NextResponse.json({ ok: true });
      }

      if (data === "ref") {
        await renderReferrals(chatId, messageId, userId);
        return NextResponse.json({ ok: true });
      }

      if (data === "aca") {
        await renderAcademy(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "sup") {
        await renderSupport(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "lib") {
        await renderLibrary(chatId, messageId, userId);
        return NextResponse.json({ ok: true });
      }

      if (data === "gen:photo") {
        await startPhotoGeneration(chatId, messageId, userId);
        return NextResponse.json({ ok: true });
      }

      if (data === "gen:video") {
        await startVideoGeneration(chatId, messageId, userId);
        return NextResponse.json({ ok: true });
      }

      if (data === "te" || data === "ts" || data === "tr") {
        const s = await ensureSettings(userId, telegramId);
        if (data === "te") await setSetting(userId, { notify_enabled: !s.notify_enabled });
        if (data === "ts") await setSetting(userId, { notify_success: !s.notify_success });
        if (data === "tr") await setSetting(userId, { notify_error: !s.notify_error });
        await renderSettings(chatId, messageId, userId, telegramId);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("ai:")) {
        const interestCode = data.slice(3, 4);
        const interest =
          interestCode === "u"
            ? "ugc"
            : interestCode === "a"
              ? "ads"
              : interestCode === "m"
                ? "marketplaces"
                : interestCode === "n"
                  ? "monetization"
                  : "other";

        try {
          const supabase = getSupabaseAdmin();
          await supabase.from("academy_waitlist").insert({
            user_id: userId,
            telegram_id: telegramId,
            interest,
            note: null,
          });
        } catch {
          // ignore
        }

        const text = `Готово ✅ Мы уведомим в Telegram, когда стартанём.\n\nИнтерес: <b>${interest}</b>`;
        const kb = [[{ text: "⬅️ В меню", callback_data: "m" }]] as const;
        if (messageId) await editMessage({ chatId, messageId, text, keyboard: kb as any });
        else await sendMessage({ chatId, text, keyboard: kb as any });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("sg:")) {
        const generationId = data.slice(3);
        await startSupportDraft({ chatId, telegramId, userId, topic: "generation", generationId });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("st:")) {
        const c = data.slice(3, 4);
        const topic = c === "g" ? "generation" : c === "p" ? "payment" : c === "a" ? "account" : "other";
        await startSupportDraft({ chatId, telegramId, userId, topic });
        return NextResponse.json({ ok: true });
      }

      await showMenuInMessage(chatId, messageId);
      return NextResponse.json({ ok: true });
    }

    // --- Messages ---
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = String(message.text || "").trim();
    const username = message.from.username || null;
    const firstName = message.from.first_name || null;

    const supabase = getSupabaseAdmin();

    // Keep legacy bot-links and profile updates for existing site flows
    try {
      await supabase.from("telegram_bot_links").upsert(
        {
          telegram_id: telegramId,
          can_notify: true,
          chat_id: chatId,
          linked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "telegram_id" }
      );
    } catch {
      // ignore
    }

    try {
      await supabase.from("telegram_profiles").upsert(
        {
          telegram_id: telegramId,
          telegram_username: username,
          first_name: firstName,
          last_name: message.from.last_name || null,
          photo_url: null,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "telegram_id", ignoreDuplicates: false }
      );
    } catch {
      // ignore
    }

    const userId = await resolveUserIdByTelegramId(telegramId);

    if (text.startsWith("/start")) {
      const startParam = text.split(" ")[1] || null;

      // Preserve existing login flow: /start login_CODE
      if (startParam?.startsWith("login_")) {
        const loginCode = startParam.replace("login_", "");

        const { data: profile } = await supabase
          .from("telegram_profiles")
          .select("id")
          .eq("telegram_id", telegramId)
          .maybeSingle();

        const { data: loginCodeData, error: codeError } = await supabase
          .from("telegram_login_codes")
          .update({
            used: true,
            telegram_id: telegramId,
            profile_id: (profile as any)?.id,
            used_at: new Date().toISOString(),
          })
          .eq("code", loginCode)
          .eq("used", false)
          .gt("expires_at", new Date().toISOString())
          .select()
          .maybeSingle();

        if (codeError || !loginCodeData) {
          await sendMessage({
            chatId,
            text: `❌ Ссылка для входа устарела или уже использована.\n\nВернитесь на сайт и нажмите «Войти через Telegram» снова.`,
          });
        } else {
          await sendMessage({
            chatId,
            text: `✅ Вход выполнен.\n\nОткройте сайт в браузере — вы уже авторизованы.`,
          });
        }

        await ensureSettings(userId, telegramId);
        await sendMainMenu(chatId, firstName);
        return NextResponse.json({ ok: true });
      }

      await ensureSettings(userId, telegramId);
      await sendMainMenu(chatId, firstName);
      return NextResponse.json({ ok: true });
    }

    if (text === "/menu" || text === "/help") {
      await sendMainMenu(chatId, firstName);
      return NextResponse.json({ ok: true });
    }

    if (text === "/stop") {
      await setSetting(userId, { notify_enabled: false });
      try {
        await supabase.from("telegram_bot_links").update({ can_notify: false, updated_at: new Date().toISOString() }).eq("telegram_id", telegramId);
      } catch {
        // ignore
      }
      await sendMessage({ chatId, text: "🔕 Уведомления отключены. Чтобы включить — откройте ⚙️ Настройки или отправьте /start." });
      return NextResponse.json({ ok: true });
    }

    // Check if user is in generation mode
    if (text && !text.startsWith("/") && userId) {
      try {
        const { data: settings } = await supabase
          .from("telegram_user_settings")
          .select("bot_mode")
          .eq("user_id", userId)
          .maybeSingle();

        const mode = String((settings as any)?.bot_mode || "");

        if (mode === "gen_photo") {
          // Reset mode
          await supabase.from("telegram_user_settings").update({ bot_mode: null, updated_at: new Date().toISOString() }).eq("user_id", userId);

          // Show processing message
          await sendMessage({
            chatId,
            text: `🎨 <b>Создаю фото...</b>\n\nПромпт: <code>${text}</code>\n\nЭто займёт ~30 секунд. Я уведомлю когда готово! ✨`,
          });

          // Trigger generation via API
          const site = getSiteUrl();
          try {
            const response = await fetch(`${site}/api/generate/photo`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // We need to pass user context somehow - for now just show instruction
              },
              body: JSON.stringify({
                model: "nano-banana",
                prompt: text,
                aspectRatio: "1:1",
                variants: 1,
              }),
            });

            if (!response.ok) {
              throw new Error("Generation failed");
            }

            // Success - webhook will notify when ready
          } catch (error) {
            await sendMessage({
              chatId,
              text: `❌ <b>Ошибка генерации</b>\n\nПопробуйте создать на сайте:\n${site}/create/studio`,
            });
          }

          await sendMainMenu(chatId, firstName);
          return NextResponse.json({ ok: true });
        }

        if (mode === "gen_video") {
          // Reset mode
          await supabase.from("telegram_user_settings").update({ bot_mode: null, updated_at: new Date().toISOString() }).eq("user_id", userId);

          // Show processing message
          await sendMessage({
            chatId,
            text: `🎬 <b>Создаю видео...</b>\n\nПромпт: <code>${text}</code>\n\nЭто займёт ~2 минуты. Я уведомлю когда готово! ✨`,
          });

          // Trigger generation via API
          const site = getSiteUrl();
          try {
            const response = await fetch(`${site}/api/generate/video`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "kling",
                prompt: text,
                aspectRatio: "16:9",
                duration: 5,
              }),
            });

            if (!response.ok) {
              throw new Error("Generation failed");
            }

            // Success - webhook will notify when ready
          } catch (error) {
            await sendMessage({
              chatId,
              text: `❌ <b>Ошибка генерации</b>\n\nПопробуйте создать на сайте:\n${site}/create/studio`,
            });
          }

          await sendMainMenu(chatId, firstName);
          return NextResponse.json({ ok: true });
        }
      } catch {
        // ignore
      }
    }

    // Support: if there is a draft ticket, treat the next non-command message as its content
    try {
      const { data: draft } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("telegram_id", telegramId)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const draftId = Number((draft as any)?.id || 0);
      if (draftId && text && !text.startsWith("/")) {
        await supabase.from("support_tickets").update({ message: text, status: "open" }).eq("id", draftId);
        await sendMessage({ chatId, text: `Принято ✅ Номер тикета: #${draftId}. Мы ответим здесь.` });
        await sendMainMenu(chatId, firstName);
        return NextResponse.json({ ok: true });
      }
    } catch {
      // ignore
    }

    await sendMainMenu(chatId, firstName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    // Always return 200 to Telegram
    return NextResponse.json({ ok: true });
  }
}
