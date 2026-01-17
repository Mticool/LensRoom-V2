/**
 * Hook for haptic feedback on mobile devices
 */

import { useCallback } from 'react';
import logger from '@/lib/logger';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 100, 50],
  warning: [20, 50, 20, 50],
};

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern | number | number[]) => {
    // Check if vibration API is available
    if (!('vibrate' in navigator)) {
      logger.log('[useHaptic] Vibration API not supported');
      return;
    }

    try {
      // Get the pattern
      const vibrationPattern = typeof pattern === 'string'
        ? hapticPatterns[pattern]
        : pattern;

      // Trigger vibration
      navigator.vibrate(vibrationPattern);
      logger.log(`[useHaptic] Vibrated with pattern:`, vibrationPattern);
    } catch (error) {
      logger.error('[useHaptic] Failed to vibrate:', error);
    }
  }, []);

  const stopVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }, []);

  return {
    vibrate,
    stopVibration,
    light: () => vibrate('light'),
    medium: () => vibrate('medium'),
    heavy: () => vibrate('heavy'),
    success: () => vibrate('success'),
    error: () => vibrate('error'),
    warning: () => vibrate('warning'),
  };
}
