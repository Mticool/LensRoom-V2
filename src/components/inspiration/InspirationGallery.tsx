'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { OptimizedImage, LazyVideo } from '@/components/ui/OptimizedMedia';

// ===== CONSTANTS =====
const INITIAL_LOAD = 12;
const LOAD_MORE = 9;

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
function getAspectClass(ratio: string): string {
  switch (ratio) {
    case '9:16':
      return 'aspect-[9/16]';
    case '16:9':
      return 'aspect-video';
    case '1:1':
    default:
      return 'aspect-square';
  }
}

// ===== CONTENT CARD COMPONENT (Memoized) =====
interface ContentCardProps {
  card: ContentCard;
  onRepeat: () => void;
  priority?: boolean;
}

const ContentCardComponent = memo(function ContentCardComponent({ card, onRepeat, priority = false }: ContentCardProps) {
  const isVideo = card.content_type === 'video';
  
  // For videos: prioritize animated preview (WebM) > poster > asset
  // For photos: use preview > asset
  let src = '';
  if (isVideo) {
    src = (card.preview_url || card.poster_url || card.asset_url || card.preview_image || '').trim();
  } else {
    src = (card.preview_url || card.preview_image || card.asset_url || '').trim();
  }
  
  const posterSrc = isVideo ? (card.poster_url || '').trim() : '';
  
  return (
    <div className="break-inside-avoid mb-3">
      <div
        className="group relative w-full overflow-hidden rounded-xl bg-[var(--surface)] 
                   border border-[var(--border)]
                   transition-all duration-300 ease-out
                   hover:translate-y-[-2px]
                   hover:border-white/50
                   hover:shadow-[0_0_20px_rgba(214,179,106,0.08),inset_0_0_20px_rgba(214,179,106,0.03)]"
      >
        {/* Image with aspect ratio */}
        <div className={`relative w-full ${getAspectClass(card.aspect || card.tile_ratio)} overflow-hidden`}>
          {src ? (
            isVideo ? (
              <LazyVideo
                src={src}
                poster={posterSrc || undefined}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <OptimizedImage
                src={src}
                alt={card.title}
                className="transition-transform duration-500 group-hover:scale-105"
                priority={priority}
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
          
          {/* Title & Repeat Button - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wide truncate mb-2">
              {card.title}
            </h3>
            <button
              onClick={onRepeat}
              className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg bg-[var(--gold)] text-black font-semibold text-xs
                         hover:bg-[var(--gold)]/90 transition-all
                         flex items-center justify-center gap-1
                         opacity-0 group-hover:opacity-100"
            >
              <RefreshCw className="w-3 h-3" />
              Повторить
            </button>
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

  // Infinite scroll - load more when reaching bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore) {
          setLoadingMore(true);
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              setDisplayCount(prev => prev + LOAD_MORE);
              setLoadingMore(false);
            });
          } else {
            setTimeout(() => {
              setDisplayCount(prev => prev + LOAD_MORE);
              setLoadingMore(false);
            }, 100);
          }
        }
      },
      { rootMargin: '200px' }
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
  }, [loadingMore]);

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

  // Handle repeat - redirect to generator with pre-filled prompt
  const handleRepeat = useCallback((card: ContentCard) => {
    const params = new URLSearchParams();
    params.set('kind', card.content_type);
    params.set('model', card.model_key);
    params.set('mode', card.mode);
    if (card.template_prompt) {
      params.set('prompt', card.template_prompt);
    }
    
    router.push(`/create/studio?${params.toString()}`);
    toast.success('Открываем генератор', {
      description: 'Промпт уже вставлен — нажмите "Создать"',
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

      {/* Masonry Grid */}
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
        {visibleContent.map((card, index) => (
          <ContentCardComponent
            key={card.id}
            card={card}
            onRepeat={() => handleRepeat(card)}
            priority={index < 8}
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
