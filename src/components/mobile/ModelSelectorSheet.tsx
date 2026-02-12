'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, Zap, Sparkles } from 'lucide-react';
import { PHOTO_MODELS } from '@/config/models';
import type { PhotoModelConfig } from '@/config/models';

interface ModelSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: PhotoModelConfig;
  onSelectModel: (model: PhotoModelConfig) => void;
}

const modelIcons: Record<string, string> = {
  'nano-banana': '🍌',
  'nano-banana-pro': '🍌',
  'grok-imagine': '🌶️',
  'flux-2-pro': '✨',
  'seedream-4.5': '🌱',
  'gpt-image': '🤖',
  'z-image': '⚡',
  'topaz-image-upscale': '📐',
  'recraft-remove-background': '✂️',
};

// Получить минимальную цену модели
function getMinPrice(model: PhotoModelConfig): number {
  const pricing = model.pricing;
  if (typeof pricing === 'number') return pricing;

  let minPrice = Infinity;
  const findMin = (obj: unknown): void => {
    if (typeof obj === 'number') {
      minPrice = Math.min(minPrice, obj);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(findMin);
    }
  };
  findMin(pricing);

  return minPrice === Infinity ? 0 : minPrice;
}

// Получить иконку скорости
function getSpeedIcon(speed: string) {
  switch (speed) {
    case 'fast':
      return <Zap className="w-3 h-3 text-emerald-500" />;
    case 'slow':
      return <Star className="w-3 h-3 text-[#8cf425]" />;
    default:
      return <Sparkles className="w-3 h-3 text-blue-500" />;
  }
}

export function ModelSelectorSheet({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}: ModelSelectorSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#0A0A0A] rounded-t-3xl border-t border-[rgba(255,255,255,0.08)] max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <h2 className="text-lg font-semibold text-white">Выбрать модель</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {PHOTO_MODELS.length} доступных моделей
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center active:scale-95 transition-transform"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Models List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 space-y-2">
                {PHOTO_MODELS.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  const icon = modelIcons[model.id] || '📸';
                  const minPrice = getMinPrice(model);

                  return (
                    <button
                      key={model.id}
                      onClick={() => onSelectModel(model)}
                      className={`
                        w-full p-4 rounded-2xl transition-all active:scale-[0.98]
                        ${isSelected
                          ? 'bg-[#8cf425]/10 border-2 border-[#8cf425]'
                          : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-2xl">
                          {icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-sm">
                              {model.name}
                            </h3>
                            {model.featured && (
                              <span className="px-1.5 py-0.5 rounded bg-[#8cf425]/10 text-[#8cf425] text-[9px] font-medium">
                                TOP
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-white/50 leading-relaxed mb-2">
                            {model.shortDescription || model.description.slice(0, 80) + '...'}
                          </p>

                          <div className="flex items-center gap-3 text-xs">
                            {/* Speed */}
                            <div className="flex items-center gap-1">
                              {getSpeedIcon(model.speed)}
                              <span className="text-white/40 capitalize">{model.speed}</span>
                            </div>

                            {/* Quality */}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-[#8cf425]" />
                              <span className="text-white/40 capitalize">{model.quality}</span>
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-white/40">от</span>
                              <span className="font-semibold text-white">{minPrice}⭐</span>
                            </div>
                          </div>
                        </div>

                        {/* Selected Check */}
                        {isSelected && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#8cf425] flex items-center justify-center">
                            <Check className="w-4 h-4 text-black" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Padding */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
