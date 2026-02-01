'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FILTER_CHIPS, 
  getOrderedPresetsForMasonry,
  buildPresetUrl,
  getTileAspectClass,
  type FilterChipId,
  type EffectPreset,
} from '@/config/effectsGallery';
import { OptimizedImage, LazyVideo } from '@/components/ui/OptimizedMedia';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

// ===== CONSTANTS =====
const INITIAL_LOAD = 15; // Increased for better initial experience
const LOAD_MORE = 12; // Increased for smoother scrolling
const PREFETCH_THRESHOLD = 3; // Start loading when 3 items from bottom

// ===== EFFECT CARD (Memoized) =====
interface EffectCardProps {
  preset: EffectPreset;
  onClick: () => void;
  priority?: boolean;
  quality?: 'low' | 'medium' | 'high';
  reducedMotion?: boolean;
}

const EffectCard = memo(function EffectCard({ 
  preset, 
  onClick, 
  priority = false,
  quality = 'medium',
  reducedMotion = false,
}: EffectCardProps) {
  const src = (preset.previewImage || '').trim();
  const posterSrc = (preset.posterUrl || '').trim();
  const isVideo = preset.contentType === 'video' || /\.(mp4|webm)(\?|#|$)/i.test(src);
  
  // Transition based on reduced motion
  const transitionDuration = reducedMotion ? 'duration-200' : 'duration-500';
  const hoverTransform = reducedMotion ? '' : 'group-hover:scale-105';
  
  // Dynamic aspect ratios for visual variety in masonry
  const getAspectClass = (ratio: string, isFeatured?: boolean) => {
    // Featured items get taller aspect ratio for emphasis
    if (isFeatured) return 'aspect-[3/4]';
    
    switch (ratio) {
      case '9:16': return 'aspect-[9/16]'; // Tall portrait
      case '3:4': return 'aspect-[3/4]';   // Portrait
      case '4:5': return 'aspect-[4/5]';   // Instagram portrait
      case '16:9': return 'aspect-video';  // Landscape
      case '4:3': return 'aspect-[4/3]';   // Classic
      case '2:3': return 'aspect-[2/3]';   // Photo portrait
      case '1:1': return 'aspect-square';  // Square
      default: return 'aspect-[3/4]';      // Default to nice portrait
    }
  };
  
  return (
    <div
      className={`group relative w-full overflow-hidden rounded-xl bg-[var(--surface)] 
                 border border-[var(--border)] break-inside-avoid mb-3
                 transition-all ${transitionDuration} ease-out
                 ${reducedMotion ? '' : 'hover:translate-y-[-2px]'}
                 hover:border-white/50
                 hover:shadow-[0_0_20px_rgba(214,179,106,0.08),inset_0_0_20px_rgba(214,179,106,0.03)]`}
    >
      {/* Image/Video with proper aspect ratio */}
      <div className={`relative w-full ${getAspectClass(preset.tileRatio, preset.featured)} overflow-hidden`}>
        {src ? (
          isVideo ? (
            <LazyVideo
              src={src}
              poster={posterSrc || undefined}
              className={`w-full h-full object-cover transition-transform ${transitionDuration} ${hoverTransform}`}
            />
          ) : (
            <OptimizedImage
              src={src}
              alt={preset.title}
              className={`transition-transform ${transitionDuration} ${hoverTransform}`}
              priority={priority}
              quality={quality}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )
        ) : (
          <div className="w-full h-full min-h-[220px] bg-[var(--surface2)] flex items-center justify-center">
            <div className="text-center px-6">
              <div className="text-sm font-semibold text-[var(--text)]">{preset.title}</div>
              <div className="text-xs text-[var(--muted)] mt-1">Нет превью</div>
            </div>
          </div>
        )}
        
        {/* Bottom gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        
        {/* Cost pill - top right */}
        {preset.costStars > 0 && (
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full 
                        bg-black/50 backdrop-blur-sm
                        text-[10px] font-semibold text-white
                        flex items-center gap-0.5"
          >
            ⭐{preset.costStars}
          </div>
        )}
        
        {/* Title & Repeat Button - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide truncate mb-2">
            {preset.title}
          </h3>
          <button
            onClick={onClick}
            className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-[var(--gold)] text-black font-semibold text-xs
                       hover:bg-[var(--gold)]/90 transition-all
                       flex items-center justify-center gap-1
                       opacity-0 group-hover:opacity-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Повторить
          </button>
        </div>
      </div>
    </div>
  );
});

// ===== FILTER CHIPS =====
interface FilterChipsProps {
  activeFilter: FilterChipId;
  onFilterChange: (id: FilterChipId) => void;
}

const FilterChips = memo(function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
      {FILTER_CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onFilterChange(chip.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${activeFilter === chip.id
              ? 'bg-white text-black'
              : 'bg-[var(--surface)] text-[var(--text2)] border border-[var(--border)] hover:border-white/50 hover:text-[var(--text)]'
            }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
});

// ===== MASONRY GRID =====
interface MasonryGridProps {
  presets: EffectPreset[];
  onCardClick: (preset: EffectPreset) => void;
  quality?: 'low' | 'medium' | 'high';
  reducedMotion?: boolean;
  isMobile?: boolean;
}

const MasonryGrid = memo(function MasonryGrid({ 
  presets, 
  onCardClick, 
  quality = 'medium',
  reducedMotion = false,
  isMobile = false,
}: MasonryGridProps) {
  // Order presets for balanced visual layout
  const orderedPresets = getOrderedPresetsForMasonry(presets);
  
  // Pattern for visual variety: tall, square, portrait, landscape...
  const aspectPattern = ['3:4', '1:1', '4:5', '16:9', '2:3', '1:1', '9:16', '4:3'];
  
  // Apply pattern to presets that don't have explicit tileRatio
  const presetsWithVariety = orderedPresets.map((preset, index) => {
    // If preset already has a specific ratio, keep it
    if (preset.tileRatio && preset.tileRatio !== '1:1') {
      return preset;
    }
    // Otherwise apply pattern for visual variety
    return {
      ...preset,
      tileRatio: aspectPattern[index % aspectPattern.length] as any,
    };
  });
  
  return (
    <div className={`columns-2 sm:columns-3 lg:columns-4 xl:columns-5 ${isMobile ? 'gap-2' : 'gap-3'}`}>
      {presetsWithVariety.map((preset, index) => (
        <EffectCard
          key={preset.presetId}
          preset={preset}
          onClick={() => onCardClick(preset)}
          priority={index < (isMobile ? 6 : 8)}
          quality={quality}
          reducedMotion={reducedMotion}
        />
      ))}
    </div>
  );
});

// ===== SKELETON LOADER =====
const SkeletonCard = memo(function SkeletonCard({ index = 0 }: { index?: number }) {
  // Matching aspect pattern for skeleton loading
  const aspects = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-video', 'aspect-[2/3]', 'aspect-square', 'aspect-[9/16]', 'aspect-[4/3]'];
  const aspectClass = aspects[index % aspects.length];
  
  return (
    <div className="break-inside-avoid mb-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <div className={`${aspectClass} bg-[var(--surface2)] animate-pulse`} />
    </div>
  );
});

const SkeletonGrid = memo(function SkeletonGrid() {
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
      {[...Array(12)].map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );
});

// ===== MAIN GALLERY COMPONENT =====
export function EffectsGallery() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterChipId>('all');
  const [allPresets, setAllPresets] = useState<EffectPreset[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<EffectPreset[] | null>(null);
  
  // Mobile optimization
  const { isMobile, imageQuality, reducedMotion } = useMobileOptimization();

  // Load content with caching
  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      // Use cached data if available
      if (cacheRef.current) {
        setAllPresets(cacheRef.current);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load content from effects_gallery with placement=home
        const res = await fetch('/api/content?placement=home&status=published&limit=100');
        if (!res.ok) {
          console.warn('[EffectsGallery] Failed to load content:', res.status);
          setAllPresets([]);
          return;
        }
        
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray((data as any)?.content) ? (data as any).content : 
                     Array.isArray((data as any)?.effects) ? (data as any).effects : [];
        
        if (cancelled) return;
        
        if (list.length) {
          const mapped: EffectPreset[] = list.map((row: any) => {
            const isVideo = row.content_type === 'video' || row.type === 'video';
            
            // For videos: prioritize animated preview (WebM) > poster > asset
            // For photos: use preview > asset
            let previewSrc = '';
            if (isVideo) {
              previewSrc = String(row.preview_url || row.poster_url || row.asset_url || '');
            } else {
              previewSrc = String(row.preview_url || row.preview_image || row.asset_url || '');
            }
            
            const preset: EffectPreset = {
              presetId: String(row.preset_id || row.presetId || row.id || ''),
              title: String(row.title || ''),
              contentType: (isVideo ? 'video' : 'photo') as any,
              modelKey: String(row.model_key || ''),
              tileRatio: (row.tile_ratio || row.aspect || '1:1') as any,
              costStars: Number(row.cost_stars ?? 0),
              mode: (row.mode || (isVideo ? 't2v' : 't2i')) as any,
              variantId: String(row.variant_id || 'default'),
              previewImage: previewSrc,
              posterUrl: isVideo ? String(row.poster_url || '') : undefined,
              templatePrompt: String(row.template_prompt || ''),
              featured: !!row.featured,
            };
            
            return preset;
          });
          
          // Cache the data
          cacheRef.current = mapped;
          setAllPresets(mapped);
        } else {
          setAllPresets([]);
        }
      } catch (e) {
        console.error('[EffectsGallery] Failed to load DB presets', e);
        setAllPresets([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(INITIAL_LOAD);
  }, [activeFilter]);

  const filteredPresets = (() => {
    if (activeFilter === 'all') return allPresets;
    const chip = FILTER_CHIPS.find((c) => c.id === activeFilter);
    if (!chip) return allPresets;
    if (chip.type === 'content') {
      return allPresets.filter((p) => p.contentType === activeFilter);
    }
    if (chip.type === 'model' && chip.modelKey) {
      return allPresets.filter((p) => p.modelKey === chip.modelKey);
    }
    return allPresets;
  })();
  
  // Only show displayCount items
  const visiblePresets = filteredPresets.slice(0, displayCount);
  const hasMore = filteredPresets.length > displayCount;
  
  // Optimized infinite scroll - load more when reaching bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore && hasMore) {
          setLoadingMore(true);
          
          // Use requestIdleCallback for non-blocking UI updates
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              setDisplayCount(prev => Math.min(prev + LOAD_MORE, filteredPresets.length));
              setLoadingMore(false);
            }, { timeout: 2000 });
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              setDisplayCount(prev => Math.min(prev + LOAD_MORE, filteredPresets.length));
              setLoadingMore(false);
            }, 50);
          }
        }
      },
      { 
        rootMargin: '300px', // Increased for better prefetching
        threshold: 0 
      }
    );
    
    const current = loadMoreRef.current;
    if (current) {
      observer.observe(current);
    }
    
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [loadingMore, hasMore, filteredPresets.length]);
  
  const handleCardClick = useCallback((preset: EffectPreset) => {
    router.push(buildPresetUrl(preset));
  }, [router]);

  const handleFilterChange = useCallback((id: FilterChipId) => {
    setActiveFilter(id);
  }, []);

  // Loading state
  if (loading) {
    return (
      <section className="pb-8">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 w-20 rounded-full bg-[var(--surface)] animate-pulse" />
              ))}
            </div>
          </div>
          <SkeletonGrid />
        </div>
      </section>
    );
  }

  return (
    <section className="pb-8">
      <div className="container mx-auto px-6">
        {/* Filter chips */}
        <div className="mb-8">
          <FilterChips 
            activeFilter={activeFilter} 
            onFilterChange={handleFilterChange} 
          />
        </div>

        {/* Masonry grid - Optimized for mobile */}
        {visiblePresets.length > 0 ? (
          <>
            <MasonryGrid 
              presets={visiblePresets} 
              onCardClick={handleCardClick}
              quality={imageQuality}
              reducedMotion={reducedMotion}
              isMobile={isMobile}
            />
            
            {/* Load more trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-lg mb-2">
              Галерея эффектов пуста
            </p>
            <p className="text-sm text-[var(--muted)]">
              Создайте контент в разделе <a href="/admin/styles" className="text-[var(--gold)] hover:underline">Стили</a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default EffectsGallery;
