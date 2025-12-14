"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PACK_SLIDES_DEFAULT } from "@/config/productImageModes";

// ===== TYPES =====

export type SlideStatus = "empty" | "pending" | "generating" | "completed" | "failed";

export interface Slide {
  id: string;
  imageUrl: string;
  status: SlideStatus;
  text?: string;
}

interface ProductPreviewProps {
  slides: Slide[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  onRegenerate: (index: number) => void;
  onDownloadAll: () => void;
  isGenerating: boolean;
  modeName: string;
  marketplace: string;
}

// ===== COMPONENT =====

export function ProductPreview({
  slides,
  activeIndex,
  onActiveChange,
  onRegenerate,
  onDownloadAll,
  isGenerating,
  modeName,
  marketplace,
}: ProductPreviewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const activeSlide = slides[activeIndex];
  const completedCount = slides.filter(s => s.status === "completed").length;

  const handleCopyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Текст скопирован");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const goToPrev = () => {
    onActiveChange(activeIndex > 0 ? activeIndex - 1 : slides.length - 1);
  };

  const goToNext = () => {
    onActiveChange(activeIndex < slides.length - 1 ? activeIndex + 1 : 0);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-[var(--text)]">Предпросмотр</h3>
          <p className="text-sm text-[var(--muted)]">
            {completedCount} / {slides.length} готово
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(activeIndex)}
            disabled={isGenerating || activeSlide?.status !== "completed"}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Перегенерировать
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadAll}
            disabled={completedCount === 0}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Скачать ZIP
          </Button>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 min-h-0 relative">
        <Card className="h-full bg-[var(--surface)] border-[var(--border)] overflow-hidden relative">
          {/* Preview Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            {activeSlide?.status === "completed" && activeSlide.imageUrl ? (
              <img
                src={activeSlide.imageUrl}
                alt={`Slide ${activeIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : activeSlide?.status === "generating" ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-[var(--gold)] animate-spin" />
                <span className="text-sm text-[var(--muted)]">Генерация слайда {activeIndex + 1}...</span>
              </div>
            ) : activeSlide?.status === "pending" ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-[var(--muted)]" />
                </div>
                <span className="text-sm text-[var(--muted)]">В очереди</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-[var(--surface2)] border border-dashed border-[var(--border)] flex items-center justify-center">
                  <Package className="w-10 h-10 text-[var(--muted)]" />
                </div>
                <div className="text-center">
                  <div className="text-sm text-[var(--text)] font-medium">Готово к генерации</div>
                  <div className="text-xs text-[var(--muted)]">Нажмите кнопку внизу</div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation arrows */}
          {slides.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Info badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge variant="default" className="text-xs bg-[var(--surface)]/90 backdrop-blur">
              {modeName}
            </Badge>
            <Badge variant="outline" className="text-xs bg-[var(--surface)]/90 backdrop-blur">
              {marketplace.toUpperCase()}
            </Badge>
          </div>

          {/* Slide number */}
          <div className="absolute top-3 right-3">
            <Badge variant="default" className="text-xs bg-[var(--surface)]/90 backdrop-blur">
              {activeIndex + 1} / {slides.length}
            </Badge>
          </div>

          {/* Zoom button */}
          {activeSlide?.status === "completed" && (
            <button className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </Card>
      </div>

      {/* Thumbnails Row */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => onActiveChange(index)}
            className={cn(
              "w-16 h-16 rounded-lg border-2 shrink-0 overflow-hidden transition-all relative",
              activeIndex === index
                ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/20"
                : "border-[var(--border)] hover:border-[var(--gold)]/50"
            )}
          >
            {slide.status === "completed" && slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={`Thumb ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[var(--surface2)] flex items-center justify-center">
                {slide.status === "generating" ? (
                  <Loader2 className="w-4 h-4 text-[var(--gold)] animate-spin" />
                ) : slide.status === "pending" ? (
                  <span className="text-xs text-[var(--muted)]">{index + 1}</span>
                ) : (
                  <ImageIcon className="w-4 h-4 text-[var(--muted)]" />
                )}
              </div>
            )}
            
            {/* Status indicator */}
            {slide.status === "completed" && (
              <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border border-[var(--surface)]" />
            )}
          </button>
        ))}
      </div>

      {/* Text outputs */}
      {slides.some(s => s.text) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-[var(--text)]">Тексты для карточки</h4>
          {slides.map((slide, index) => slide.text && (
            <div
              key={slide.id}
              className="p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)]"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--text)] flex-1">{slide.text}</p>
                <button
                  onClick={() => handleCopyText(slide.text!, index)}
                  className="p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] transition-colors shrink-0"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== HELPERS =====

export function createEmptySlides(count: number): Slide[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide_${Date.now()}_${i}`,
    imageUrl: "",
    status: "empty" as SlideStatus,
  }));
}

export function createPendingSlides(count: number): Slide[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide_${Date.now()}_${i}`,
    imageUrl: "",
    status: "pending" as SlideStatus,
  }));
}
