'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  template_prompt: string;
  featured: boolean;
  category: string;
  priority: number;
  aspect: '9:16' | '1:1' | '16:9';
  short_description: string;
}

type FilterType = 'all' | 'photo' | 'video' | 'featured';

// ===== ANIMATIONS =====
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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

// ===== CONTENT CARD COMPONENT =====
interface ContentCardProps {
  card: ContentCard;
  onClick: () => void;
}

function ContentCardComponent({ card, onClick }: ContentCardProps) {
  return (
    <motion.div variants={item} className="break-inside-avoid mb-4">
      <button
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] 
                   border border-[var(--border)]
                   transition-all duration-300 ease-out
                   hover:translate-y-[-2px]
                   hover:border-white/50
                   hover:shadow-[0_0_20px_rgba(214,179,106,0.08),inset_0_0_20px_rgba(214,179,106,0.03)]
                   focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)]
                   text-left w-full"
      >
        {/* Image with aspect ratio */}
        <div className={`relative w-full ${getAspectClass(card.aspect || card.tile_ratio)} overflow-hidden`}>
          <img
            src={card.preview_url || card.preview_image}
            alt={card.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Cost pill - top right */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full 
                          bg-black/50 backdrop-blur-sm
                          text-[11px] font-semibold text-white
                          flex items-center gap-1">
            ⭐{card.cost_stars}
          </div>
          
          {/* Title - bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">
              {card.title}
            </h3>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

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

function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
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
}

// ===== MAIN GALLERY =====
export function InspirationGallery() {
  const router = useRouter();
  const [content, setContent] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Load content from API
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      try {
        const res = await fetch('/api/content?placement=inspiration&limit=100');
        if (!res.ok) throw new Error('Failed to load content');
        
        const data = await res.json();
        setContent(data.content || []);
      } catch (error) {
        console.error('Failed to load inspiration content:', error);
        toast.error('Не удалось загрузить контент');
      } finally {
        setLoading(false);
      }
    }
    
    loadContent();
  }, []);

  // Filter content
  const filteredContent = content.filter(card => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'featured') return card.featured;
    if (activeFilter === 'photo') return card.content_type === 'photo';
    if (activeFilter === 'video') return card.content_type === 'video';
    return true;
  });

  // Handle card click - redirect to generator with pre-filled prompt
  const handleCardClick = (card: ContentCard) => {
    const params = new URLSearchParams();
    params.set('kind', card.content_type);
    params.set('model', card.model_key);
    params.set('mode', card.mode);
    if (card.template_prompt) {
      params.set('prompt', card.template_prompt);
    }
    
    router.push(`/create/studio?${params.toString()}`);
    toast.success('Открываем генератор', {
      description: card.template_prompt ? 'Промпт уже вставлен' : undefined,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  // Empty state
  if (content.length === 0) {
    return (
      <div className="text-center py-20">
        <Sparkles className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
        <p className="text-[var(--muted)] mb-4">Нет контента для вдохновения</p>
        <p className="text-sm text-[var(--muted)]">
          Администратор еще не добавил карточки в раздел Inspiration
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
        <span>Featured: {content.filter(c => c.featured).length}</span>
      </div>

      {/* Masonry Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="columns-1 md:columns-2 lg:columns-3 gap-4"
      >
        {filteredContent.map((card) => (
          <ContentCardComponent
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card)}
          />
        ))}
      </motion.div>
    </div>
  );
}
