"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  BarChart3,
  Video,
  Camera,
  FlaskConical,
  Lock,
  X,
  Bell,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ===== TYPES =====

interface ComingSoonFeature {
  id: string;
  title: string;
  icon: React.ReactNode;
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
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    icon: <Camera className="w-3.5 h-3.5" />,
  },
  {
    id: "ab-test",
    title: "A/B обложки",
    icon: <FlaskConical className="w-3.5 h-3.5" />,
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
  const [showInfographicsAccordion, setShowInfographicsAccordion] = useState(false);

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

      {/* Infographics Accordion (collapsed by default) */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInfographicsAccordion(!showInfographicsAccordion)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--surface2)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm text-[var(--text)]">Инфографика: свой промт</span>
            <Badge variant="outline" className="text-[10px] border-[var(--gold)]/30 text-[var(--gold)]">
              Скоро
            </Badge>
          </div>
          {showInfographicsAccordion ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          )}
        </button>
        
        {showInfographicsAccordion && (
          <div className="p-4 pt-0 border-t border-[var(--border)] opacity-60">
            <p className="text-xs text-[var(--muted)] mb-3">
              Опишите стиль, плашки и акценты. Мы применим к шаблону.
            </p>
            <div className="flex gap-3">
              <textarea
                disabled
                placeholder="Пример: Добавь красную плашку -30% в верхнем правом углу, белый текст 'ХИТ ПРОДАЖ' снизу..."
                className="flex-1 h-16 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] text-xs resize-none cursor-not-allowed"
              />
              <div className="flex items-center justify-center w-10">
                <Lock className="w-5 h-5 text-[var(--muted)]" />
              </div>
            </div>
          </div>
        )}
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
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    saveInterest(feature.id, email.trim() || undefined);
    
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Готово! Мы напишем, когда откроем доступ.");
      onClose();
    }, 500);
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

        {/* Content */}
        <p className="text-sm text-[var(--text)] mb-4">
          Мы доделываем этот инструмент. Хотите ранний доступ?
        </p>

        {/* Email input (optional) */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (необязательно)"
          className="w-full px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] text-sm mb-4"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Закрыть
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            <Bell className="w-4 h-4 mr-2" />
            Уведомить меня
          </Button>
        </div>
      </div>
    </div>
  );
}
