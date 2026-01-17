'use client';

/**
 * Пример использования улучшенных мобильных компонентов
 * Вдохновлен интерфейсом Higgsfield AI
 */

import { useState } from 'react';
import { MobileButton } from '@/components/ui/mobile-button';
import { FloatingActionMenu } from '@/components/ui/floating-action-menu';
import { SwipeableTabs, SegmentedControl } from '@/components/ui/swipeable-tabs';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import {
  Sparkles,
  Image,
  Video,
  Settings,
  Heart,
  Share2,
  Download,
  Wand2,
  Zap,
  Palette
} from 'lucide-react';

export function MobileUIExample() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('photo');

  // Пример вкладок со свайп-навигацией
  const tabs = [
    {
      id: 'photo',
      label: 'Фото',
      icon: <Image className="w-4 h-4" />,
      content: (
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Создание фото</h2>
          <p className="text-[var(--muted)]">
            Генерируйте фотореалистичные изображения с помощью AI
          </p>

          <div className="space-y-3 mt-6">
            <MobileButton variant="primary" size="lg" fullWidth>
              <Sparkles className="w-5 h-5" />
              Создать изображение
            </MobileButton>
            <MobileButton variant="secondary" size="lg" fullWidth>
              <Palette className="w-5 h-5" />
              Выбрать стиль
            </MobileButton>
          </div>
        </div>
      ),
    },
    {
      id: 'video',
      label: 'Видео',
      icon: <Video className="w-4 h-4" />,
      content: (
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Создание видео</h2>
          <p className="text-[var(--muted)]">
            Превратите текст или изображение в видео
          </p>

          <div className="space-y-3 mt-6">
            <MobileButton variant="primary" size="lg" fullWidth>
              <Video className="w-5 h-5" />
              Создать видео
            </MobileButton>
            <MobileButton variant="secondary" size="lg" fullWidth>
              <Wand2 className="w-5 h-5" />
              Анимировать фото
            </MobileButton>
          </div>
        </div>
      ),
    },
    {
      id: 'settings',
      label: 'Настройки',
      icon: <Settings className="w-4 h-4" />,
      content: (
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Настройки</h2>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span>Качество</span>
              <span className="text-[var(--muted)]">HD</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <span>Язык</span>
              <span className="text-[var(--muted)]">Русский</span>
            </div>
            <MobileButton
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setSheetOpen(true)}
            >
              Открыть Bottom Sheet
            </MobileButton>
          </div>
        </div>
      ),
    },
  ];

  // Действия для FAB меню
  const fabActions = [
    {
      icon: <Sparkles className="w-5 h-5" />,
      label: 'Создать',
      onClick: () => console.log('Generate'),
      color: 'bg-white text-black',
    },
    {
      icon: <Image className="w-5 h-5" />,
      label: 'Галерея',
      onClick: () => console.log('Gallery'),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
    {
      icon: <Heart className="w-5 h-5" />,
      label: 'Избранное',
      onClick: () => console.log('Favorites'),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Настройки',
      onClick: () => setSheetOpen(true),
      color: 'bg-[var(--surface)] text-[var(--text)]',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Верхняя панель с Segmented Control */}
      <div className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="p-4">
          <SegmentedControl
            segments={[
              { id: 'photo', label: 'Фото', icon: <Image className="w-4 h-4" /> },
              { id: 'video', label: 'Видео', icon: <Video className="w-4 h-4" /> },
              { id: 'settings', label: 'Еще', icon: <Settings className="w-4 h-4" /> },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      {/* Основной контент со свайп-навигацией */}
      <SwipeableTabs
        tabs={tabs}
        defaultTab={activeTab}
        onTabChange={setActiveTab}
        className="h-[calc(100vh-140px)]"
      />

      {/* Плавающее меню действий */}
      <FloatingActionMenu
        actions={fabActions}
        position="bottom-right"
      />

      {/* Bottom Sheet для настроек */}
      <MobileBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Настройки генерации"
        snapPoints={[40, 70, 95]}
        defaultSnap={1}
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Качество</h4>
            <SegmentedControl
              segments={[
                { id: 'sd', label: 'SD' },
                { id: 'hd', label: 'HD' },
                { id: '4k', label: '4K' },
              ]}
              value="hd"
              onChange={(v) => console.log('Quality:', v)}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Соотношение сторон</h4>
            <div className="grid grid-cols-3 gap-2">
              {['1:1', '16:9', '9:16'].map((ratio) => (
                <MobileButton
                  key={ratio}
                  variant="outline"
                  size="md"
                  onClick={() => console.log('Aspect:', ratio)}
                >
                  {ratio}
                </MobileButton>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Стиль</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Реализм', 'Аниме', 'Арт', '3D'].map((style) => (
                <MobileButton
                  key={style}
                  variant="secondary"
                  size="md"
                  onClick={() => console.log('Style:', style)}
                >
                  {style}
                </MobileButton>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)]">
            <MobileButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                console.log('Apply settings');
                setSheetOpen(false);
              }}
            >
              <Zap className="w-5 h-5" />
              Применить настройки
            </MobileButton>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Демо: фиксированная нижняя панель с кнопками-иконками */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-[var(--bg)]/95 backdrop-blur-xl border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <MobileButton
              variant="icon"
              size="icon"
              onClick={() => console.log('Like')}
            >
              <Heart className="w-5 h-5" />
            </MobileButton>
            <MobileButton
              variant="icon"
              size="icon"
              onClick={() => console.log('Share')}
            >
              <Share2 className="w-5 h-5" />
            </MobileButton>
            <MobileButton
              variant="icon"
              size="icon"
              onClick={() => console.log('Download')}
            >
              <Download className="w-5 h-5" />
            </MobileButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileUIExample;
