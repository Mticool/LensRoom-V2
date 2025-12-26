"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Send,
  Users,
  Sparkles,
  CreditCard,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  UserX,
  Repeat,
  Zap,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Segment =
  | "all"
  | "no_generation"
  | "no_purchase"
  | "inactive_7d"
  | "inactive_30d"
  | "paid_once"
  | "paid_multiple"
  | "low_balance";

interface SegmentData {
  total: number;
  canNotify: number;
}

interface SegmentsResponse {
  segments: Record<Segment, SegmentData>;
  totalCanNotify: number;
  totalUsers: number;
}

const SEGMENT_CONFIG: Record<
  Segment,
  { label: string; description: string; icon: any; color: string; emoji: string }
> = {
  all: {
    label: "Все пользователи",
    description: "Все зарегистрированные пользователи",
    icon: Users,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emoji: "👥",
  },
  no_generation: {
    label: "Не генерировали",
    description: "Зарегистрировались, но ни разу не создали контент",
    icon: Sparkles,
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    emoji: "✨",
  },
  no_purchase: {
    label: "Не платили",
    description: "Использовали бесплатные звёзды, но не покупали",
    icon: CreditCard,
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    emoji: "💳",
  },
  inactive_7d: {
    label: "Неактивны 7+ дней",
    description: "Не заходили на сайт больше недели",
    icon: Clock,
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    emoji: "⏰",
  },
  inactive_30d: {
    label: "Неактивны 30+ дней",
    description: "Не заходили на сайт больше месяца",
    icon: UserX,
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    emoji: "😴",
  },
  paid_once: {
    label: "Купили 1 раз",
    description: "Сделали только одну покупку — потенциал для upsell",
    icon: Star,
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    emoji: "⭐",
  },
  paid_multiple: {
    label: "Лояльные (2+ покупки)",
    description: "VIP клиенты с несколькими покупками",
    icon: Repeat,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    emoji: "💎",
  },
  low_balance: {
    label: "Мало звёзд (<10)",
    description: "Баланс почти закончился — напомнить о пополнении",
    icon: AlertTriangle,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    emoji: "⚠️",
  },
};

const MESSAGE_TEMPLATES = [
  {
    label: "🎁 Приветственный бонус",
    text: "🎁 Привет! Мы заметили, что ты ещё не пробовал наш генератор.\n\nСпециально для тебя — 50 бесплатных звёзд ⭐ для первых генераций!\n\n👉 Попробуй прямо сейчас: {site_url}/create",
  },
  {
    label: "💰 Скидка на пополнение",
    text: "💰 Только сегодня!\n\nСкидка 20% на любой пакет звёзд по промокоду COMEBACK\n\n⭐ Пополнить баланс: {site_url}/pricing",
  },
  {
    label: "🔥 Новые модели",
    text: "🔥 Мы добавили новые AI модели!\n\n• Flux Pro Ultra — фотореализм нового уровня\n• Veo 2 — кинематографичное видео\n\n🎬 Попробовать: {site_url}/create",
  },
  {
    label: "😢 Скучаем",
    text: "👋 Давно не виделись!\n\nМы скучаем по тебе и подготовили подарок — 30 бонусных звёзд ⭐\n\nЗаходи и создавай: {site_url}",
  },
  {
    label: "⚡ Напоминание о балансе",
    text: "⚡ Твои звёзды почти закончились!\n\nПополни баланс и продолжай создавать крутой контент.\n\n💳 Тарифы: {site_url}/pricing",
  },
];

