"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, X, Loader2 } from "lucide-react";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  showLocalNotification,
} from "@/lib/push-notifications";

export function NotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const isSupported = isPushSupported();
      setSupported(isSupported);

      if (isSupported) {
        setPermission(getNotificationPermission());
        const subscription = await getPushSubscription();
        setSubscribed(!!subscription);
      }

      setLoading(false);
    };

    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setSubscribed(true);
        setPermission("granted");

        // Показываем тестовое уведомление
        await showLocalNotification("Уведомления включены! 🔔", {
          body: "Теперь вы будете получать уведомления о готовых генерациях",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setSubscribed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <BellOff className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h4 className="font-medium text-[var(--text)]">Push-уведомления</h4>
            <p className="text-sm text-[var(--muted)]">
              Не поддерживается в этом браузере
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <X className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="font-medium text-[var(--text)]">Push-уведомления</h4>
            <p className="text-sm text-[var(--muted)]">
              Заблокированы в настройках браузера
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Разрешите уведомления в настройках сайта
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              subscribed ? "bg-emerald-500/10" : "bg-[var(--surface2)]"
            }`}
          >
            {subscribed ? (
              <Bell className="w-5 h-5 text-emerald-400" />
            ) : (
              <BellOff className="w-5 h-5 text-[var(--muted)]" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-[var(--text)]">Push-уведомления</h4>
            <p className="text-sm text-[var(--muted)]">
              {subscribed
                ? "Вы получаете уведомления о готовых генерациях"
                : "Узнавайте когда генерация готова"}
            </p>
          </div>
        </div>

        <Button
          variant={subscribed ? "outline" : "default"}
          size="sm"
          onClick={subscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : subscribed ? (
            "Отключить"
          ) : (
            "Включить"
          )}
        </Button>
      </div>

      {subscribed && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] mb-2">Вы будете получать:</p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400" />
              Уведомления о готовых генерациях
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400" />
              Информацию о новых функциях
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-emerald-400" />
              Специальные предложения
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

