import type { Aspect, Duration, Mode, Quality, StudioModel } from "@/config/studioModels";

export const RUB_PER_STAR = 3.3;

export type StudioSelectedOptions = {
  mode: Mode;
  quality: Quality;
  aspect: Aspect;
  duration?: Duration;
  audio?: boolean;
};

export function calcStars(model: StudioModel, opts: StudioSelectedOptions): number {
  const baseline = model.baseStars || 0;

  const qualityMultiplier: Record<Quality, number> = {
    standard: 1.0,
    high: 1.2,
    ultra: 1.5,
  };

  const durationMultiplier = (d: Duration | undefined) => {
    if (!d) return 1.0;
    return d === 10 ? 1.6 : 1.0;
  };

  const q = qualityMultiplier[opts.quality] ?? 1.0;
  const dmul = model.kind === "video" ? durationMultiplier(opts.duration) : 1.0;

  let total = baseline * q * dmul;

  // Add-ons (test values)
  if (opts.mode === "start_end") total += 10;
  if (opts.mode === "storyboard") total += 15;

  return Math.max(0, Math.ceil(total));
}

export function calcRub(stars: number): number {
  return Math.ceil(stars * RUB_PER_STAR);
}



