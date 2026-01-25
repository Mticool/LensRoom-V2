import type { Aspect, Duration, Mode, Quality, StudioModel } from "@/config/studioModels";

export interface StudioSelectedOptions {
  mode: Mode;
  duration?: Duration;
  aspect: Aspect;
  quality: Quality;
  audio?: boolean;
}

export function calcStars(model: StudioModel, opts: StudioSelectedOptions): number {
  const baseline = model.baseStars || 0;

  const qualityMultiplier: Record<Quality, number> = {
    standard: 1.0,
    high: 1.2,
    ultra: 1.5,
  };

  const durationMultiplier: Record<Duration, number> = {
    5: 1.0,
    10: 1.6,
  };

  let total = baseline * qualityMultiplier[opts.quality];

  if (model.kind === "video") {
    const d = opts.duration ?? 5;
    total *= durationMultiplier[d];
  }

  // Add-ons (test values)
  if (opts.mode === "start_end") total += 10;
  if (opts.mode === "storyboard") total += 15;

  return Math.max(0, Math.ceil(total));
}
