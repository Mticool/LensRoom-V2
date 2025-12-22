import { env } from "@/lib/env";

type InlineKeyboardButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

type InlineKeyboard = InlineKeyboardButton[][];

function getTelegramBotToken(): string {
  return env.required("TELEGRAM_BOT_TOKEN");
}

function apiUrl(method: string) {
  const token = getTelegramBotToken();
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function tgCall<T>(method: string, body: any): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const msg = json?.description || `Telegram API error (${res.status})`;
    throw new Error(msg);
  }
  return json.result as T;
}

export function buildInlineKeyboard(rows: InlineKeyboard): { inline_keyboard: InlineKeyboard } {
  // Ensure callback_data <= 64 bytes
  for (const row of rows) {
    for (const b of row) {
      if ("callback_data" in b) {
        const bytes = new TextEncoder().encode(b.callback_data);
        if (bytes.length > 64) {
          throw new Error(`callback_data too long (${bytes.length} bytes)`);
        }
      }
    }
  }
  return { inline_keyboard: rows };
}

export async function sendMessage(params: {
  chatId: number;
  text: string;
  keyboard?: InlineKeyboard;
  disablePreview?: boolean;
}) {
  const reply_markup = params.keyboard ? buildInlineKeyboard(params.keyboard) : undefined;
  return tgCall("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: "HTML",
    disable_web_page_preview: params.disablePreview ?? true,
    reply_markup,
  });
}

export async function editMessage(params: {
  chatId: number;
  messageId: number;
  text: string;
  keyboard?: InlineKeyboard;
}) {
  const reply_markup = params.keyboard ? buildInlineKeyboard(params.keyboard) : undefined;
  return tgCall("editMessageText", {
    chat_id: params.chatId,
    message_id: params.messageId,
    text: params.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup,
  });
}

export async function answerCallbackQuery(params: { callbackQueryId: string; text?: string; showAlert?: boolean }) {
  return tgCall("answerCallbackQuery", {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: params.showAlert || false,
  });
}


