'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { computePrice } from '@/lib/pricing/compute-price';
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text)]">Стоимость</span>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-sm font-bold text-[var(--accent-primary)]">
            {priceData.stars}⭐
          </span>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="rounded-md bg-[var(--surface2)] p-2 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[var(--muted)]">За видео</span>
          <span className="text-[var(--text)]">{Math.ceil(priceData.stars / variants)}⭐</span>
        </div>

        {variants > 1 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--muted)]">Количество</span>
            <span className="text-[var(--text)]">×{variants}</span>
          </div>
        )}

        <div className="pt-1 border-t border-[var(--border)] flex justify-between text-xs font-semibold">
          <span className="text-[var(--text)]">Итого</span>
          <span className="text-[var(--accent-primary)]">{priceData.stars}⭐</span>
        </div>
      </div>
    </div>
  );
}
