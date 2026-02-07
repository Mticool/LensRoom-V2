'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, ChevronDown, ImagePlus, Camera, ImageIcon, Wand2, Star, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { PHOTO_MODELS } from '@/config/models';
import type { PhotoModelConfig, PhotoQuality } from '@/config/models';
import { ModelSelectorSheet } from './ModelSelectorSheet';
import { ImageUploadButton } from './ImageUploadButton';
import { OfflineBanner } from './OfflineBanner';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';
import logger from '@/lib/logger';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

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

// Получить цену для конкретного качества
function getPriceForQuality(model: PhotoModelConfig, quality: PhotoQuality): number {
  const pricing = model.pricing;
  if (typeof pricing === 'number') return pricing;
  if (typeof pricing === 'object' && quality in pricing) {
    return pricing[quality as keyof typeof pricing] as number;
  }
  return getMinPrice(model);
}

function ImageGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { credits, isAuthenticated } = useAuth();
  const { light, success, error: errorHaptic } = useHaptic();
  const isOnline = useOnlineStatus();

  // Получаем модель из URL или используем первую
  const initialModelId = searchParams?.get('model') || 'nano-banana-pro';
  const initialModel = PHOTO_MODELS.find(m => m.id === initialModelId) || PHOTO_MODELS[0];

  const [selectedModel, setSelectedModel] = useState<PhotoModelConfig>(initialModel);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(selectedModel.aspectRatios[0]);
  const [selectedQuality, setSelectedQuality] = useState<PhotoQuality>(
    selectedModel.qualityOptions?.[0] || 'balanced' as PhotoQuality
  );
  const [generationCount, setGenerationCount] = useState(1);
  const [maxGenerations] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  const modelIcon = modelIcons[selectedModel.id] || '📸';
  const currentPrice = getPriceForQuality(selectedModel, selectedQuality);

  const handleModelSelect = (model: PhotoModelConfig) => {
    light();
    setSelectedModel(model);
    setShowModelSelector(false);
    // Сброс настроек под новую модель
    setSelectedAspectRatio(model.aspectRatios[0]);
    if (model.qualityOptions && model.qualityOptions.length > 0) {
      setSelectedQuality(model.qualityOptions[0]);
    }
    // Обновляем URL
    router.push(`/create/studio?section=photo&model=${encodeURIComponent(model.id)}`, { scroll: false });
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      errorHaptic();
      toast.error('Пожалуйста, введите промпт или загрузите изображение');
      return;
    }

    if (!isOnline) {
      errorHaptic();
      toast.error('Нет подключения к интернету');
      return;
    }

    if (!isAuthenticated) {
      light();
      router.push('/login');
      return;
    }

    if (credits < currentPrice) {
      errorHaptic();
      toast.error('Недостаточно кредитов');
      return;
    }

    light();
    setIsGenerating(true);
    try {
      // TODO: Implement actual generation API call
      logger.log('Generating with:', {
        model: selectedModel.id,
        prompt,
        image: uploadedImage,
        aspectRatio: selectedAspectRatio,
        quality: selectedQuality,
      });

      // Simulate generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      success();
      setGenerationCount(prev => Math.min(prev + 1, maxGenerations));
    } catch (error) {
      errorHaptic();
      logger.error('Generation failed:', error);
      toast.error('Ошибка генерации. Попробуйте снова.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] pb-20">
      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F0F10]/98 backdrop-blur-xl border-b border-[#27272A]">
        <div className="flex items-center justify-between px-4 py-3 pt-safe">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-center active:scale-95 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div>
              <h1 className="text-base font-semibold text-white">Создать фото</h1>
              <p className="text-xs text-[#71717A]">AI Image Generator</p>
            </div>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm font-semibold text-white">
                {credits.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Model Selector */}
        <button
          onClick={() => setShowModelSelector(true)}
          className="w-full p-4 rounded-2xl bg-[#18181B] border border-[#27272A] active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#27272A] to-[#18181B] flex items-center justify-center text-2xl">
                {modelIcon}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-[#A1A1AA] mb-0.5">Модель</div>
                <div className="text-base font-semibold text-white flex items-center gap-2">
                  {selectedModel.name}
                  {selectedModel.featured && (
                    <span className="px-1.5 py-0.5 rounded bg-[#00D9FF]/10 text-[#00D9FF] text-[9px] font-medium">
                      TOP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-[#71717A]" />
          </div>
        </button>

        {/* Style Preview - Show uploaded image or placeholder */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-[#27272A] to-[#18181B] border border-[#27272A]">
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-2">{modelIcon}</div>
                <div className="text-lg font-bold text-yellow-400 uppercase tracking-wider">
                  {selectedModel.name}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setUploadedImage(null)}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Изменить
          </button>
        </div>

        {/* Image Upload */}
        {selectedModel.supportsI2i && (
          <ImageUploadButton onUpload={handleImageUpload} />
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-white">Промпт</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите, что вы хотите создать..."
            className="
              w-full h-32 px-4 py-3 rounded-2xl
              bg-[#18181B] border border-[#27272A]
              text-white placeholder:text-[#71717A]
              focus:outline-none focus:border-[#00D9FF]
              resize-none text-sm
            "
          />
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-white">Соотношение сторон</div>
          <div className="flex gap-2 flex-wrap">
            {selectedModel.aspectRatios.map((ratio) => (
              <button
                key={ratio}
                onClick={() => {
                  light();
                  setSelectedAspectRatio(ratio);
                }}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium
                  transition-all active:scale-95
                  ${selectedAspectRatio === ratio
                    ? 'bg-[#00D9FF] text-black'
                    : 'bg-[#18181B] border border-[#27272A] text-white'
                  }
                `}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Options */}
        {selectedModel.qualityOptions && selectedModel.qualityOptions.length > 1 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-white">Качество</div>
            <div className="flex gap-2 flex-wrap">
              {selectedModel.qualityOptions.map((quality) => {
                const price = getPriceForQuality(selectedModel, quality);
                return (
                  <button
                    key={quality}
                    onClick={() => {
                      light();
                      setSelectedQuality(quality);
                    }}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium
                      transition-all active:scale-95 flex items-center gap-1.5
                      ${selectedQuality === quality
                        ? 'bg-[#00D9FF] text-black'
                        : 'bg-[#18181B] border border-[#27272A] text-white'
                      }
                    `}
                  >
                    {quality.toUpperCase()}
                    <span className="text-xs opacity-70">• {price}⭐</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Generation Counter */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#18181B] border border-[#27272A]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (generationCount > 1) {
                  light();
                  setGenerationCount(Math.max(1, generationCount - 1));
                }
              }}
              disabled={generationCount <= 1}
              className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-transform"
            >
              −
            </button>
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {generationCount}/{maxGenerations}
              </div>
              <div className="text-xs text-[#71717A]">Количество</div>
            </div>
            <button
              onClick={() => {
                if (generationCount < maxGenerations) {
                  light();
                  setGenerationCount(Math.min(maxGenerations, generationCount + 1));
                }
              }}
              disabled={generationCount >= maxGenerations}
              className="w-8 h-8 rounded-lg bg-[#27272A] flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-transform"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-lg font-bold text-white">
              {currentPrice * generationCount}
            </span>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-[#0F0F10] via-[#0F0F10] to-transparent">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
          className={`
            w-full h-14 rounded-2xl font-semibold text-base
            flex items-center justify-center gap-2
            transition-all active:scale-[0.98]
            ${isGenerating || (!prompt.trim() && !uploadedImage)
              ? 'bg-[#27272A] text-[#71717A] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#00D9FF] to-[#0EA5E9] text-black'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Создать • {currentPrice * generationCount}⭐
            </>
          )}
        </button>
      </div>

      {/* Model Selector Sheet */}
      <ModelSelectorSheet
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
      />
    </div>
  );
}

export function ImageGenerator() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00D9FF]/20 border-t-[#00D9FF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#71717A]">Загрузка...</p>
        </div>
      </div>
    }>
      <ImageGeneratorContent />
    </Suspense>
  );
}
