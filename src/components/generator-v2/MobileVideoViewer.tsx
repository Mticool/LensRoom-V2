'use client';

import { useCallback, useMemo, useRef } from "react";
import { Download, Heart } from "lucide-react";
import type { GenerationResult } from "@/components/generator-v2/GeneratorV2";

interface MobileVideoViewerProps {
  video: GenerationResult | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onDownload: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

export function MobileVideoViewer({
  video,
  index,
  total,
  onPrev,
  onNext,
  onDownload,
  onToggleFavorite,
  isFavorite,
}: MobileVideoViewerProps) {
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const canSwipe = total > 1;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!canSwipe) return;
      const start = swipeRef.current;
      swipeRef.current = null;
      if (!start) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;
      // Horizontal swipe only
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      if (dt > 900) return;
      if (dx > 0) onPrev();
      else onNext();
    },
    [canSwipe, onPrev, onNext]
  );

  const indicator = useMemo(() => {
    if (!canSwipe) return null;
    const safeTotal = Math.max(1, total);
    const safeIdx = Math.min(Math.max(0, index), safeTotal - 1);
    return `${safeIdx + 1}/${safeTotal}`;
  }, [canSwipe, index, total]);

  if (!video?.url) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-white/80 font-medium">Результат появится здесь</div>
          <div className="mt-2 text-white/40 text-sm">Введите промпт и нажмите «Сгенерировать»</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 bg-black"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <video
        src={video.url}
        controls
        autoPlay
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-contain select-none"
      />

      {/* Indicator (1/N) */}
      {indicator ? (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-white/90 text-xs font-medium backdrop-blur">
          {indicator}
        </div>
      ) : null}

      {/* Minimal actions */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFavorite}
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/55 border border-white/10 backdrop-blur text-white hover:bg-black/70 active:scale-95 transition"
          title={isFavorite ? "Убрать из избранного" : "В избранное"}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? "text-rose-400" : "text-white"}`} />
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/55 border border-white/10 backdrop-blur text-white hover:bg-black/70 active:scale-95 transition"
          title="Скачать"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
