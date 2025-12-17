"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Video,
  Camera,
  FlaskConical,
  X,
  Bell,
  ChevronRight,
  Sparkles,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTelegramAuth } from "@/providers/telegram-auth-provider";
import type { WaitlistType } from "@/types/telegram";

// ===== TYPES =====

interface ComingSoonFeature {
  id: string;
  title: string;
  icon: React.ReactNode;
  waitlistType: WaitlistType;
}

interface ComingSoonInterest {
  featureId: string;
  createdAt: string;
  email?: string;
}

// ===== CONSTANTS =====

const COMING_SOON_FEATURES: ComingSoonFeature[] = [
  {
    id: "video-ads",
    title: "Видео-реклама",
    icon: <Video className="w-3.5 h-3.5" />,
    waitlistType: "feature_video_ads",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    icon: <Camera className="w-3.5 h-3.5" />,
    waitlistType: "feature_lifestyle",
  },
  {
    id: "ab-test",
    title: "A/B обложки",
    icon: <FlaskConical className="w-3.5 h-3.5" />,
    waitlistType: "feature_ab_covers",
  },
];

const STORAGE_KEY = "lensroom_coming_soon_interest";

// ===== HELPERS =====

function saveInterest(featureId: string, email?: string): void {
  if (typeof window === "undefined") return;
  
  const existing = getInterests();
  const newInterest: ComingSoonInterest = {
    featureId,
    createdAt: new Date().toISOString(),
    email: email || undefined,
  };
  
  const filtered = existing.filter(i => i.featureId !== featureId);
  filtered.push(newInterest);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

function getInterests(): ComingSoonInterest[] {
  if (typeof window === "undefined") return [];
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function hasInterest(featureId: string): boolean {
  return getInterests().some(i => i.featureId === featureId);
}

// ===== MAIN COMPONENT =====

export function MarketplaceHub() {
  const [modalFeature, setModalFeature] = useState<ComingSoonFeature | null>(null);

  const handleScrollToWizard = () => {
    const element = document.querySelector("#product-card-wizard");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Card: Карточка товара */}
      <button
        onClick={handleScrollToWizard}
        className="w-full p-5 rounded-2xl border bg-[var(--surface)] border-[var(--border)] hover:border-[var(--gold)]/50 hover:shadow-lg hover:shadow-[var(--gold)]/5 transition-all text-left group"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-[var(--gold)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--text)]">Карточка товара</h3>
              <Badge variant="primary" className="text-[10px]">
                <Sparkles className="w-3 h-3 mr-1" />
                Доступно
              </Badge>
            </div>
            <p className="text-sm text-[var(--muted)]">
              6 готовых слайдов + тексты: название, выгоды, описание и ключи.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--gold)] transition-colors shrink-0 mt-1" />
        </div>
      </button>

      {/* Coming Soon Strip */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)] shrink-0">Скоро:</span>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {COMING_SOON_FEATURES.map((feature) => {
            const registered = hasInterest(feature.id);
            return (
              <button
                key={feature.id}
                onClick={() => setModalFeature(feature)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all shrink-0",
                  "bg-[var(--surface)] border-[var(--border)] text-[var(--text2)]",
                  "hover:border-[var(--gold)]/50 hover:text-[var(--text)]",
                  registered && "border-green-500/30"
                )}
              >
                {feature.icon}
                <span>{feature.title}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[8px] px-1 py-0 ml-1",
                    registered 
                      ? "border-green-500/50 text-green-400" 
                      : "border-[var(--gold)]/30 text-[var(--gold)]"
                  )}
                >
                  {registered ? "✓" : "Скоро"}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Modal */}
      {modalFeature && (
        <ComingSoonModal
          feature={modalFeature}
          onClose={() => setModalFeature(null)}
        />
      )}
    </div>
  );
}

// ===== COMING SOON MODAL =====

function ComingSoonModal({ feature, onClose }: { feature: ComingSoonFeature; onClose: () => void }) {
  const { user } = useTelegramAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showBotPrompt, setShowBotPrompt] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      // Fallback to localStorage for non-logged users
      saveInterest(feature.id);
      toast.success("Готово! Войдите через Telegram для уведомлений.");
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/waitlist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: feature.waitlistType, 
          source: 'create_products' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        saveInterest(feature.id); // Also save locally for UI state
        setSubscribed(true);
        
        if (!data.canNotify) {
          setShowBotPrompt(true);
        } else {
          toast.success("Готово! Мы напишем вам в Telegram.");
        }
      } else {
        toast.error(data.error || 'Ошибка подписки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectBot = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoomBot';
    window.open(`https://t.me/${botUsername}?start=notify`, '_blank');
    toast.info('После запуска бота вы будете получать уведомления');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center text-[var(--gold)]">
              {feature.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)]">Скоро</h3>
              <p className="text-xs text-[var(--muted)]">{feature.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {subscribed ? (
          showBotPrompt ? (
            <div className="py-2">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Подписка оформлена!</span>
              </div>
              <p className="text-sm text-[var(--muted)] mb-4">
                Чтобы получить уведомление в Telegram, подключите бота:
              </p>
              <Button
                onClick={handleConnectBot}
                className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white mb-3"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Подключить бота
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                Пропустить
              </Button>
            </div>
          ) : (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-[var(--text)] font-medium">Готово!</p>
              <p className="text-sm text-[var(--muted)] mt-1">
                Мы напишем вам в Telegram.
              </p>
            </div>
          )
        ) : (
          <>
            {/* Content */}
            <p className="text-sm text-[var(--text)] mb-4">
              Мы доделываем этот инструмент. Хотите ранний доступ?
            </p>

            {!user && (
              <p className="text-xs text-[var(--muted)] mb-4">
                💡 Войдите через Telegram для уведомлений
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Закрыть
              </Button>
              <Button onClick={handleSubscribe} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Уведомить меня
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



