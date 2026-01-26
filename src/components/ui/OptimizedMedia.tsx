'use client';

import { useState, useRef, useEffect, memo } from 'react';
// Note: Using native img instead of next/image for better reliability with external URLs

// ===== OPTIMIZED IMAGE =====
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  onLoad?: () => void;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  fill = true,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryUrl, setRetryUrl] = useState<string | null>(null);
  
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };
  
  const handleError = () => {
    console.warn('[OptimizedImage] Failed to load:', src?.substring(0, 100));
    
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
  
  // Use retry URL if available, otherwise use original src
  const imageSrc = retryUrl || src;
  
  // Always use simple img tag for reliability (Next.js Image has issues with external URLs)
  return (
    <>
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[var(--surface2)] animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover ${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{ objectFit: 'cover' }}
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
}

export const LazyVideo = memo(function LazyVideo({
  src,
  poster,
  className = '',
  muted = true,
  loop = true,
  playsInline = true,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Intersection Observer - play only when visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
          
          if (entry.isIntersecting) {
            // Play when visible
            video.play().catch(() => {
              // Autoplay blocked, that's ok
            });
          } else {
            // Pause when not visible to save resources
            video.pause();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading a bit before visible
        threshold: 0.1,
      }
    );
    
    observer.observe(video);
    
    return () => observer.disconnect();
  }, []);
  
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
      {/* Poster/placeholder while loading */}
      {!isLoaded && poster && (
        <img 
          src={poster} 
          alt="Loading..." 
          className={`absolute inset-0 object-cover ${className}`}
          loading="lazy"
        />
      )}
      {!isLoaded && !poster && (
        <div className={`absolute inset-0 bg-[var(--surface2)] animate-pulse ${className}`} />
      )}
      <video
        ref={videoRef}
        src={isVisible ? src : undefined} // Only load src when visible
        poster={poster}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload="none" // Don't preload until visible
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