export default function AdminBroadcastPage() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSegments(data);
      }
    } catch (e) {
      console.error("Failed to fetch segments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleSend = async (testMode = false) => {
    if (!message.trim()) {
      toast.error("Введите текст сообщения");
      return;
    }

    const segmentData = segments?.segments[selectedSegment];
    if (!testMode && segmentData?.canNotify === 0) {
      toast.error("В этом сегменте нет пользователей с уведомлениями");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          segment: selectedSegment,
          message: message.replace("{site_url}", "https://lensroom.ru"),
          testMode,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLastResult({ sent: data.sent, failed: data.failed });
        toast.success(
          testMode
            ? `Тестовое сообщение отправлено`
            : `Отправлено: ${data.sent}, Ошибок: ${data.failed}`
        );
      } else {
        toast.error(data.error || "Ошибка отправки");
      }
    } catch (e) {
      toast.error("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  const selectedSegmentData = segments?.segments[selectedSegment];
  const selectedConfig = SEGMENT_CONFIG[selectedSegment];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Рассылки</h1>
          <p className="text-[var(--muted)] mt-1">
            Отправка сообщений пользователям через Telegram
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSegments}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-5">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalUsers?.toLocaleString("ru") || "—"}
            </p>
            <p className="text-xs text-[var(--muted)]">Всего пользователей</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-5">
            <MessageSquare className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalCanNotify?.toLocaleString("ru") || "—"}
            </p>
            <p className="text-xs text-[var(--muted)]">Можем написать</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-5">
            <Zap className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalUsers && segments?.totalCanNotify
                ? Math.round((segments.totalCanNotify / segments.totalUsers) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-[var(--muted)]">Охват уведомлений</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-5">
            <Send className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {selectedSegmentData?.canNotify?.toLocaleString("ru") || "0"}
            </p>
            <p className="text-xs text-[var(--muted)]">В выбранном сегменте</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segments */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Выберите сегмент</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
                </div>
              ) : (
                Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
                  const segmentKey = key as Segment;
                  const data = segments?.segments[segmentKey];
                  const Icon = config.icon;
                  const isSelected = selectedSegment === segmentKey;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSegment(segmentKey)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        isSelected
                          ? "bg-[var(--gold)]/10 border-[var(--gold)] shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                          : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--gold)]/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                          config.color
                        )}
                      >
                        {config.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium text-sm truncate",
                            isSelected ? "text-[var(--gold)]" : "text-[var(--text)]"
                          )}
                        >
                          {config.label}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {data?.total || 0} чел. • {data?.canNotify || 0} с уведомл.
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segment Info */}
          <Card className={cn("border", selectedConfig.color)}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                    selectedConfig.color
                  )}
                >
                  {selectedConfig.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{selectedConfig.label}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">{selectedConfig.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-[var(--muted)]">
                      Всего: <strong className="text-[var(--text)]">{selectedSegmentData?.total || 0}</strong>
                    </span>
                    <span className="text-[var(--muted)]">
                      С уведомлениями:{" "}
                      <strong className="text-green-400">{selectedSegmentData?.canNotify || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Шаблоны сообщений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((template, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(template.text)}
                    className="text-xs"
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardHeader>
              <CardTitle>Текст сообщения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите текст сообщения для рассылки...&#10;&#10;Используйте {site_url} для вставки ссылки на сайт"
                className="w-full h-40 px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] resize-none font-mono text-sm"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  Будет отправлено{" "}
                  <strong className="text-[var(--text)]">{selectedSegmentData?.canNotify || 0}</strong>{" "}
                  пользователям
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSend(true)}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    🧪 Тест
                  </Button>
                  <Button
                    onClick={() => handleSend(false)}
                    disabled={sending || !message.trim() || selectedSegmentData?.canNotify === 0}
                    className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Отправить
                  </Button>
                </div>
              </div>

              {/* Result */}
              {lastResult && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-[var(--text)]">Рассылка завершена</p>
                    <p className="text-sm text-[var(--muted)]">
                      Успешно: {lastResult.sent} • Ошибок: {lastResult.failed}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400">Важно</p>
              <p className="text-[var(--muted)] mt-1">
                Рассылка отправляется через Telegram Bot. Получат только пользователи, которые:
              </p>
              <ul className="list-disc list-inside text-[var(--muted)] mt-1 space-y-1">
                <li>Запустили бота (@LensRoom_bot)</li>
                <li>Разрешили уведомления</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Send,
  Users,
  Sparkles,
  CreditCard,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
  UserX,
  Repeat,
  Zap,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Segment =
  | "all"
  | "no_generation"
  | "no_purchase"
  | "inactive_7d"
  | "inactive_30d"
  | "paid_once"
  | "paid_multiple"
  | "low_balance";

interface SegmentData {
  total: number;
  canNotify: number;
}

interface SegmentsResponse {
  segments: Record<Segment, SegmentData>;
  totalCanNotify: number;
  totalUsers: number;
}

const SEGMENT_CONFIG: Record<
  Segment,
  { label: string; description: string; icon: any; color: string; emoji: string }
> = {
  all: {
    label: "Все пользователи",
    description: "Все зарегистрированные пользователи",
    icon: Users,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emoji: "👥",
  },
  no_generation: {
    label: "Не генерировали",
    description: "Зарегистрировались, но ни разу не создали контент",
    icon: Sparkles,
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    emoji: "✨",
  },
  no_purchase: {
    label: "Не платили",
    description: "Использовали бесплатные звёзды, но не покупали",
    icon: CreditCard,
    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    emoji: "💳",
  },
  inactive_7d: {
    label: "Неактивны 7+ дней",
    description: "Не заходили на сайт больше недели",
    icon: Clock,
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    emoji: "⏰",
  },
  inactive_30d: {
    label: "Неактивны 30+ дней",
    description: "Не заходили на сайт больше месяца",
    icon: UserX,
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    emoji: "😴",
  },
  paid_once: {
    label: "Купили 1 раз",
    description: "Сделали только одну покупку — потенциал для upsell",
    icon: Star,
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    emoji: "⭐",
  },
  paid_multiple: {
    label: "Лояльные (2+ покупки)",
    description: "VIP клиенты с несколькими покупками",
    icon: Repeat,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    emoji: "💎",
  },
  low_balance: {
    label: "Мало звёзд (<10)",
    description: "Баланс почти закончился — напомнить о пополнении",
    icon: AlertTriangle,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    emoji: "⚠️",
  },
};

const MESSAGE_TEMPLATES = [
  {
    label: "🎁 Приветственный бонус",
    text: "🎁 Привет! Мы заметили, что ты ещё не пробовал наш генератор.\n\nСпециально для тебя — 50 бесплатных звёзд ⭐ для первых генераций!\n\n👉 Попробуй прямо сейчас: {site_url}/create",
  },
  {
    label: "💰 Скидка на пополнение",
    text: "💰 Только сегодня!\n\nСкидка 20% на любой пакет звёзд по промокоду COMEBACK\n\n⭐ Пополнить баланс: {site_url}/pricing",
  },
  {
    label: "🔥 Новые модели",
    text: "🔥 Мы добавили новые AI модели!\n\n• Flux Pro Ultra — фотореализм нового уровня\n• Veo 2 — кинематографичное видео\n\n🎬 Попробовать: {site_url}/create",
  },
  {
    label: "😢 Скучаем",
    text: "👋 Давно не виделись!\n\nМы скучаем по тебе и подготовили подарок — 30 бонусных звёзд ⭐\n\nЗаходи и создавай: {site_url}",
  },
  {
    label: "⚡ Напоминание о балансе",
    text: "⚡ Твои звёзды почти закончились!\n\nПополни баланс и продолжай создавать крутой контент.\n\n💳 Тарифы: {site_url}/pricing",
  },
];

export default function AdminBroadcastPage() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<Segment>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/broadcast", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSegments(data);
      }
    } catch (e) {
      console.error("Failed to fetch segments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleSend = async (testMode = false) => {
    if (!message.trim()) {
      toast.error("Введите текст сообщения");
      return;
    }

    const segmentData = segments?.segments[selectedSegment];
    if (!testMode && segmentData?.canNotify === 0) {
      toast.error("В этом сегменте нет пользователей с уведомлениями");
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          segment: selectedSegment,
          message: message.replace("{site_url}", "https://lensroom.ru"),
          testMode,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLastResult({ sent: data.sent, failed: data.failed });
        toast.success(
          testMode
            ? `Тестовое сообщение отправлено`
            : `Отправлено: ${data.sent}, Ошибок: ${data.failed}`
        );
      } else {
        toast.error(data.error || "Ошибка отправки");
      }
    } catch (e) {
      toast.error("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  const selectedSegmentData = segments?.segments[selectedSegment];
  const selectedConfig = SEGMENT_CONFIG[selectedSegment];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Рассылки</h1>
          <p className="text-[var(--muted)] mt-1">
            Отправка сообщений пользователям через Telegram
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSegments}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-5">
            <Users className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalUsers?.toLocaleString("ru") || "—"}
            </p>
            <p className="text-xs text-[var(--muted)]">Всего пользователей</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-5">
            <MessageSquare className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalCanNotify?.toLocaleString("ru") || "—"}
            </p>
            <p className="text-xs text-[var(--muted)]">Можем написать</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-5">
            <Zap className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {segments?.totalUsers && segments?.totalCanNotify
                ? Math.round((segments.totalCanNotify / segments.totalUsers) * 100)
                : 0}
              %
            </p>
            <p className="text-xs text-[var(--muted)]">Охват уведомлений</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-5">
            <Send className="w-5 h-5 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text)]">
              {selectedSegmentData?.canNotify?.toLocaleString("ru") || "0"}
            </p>
            <p className="text-xs text-[var(--muted)]">В выбранном сегменте</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segments */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Выберите сегмент</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
                </div>
              ) : (
                Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
                  const segmentKey = key as Segment;
                  const data = segments?.segments[segmentKey];
                  const Icon = config.icon;
                  const isSelected = selectedSegment === segmentKey;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSegment(segmentKey)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        isSelected
                          ? "bg-[var(--gold)]/10 border-[var(--gold)] shadow-[0_0_12px_rgba(255,215,0,0.15)]"
                          : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--gold)]/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                          config.color
                        )}
                      >
                        {config.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium text-sm truncate",
                            isSelected ? "text-[var(--gold)]" : "text-[var(--text)]"
                          )}
                        >
                          {config.label}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {data?.total || 0} чел. • {data?.canNotify || 0} с уведомл.
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Segment Info */}
          <Card className={cn("border", selectedConfig.color)}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                    selectedConfig.color
                  )}
                >
                  {selectedConfig.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{selectedConfig.label}</h3>
                  <p className="text-sm text-[var(--muted)] mt-1">{selectedConfig.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-[var(--muted)]">
                      Всего: <strong className="text-[var(--text)]">{selectedSegmentData?.total || 0}</strong>
                    </span>
                    <span className="text-[var(--muted)]">
                      С уведомлениями:{" "}
                      <strong className="text-green-400">{selectedSegmentData?.canNotify || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Шаблоны сообщений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((template, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(template.text)}
                    className="text-xs"
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardHeader>
              <CardTitle>Текст сообщения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите текст сообщения для рассылки...&#10;&#10;Используйте {site_url} для вставки ссылки на сайт"
                className="w-full h-40 px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] resize-none font-mono text-sm"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  Будет отправлено{" "}
                  <strong className="text-[var(--text)]">{selectedSegmentData?.canNotify || 0}</strong>{" "}
                  пользователям
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSend(true)}
                    disabled={sending || !message.trim()}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    🧪 Тест
                  </Button>
                  <Button
                    onClick={() => handleSend(false)}
                    disabled={sending || !message.trim() || selectedSegmentData?.canNotify === 0}
                    className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Отправить
                  </Button>
                </div>
              </div>

              {/* Result */}
              {lastResult && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium text-[var(--text)]">Рассылка завершена</p>
                    <p className="text-sm text-[var(--muted)]">
                      Успешно: {lastResult.sent} • Ошибок: {lastResult.failed}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400">Важно</p>
              <p className="text-[var(--muted)] mt-1">
                Рассылка отправляется через Telegram Bot. Получат только пользователи, которые:
              </p>
              <ul className="list-disc list-inside text-[var(--muted)] mt-1 space-y-1">
                <li>Запустили бота (@LensRoom_bot)</li>
                <li>Разрешили уведомления</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
