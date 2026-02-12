'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Video, Image as ImageIcon, Zap, Star, Clock } from 'lucide-react';
import type { ModelConfig, PhotoModelConfig, VideoModelConfig } from '@/config/models';
import { useHaptic } from '@/lib/hooks/useHaptic';

interface ModelCardProps {
  model: ModelConfig;
  variant?: 'compact' | 'large';
}

// Иконки моделей
const modelIcons: Record<string, string> = {
  'nano-banana': '🍌',
  'nano-banana-pro': '🍌',
  'grok-imagine': '🌶️',
  'grok-video': '🌶️',
  'veo-3.1': '🎬',
  'kling': '⚡',
  'sora-2': '🌀',
  'sora-2-pro': '🌀',
  'wan': '🎥',
  'flux-2-pro': '✨',
  'seedream-4.5': '🌱',
  'gpt-image': '🤖',
  'z-image': '⚡',
  'topaz-image-upscale': '📐',
  'recraft-remove-background': '✂️',
  'kling-ai-avatar': '👤',
  'kling-ai-avatar-standard': '👤',
  'kling-ai-avatar-pro': '👤',
  'kling-motion-control': '🎭',
};

// Получить минимальную цену
function getMinPrice(model: ModelConfig): number {
  const pricing = model.pricing;
  if (typeof pricing === 'number') return pricing;
  
  // Ищем минимальную цену в объекте
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

// Получить краткое описание
function getShortDesc(model: ModelConfig): string {
  if ('shortDescription' in model && model.shortDescription) {
    return model.shortDescription;
  }
  return model.description.slice(0, 50) + '...';
}

export function ModelCard({ model, variant = 'compact' }: ModelCardProps) {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);
  const { light } = useHaptic();

  const isPhoto = model.type === 'photo';
  const icon = modelIcons[model.id] || (isPhoto ? '📸' : '🎬');
  const minPrice = getMinPrice(model);
  const shortLabel = 'shortLabel' in model ? model.shortLabel : undefined;

  const handleClick = () => {
    // Haptic feedback on click
    light();
    // Переходим на страницу генератора с выбранной моделью
    const path = isPhoto
      ? `/create/studio?section=photo&model=${encodeURIComponent(model.id)}`
      : `/create/studio?section=video&model=${encodeURIComponent(model.id)}`;
    router.push(path);
  };

  if (variant === 'large') {
    return (
      <button
        onClick={handleClick}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        className={`
          flex-shrink-0 w-40 h-48 rounded-2xl overflow-hidden
          bg-[rgba(255,255,255,0.03)]
          border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]
          transition-all duration-200
          ${isPressed ? 'scale-95' : ''}
          active:scale-95
          group
        `}
      >
        {/* Верхняя часть с иконкой */}
        <div className="h-24 flex items-center justify-center bg-gradient-to-br from-[rgba(255,255,255,0.06)] to-transparent">
          <span className="text-5xl group-hover:scale-110 transition-transform duration-200">
            {icon}
          </span>
        </div>
        
        {/* Информация */}
        <div className="p-3 text-left">
          <h3 className="font-semibold text-white text-sm truncate">
            {model.name}
          </h3>
          
          <div className="flex items-center gap-1 mt-1">
            {isPhoto ? (
              <ImageIcon className="w-3 h-3 text-white/50" />
            ) : (
              <Video className="w-3 h-3 text-white/50" />
            )}
            <span className="text-[10px] text-white/40">
              {shortLabel || (isPhoto ? 'Фото' : 'Видео')}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-[#8cf425]" />
              <span className="text-xs font-medium text-white">
                {minPrice}
              </span>
            </div>
            
            {model.featured && (
              <span className="px-1.5 py-0.5 rounded bg-[#8cf425]/10 text-[#8cf425] text-[9px] font-medium">
                TOP
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // Компактный вариант
  return (
    <button
      onClick={handleClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`
        flex-shrink-0 w-28 h-36 rounded-xl overflow-hidden
        bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]
        transition-all duration-200
        ${isPressed ? 'scale-95' : ''}
        active:scale-95
        group
      `}
    >
      {/* Иконка */}
      <div className="h-16 flex items-center justify-center bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-transparent">
        <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
          {icon}
        </span>
      </div>
      
      {/* Информация */}
      <div className="p-2 text-left">
        <h3 className="font-medium text-white text-xs truncate">
          {model.name}
        </h3>
        
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-2.5 h-2.5 text-[#8cf425]" />
          <span className="text-[10px] text-white/50">
            от {minPrice}
          </span>
        </div>
        
        {model.featured && (
          <span className="inline-block mt-1 px-1 py-0.5 rounded bg-[#8cf425]/10 text-[#8cf425] text-[8px] font-medium">
            TOP
          </span>
        )}
      </div>
    </button>
  );
}
