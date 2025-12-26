"use client";

import { useState, useEffect } from "react";
import { X, Bell, Star, Gift, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationPromoProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUsername?: string;
  botUsername?: string;
  onSuccess?: () => void;
}

/**
 * Popup promoting Telegram bot connection for notifications
 * Shows after successful generation if user hasn't enabled notifications
 */
export function NotificationPromoPopup({
  isOpen,
  onClose,
  telegramUsername,
  botUsername = "LensRoom_bot",
  onSuccess,
}: NotificationPromoProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = () => {
    setIsConnecting(true);
    // Open Telegram bot in new tab
    const botUrl = `https://t.me/${botUsername}?start=notify_${telegramUsername || "user"}`;
    window.open(botUrl, "_blank");

    // Show success state after a delay
    setTimeout(() => {
      setIsSuccess(true);
      setIsConnecting(false);
      onSuccess?.();
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1A1A1E] to-[#131316] border border-white/10 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF] to-[#0099FF] rounded-2xl animate-pulse" />
            <div className="absolute inset-1 bg-[#1A1A1E] rounded-xl flex items-center justify-center">
              {isSuccess ? (
                <Check className="w-10 h-10 text-green-400 animate-in zoom-in duration-300" />
              ) : (
                <Bell className="w-10 h-10 text-[#00D9FF]" />
              )}
            </div>
            {/* Bonus badge */}
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center gap-1 shadow-lg">
              <Star className="w-3 h-3 text-white fill-white" />
              <span className="text-xs font-bold text-white">+10</span>
            </div>
          </div>

          {isSuccess ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Отлично! 🎉</h2>
              <p className="text-white/60">
                Уведомления подключены! +10⭐ зачислены на баланс
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">
                Не пропустите результат!
              </h2>
              <p className="text-white/60 mb-6">
                Подключите Telegram-уведомления и получайте оповещения, когда генерация готова
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-6 text-left">
                <Benefit icon={MessageCircle} text="Мгновенные уведомления о готовых генерациях" />
                <Benefit icon={Bell} text="Оповещения об ошибках и проблемах" />
                <Benefit icon={Gift} text="Бонус +10⭐ за подключение!" highlight />
              </div>

              {/* CTA */}
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full h-12 bg-gradient-to-r from-[#00D9FF] to-[#0099FF] hover:from-[#00C4E6] hover:to-[#0088E6] text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Подключение...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Подключить уведомления
                  </span>
                )}
              </Button>

              {/* Skip */}
              <button
                onClick={onClose}
                className="mt-4 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Напомнить позже
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Benefit({
  icon: Icon,
  text,
  highlight,
}: {
  icon: any;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        highlight
          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
          : "bg-white/5"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          highlight ? "bg-amber-500/30 text-amber-400" : "bg-white/10 text-white/60"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className={cn("text-sm", highlight ? "text-amber-300 font-medium" : "text-white/70")}>
        {text}
      </span>
    </div>
  );
}

/**
 * Small banner promoting notifications (for header/sidebar)
 */
export function NotificationPromoBanner({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#00D9FF]/10 to-[#0099FF]/10 border border-[#00D9FF]/20 hover:border-[#00D9FF]/40 transition-all group",
        className
      )}
    >
      <div className="relative">
        <Bell className="w-4 h-4 text-[#00D9FF]" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
      </div>
      <span className="text-sm text-[#00D9FF] group-hover:text-white transition-colors">
        +10⭐ за уведомления
      </span>
    </button>
  );
}

/**
 * Hook to manage notification promo popup state
 */
export function useNotificationPromo() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Check if already shown this session
  useEffect(() => {
    const shown = sessionStorage.getItem("notification_promo_shown");
    if (shown) setHasShown(true);
  }, []);

  const showPromo = (canNotify: boolean) => {
    // Don't show if already has notifications or already shown
    if (canNotify || hasShown) return;

    // Mark as shown for this session
    sessionStorage.setItem("notification_promo_shown", "true");
    setHasShown(true);
    setIsOpen(true);
  };

  const closePromo = () => setIsOpen(false);

  return { isOpen, showPromo, closePromo };
}

