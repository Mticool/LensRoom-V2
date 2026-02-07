'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { getOptimalImageQuality, isMobileDevice, prefersReducedMotion } from '@/lib/utils/mobile-optimization';
// Note: Using native img instead of next/image for better reliability with external URLs

// ===== OPTIMIZED IMAGE =====
interface OptimizedImageProps {
  src: string;
  alt: string;
  generationId?: string; // Generation ID for fallback URL when external URLs fail
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  onLoad?: () => void;
  quality?: 'low' | 'medium' | 'high';
}

// Generate srcset for responsive images with different quality levels
function generateSrcSet(url: string, quality: 'low' | 'medium' | 'high' = 'medium'): string {
  if (!url || url.includes('?')) return ''; // Skip if URL has params

  // Some external hosts do not support width params ("?w=") and may return HTML,
  // which Chromium blocks via ORB. Avoid generating srcset for these.
  if (url.includes('tempfile.aiquickdraw.com')) return '';

  // Only generate srcset for same-origin, relative URLs, or known storage/CDN URLs.
  // This prevents broken thumbnails for arbitrary external links.
  if (url.startsWith('http')) {
    const allowed = [
      'lensroom.ru',
      '/storage/v1/object/',
      'supabase.co',
    ];
    if (!allowed.some((s) => url.includes(s))) return '';
  }
  
  const widths = quality === 'low' ? [320, 640] : 
                 quality === 'high' ? [640, 1024, 1920] : 
                 [640, 1024];
  
  return widths.map(w => `${url}?w=${w} ${w}w`).join(', ');
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  generationId,
  className = '',
  priority = false,
  fill = true,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad,
  quality,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryUrl, setRetryUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Auto-detect optimal quality if not specified
  const optimalQuality = quality || getOptimalImageQuality();
  const reducedMotion = prefersReducedMotion();
  const isMobile = isMobileDevice();

  // Use retry URL if available, otherwise use original src.
  // Keep this above hooks that depend on it so hook order is stable.
  const imageSrc = retryUrl || src;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    console.warn('[OptimizedImage] Failed to load:', src?.substring(0, 100));

    // If external URL (tempfile.aiquickdraw.com) failed and we have generationId, try proxy endpoint
    if (src && src.includes('tempfile.aiquickdraw.com') && generationId && !retryUrl) {
      const fallbackUrl = `/api/generations/${encodeURIComponent(generationId)}/download?kind=original&proxy=1`;
      console.log('[OptimizedImage] External URL failed, trying proxy:', fallbackUrl);
      setRetryUrl(fallbackUrl);
      setHasError(false);
      return;
    }

    // If URL is a download endpoint without proxy, try with proxy
    if (src && src.includes('/api/generations/') && src.includes('/download') && !src.includes('proxy=1')) {
      const newUrl = src.includes('?') ? `${src}&proxy=1` : `${src}?proxy=1`;
      setRetryUrl(newUrl);
      setHasError(false); // Reset error to try again
      return;
    }

    // If URL is a download endpoint with proxy, try without proxy (fallback to redirect)
    if (src && src.includes('/api/generations/') && src.includes('/download') && src.includes('proxy=1')) {
      const newUrl = src.replace('&proxy=1', '').replace('?proxy=1', '');
      setRetryUrl(newUrl);
      setHasError(false);
      return;
    }

    setHasError(true);
  };
  
  // Intersection Observer for lazy loading (only for non-priority images).
  // IMPORTANT: this hook must always be called (even when src is missing or hasError is true),
  // otherwise React will throw "Rendered fewer hooks than expected" (minified error #300).
  useEffect(() => {
    if (priority || !imgRef.current) return;
    if (!imageSrc || hasError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            // Start loading when visible
            const img = imgRef.current;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading slightly before visible
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority, imageSrc, hasError]);

  // No src - show placeholder
  if (!src) {
    return (
      <div className={`w-full h-full bg-[var(--surface2)] flex items-center justify-center ${className}`}>
        <span className="text-xs text-[var(--muted)]">Нет изображения</span>
      </div>
    );
  }
  
  // Error state - show placeholder
  if (hasError) {
    return (
      <div className={`w-full h-full bg-[var(--surface2)] flex items-center justify-center ${className}`}>
        <span className="text-xs text-[var(--muted)]">Ошибка загрузки</span>
      </div>
    );
  }
  
  // Generate srcset for responsive loading
  const srcSet = generateSrcSet(imageSrc, optimalQuality);
  
  // Adjust transition duration based on reduced motion preference
  const transitionDuration = reducedMotion ? 'duration-200' : 'duration-500';
  
  // Always use simple img tag for reliability (Next.js Image has issues with external URLs)
  return (
    <>
      {/* Enhanced blur placeholder while loading */}
      {!isLoaded && (
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--surface2)] via-[var(--surface)] to-[var(--surface2)] ${reducedMotion ? '' : 'animate-pulse'}`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
        </div>
      )}
      <img
        ref={imgRef}
        src={priority ? imageSrc : undefined}
        data-src={priority ? undefined : imageSrc}
        srcSet={priority && srcSet ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        className={`w-full h-full object-cover ${className} transition-opacity ${transitionDuration} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        onLoad={handleLoad}
        onError={handleError}
        style={{ 
          objectFit: 'cover',
          // Optimize rendering on mobile
          ...(isMobile && {
            willChange: 'opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          })
        }}
        key={imageSrc} // Force re-render when URL changes
      />
    </>
  );
});

// ===== LAZY VIDEO (plays only when visible) =====
interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
}

