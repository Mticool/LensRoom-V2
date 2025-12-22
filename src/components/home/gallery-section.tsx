'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  likes: number;
  views: number;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/seed/lensroom1/800/600',
    prompt: 'Футуристический город на закате с неоновыми огнями',
    model: 'FLUX.2',
    likes: 234,
    views: 1520,
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/seed/lensroom2/600/800',
    prompt: 'Портрет девушки в стиле киберпанк',
    model: 'Midjourney',
    likes: 189,
    views: 980,
  },
  {
    id: '3',
    imageUrl: 'https://picsum.photos/seed/lensroom3/800/800',
    prompt: 'Абстрактное искусство с яркими красками',
    model: 'Seedream 4.5',
    likes: 312,
    views: 2100,
  },
  {
    id: '4',
    imageUrl: 'https://picsum.photos/seed/lensroom4/700/900',
    prompt: 'Фэнтезийный пейзаж с драконами',
    model: 'Nano Banana Pro',
    likes: 456,
    views: 3200,
  },
  {
    id: '5',
    imageUrl: 'https://picsum.photos/seed/lensroom5/900/600',
    prompt: 'Минималистичная архитектурная фотография',
    model: 'FLUX.2',
    likes: 178,
    views: 890,
  },
  {
    id: '6',
    imageUrl: 'https://picsum.photos/seed/lensroom6/600/900',
    prompt: 'Аниме персонаж в японском стиле',
    model: 'Midjourney',
    likes: 523,
    views: 4500,
  },
  {
    id: '7',
    imageUrl: 'https://picsum.photos/seed/lensroom7/800/600',
    prompt: 'Космический корабль в глубоком космосе',
    model: 'Seedream 4.5',
    likes: 298,
    views: 1800,
  },
  {
    id: '8',
    imageUrl: 'https://picsum.photos/seed/lensroom8/700/800',
    prompt: 'Уютный интерьер в скандинавском стиле',
    model: 'Imagen 4',
    likes: 412,
    views: 2400,
  },
];

export function GallerySection() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPosition += scrollSpeed;
      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0;
      }
      container.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    // Start animation after a delay
    const timer = setTimeout(() => {
      animationId = requestAnimationFrame(animate);
    }, 2000);

    // Pause on hover
    const handleMouseEnter = () => cancelAnimationFrame(animationId);
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(animate);
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timer);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Duplicate items for infinite scroll effect
  const displayItems = [...GALLERY_ITEMS, ...GALLERY_ITEMS];

  return (
    <section className="py-16 border-t border-[var(--border)] overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text)] mb-2">
              Галерея работ
            </h2>
            <p className="text-[var(--muted)]">
              Примеры генераций от нашего сообщества
            </p>
          </div>
          <Link 
            href="/inspiration"
            className="text-[var(--gold)] hover:text-[var(--gold-hover)] hover:underline flex items-center gap-2 text-sm font-medium transition-colors"
          >
            Смотреть все
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scrolling Gallery */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden px-4 pb-4"
        style={{ scrollBehavior: 'auto' }}
      >
        {displayItems.map((item, index) => (
          <motion.div
            key={`${item.id}-${index}`}
            className="flex-shrink-0 relative group cursor-pointer"
            onMouseEnter={() => setHoveredId(`${item.id}-${index}`)}
            onMouseLeave={() => setHoveredId(null)}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="/create">
              <div className="relative w-64 h-80 rounded-2xl overflow-hidden bg-[var(--surface2)]">
                {/* Image */}
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content on Hover */}
                <div className={`absolute inset-0 p-4 flex flex-col justify-end transition-opacity duration-300 ${
                  hoveredId === `${item.id}-${index}` ? 'opacity-100' : 'opacity-0'
                }`}>
                  <p className="text-white text-sm line-clamp-2 mb-2">
                    {item.prompt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                      {item.model}
                    </span>
                    <div className="flex items-center gap-3 text-white/60 text-xs">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {item.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.views}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Model Badge (always visible) */}
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] px-2 py-1 bg-black/50 backdrop-blur-sm text-white/80 rounded-full border border-white/10">
                    {item.model}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}




