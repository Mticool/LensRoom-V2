"use client";

import { useState } from "react";
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
  Save,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type MarketplaceProfile } from "@/config/marketplaceProfiles";
import {
  exportProductZip,
  copyProductTexts,
  saveProductToLibrary,
  type ProductExportData,
} from "@/lib/productExport";

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
  isGenerating: boolean;
  modeName: string;
  marketplace: string;
  marketplaceProfile?: MarketplaceProfile;
  // Export data
  productTitle: string;
  productBenefits: string[];
  modeId: string;
  templateStyle: string;
  nicheId?: string | null;
  sceneId?: string | null;
  brandTemplateId?: string | null;
}

// ===== COMPONENT =====

export function ProductPreview({
  slides,
  activeIndex,
  onActiveChange,
  onRegenerate,
  isGenerating,
  modeName,
  marketplace,
  marketplaceProfile,
  productTitle,
  productBenefits,
  modeId,
  templateStyle,
  nicheId,
  sceneId,
  brandTemplateId,
}: ProductPreviewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopyingTexts, setIsCopyingTexts] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  
  const activeSlide = slides[activeIndex];
  const completedSlides = slides.filter(s => s.status === "completed");
  const completedCount = completedSlides.length;

  // Get safe area for overlay visualization
  const safeArea = marketplaceProfile?.safeArea;

  // Build export data
  const getExportData = (): ProductExportData => ({
    slides: slides
      .filter(s => s.status === "completed" && s.imageUrl)
      .map(s => ({
        id: s.id,
        imageUrl: s.imageUrl,
        text: s.text,
      })),
    productTitle,
    productBenefits,
    marketplace,
    modeId,
    templateStyle,
    nicheId,
    sceneId,
    brandTemplateId,
  });

  // Export handlers
  const handleDownloadZip = async () => {
    if (completedCount === 0) return;
    
    setIsExporting(true);
    try {
      await exportProductZip(getExportData());
      toast.success("ZIP архив скачан");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Ошибка экспорта");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTexts = async () => {
    setIsCopyingTexts(true);
    try {
      const success = await copyProductTexts(getExportData());
      if (success) {
        toast.success("Тексты скопированы");
      } else {
        toast.error("Не удалось скопировать");
      }
    } finally {
      setIsCopyingTexts(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (completedCount === 0) return;
    
    setIsSavingToLibrary(true);
    try {
      await saveProductToLibrary(getExportData());
      toast.success("Сохранено в библиотеку");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Ошибка сохранения");
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const handleCopySlideText = async (text: string, index: number) => {
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

  // Get canvas aspect ratio
  const getAspectRatio = () => {
    if (!marketplaceProfile) return "1 / 1";
    const canvas = marketplaceProfile.canvasPresets.find(c => c.id === marketplaceProfile.defaultCanvasId);
    if (!canvas) return "1 / 1";
    return `${canvas.width} / ${canvas.height}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-[var(--text)]">Предпросмотр</h3>
          <p className="text-sm text-[var(--muted)]">
            {completedCount} / {slides.length} готово
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(activeIndex)}
            disabled={isGenerating || activeSlide?.status !== "completed"}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Перегенерировать</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyTexts}
            disabled={isCopyingTexts}
            className="text-xs"
          >
            {isCopyingTexts ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">Копировать тексты</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            disabled={completedCount === 0 || isExporting}
            className="text-xs"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">Скачать ZIP</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToLibrary}
            disabled={completedCount === 0 || isSavingToLibrary}
            className="text-xs"
          >
            {isSavingToLibrary ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">В библиотеку</span>
          </Button>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center">
        <div
          className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-lg"
          style={{
            aspectRatio: getAspectRatio(),
            maxHeight: "100%",
            maxWidth: "100%",
          }}
        >
          {/* Safe Area Overlay (visible when empty) */}
          {safeArea && activeSlide?.status === "empty" && (
            <>
              <div
                className="absolute left-0 right-0 top-0 bg-red-500/10 border-b border-dashed border-red-500/30"
                style={{ height: `${safeArea.top}%` }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 bg-red-500/10 border-t border-dashed border-red-500/30"
                style={{ height: `${safeArea.bottom}%` }}
              />
              <div
                className="absolute top-0 bottom-0 left-0 bg-red-500/10 border-r border-dashed border-red-500/30"
                style={{ width: `${safeArea.left}%` }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 bg-red-500/10 border-l border-dashed border-red-500/30"
                style={{ width: `${safeArea.right}%` }}
              />
            </>
          )}

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
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <div className="w-20 h-20 rounded-2xl bg-[var(--surface2)] border border-dashed border-[var(--border)] flex items-center justify-center">
                  <Package className="w-10 h-10 text-[var(--muted)]" />
                </div>
                <div>
                  <div className="text-sm text-[var(--text)] font-medium">Готово к генерации</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {safeArea && "Красные зоны — безопасные отступы"}
                  </div>
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
            <Badge 
              variant="outline" 
              className="text-xs bg-[var(--surface)]/90 backdrop-blur"
              style={{
                borderColor: marketplaceProfile?.brandColor,
                color: marketplaceProfile?.brandColor,
              }}
            >
              {marketplace.toUpperCase()}
            </Badge>
          </div>

          {/* Slide number + filename */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            <Badge variant="default" className="text-xs bg-[var(--surface)]/90 backdrop-blur">
              {activeIndex + 1} / {slides.length}
            </Badge>
            <span className="text-[10px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur px-1.5 py-0.5 rounded">
              {getSlideFilenameDisplay(activeIndex)}
            </span>
          </div>

          {/* Typography hint */}
          {marketplaceProfile && activeSlide?.status === "empty" && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-[10px] text-[var(--muted)] bg-[var(--surface)]/90 backdrop-blur px-2 py-1 rounded">
                Рекомендуемый заголовок: {marketplaceProfile.typography.titleSize}px, 
                макс. {marketplaceProfile.typography.maxTitleChars} символов
              </div>
            </div>
          )}

          {/* Zoom button */}
          {activeSlide?.status === "completed" && (
            <button className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thumbnails Row */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => onActiveChange(index)}
            className={cn(
              "shrink-0 rounded-lg border-2 overflow-hidden transition-all relative flex flex-col",
              activeIndex === index
                ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/20"
                : "border-[var(--border)] hover:border-[var(--gold)]/50"
            )}
          >
            <div className="w-16 h-16">
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
            </div>
            
            {/* Filename label */}
            <div className="text-[8px] text-[var(--muted)] bg-[var(--surface2)] py-0.5 text-center truncate px-1">
              {getSlideFilenameShort(index)}
            </div>
            
            {/* Status indicator */}
            {slide.status === "completed" && (
              <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border border-[var(--surface)]" />
            )}
          </button>
        ))}
      </div>

      {/* Text outputs */}
      {completedSlides.some(s => s.text) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-[var(--text)]">Тексты для карточки</h4>
          {slides.map((slide, index) => slide.text && (
            <div
              key={slide.id}
              className="p-3 rounded-lg bg-[var(--surface2)] border border-[var(--border)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-[var(--muted)] uppercase">{getSlideFilenameShort(index)}</span>
                  <p className="text-sm text-[var(--text)] mt-0.5">{slide.text}</p>
                </div>
                <button
                  onClick={() => handleCopySlideText(slide.text!, index)}
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

const SLIDE_NAMES: Record<number, { full: string; short: string }> = {
  0: { full: "01_cover.jpg", short: "cover" },
  1: { full: "02_benefits.jpg", short: "benefits" },
  2: { full: "03_specs.jpg", short: "specs" },
  3: { full: "04_howto.jpg", short: "howto" },
  4: { full: "05_bundle.jpg", short: "bundle" },
  5: { full: "06_delivery.jpg", short: "delivery" },
};

function getSlideFilenameDisplay(index: number): string {
  return SLIDE_NAMES[index]?.full ?? `${String(index + 1).padStart(2, "0")}_slide.jpg`;
}

function getSlideFilenameShort(index: number): string {
  return SLIDE_NAMES[index]?.short ?? `slide_${index + 1}`;
}

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