export const LazyVideo = memo(function LazyVideo({
  src,
  poster,
  className = '',
  muted = true,
  loop = true,
  playsInline = true,
  preload = 'none',
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasLoadedSrc, setHasLoadedSrc] = useState(false);
  
  // Intersection Observer - load and play only when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          
          if (entry.isIntersecting) {
            // Load src if not loaded yet
            if (!hasLoadedSrc && src) {
              video.src = src;
              setHasLoadedSrc(true);
            }
            
            // Play when visible
            video.play().catch(() => {
              // Autoplay blocked, that's ok
            });
          } else {
            // Pause when not visible to save resources and bandwidth
            video.pause();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading earlier for smoother experience
        threshold: 0.1,
      }
    );
    
    observer.observe(video);
    
    return () => observer.disconnect();
  }, [src, hasLoadedSrc]);
  
  const handleLoadedData = () => {
    setIsLoaded(true);
  };
  
  const handleError = () => {
    setHasError(true);
  };
  
  if (hasError) {
    return (
      <div className={`bg-[var(--surface2)] flex items-center justify-center ${className}`}>
        {poster ? (
          <img src={poster} alt="Preview" className={`object-cover ${className}`} loading="lazy" />
        ) : (
          <span className="text-xs text-[var(--muted)]">Видео недоступно</span>
        )}
      </div>
    );
  }
  
  return (
    <>
      {/* Enhanced poster/placeholder while loading */}
      {!isLoaded && poster && (
        <img 
          src={poster} 
          alt="Loading..." 
          className={`absolute inset-0 object-cover ${className}`}
          loading="lazy"
        />
      )}
      {!isLoaded && !poster && (
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--surface2)] via-[var(--surface)] to-[var(--surface2)] animate-pulse ${className}`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        poster={poster}
        className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload={preload}
        onLoadedData={handleLoadedData}
        onError={handleError}
      />
    </>
  );
});

// ===== OPTIMIZED MEDIA CARD =====
interface OptimizedMediaCardProps {
  src: string;
  posterSrc?: string;
  alt: string;
  isVideo: boolean;
  aspectClass?: string;
  className?: string;
  priority?: boolean;
}

export const OptimizedMediaCard = memo(function OptimizedMediaCard({
  src,
  posterSrc,
  alt,
  isVideo,
  aspectClass = 'aspect-square',
  className = '',
  priority = false,
}: OptimizedMediaCardProps) {
  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden ${className}`}>
      {isVideo ? (
        <LazyVideo
          src={src}
          poster={posterSrc}
          className="w-full h-full object-cover"
        />
      ) : (
        <OptimizedImage
          src={src}
          alt={alt}
          className="object-cover"
          priority={priority}
        />
      )}
    </div>
  );
});
