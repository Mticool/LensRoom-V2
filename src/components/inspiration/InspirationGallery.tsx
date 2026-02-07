'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RefreshCw, Copy, Play } from 'lucide-react';
import { toast } from 'sonner';
import { OptimizedImage, LazyVideo } from '@/components/ui/OptimizedMedia';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { navigateWithFallback } from '@/lib/client/navigate';

function proxifyExternalMediaUrl(raw: string): string {
  const src = String(raw || '').trim();
  if (!src) return '';
  if (!src.startsWith('http://') && !src.startsWith('https://')) return src;
  try {
    const u = new URL(src);
    // tempfile.aiquickdraw.com can be blocked in Chromium via ORB when loaded cross-origin.
    if (u.hostname.toLowerCase() === 'tempfile.aiquickdraw.com') {
      return `/api/media/proxy?url=${encodeURIComponent(src)}`;
    }
  } catch {
    // ignore invalid URL
  }
  return src;
}

// ===== CONSTANTS =====
const INITIAL_LOAD = 15; // Increased for better initial experience
const LOAD_MORE = 12; // Increased for smoother scrolling
const PREFETCH_THRESHOLD = 3; // Start loading when 3 items from bottom

// ===== TYPES =====
interface ContentCard {
  id: string;
  preset_id: string;
  title: string;
  content_type: 'photo' | 'video';
  model_key: string;
  tile_ratio: '9:16' | '1:1' | '16:9';
  cost_stars: number;
  mode: string;
  preview_image: string;
  preview_url?: string;
  poster_url?: string;
  asset_url?: string;
  template_prompt: string;
  featured: boolean;
  category: string;
  priority: number;
  aspect: '9:16' | '1:1' | '16:9';
  short_description: string;
}

type FilterType = 'all' | 'photo' | 'video' | 'featured';

// ===== ASPECT RATIO HELPER =====
// Fixed aspect ratio to prevent jumping - all cards use consistent height
function getAspectClass(ratio: string): string {
  // Use consistent 3:4 aspect for all cards to prevent layout jumping
  return 'aspect-[3/4]';
}

// ===== CONTENT CARD COMPONENT (Memoized) =====
interface ContentCardProps {
  card: ContentCard;
  onRepeat: () => void;
  onCopyPrompt: () => void;
  priority?: boolean;
}

