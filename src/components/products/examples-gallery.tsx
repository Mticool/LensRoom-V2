'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Example {
  id: string;
  category: string;
  before: string;
  after: string;
  scene: string;
  description: string;
}

const EXAMPLES: Example[] = [
  {
    id: '1',
    category: 'Одежда',
    before: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
    after: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
    scene: 'Белая студия',
    description: 'Футболка на чистом фоне',
  },
  {
    id: '2',
    category: 'Электроника',
    before: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400',
    after: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    scene: 'Градиентный фон',
    description: 'Наушники в современном стиле',
  },
  {
    id: '3',
    category: 'Косметика',
    before: 'https://images.unsplash.com/photo-1526045478516-99145907023c?w=400',
    after: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    scene: 'Flat Lay',
    description: 'Косметика в красивой композиции',
  },
  {
    id: '4',
    category: 'Обувь',
    before: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    after: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400',
    scene: 'Lifestyle',
    description: 'Кроссовки в интерьере',
  },
  {
    id: '5',
    category: 'Аксессуары',
    before: 'https://images.unsplash.com/photo-1509941943102-10c232535736?w=400',
    after: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400',
    scene: 'Премиум',
    description: 'Часы на элегантном фоне',
  },
];

export function ExamplesGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBefore, setShowBefore] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const current = EXAMPLES[currentIndex];

  const next = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((i) => (i + 1) % EXAMPLES.length);
    setShowBefore(false);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const prev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((i) => (i - 1 + EXAMPLES.length) % EXAMPLES.length);
    setShowBefore(false);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c8ff00]" />
          Примеры результатов
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prev}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                     text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                     text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image with Before/After */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="aspect-square relative">
          {/* Image */}
          <div className={cn(
            "absolute inset-0 transition-opacity duration-300",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}>
            <Image
              src={showBefore ? current.before : current.after}
              alt={current.description}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* Before/After Toggle */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowBefore(false)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                !showBefore
                  ? 'bg-[#c8ff00] text-black shadow-lg'
                  : 'bg-black/50 text-white backdrop-blur-sm hover:bg-black/70'
              )}
            >
              После
            </button>
            <button
              type="button"
              onClick={() => setShowBefore(true)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                showBefore
                  ? 'bg-[#c8ff00] text-black shadow-lg'
                  : 'bg-black/50 text-white backdrop-blur-sm hover:bg-black/70'
              )}
            >
              До
            </button>
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-[10px] font-medium text-white">
              {current.category}
            </span>
          </div>

          {/* Scene Badge */}
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-[#c8ff00]/20 backdrop-blur-sm rounded-lg text-[10px] font-medium text-[#c8ff00]">
              {current.scene}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-white/[0.02] border-t border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white mb-0.5">
                {current.description}
              </p>
              <p className="text-xs text-white/40">
                Сцена: {current.scene}
              </p>
            </div>
            <button 
              type="button"
              className="text-[#c8ff00] hover:text-[#c8ff00]/80 transition-colors p-1"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-5 gap-1.5">
        {EXAMPLES.map((example, i) => (
          <button
            key={example.id}
            type="button"
            onClick={() => {
              if (isTransitioning) return;
              setIsTransitioning(true);
              setCurrentIndex(i);
              setShowBefore(false);
              setTimeout(() => setIsTransitioning(false), 300);
            }}
            className={cn(
              "aspect-square rounded-lg overflow-hidden border-2 transition-all",
              i === currentIndex
                ? 'border-[#c8ff00] scale-105'
                : 'border-transparent hover:border-white/20 opacity-60 hover:opacity-100'
            )}
          >
            <Image
              src={example.after}
              alt={example.description}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Counter */}
      <div className="text-center text-xs text-white/30">
        {currentIndex + 1} / {EXAMPLES.length}
      </div>
    </div>
  );
}

