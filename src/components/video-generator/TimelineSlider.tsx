'use client';

import { Slider } from '@/components/ui/slider';

interface TimelineSliderProps {
  currentTime: number;
  duration: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export function TimelineSlider({
  currentTime,
  duration,
  onChange,
  disabled = false,
}: TimelineSliderProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {/* Slider */}
      <Slider
        value={[currentTime]}
        max={duration}
        step={0.1}
        disabled={disabled}
        onValueChange={(value) => onChange?.(value[0])}
        className="w-full"
      />

      {/* Time Display */}
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
