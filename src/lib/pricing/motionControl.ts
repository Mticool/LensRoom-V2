// Motion Control (Kling 2.6 Motion Control) pricing helpers
//
// Pricing model: per-second, rounded up to nearest 5⭐ (like other motion-control style pricing).
// Duration constraints: 3–30 seconds. If autoTrim=true, durations > 30s are trimmed to 30s.

export type MotionControlResolution = "720p" | "1080p";

export const MOTION_CONTROL_CONFIG = {
  MIN_DURATION_SEC: 3,
  MAX_DURATION_SEC: 30,
  // ⭐ per second (updated 2026-01-27)
  // These match the pricing.ts SKU prices:
  // - kling_motion_control:720p:per_sec = 10⭐
  // - kling_motion_control:1080p:per_sec = 20⭐
  RATE_720P: 10, // Updated from 16 to 10
  RATE_1080P: 20, // Updated from 25 to 20
  // pricing rounding step (no longer needed with fixed per-second pricing)
  ROUND_TO: 1, // Changed from 5 to 1 (no rounding)
} as const;

export function validateMotionControlDuration(durationSec: number, autoTrim: boolean) {
  const d = Number(durationSec || 0);

  if (!Number.isFinite(d) || d <= 0) {
    return { valid: false, error: "Укажите длительность видео" as const };
  }

  if (d < MOTION_CONTROL_CONFIG.MIN_DURATION_SEC) {
    return {
      valid: false,
      error: `Минимум ${MOTION_CONTROL_CONFIG.MIN_DURATION_SEC} сек` as const,
    };
  }

  if (d > MOTION_CONTROL_CONFIG.MAX_DURATION_SEC) {
    if (!autoTrim) {
      return {
        valid: false,
        error: `Максимум ${MOTION_CONTROL_CONFIG.MAX_DURATION_SEC} сек` as const,
      };
    }
    return {
      valid: true,
      effectiveDuration: MOTION_CONTROL_CONFIG.MAX_DURATION_SEC,
      trimmed: true,
      originalDuration: d,
    };
  }

  return {
    valid: true,
    effectiveDuration: d,
    trimmed: false,
    originalDuration: d,
  };
}

export function calcMotionControlStars(
  durationSec: number,
  resolution: MotionControlResolution,
  autoTrim: boolean
): number | null {
  const validation = validateMotionControlDuration(durationSec, autoTrim);
  if (!validation.valid) return null;

  const effective = Number(validation.effectiveDuration || 0);
  if (!Number.isFinite(effective) || effective <= 0) return null;

  const rate =
    resolution === "1080p" ? MOTION_CONTROL_CONFIG.RATE_1080P : MOTION_CONTROL_CONFIG.RATE_720P;

  // Simple per-second calculation (no rounding needed with fixed rates)
  const stars = effective * rate;
  return Math.max(0, Math.round(stars));
}


