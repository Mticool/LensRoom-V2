/**
 * Hook for pinch-to-zoom gesture
 */

import { useGesture } from '@use-gesture/react';
import { useState, useCallback } from 'react';
import logger from '@/lib/logger';

interface PinchZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export function usePinchZoom(options: PinchZoomOptions = {}) {
  const { minZoom = 1, maxZoom = 3, initialZoom = 1, onZoomChange } = options;

  const [zoom, setZoom] = useState(initialZoom);

  const bind = useGesture(
    {
      onPinch: ({ offset: [scale] }) => {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, scale));
        logger.log(`[usePinchZoom] Zoom: ${newZoom.toFixed(2)}x`);
        setZoom(newZoom);
        onZoomChange?.(newZoom);
      },
    },
    {
      pinch: {
        from: [initialZoom, 0],
        scaleBounds: { min: minZoom, max: maxZoom },
      },
    }
  );

  const resetZoom = useCallback(() => {
    setZoom(initialZoom);
    onZoomChange?.(initialZoom);
  }, [initialZoom, onZoomChange]);

  return {
    bind,
    zoom,
    resetZoom,
  };
}
