/**
 * Hook for swipe gestures
 */

import { useGesture } from '@use-gesture/react';
import { useCallback } from 'react';
import { useHaptic } from './useHaptic';
import logger from '@/lib/logger';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum swipe distance in pixels
  haptic?: boolean; // Enable haptic feedback on swipe
}

export function useSwipe(options: SwipeOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    haptic = true,
  } = options;

  const { light } = useHaptic();

  const bind = useGesture(
    {
      onDrag: ({ direction: [dx, dy], distance: [distanceX, distanceY], last }) => {
        if (!last) return;

        // Determine if swipe is primarily horizontal or vertical
        const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontal && distanceX > threshold) {
          // Swipe right
          if (dx > 0 && onSwipeRight) {
            if (haptic) light();
            logger.log('[useSwipe] Swipe right detected');
            onSwipeRight();
          }
          // Swipe left
          else if (dx < 0 && onSwipeLeft) {
            if (haptic) light();
            logger.log('[useSwipe] Swipe left detected');
            onSwipeLeft();
          }
        } else if (!isHorizontal && distanceY > threshold) {
          // Swipe down
          if (dy > 0 && onSwipeDown) {
            if (haptic) light();
            logger.log('[useSwipe] Swipe down detected');
            onSwipeDown();
          }
          // Swipe up
          else if (dy < 0 && onSwipeUp) {
            if (haptic) light();
            logger.log('[useSwipe] Swipe up detected');
            onSwipeUp();
          }
        }
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 10,
      },
    }
  );

  return bind;
}
