"use client";

import { useState, useEffect } from "react";
import { X, Bell, Star, MessageCircle, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BotConnectPopupProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUsername?: string;
  hasNotifications?: boolean;
  onSuccess?: () => void;
}

const BOT_USERNAME = "LensRoom_bot";

export function BotConnectPopup({
  isOpen,
  onClose,
  telegramUsername,
  hasNotifications,
  onSuccess,
}: BotConnectPopupProps) {
  const [step, setStep] = useState<"intro" | "waiting" | "success">("intro");
  const [checking, setChecking] = useState(false);

  // Reset step when opening
  useEffect(() => {
    if (isOpen) {
      setStep(hasNotifications ? "success" : "intro");
    }
  }, [isOpen, hasNotifications]);

  // Check if user enabled notifications
  const checkNotifications = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/notifications/check", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (data.enabled) {
        setStep("success");
        onSuccess?.();

        // Give bonus if first time
        if (data.bonusGiven) {
          // Show success message with bonus
        }
      }
    } catch (e) {
      console.error("Failed to check notifications:", e);
    } finally {
      setChecking(false);
    }
  };

  const openBot = () => {
    window.open(`https://t.me/${BOT_USERNAME}?start=notify`, "_blank");
    setStep("waiting");

    // Start checking periodically
    const interval = setInterval(async () => {
      const res = await fetch("/api/notifications/check", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);

      if (res?.ok) {
        const data = await res.json();
        if (data.enabled) {
          clearInterval(interval);
          setStep("success");
          onSuccess?.();
        }
      }
    }, 3000);

    // Stop after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1A1A1E] to-[#131316] rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 fade-in overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00D9FF]/20 blur-3xl" />

        {/* Content */}
        <div className="relative p-6">
          {step === "intro" && (
            <>
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00D9FF]/20 to-[#00D9FF]/5 border border-[#00D9FF]/30 flex items-center justify-center">
                <Bell className="w-10 h-10 text-[#00D9FF]" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Не пропустите результат! 🔔
              </h2>

              {/* Description */}
              <p className="text-white/60 text-center mb-6">
                Подключите Telegram-бота и получайте уведомления, когда генерация готова
              </p>

              {/* Bonus */}
              <div className="flex items-center justify-center gap-2 mb-6 py-3 px-4 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20">
                <Star className="w-5 h-5 text-[#FFD700]" />
                <span className="font-semibold text-[#FFD700]">+10 звёзд</span>
                <span className="text-white/60">за подключение</span>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {[
                  "Мгновенные уведомления о готовности",
                  "Никогда не пропустите результат",
                  "Управление прямо в Telegram",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00D9FF]/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-[#00D9FF]" />
                    </div>
                    <span className="text-white/80 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <Button
                onClick={openBot}
                className="w-full h-12 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-semibold rounded-xl gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Подключить бота
                <ExternalLink className="w-4 h-4" />
              </Button>

              <p className="text-center text-white/40 text-xs mt-4">
                Откроется Telegram с нашим ботом
              </p>
            </>
          )}

          {step === "waiting" && (
            <>
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Ожидаем подключения...
              </h2>

              {/* Description */}
              <p className="text-white/60 text-center mb-6">
                Нажмите <strong>Start</strong> в Telegram-боте,
                <br />
                затем разрешите уведомления
              </p>

              {/* Instructions */}
              <div className="space-y-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00D9FF]/20 text-[#00D9FF] flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <span className="text-white/80 text-sm">Откройте бота в Telegram</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00D9FF]/20 text-[#00D9FF] flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <span className="text-white/80 text-sm">Нажмите кнопку "Start"</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00D9FF]/20 text-[#00D9FF] flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <span className="text-white/80 text-sm">Выберите "🔔 Включить уведомления"</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={openBot}
                  className="flex-1 h-11 rounded-xl gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Открыть бота
                </Button>
                <Button
                  onClick={checkNotifications}
                  disabled={checking}
                  className="flex-1 h-11 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-semibold rounded-xl"
                >
                  {checking ? "Проверяем..." : "Я подключил"}
                </Button>
              </div>
            </>
          )}

          {step === "success" && (
            <>
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-400" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                Уведомления включены! 🎉
              </h2>

              {/* Description */}
              <p className="text-white/60 text-center mb-6">
                Теперь вы будете получать уведомления в Telegram, когда генерация завершится
              </p>

              {/* Bonus */}
              <div className="flex items-center justify-center gap-2 mb-6 py-4 px-4 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20">
                <Star className="w-6 h-6 text-[#FFD700]" />
                <span className="text-xl font-bold text-[#FFD700]">+10 звёзд</span>
                <span className="text-white/60">начислено!</span>
              </div>

              {/* Button */}
              <Button
                onClick={onClose}
                className="w-full h-12 bg-green-500 hover:bg-green-500/90 text-white font-semibold rounded-xl"
              >
                Отлично!
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage popup state
export function useBotConnectPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownAfterGeneration, setHasShownAfterGeneration] = useState(false);

  const showPopup = () => setIsOpen(true);
  const hidePopup = () => setIsOpen(false);

  // Show popup after first successful generation (if user doesn't have notifications)
  const showAfterGeneration = (hasNotifications: boolean) => {
    if (!hasNotifications && !hasShownAfterGeneration) {
      // Delay to let user see the result first
      setTimeout(() => {
        setIsOpen(true);
        setHasShownAfterGeneration(true);
      }, 2000);
    }
  };

  return {
    isOpen,
    showPopup,
    hidePopup,
    showAfterGeneration,
  };
}