// Memoized component needs access to mobile optimization
const ContentCardComponent = memo(function ContentCardComponent({ 
  card, 
  onRepeat, 
  onCopyPrompt, 
  priority = false,
  isTouch = false,
  quality = 'medium',
  reducedMotion = false,
}: ContentCardProps & { isTouch?: boolean; quality?: 'low' | 'medium' | 'high'; reducedMotion?: boolean }) {
  const isVideo = card.content_type === 'video';
  
  // For videos: prioritize animated preview (WebM) > poster > asset
  // For photos: use preview > asset
  let src = '';
  if (isVideo) {
    src = (card.preview_url || card.poster_url || card.asset_url || card.preview_image || '').trim();
  } else {
    src = (card.preview_url || card.preview_image || card.asset_url || '').trim();
  }
  
  src = proxifyExternalMediaUrl(src);
  const posterSrc = isVideo ? proxifyExternalMediaUrl((card.poster_url || '').trim()) : '';
  
  // Transition duration based on reduced motion
  const transitionDuration = reducedMotion ? 'duration-200' : 'duration-500';
  const hoverTransform = reducedMotion ? '' : 'group-hover:scale-105';
  const actionsClass = isTouch ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';
  
  return (
    <div className="break-inside-avoid mb-3">
      <div
        onClick={onRepeat}
        role="button"
        tabIndex={0}
        className={`group relative w-full overflow-hidden rounded-xl bg-[var(--surface)] 
                   border border-[var(--border)]
                   transition-all ${transitionDuration} ease-out
                   ${reducedMotion ? '' : 'hover:translate-y-[-2px]'}
                   cursor-pointer
                   hover:border-white/50
                   hover:shadow-[0_0_20px_rgba(214,179,106,0.08),inset_0_0_20px_rgba(214,179,106,0.03)]`}
      >
        {/* Image with aspect ratio */}
        <div className={`relative w-full ${getAspectClass(card.aspect || card.tile_ratio)} overflow-hidden`}>
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
                alt={card.title}
                className={`transition-transform ${transitionDuration} ${hoverTransform}`}
                priority={priority}
                quality={quality}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            )
          ) : (
            <div className="w-full h-full min-h-[220px] bg-[var(--surface2)] flex items-center justify-center">
              <div className="text-center px-6">
                <div className="text-sm font-semibold text-[var(--text)]">{card.title}</div>
                <div className="text-xs text-[var(--muted)] mt-1">Нет превью</div>
              </div>
            </div>
          )}
          
          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
          
          {/* Cost pill - top right */}
          {card.cost_stars > 0 && (
            <div
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full 
                          bg-black/50 backdrop-blur-sm
                          text-[10px] font-semibold text-white
                          flex items-center gap-0.5"
            >
              ⭐{card.cost_stars}
            </div>
          )}
          
          {/* Title & Buttons - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wide truncate flex-1">
                {card.title}
              </h3>
              <span className="text-[10px] text-white/60 ml-2 shrink-0">
                {card.model_key}
              </span>
            </div>
            <div className={`flex gap-2 transition-opacity ${actionsClass}`}>
              <button
                onClick={(e) => { e.stopPropagation(); onCopyPrompt(); }}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-white/10 backdrop-blur-sm text-white font-medium text-xs
                           hover:bg-white/20 transition-all
                           flex items-center justify-center gap-1 border border-white/20"
              >
                <Copy className="w-3 h-3" />
                Промпт
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRepeat(); }}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-[var(--gold)] text-black font-semibold text-xs
                           hover:bg-[var(--gold)]/90 transition-all
                           flex items-center justify-center gap-1"
              >
                <Play className="w-3 h-3" />
                Создать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ===== FILTER CHIPS =====
const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'featured', label: 'Featured' },
  { id: 'photo', label: 'Фото' },
  { id: 'video', label: 'Видео' },
];

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterChips = memo(function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onFilterChange(option.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${activeFilter === option.id
              ? 'bg-white text-black'
              : 'bg-[var(--surface)] text-[var(--text2)] border border-[var(--border)] hover:border-white/50 hover:text-[var(--text)]'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
});

// ===== SKELETON LOADER =====
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="break-inside-avoid mb-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
      <div className="aspect-[4/5] bg-[var(--surface2)] animate-pulse" />
    </div>
  );
});

const SkeletonGrid = memo(function SkeletonGrid() {
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
      {[...Array(10)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
});

// ===== MAIN GALLERY =====
export function InspirationGallery() {
  const router = useRouter();
  const [allContent, setAllContent] = useState<ContentCard[]>([]);
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<ContentCard[] | null>(null);
  
  // Mobile optimization
  const { isMobile, isTouch, imageQuality, itemsPerPage, reducedMotion } = useMobileOptimization();

  // Load content from API with caching
  useEffect(() => {
    async function loadContent() {
      // Use cached data if available
      if (cacheRef.current) {
        setAllContent(cacheRef.current);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch('/api/content?placement=inspiration&status=published&limit=100');
        if (!res.ok) throw new Error('Failed to load content');
        const data = await res.json();
        const effects = Array.isArray(data?.effects) ? data.effects : [];

        const mapped: ContentCard[] = effects.map((s: any) => ({
          id: String(s.id),
          preset_id: String(s.preset_id || s.id),
          title: String(s.title || ''),
          content_type: s.content_type || 'photo',
          model_key: String(s.model_key || 'nano-banana-pro'),
          tile_ratio: s.tile_ratio || '1:1',
          cost_stars: Number(s.cost_stars || 0),
          mode: s.mode || 't2i',
          preview_image: String(s.preview_image || ''),
          preview_url: String(s.preview_url || s.preview_image || ''),
          poster_url: String(s.poster_url || ''),
          asset_url: String(s.asset_url || ''),
          template_prompt: String(s.template_prompt || ''),
          featured: !!s.featured,
          category: String(s.category || ''),
          priority: Number(s.priority ?? 0),
          aspect: s.aspect || s.tile_ratio || '1:1',
          short_description: String(s.short_description || ''),
        }));

        // Cache the data
        cacheRef.current = mapped;
        setAllContent(mapped);
      } catch (error) {
        console.error('Failed to load inspiration content:', error);
        toast.error('Не удалось загрузить контент');
      } finally {
        setLoading(false);
      }
    }
    
    loadContent();
  }, []);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(INITIAL_LOAD);
  }, [activeFilter]);

  // Filter content
  const filteredContent = allContent.filter(card => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'featured') return card.featured;
    if (activeFilter === 'photo') return card.content_type === 'photo';
    if (activeFilter === 'video') return card.content_type === 'video';
    return true;
  });

  // Only show displayCount items
  const visibleContent = filteredContent.slice(0, displayCount);
  const hasMore = filteredContent.length > displayCount;

  // Optimized infinite scroll - load more when reaching bottom
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore && hasMore) {
          setLoadingMore(true);
          
          // Use requestIdleCallback for non-blocking UI updates
          const ric = (window as any).requestIdleCallback;
          if (typeof ric === 'function') {
            ric(() => {
              setDisplayCount(prev => Math.min(prev + LOAD_MORE, filteredContent.length));
              setLoadingMore(false);
            }, { timeout: 2000 });
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
              setDisplayCount(prev => Math.min(prev + LOAD_MORE, filteredContent.length));
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
  }, [loadingMore, hasMore, filteredContent.length]);

  // Handle copy prompt
  const handleCopyPrompt = useCallback(async (card: ContentCard) => {
    try {
      await navigator.clipboard.writeText(card.template_prompt);
      toast.success('Промпт скопирован!', {
        description: card.template_prompt.slice(0, 50) + '...',
      });
    } catch (e) {
      toast.error('Не удалось скопировать');
    }
  }, []);

  // Handle repeat - redirect to generator with correct model and prompt
  const handleRepeat = useCallback((card: ContentCard) => {
    // Map content_type to section
    const section = card.content_type === 'video' ? 'video' : 'photo';

    // Store prompt in localStorage to be picked up by generator
    if (card.template_prompt) {
      localStorage.setItem('lensroom_prefill_prompt', card.template_prompt);
      localStorage.setItem('lensroom_prefill_model', card.model_key);
    }

    const params = new URLSearchParams();
    params.set('section', section);
    params.set('model', card.model_key);
    navigateWithFallback(router, `/create/studio?${params.toString()}`);

    toast.success('Открываем генератор', {
      description: `${card.model_key} • Промпт применён`,
    });
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-20 rounded-full bg-[var(--surface)] animate-pulse" />
          ))}
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  // Empty state
  if (allContent.length === 0) {
    return (
      <div className="text-center py-20">
        <Sparkles className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
        <p className="text-[var(--muted)] mb-4">Нет контента для вдохновения</p>
        <p className="text-sm text-[var(--muted)]">
          Создайте контент в разделе Стили (/admin/styles)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <FilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
        <span>Всего: {filteredContent.length}</span>
        <span>•</span>
        <span>Featured: {allContent.filter(c => c.featured).length}</span>
      </div>

      {/* Masonry Grid - Optimized for mobile */}
      <div className={`columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 ${isMobile ? 'gap-2' : 'gap-3'}`}>
        {visibleContent.map((card, index) => (
          <ContentCardComponent
            key={card.id}
            card={card}
            onRepeat={() => handleRepeat(card)}
            onCopyPrompt={() => handleCopyPrompt(card)}
            priority={index < (isMobile ? 6 : 8)}
            isTouch={isTouch}
            quality={imageQuality}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
