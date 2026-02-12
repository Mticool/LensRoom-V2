'use client';

import { memo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface MotionModelOption {
  id: string;
  name: string;
  provider: string;
  subtitle: string;
  price: string;
}

const MOTION_MODELS: MotionModelOption[] = [
  {
    id: 'kling-motion-control',
    name: 'Motion Control',
    provider: 'Kling',
    subtitle: 'Фото + видео движения → видео с вашим персонажем',
    price: '6-9⭐/с',
  },
  {
    id: 'wan-animate-move',
    name: 'Motion Transfer',
    provider: 'WAN 2.2',
    subtitle: 'Фото + видео движения → оживлённое фото',
    price: '6⭐/с',
  },
  {
    id: 'wan-animate-replace',
    name: 'Character Swap',
    provider: 'WAN 2.2',
    subtitle: 'Видео + фото лица → замена персонажа',
    price: '8⭐/с',
  },
  {
    id: 'grok-video',
    name: 'Grok Video',
    provider: 'Grok',
    subtitle: 'Промпт или фото → видео со звуком',
    price: '17-26⭐',
  },
  {
    id: 'kling-o1-edit',
    name: 'Video Edit',
    provider: 'Kling O3',
    subtitle: 'Видео + промпт → редактирование, замена, трансформация',
    price: '75-150⭐',
  },
];

interface MotionModelSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  trigger?: React.ReactNode;
}

export const MotionModelSelector = memo(function MotionModelSelector({
  selectedId,
  onSelect,
  trigger,
}: MotionModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = MOTION_MODELS.find((m) => m.id === selectedId) || MOTION_MODELS[0];

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] active:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-[#8cf425]">
                  {selected.provider.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="text-left min-w-0">
                <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                  Модель
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {selected.provider} • {selected.name}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[70vh] overflow-y-auto !z-[100] bg-[#0D0D0F] border-t border-white/10"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg text-white">Выберите модель</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 pb-4">
          {MOTION_MODELS.map((model) => {
            const isSelected = model.id === selectedId;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelect(model.id)}
                className={`
                  w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-150
                  ${isSelected
                    ? 'bg-[#8cf425]/10 border border-[#8cf425]/30'
                    : 'bg-white/[0.03] border border-white/[0.06] active:bg-white/[0.06]'
                  }
                `}
              >
                {/* Provider monogram */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#8cf425]/20' : 'bg-white/5'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#8cf425]' : 'text-white/40'}`}>
                    {model.provider.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-semibold text-white truncate">
                    {model.provider} <span className="text-white/40 font-normal">•</span> {model.name}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5 leading-snug">{model.subtitle}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/50 font-medium">{model.price}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#8cf425] flex items-center justify-center">
                      <Check className="w-3 h-3 text-black" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
});

/** List of motion model IDs for filtering */
export const MOTION_MODEL_IDS = MOTION_MODELS.map((m) => m.id);
