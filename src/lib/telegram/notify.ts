import { env } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram/bot-client";

type Kind = "photo" | "video";
type Status = "success" | "failed";

function getSiteUrl(): string {
  const u = env.required("SITE_URL");
  return u.replace(/\/$/, "");
}

function looksLikeMissingRelation(err: any) {
  const msg = String(err?.message || err?.details || err || "");
  return msg.includes("does not exist") && msg.includes("relation");
}

async function resolveTelegramIdByUserId(userId: string): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from("telegram_profiles")
      .select("telegram_id")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (error) return null;
    const tg = Number((data as any)?.telegram_id);
    return Number.isFinite(tg) ? tg : null;
  } catch {
    return null;
  }
}

async function ensureSettings(userId: string, telegramId: number) {
  const supabase = getSupabaseAdmin();
  // Create default row if missing.
  try {
    await supabase
      .from("telegram_user_settings")
      .upsert(
        {
          user_id: userId,
          telegram_id: telegramId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
  } catch {
    // ignore
  }

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
}

export async function notifyGenerationStatus(params: {
  userId: string;
  generationId: string;
  kind: Kind;
  status: Status;
}) {
  const supabase = getSupabaseAdmin();
  const site = getSiteUrl();

  const telegramId = await resolveTelegramIdByUserId(params.userId);
  if (!telegramId) return;

  const settings = await ensureSettings(params.userId, telegramId);
  if (!settings.notify_enabled) return;
  if (params.status === "success" && !settings.notify_success) return;
  if (params.status === "failed" && !settings.notify_error) return;

  // Idempotency: one event -> one message
  try {
    const { error } = await supabase.from("telegram_notifications").insert({
      generation_id: params.generationId,
      user_id: params.userId,
      telegram_id: telegramId,
      event: params.status,
    });

    if (error) {
      // Unique violation => already sent
      const code = String((error as any).code || "");
      if (code === "23505") return;
      if (looksLikeMissingRelation(error)) return;
      throw error;
    }
  } catch {
    // If we can't guarantee idempotency, skip sending.
    return;
  }

  const kb = (() => {
    if (params.status === "success" && params.kind === "photo") {
      return [[{ text: "📚 Открыть Library", url: `${site}/library` }]];
    }
    if (params.status === "success" && params.kind === "video") {
      return [
        [{ text: "📚 Открыть Library", url: `${site}/library` }],
        [{ text: "🎬 Открыть Studio", url: `${site}/create/studio` }],
      ];
    }
    // failed
    return [
      [{ text: "📚 Открыть Library", url: `${site}/library` }],
      [{ text: "🆘 Поддержка", callback_data: `sg:${params.generationId}` }],
    ];
  })();

  const text =
    params.status === "success"
      ? params.kind === "photo"
        ? "Фото готово ✅"
        : "Видео готово ✅"
      : "Ошибка генерации ❌";

  await sendMessage({ chatId: telegramId, text, keyboard: kb, disablePreview: true });
}


