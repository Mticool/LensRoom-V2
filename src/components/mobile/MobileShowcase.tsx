'use client';

import { ModelCard } from './ModelCard';
import { ModelCardSkeleton } from './ModelCardSkeleton';
import { OfflineBanner } from './OfflineBanner';
import { HorizontalScroll } from './HorizontalScroll';
import { BottomTabBar } from './BottomTabBar';
import { PHOTO_MODELS, VIDEO_MODELS } from '@/config/models';
import { Search, Star, Sparkles, Zap, Play, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useHaptic } from '@/lib/hooks/useHaptic';

export function MobileShowcase() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { credits, isAuthenticated } = useAuth();
  const isOnline = useOnlineStatus();
  const { light } = useHaptic();

  // Simulate initial loading (models are static, but auth might be loading)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
      m.id === 'kling-ai-avatar-standard' ||
      m.id === 'kling-ai-avatar-pro' ||
      m.id === 'kling-motion-control'
    ),
  ].filter(m =>
    searchQuery ? m.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // Quick actions
  const quickActions = [
    {
      id: 'create-image',
      title: 'Создать фото',
      icon: ImageIcon,
      color: 'from-[#8cf425] to-[#6bc41a]',
      path: '/create/studio?section=photo',
    },
    {
      id: 'create-video',
      title: 'Создать видео',
      icon: Play,
      color: 'from-blue-500 to-indigo-500',
      path: '/create/studio?section=video',
    },
    {
      id: 'library',
      title: 'Моя библиотека',
      icon: Star,
      color: 'from-purple-500 to-pink-500',
      path: '/library',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} />

      {/* Шапка */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)]">
        <div className="px-4 pt-safe pb-3">
          {/* Лого и баланс */}
          <div className="flex items-center justify-between mb-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#8cf425]/15 border border-[#8cf425]/25 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#8cf425]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">LensRoom</h1>
                <p className="text-[10px] text-white/40">AI Creative Studio</p>
              </div>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8cf425]/10 border border-[#8cf425]/20">
                <Star className="w-3.5 h-3.5 text-[#8cf425]" />
                <span className="text-sm font-semibold text-white">
                  {credits.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Поиск AI моделей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full h-11 pl-10 pr-4 rounded-xl
                bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]
                text-white placeholder:text-white/40
                focus:outline-none focus:border-[#8cf425]
                transition-colors text-sm
              "
            />
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="pt-4">
        {!searchQuery && (
          <>
            {/* Quick Actions */}
            <div className="px-4 mb-6">
              <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wide">
                Быстрый старт
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      light();
                      router.push(action.path);
                    }}
                    className="group relative overflow-hidden rounded-2xl p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] active:scale-95 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-medium text-white text-left">
                      {action.title}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Популярное */}
            <HorizontalScroll
              title="Популярное"
              icon="🔥"
            >
              {isLoading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <ModelCardSkeleton key={i} variant="large" />
                  ))}
                </>
              ) : (
                featuredModels.map((model) => (
                  <ModelCard key={model.id} model={model} variant="large" />
                ))
              )}
            </HorizontalScroll>
          </>
        )}

        {/* Фото модели */}
        {(isLoading || photoModels.length > 0) && (
          <HorizontalScroll
            title="Фото генераторы"
            icon="📸"
          >
            {isLoading ? (
              <>
                {[...Array(8)].map((_, i) => (
                  <ModelCardSkeleton key={i} variant="compact" />
                ))}
              </>
            ) : (
              photoModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))
            )}
          </HorizontalScroll>
        )}

        {/* Видео модели */}
        {(isLoading || videoModels.length > 0) && (
          <HorizontalScroll
            title="Видео генераторы"
            icon="🎬"
          >
            {isLoading ? (
              <>
                {[...Array(6)].map((_, i) => (
                  <ModelCardSkeleton key={i} variant="compact" />
                ))}
              </>
            ) : (
              videoModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))
            )}
          </HorizontalScroll>
        )}

        {/* Инструменты */}
        {!searchQuery && (isLoading || toolModels.length > 0) && (
          <HorizontalScroll
            title="Инструменты"
            icon="🛠️"
          >
            {isLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <ModelCardSkeleton key={i} variant="compact" />
                ))}
              </>
            ) : (
              toolModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))
            )}
          </HorizontalScroll>
        )}

        {/* Пустое состояние */}
        {searchQuery && photoModels.length === 0 && videoModels.length === 0 && toolModels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Ничего не найдено
            </h3>
            <p className="text-sm text-white/40 text-center">
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
