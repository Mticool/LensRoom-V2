export type MotionControlResolution = '720p' | '1080p';
export type MotionCharacterOrientation = 'image' | 'video';

export const MOTION_CONTROL_LIMITS = {
  minSeconds: 3,
  maxSeconds: 30,
  maxByOrientation: {
    image: 10,
    video: 30,
  } as const,
  creditsPerSecond: {
    '720p': 6,
    '1080p': 9,
  } as const,
};

export function clampMotionControlSeconds(
  seconds: number,
  orientation: MotionCharacterOrientation
): number {
  const normalized = Number(seconds || 0);
  const min = MOTION_CONTROL_LIMITS.minSeconds;
  const maxByOrientation = MOTION_CONTROL_LIMITS.maxByOrientation[orientation] || MOTION_CONTROL_LIMITS.maxSeconds;
  const max = Math.min(MOTION_CONTROL_LIMITS.maxSeconds, maxByOrientation);
  if (!Number.isFinite(normalized)) return min;
  return Math.min(max, Math.max(min, normalized));
}

export function validateMotionControlSeconds(
  seconds: number,
  orientation: MotionCharacterOrientation
): { valid: boolean; message?: string } {
  const n = Number(seconds || 0);
  if (!Number.isFinite(n) || n <= 0) {
    return { valid: false, message: 'Укажите длительность motion-видео' };
  }
  if (n < MOTION_CONTROL_LIMITS.minSeconds) {
    return { valid: false, message: `Минимум ${MOTION_CONTROL_LIMITS.minSeconds} сек` };
  }
  const maxByOrientation = MOTION_CONTROL_LIMITS.maxByOrientation[orientation] || MOTION_CONTROL_LIMITS.maxSeconds;
  if (n > maxByOrientation) {
    return { valid: false, message: `Для orientation=${orientation} максимум ${maxByOrientation} сек` };
  }
  return { valid: true };
}

export function calcMotionControlCredits(
  seconds: number,
  resolution: MotionControlResolution,
  orientation: MotionCharacterOrientation
): { billableSeconds: number; creditsPerSecond: number; credits: number } {
  const billableSeconds = clampMotionControlSeconds(seconds, orientation);
  const creditsPerSecond = MOTION_CONTROL_LIMITS.creditsPerSecond[resolution] || MOTION_CONTROL_LIMITS.creditsPerSecond['720p'];
  const credits = Math.ceil(billableSeconds * creditsPerSecond);
  return { billableSeconds, creditsPerSecond, credits };
}
