/**
 * Hook for mobile optimization
 */

import { useEffect, useState, useMemo } from 'react';
import { 
  isMobileDevice, 
  isTouchDevice, 
  isSlowConnection, 
  getViewportDimensions,
  getMasonryColumns,
  prefersReducedMotion,
} from '@/lib/utils/mobile-optimization';

export interface MobileOptimizationState {
  isMobile: boolean;
  isTouch: boolean;
  isSlowNetwork: boolean;
  viewportWidth: number;
  viewportHeight: number;
  columns: number;
  reducedMotion: boolean;
  // Image quality recommendations
  imageQuality: 'low' | 'medium' | 'high';
  // Load more items
  itemsPerPage: number;
}

export function useMobileOptimization(): MobileOptimizationState {
  const [viewport, setViewport] = useState(getViewportDimensions);
  
  // Detect device capabilities (only run once on mount)
  const deviceInfo = useMemo(() => ({
    isMobile: isMobileDevice(),
    isTouch: isTouchDevice(),
    isSlowNetwork: isSlowConnection(),
    reducedMotion: prefersReducedMotion(),
  }), []);
  
  // Update viewport dimensions on resize
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport(getViewportDimensions());
      }, 150); // Debounce resize events
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Calculate optimal settings based on device and network
  const optimizedSettings = useMemo(() => {
    const columns = getMasonryColumns();
    
    // Determine image quality
    let imageQuality: 'low' | 'medium' | 'high' = 'high';
    if (deviceInfo.isSlowNetwork) {
      imageQuality = 'low';
    } else if (deviceInfo.isMobile) {
      imageQuality = 'medium';
    }
    
    // Items per page based on device
    let itemsPerPage = 30;
    if (deviceInfo.isMobile) {
      itemsPerPage = 20; // Fewer items on mobile for better performance
    }
    if (deviceInfo.isSlowNetwork) {
      itemsPerPage = 15; // Even fewer on slow networks
    }
    
    return {
      columns,
      imageQuality,
      itemsPerPage,
    };
  }, [deviceInfo, viewport.width]);
  
  return {
    ...deviceInfo,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    ...optimizedSettings,
  };
}

// Hook for touch gestures
export function useTouchGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  useEffect(() => {
    if (!isTouchDevice()) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleGesture();
    };
    
    const handleGesture = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Determine if swipe is more horizontal or vertical
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);
}

// Hook for viewport visibility
export function useViewportVisibility(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): boolean {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [ref, options]);
  
  return isVisible;
}
