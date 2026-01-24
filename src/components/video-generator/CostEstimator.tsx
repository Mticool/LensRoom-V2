'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { computePrice, formatPriceDisplay } from '@/lib/pricing/compute-price';
import type { VideoMode, VideoQuality } from '@/types/video-generator';

interface CostEstimatorProps {
  modelId: string;
  mode: VideoMode;
  duration: number;
  quality: VideoQuality;
  withSound: boolean;
  variants?: number;
}

export function CostEstimator({
  modelId,
  mode,
  duration,
  quality,
  withSound,
  variants = 1,
}: CostEstimatorProps) {
  const priceData = useMemo(() => {
    return computePrice(modelId, {
      mode: mode === 'text' ? 't2v' : 'i2v',
      duration,
      videoQuality: quality,
      audio: withSound,
      variants,
    });
  }, [modelId, mode, duration, quality, withSound, variants]);

  const formattedPrice = formatPriceDisplay(priceData);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text)]">Стоимость генерации</span>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-lg font-bold text-[var(--accent-primary)]">
            {formattedPrice.stars}
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="rounded-lg bg-[var(--surface2)] p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--muted)]">За видео</span>
          <span className="text-[var(--text)]">{Math.ceil(priceData.stars / variants)}⭐</span>
        </div>

        {variants > 1 && (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--muted)]">Количество</span>
            <span className="text-[var(--text)]">×{variants}</span>
          </div>
        )}

        <div className="pt-2 border-t border-[var(--border)] flex justify-between text-sm font-semibold">
          <span className="text-[var(--text)]">Итого</span>
          <span className="text-[var(--accent-primary)]">{formattedPrice.stars}</span>
        </div>

        {priceData.approxRub > 0 && (
          <div className="text-center text-xs text-[var(--muted)]">{formattedPrice.rub}</div>
        )}
      </div>

      {/* Info Text */}
      <p className="text-xs text-[var(--muted)] leading-relaxed">
        {mode === 'image' || mode === 'reference'
          ? 'Стоимость будет рассчитана автоматически после загрузки файла.'
          : 'Стоимость зависит от длительности, качества и выбранной модели.'}
      </p>
    </div>
  );
}
