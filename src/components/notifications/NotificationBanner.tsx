"use client";

import { useState, useEffect } from "react";
import { Bell, X, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBannerProps {
  onConnect: () => void;
  className?: string;
}

/**
 * Banner that shows on the site to encourage users to connect the bot
 */
export function NotificationBanner({ onConnect, className }: NotificationBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    // Check localStorage for dismissal
    const dismissedAt = localStorage.getItem("notification_banner_dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    // Check if user already has notifications
    fetch("/api/notifications/check", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled) {
          setHasNotifications(true);
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      })
      .catch(() => {
        setDismissed(false);
      });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification_banner_dismissed", new Date().toISOString());
  };

  if (dismissed || hasNotifications) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-[#00D9FF]/20 bg-gradient-to-r from-[#00D9FF]/10 via-[#00D9FF]/5 to-transparent",
        className
      )}
    >
      {/* Glow */}
      <div className="absolute left-0 top-0 w-32 h-full bg-[#00D9FF]/10 blur-2xl" />

      <div className="relative flex items-center gap-4 p-4">
        {/* Icon */}
        <div className="shrink-0 w-12 h-12 rounded-xl bg-[#00D9FF]/10 border border-[#00D9FF]/20 flex items-center justify-center">
          <Bell className="w-6 h-6 text-[#00D9FF]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">Не пропустите результат!</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFD700]/20 text-[#FFD700] text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3" />
              +10⭐
            </span>
          </div>
          <p className="text-sm text-white/60">
            Подключите Telegram-бота и получайте уведомления
          </p>
        </div>

        {/* Button */}
        <button
          onClick={onConnect}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-medium text-sm transition-colors"
        >
          Подключить
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for sidebar or smaller spaces
 */
export function NotificationBannerCompact({ onConnect }: { onConnect: () => void }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("notification_banner_compact_dismissed");
    if (!dismissedAt) {
      // Check if user has notifications
      fetch("/api/notifications/check", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.enabled) {
            setDismissed(false);
          }
        })
        .catch(() => setDismissed(false));
    }
  }, []);

  if (dismissed) return null;

  return (
    <button
      onClick={onConnect}
      className="w-full p-3 rounded-xl bg-gradient-to-r from-[#00D9FF]/10 to-transparent border border-[#00D9FF]/20 hover:border-[#00D9FF]/40 transition-all group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center">
          <Bell className="w-4 h-4 text-[#00D9FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white group-hover:text-[#00D9FF] transition-colors">
            Включить уведомления
          </p>
          <p className="text-xs text-white/50">
            +10⭐ за подключение
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-[#00D9FF] transition-colors" />
      </div>
    </button>
  );
}

