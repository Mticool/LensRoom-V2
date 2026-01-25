'use client';

import { Slider } from '@/components/ui/slider';
import { Check } from 'lucide-react';
import type { VideoQuality } from '@/types/video-generator';

interface VideoParamsControlsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  quality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
  withSound: boolean;
  onSoundChange: (withSound: boolean) => void;
  aspectRatio?: string;
  onAspectRatioChange?: (aspectRatio: string) => void;
  durationOptions?: number[];
  qualityOptions?: VideoQuality[];
  aspectRatioOptions?: string[];
  supportsAudio?: boolean;
}

export function VideoParamsControls({
  duration,
  onDurationChange,
  quality,
  onQualityChange,
  withSound,
  onSoundChange,
  aspectRatio,
  onAspectRatioChange,
  durationOptions = [3, 5, 10, 15],
  qualityOptions = ['720p', '1080p', '4K'],
  aspectRatioOptions = ['16:9', '9:16', '1:1'],
  supportsAudio = true,
}: VideoParamsControlsProps) {
  // Find closest duration option index
  const durationIndex = durationOptions.indexOf(duration);
  const currentIndex = durationIndex >= 0 ? durationIndex : 1; // Default to index 1 (5s)

  const handleDurationSliderChange = (value: number[]) => {
    const index = Math.round(value[0]);
    const newDuration = durationOptions[index];
    if (newDuration !== undefined) {
      onDurationChange(newDuration);
    }
  };

  return (
    <div className="space-y-3">
      {/* Duration Slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium">Длительность</label>
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {duration} сек
          </span>
        </div>

        <Slider
          value={[currentIndex]}
          min={0}
          max={durationOptions.length - 1}
          step={1}
          onValueChange={handleDurationSliderChange}
          className="w-full"
        />

        {/* Duration Labels */}
        <div className="flex justify-between mt-1">
          {durationOptions.map((dur) => (
            <span
              key={dur}
              className={`text-[10px] ${
                dur === duration ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--muted)]'
              }`}
            >
              {dur}s
            </span>
          ))}
        </div>
      </div>

      {/* Quality Selector */}
      <div>
        <label className="block text-xs font-medium mb-1">Качество</label>
        <div className="grid grid-cols-3 gap-1.5">
          {qualityOptions.map((q) => {
            const isSelected = quality === q;

            return (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`px-2 py-1.5 rounded-md border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]'
                    : 'bg-[var(--surface2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect Ratio Selector */}
      {aspectRatio && onAspectRatioChange && aspectRatioOptions.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-1">Соотношение сторон</label>
          <div className="grid grid-cols-3 gap-1.5">
            {aspectRatioOptions.map((ratio) => {
              const isSelected = aspectRatio === ratio;

              return (
                <button
                  key={ratio}
                  onClick={() => onAspectRatioChange(ratio)}
                  className={`px-2 py-1.5 rounded-md border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]'
                      : 'bg-[var(--surface2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--border-hover)]'
                  }`}
                >
                  {ratio}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sound Checkbox (only if supported by model) */}
      {supportsAudio && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={withSound}
                onChange={(e) => onSoundChange(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-4 h-4 border-2 rounded transition-all ${
                  withSound
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                    : 'bg-[var(--surface2)] border-[var(--border)] group-hover:border-[var(--border-hover)]'
                }`}
              >
                {withSound && <Check className="w-3 h-3 text-black absolute top-0 left-0" strokeWidth={3} />}
              </div>
            </div>
            <span className="text-xs font-medium">Со звуком</span>
          </label>
          <p className="text-[10px] text-[var(--muted)] mt-0.5 ml-6">
            Синхронизированный звук
          </p>
        </div>
      )}
    </div>
  );
}
