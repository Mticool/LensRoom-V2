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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ===== TYPES =====

interface HubTile {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  href?: string;
}

interface ComingSoonInterest {
  featureId: string;
  createdAt: string;
  email?: string;
}

// ===== CONSTANTS =====

const HUB_TILES: HubTile[] = [
  {
    id: "product-card",
    title: "Карточка товара",
    description: "Создайте профессиональные фото для WB и Ozon",
    icon: <Package className="w-6 h-6" />,
    available: true,
    href: "#product-card-wizard",
  },
  {
    id: "infographics",
    title: "Инфографика",
    description: "Добавьте плашки, бейджи и текст на фото",
    icon: <BarChart3 className="w-6 h-6" />,
    available: false,
  },
  {
    id: "video-ads",
    title: "Видео-реклама",
    description: "Создайте короткие рекламные ролики",
    icon: <Video className="w-6 h-6" />,
    available: false,
  },
  {
    id: "lifestyle",
    title: "Lifestyle-сцены",
    description: "Товар в интерьере, на кухне, в руках",
    icon: <Camera className="w-6 h-6" />,
    available: false,
  },
  {
    id: "ab-test",
    title: "A/B тест обложек",
    description: "Сравните варианты и выберите лучший",
    icon: <FlaskConical className="w-6 h-6" />,
    available: false,
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
  
  // Don't duplicate
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

// ===== COMPONENTS =====

export function MarketplaceHub() {
  const [modalTile, setModalTile] = useState<HubTile | null>(null);

  const handleTileClick = (tile: HubTile) => {
    if (tile.available && tile.href) {
      // Scroll to wizard
      const element = document.querySelector(tile.href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Open coming soon modal
      setModalTile(tile);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hub Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {HUB_TILES.map((tile) => (
          <TileCard
            key={tile.id}
            tile={tile}
            onClick={() => handleTileClick(tile)}
          />
        ))}
      </div>

      {/* Disabled Infographics Prompt Block */}
      <InfographicsPromptBlock />

      {/* Coming Soon Modal */}
      {modalTile && (
        <ComingSoonModal
          tile={modalTile}
          onClose={() => setModalTile(null)}
        />
      )}
    </div>
  );
}

// ===== TILE CARD =====

function TileCard({ tile, onClick }: { tile: HubTile; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const registered = !tile.available && hasInterest(tile.id);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative p-5 rounded-2xl border text-left transition-all duration-200",
        "bg-[var(--surface)] border-[var(--border)]",
        "hover:border-[var(--gold)]/50 hover:shadow-lg hover:shadow-[var(--gold)]/5",
        tile.available 
          ? "cursor-pointer" 
          : "cursor-pointer opacity-90"
      )}
    >
      {/* Coming Soon Badge */}
      {!tile.available && (
        <Badge 
          variant="outline" 
          className={cn(
            "absolute top-3 right-3 text-[10px] px-2 py-0.5",
            registered 
              ? "border-green-500/50 text-green-400" 
              : "border-[var(--gold)]/30 text-[var(--gold)]"
          )}
        >
          {registered ? "Уведомим" : "Скоро"}
        </Badge>
      )}

      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
        tile.available 
          ? "bg-[var(--gold)]/10 text-[var(--gold)]" 
          : "bg-[var(--surface2)] text-[var(--muted)]"
      )}>
        {tile.icon}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-[var(--text)] text-sm mb-1">
        {tile.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-[var(--muted)] line-clamp-2">
        {tile.description}
      </p>

      {/* Hover hint for available */}
      {tile.available && isHovered && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-[var(--gold)]">
          <ChevronDown className="w-3 h-3" />
          Открыть
        </div>
      )}
    </button>
  );
}

// ===== INFOGRAPHICS PROMPT BLOCK =====

function InfographicsPromptBlock() {
  return (
    <div className="relative p-5 rounded-2xl border bg-[var(--surface)] border-[var(--border)] opacity-60">
      {/* Badge */}
      <Badge 
        variant="outline" 
        className="absolute top-4 right-4 text-[10px] border-[var(--gold)]/30 text-[var(--gold)]"
      >
        Скоро
      </Badge>

      <div className="flex gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[var(--text)] text-sm mb-1">
            Инфографика: свой промт
          </h4>
          <p className="text-xs text-[var(--muted)] mb-3">
            Опишите стиль, плашки и акценты. Мы применим к шаблону.
          </p>
          
          <textarea
            disabled
            placeholder="Пример: Добавь красную плашку -30% в верхнем правом углу, белый текст 'ХИТО ПРОДАЖ' снизу, минималистичный стиль..."
            className="w-full h-20 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] text-xs resize-none cursor-not-allowed"
          />
        </div>

        {/* Lock icon */}
        <div className="flex items-center justify-center w-12">
          <Lock className="w-6 h-6 text-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}

// ===== COMING SOON MODAL =====

function ComingSoonModal({ tile, onClose }: { tile: HubTile; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Save to localStorage
    saveInterest(tile.id, email.trim() || undefined);
    
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
              {tile.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text)]">Скоро</h3>
              <p className="text-xs text-[var(--muted)]">{tile.title}</p>
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
