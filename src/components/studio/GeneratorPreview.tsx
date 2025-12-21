"use client";

import { memo, useState, useEffect } from "react";
import type { Aspect, Mode, StudioModel } from "@/config/studioModels";
import { cn } from "@/lib/utils";
import { Film, Image as ImageIcon, Download, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Storage keys for persisting results across page navigation
const STORAGE_KEY_PHOTO = "lensroom_last_photo_result";
const STORAGE_KEY_VIDEO = "lensroom_last_video_result";

function aspectToCss(aspect: Aspect): string {
  const v = String(aspect || "").trim();
  if (v === "portrait") return "9 / 16";
  if (v === "landscape") return "16 / 9";
  const m = v.match(/^(\d+)\s*:\s*(\d+)$/);
  if (m) return `${m[1]} / ${m[2]}`;
  return "16 / 9";
}

// Helper to safely access localStorage (SSR-safe)
function getStoredResult(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredResult(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

interface GeneratorPreviewProps {
  model: StudioModel;
  mode: Mode;
  aspect: Aspect;
  referencePreviewUrl?: string | null;
  resultUrl?: string | null;
  isGenerating?: boolean;
}

export const GeneratorPreview = memo(function GeneratorPreview({
  model,
  mode,
  aspect,
  referencePreviewUrl,
  resultUrl,
  isGenerating,
}: GeneratorPreviewProps) {
  const isVideo = model.kind === "video";
  const Icon = isVideo ? Film : ImageIcon;
  const storageKey = isVideo ? STORAGE_KEY_VIDEO : STORAGE_KEY_PHOTO;

  // Keep showing last result until explicitly cleared
  // Initialize from localStorage on mount
  const [persistedResult, setPersistedResult] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = getStoredResult(storageKey);
    if (stored) {
      setPersistedResult(stored);
    }
    setIsHydrated(true);
  }, [storageKey]);

  // Listen for clear event from reset button
  useEffect(() => {
    const handleClearEvent = () => {
      setPersistedResult(null);
    };
    window.addEventListener("lensroom:clear-preview", handleClearEvent);
    return () => {
      window.removeEventListener("lensroom:clear-preview", handleClearEvent);
    };
  }, []);

  // Update persisted result when new result arrives (and save to localStorage)
  useEffect(() => {
    if (resultUrl) {
      setPersistedResult(resultUrl);
      setStoredResult(storageKey, resultUrl);
    }
  }, [resultUrl, storageKey]);

  // Determine what to display
  const displayUrl = resultUrl || persistedResult;
  const showResult = !!displayUrl && isHydrated;

  const handleClearResult = () => {
    setPersistedResult(null);
    setStoredResult(storageKey, null);
  };

  const handleDownload = async () => {
    if (!displayUrl) return;
    
    setDownloading(true);
    try {
      // Fetch the image/video
      const response = await fetch(displayUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Determine extension
      const contentType = response.headers.get('content-type') || '';
      let ext = isVideo ? 'mp4' : 'png';
      if (contentType.includes('webp')) ext = 'webp';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
      if (contentType.includes('webm')) ext = 'webm';
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `lensroom_${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(blobUrl);
      toast.success('Скачивание завершено');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Ошибка скачивания');
      
      // Fallback: open in new tab
      window.open(displayUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {/* Header - simplified on mobile */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[var(--muted)]" />
          <div className="text-sm font-semibold">Результат</div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hide details on mobile when result shown */}
          <div className="text-xs text-[var(--muted)] hidden sm:block">
            {model.kind.toUpperCase()} • {mode} • {aspect}
          </div>
          
          {/* Desktop action buttons in header */}
          {showResult && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--muted)] hover:text-white disabled:opacity-50"
                title="Скачать"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleClearResult}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--muted)] hover:text-white"
                title="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div
          className={cn(
            "w-full rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden",
            "flex items-center justify-center relative"
          )}
          style={{ aspectRatio: aspectToCss(aspect) }}
        >
          {showResult ? (
            <>
              {isVideo ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video 
                  src={displayUrl} 
                  controls 
                  className="w-full h-full object-contain bg-black" 
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={displayUrl} 
                  alt="Result preview" 
                  className="w-full h-full object-cover" 
                />
              )}
              
              {/* Mobile floating action buttons - bottom of preview */}
              {!isGenerating && (
                <div className="absolute bottom-3 left-3 right-3 flex sm:hidden items-center justify-between">
                  <button
                    onClick={handleClearResult}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-sm text-white/90 text-sm font-medium active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4" />
                    Скрыть
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--gold)] text-black text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Скачать
                  </button>
                </div>
              )}
              
              {/* Generating overlay */}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)] mx-auto mb-2" />
                    <div className="text-sm text-white/80">Новая генерация...</div>
                  </div>
                </div>
              )}
            </>
          ) : referencePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={referencePreviewUrl}
              alt="Reference preview"
              className="w-full h-full object-cover"
            />
          ) : isGenerating ? (
            <div className="text-center px-4 sm:px-6 py-8 sm:py-10">
              <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center mx-auto">
                <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
              </div>
              <div className="mt-4 text-sm text-white/80">Генерация запущена...</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Результат появится автоматически</div>
            </div>
          ) : (
            <div className="text-center px-4 sm:px-6 py-8 sm:py-10">
              <div className="w-12 h-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center mx-auto">
                <Icon className="w-6 h-6 text-white/70" />
              </div>
              <div className="mt-4 text-sm text-white/80">Результат появится здесь</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Нажмите «Сгенерировать»</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
