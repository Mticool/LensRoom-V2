/**
 * Hook for long press gesture
 */

import { useGesture } from '@use-gesture/react';
import { useCallback } from 'react';
import { useHaptic } from './useHaptic';
import logger from '@/lib/logger';

interface LongPressOptions {
  onLongPress: () => void;
  threshold?: number; // Duration in ms
  haptic?: boolean; // Enable haptic feedback
  hapticPattern?: 'light' | 'medium' | 'heavy';
}

export function useLongPress(options: LongPressOptions) {
  const {
    onLongPress,
    threshold = 500,
    haptic = true,
    hapticPattern = 'medium',
  } = options;

  const { vibrate } = useHaptic();

  const bind = useGesture(
    {
      onDrag: ({ tap, elapsedTime, cancel }) => {
        if (tap) return;

        if (elapsedTime > threshold) {
          logger.log('[useLongPress] Long press detected');
          if (haptic) {
            vibrate(hapticPattern);
          }
          onLongPress();
          cancel();
        }
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 0,
      },
    }
  );

  return bind;
}
