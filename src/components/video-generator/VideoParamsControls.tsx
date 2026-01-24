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
    <div className="space-y-6">
      {/* Duration Slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Длительность</label>
          <span className="text-sm font-semibold text-[var(--accent-primary)]">
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
        <div className="flex justify-between mt-2">
          {durationOptions.map((dur) => (
            <span
              key={dur}
              className={`text-xs ${
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
        <label className="block text-sm font-medium mb-2">Качество</label>
        <div className="grid grid-cols-3 gap-2">
          {qualityOptions.map((q) => {
            const isSelected = quality === q;

            return (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
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
          <label className="block text-sm font-medium mb-2">Соотношение сторон</label>
          <div className="grid grid-cols-3 gap-2">
            {aspectRatioOptions.map((ratio) => {
              const isSelected = aspectRatio === ratio;

              return (
                <button
                  key={ratio}
                  onClick={() => onAspectRatioChange(ratio)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
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
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={withSound}
                onChange={(e) => onSoundChange(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-5 h-5 border-2 rounded transition-all ${
                  withSound
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                    : 'bg-[var(--surface2)] border-[var(--border)] group-hover:border-[var(--border-hover)]'
                }`}
              >
                {withSound && <Check className="w-4 h-4 text-black absolute top-0 left-0" strokeWidth={3} />}
              </div>
            </div>
            <span className="text-sm font-medium">Со звуком</span>
          </label>
          <p className="text-xs text-[var(--muted)] mt-1 ml-8">
            Генерировать видео с синхронизированным звуком
          </p>
        </div>
      )}
    </div>
  );
}
