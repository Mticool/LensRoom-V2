/**
 * Kling 2.6 Motion Control Pricing Module
 * 
 * Shared между frontend и backend для консистентного расчёта цены.
 * 
 * Pricing (⭐ per second):
 * - 720p (Standard): 16⭐/sec
 * - 1080p (Pro): 22⭐/sec
 * 
 * Округление: ceil((duration * rate) / 5) * 5
 * 
 * Лимиты:
 * - MIN_DURATION_SEC = 3
 * - MAX_DURATION_SEC = 30
 */

// ========== CONSTANTS ==========

export const MOTION_CONTROL_CONFIG = {
  MIN_DURATION_SEC: 3,
  MAX_DURATION_SEC: 30,
  RATE_720P: 16,  // ⭐ per second
  RATE_1080P: 22, // ⭐ per second
  ROUND_TO: 5,    // Round price to nearest 5⭐
} as const;

export type MotionControlResolution = '720p' | '1080p';

// ========== PRICING FUNCTIONS ==========

/**
 * Get rate per second for resolution
 */
export function getMotionControlRate(resolution: MotionControlResolution): number {
  return resolution === '720p' 
    ? MOTION_CONTROL_CONFIG.RATE_720P 
    : MOTION_CONTROL_CONFIG.RATE_1080P;
}

/**
 * Calculate Motion Control price in stars
 * 
 * @param durationSec - Video duration in seconds
 * @param resolution - '720p' or '1080p'
 * @param autoTrim - If true, clips to 30s; if false and duration > 30s, returns null
 * @returns Price in stars or null if invalid
 * 
 * @example
 * calcMotionControlStars(12.4, '720p', true)  // 200⭐
 * calcMotionControlStars(12.4, '1080p', true) // 275⭐
 * calcMotionControlStars(40, '720p', true)    // 480⭐ (capped to 30s)
 * calcMotionControlStars(40, '720p', false)   // null (invalid)
 * calcMotionControlStars(2, '720p', true)     // null (too short)
 */
export function calcMotionControlStars(
  durationSec: number,
  resolution: MotionControlResolution,
  autoTrim: boolean = true
): number | null {
  const { MIN_DURATION_SEC, MAX_DURATION_SEC, ROUND_TO } = MOTION_CONTROL_CONFIG;
  
  // Validate minimum duration
  if (durationSec < MIN_DURATION_SEC) {
    return null;
  }
  
  // Check max duration
  if (durationSec > MAX_DURATION_SEC) {
    if (!autoTrim) {
      return null; // Invalid if over limit and no auto-trim
    }
    durationSec = MAX_DURATION_SEC; // Cap to max
  }
  
  const rate = getMotionControlRate(resolution);
  const rawPrice = durationSec * rate;
  
  // Round up to nearest ROUND_TO (5⭐)
  const roundedPrice = Math.ceil(rawPrice / ROUND_TO) * ROUND_TO;
  
  return roundedPrice;
}

/**
 * Validate duration and get effective duration
 * 
 * @returns { valid, effectiveDuration, error }
 */
export function validateMotionControlDuration(
  durationSec: number,
  autoTrim: boolean = true
): {
  valid: boolean;
  effectiveDuration: number;
  error?: string;
  warning?: string;
} {
  const { MIN_DURATION_SEC, MAX_DURATION_SEC } = MOTION_CONTROL_CONFIG;
  
  if (durationSec < MIN_DURATION_SEC) {
    return {
      valid: false,
      effectiveDuration: 0,
      error: `Видео слишком короткое. Минимум ${MIN_DURATION_SEC} сек.`,
    };
  }
  
  if (durationSec > MAX_DURATION_SEC) {
    if (autoTrim) {
      return {
        valid: true,
        effectiveDuration: MAX_DURATION_SEC,
        warning: `Видео будет обрезано до ${MAX_DURATION_SEC} сек.`,
      };
    }
    return {
      valid: false,
      effectiveDuration: 0,
      error: `Видео слишком длинное (${durationSec.toFixed(1)}с). Максимум ${MAX_DURATION_SEC} сек. Включите обрезку.`,
    };
  }
  
  return {
    valid: true,
    effectiveDuration: durationSec,
  };
}

/**
 * Get minimum price display string (for model card)
 * Based on minimum duration (3s) at lowest resolution (720p)
 */
export function getMotionControlMinPriceLabel(): string {
  const minPrice = calcMotionControlStars(
    MOTION_CONTROL_CONFIG.MIN_DURATION_SEC,
    '720p',
    true
  );
  return `от ${minPrice}⭐`;
}

/**
 * Format price for display with duration breakdown
 */
export function formatMotionControlPrice(
  durationSec: number,
  resolution: MotionControlResolution,
  autoTrim: boolean = true
): string {
  const validation = validateMotionControlDuration(durationSec, autoTrim);
  
  if (!validation.valid) {
    return '—';
  }
  
  const price = calcMotionControlStars(validation.effectiveDuration, resolution, true);
  const rate = getMotionControlRate(resolution);
  
  return `${price}⭐ (${validation.effectiveDuration.toFixed(1)}с × ${rate}⭐/с)`;
}



