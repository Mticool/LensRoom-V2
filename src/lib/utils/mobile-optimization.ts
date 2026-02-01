/**
 * Mobile optimization utilities
 */

// Detect if device is mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Get device pixel ratio for optimal image loading
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

// Calculate optimal image size based on viewport and DPR
export function getOptimalImageSize(
  containerWidth: number,
  dpr: number = getDevicePixelRatio()
): number {
  const baseSize = Math.ceil(containerWidth * dpr);
  
  // Round to nearest standard size for better CDN caching
  const sizes = [320, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  return sizes.find(size => size >= baseSize) || sizes[sizes.length - 1];
}

// Determine if connection is slow (useful for image quality decisions)
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false;
  }
  
  const conn = (navigator as any).connection;
  if (!conn) return false;
  
  // 3G or slower, or save-data mode
  return (
    conn.effectiveType === 'slow-2g' ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === '3g' ||
    conn.saveData === true
  );
}

// Get optimal image quality based on connection
export function getOptimalImageQuality(): 'low' | 'medium' | 'high' {
  if (isSlowConnection()) return 'low';
  if (isMobileDevice()) return 'medium';
  return 'high';
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  
  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

// Debounce function for resize events
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Detect touch support
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

// Get viewport dimensions
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1920, height: 1080 };
  }
  
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

// Calculate number of columns for masonry grid based on viewport
export function getMasonryColumns(): number {
  const { width } = getViewportDimensions();
  
  if (width < 640) return 2; // Mobile
  if (width < 768) return 3; // Tablet
  if (width < 1024) return 4; // Small desktop
  if (width < 1280) return 5; // Desktop
  return 6; // Large desktop
}

// Preload critical images
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Batch preload multiple images
export async function preloadImages(srcs: string[], limit: number = 3): Promise<void> {
  const chunks = [];
  for (let i = 0; i < srcs.length; i += limit) {
    chunks.push(srcs.slice(i, i + limit));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(src => preloadImage(src).catch(() => {})));
  }
}

// Check if reduced motion is preferred (accessibility)
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Get optimal video quality for mobile
export function getOptimalVideoQuality(): '360p' | '480p' | '720p' | '1080p' {
  const { width } = getViewportDimensions();
  
  if (isSlowConnection()) return '360p';
  if (width < 640) return '480p'; // Mobile
  if (width < 1024) return '720p'; // Tablet
  return '1080p'; // Desktop
}
