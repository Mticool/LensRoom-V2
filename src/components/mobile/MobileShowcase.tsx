'use client';

import { ModelCard } from './ModelCard';
import { HorizontalScroll } from './HorizontalScroll';
import { BottomTabBar } from './BottomTabBar';
import { PHOTO_MODELS, VIDEO_MODELS } from '@/config/models';
import { Search, Star, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';

export function MobileShowcase() {
  const [searchQuery, setSearchQuery] = useState('');
  const { credits } = useAuth();

  // Фильтрация моделей
  const featuredModels = [
    ...PHOTO_MODELS.filter(m => m.featured),
    ...VIDEO_MODELS.filter(m => m.featured),
  ]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6);

  const photoModels = PHOTO_MODELS.filter(m => 
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ).sort((a, b) => a.rank - b.rank);

  const videoModels = VIDEO_MODELS.filter(m =>
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  ).sort((a, b) => a.rank - b.rank);

  const toolModels = [
    ...PHOTO_MODELS.filter(m => 
      m.id === 'topaz-image-upscale' || 
      m.id === 'recraft-remove-background'
    ),
    ...VIDEO_MODELS.filter(m => 
      m.id === 'kling-ai-avatar' || 
      m.id === 'kling-motion-control'
    ),
  ].filter(m => 
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <div className="min-h-screen bg-[#0F0F10] pb-20">
      {/* Шапка */}
      <div className="sticky top-0 z-40 bg-[#0F0F10]/95 backdrop-blur-xl border-b border-[#27272A]">
        <div className="px-4 pt-3 pb-3">
          {/* Лого и баланс */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00D9FF]" />
              <h1 className="text-lg font-bold text-white">LensRoom</h1>
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#27272A]">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-sm font-semibold text-white">
                {credits.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              placeholder="Поиск моделей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full h-10 pl-10 pr-4 rounded-xl
                bg-[#18181B] border border-[#27272A]
                text-white placeholder:text-[#71717A]
                focus:outline-none focus:border-[#00D9FF]
                transition-colors
              "
            />
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="pt-4">
        {!searchQuery && (
          <>
            {/* Популярное */}
            <HorizontalScroll
              title="Популярное"
              icon="🔥"
            >
              {featuredModels.map((model) => (
                <ModelCard key={model.id} model={model} variant="large" />
              ))}
            </HorizontalScroll>
          </>
        )}

        {/* Фото модели */}
        {photoModels.length > 0 && (
          <HorizontalScroll
            title="Фото модели"
            icon="📸"
          >
            {photoModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </HorizontalScroll>
        )}

        {/* Видео модели */}
        {videoModels.length > 0 && (
          <HorizontalScroll
            title="Видео модели"
            icon="🎬"
          >
            {videoModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </HorizontalScroll>
        )}

        {/* Инструменты */}
        {!searchQuery && toolModels.length > 0 && (
          <HorizontalScroll
            title="Инструменты"
            icon="🛠️"
          >
            {toolModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </HorizontalScroll>
        )}

        {/* Пустое состояние */}
        {searchQuery && photoModels.length === 0 && videoModels.length === 0 && toolModels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Ничего не найдено
            </h3>
            <p className="text-sm text-[#71717A] text-center">
              Попробуйте изменить поисковый запрос
            </p>
          </div>
        )}
      </div>

      {/* Нижний таббар */}
      <BottomTabBar />
    </div>
  );
}
