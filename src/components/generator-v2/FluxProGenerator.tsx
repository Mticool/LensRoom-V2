'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { ControlBarBottom } from './ControlBarBottom';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import type { GenerationResult } from './GeneratorV2';
import './theme.css';

const QUALITY_MAPPING: Record<string, string> = {
  '1K': '1k',
  '2K': '2k',
};

const COST_PER_IMAGE: Record<string, number> = {
  '1K': 9,
  '2K': 12,
};

export function FluxProGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [quantity, setQuantity] = useState(1);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Load history (show all models)
  const { history, isLoading: historyLoading, refresh: refreshHistory, invalidateCache } = useHistory('image', undefined);
  const credits = authCredits;
  const estimatedCost = COST_PER_IMAGE[quality] * quantity;

  const demoImages: GenerationResult[] = !isAuthenticated && images.length === 0 && history.length === 0 ? [
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Premium product photography with dramatic lighting',
      mode: 'image',
      settings: { model: 'flux-2-pro', size: '16:9', quality: '1k' },
      timestamp: Date.now(),
    },
  ] : [];
  
  const allImages = [...images, ...history, ...demoImages];

  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      showPopup();
      return;
    }

    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    if (credits < estimatedCost) {
      toast.error('Недостаточно звёзд');
      return;
    }

    setIsGenerating(true);

    try {
      const pendingImages: GenerationResult[] = Array.from({ length: quantity }, (_, i) => ({
        id: `pending-${Date.now()}-${i}`,
        url: '',
        prompt,
        mode: 'image' as const,
        settings: { model: 'flux-2-pro', size: aspectRatio, quality: QUALITY_MAPPING[quality] },
        timestamp: Date.now(),
        status: 'pending',
      }));

      setImages(prev => [...pendingImages, ...prev]);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'flux-2-pro',
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          quality: QUALITY_MAPPING[quality],
          variants: quantity,
          seed: seed || undefined,
          steps,
          mode: referenceImage ? 'i2i' : 't2i',
          referenceImage: referenceImage || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Слишком много запросов. Подождите минуту и попробуйте снова.');
          setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();

      const newImage: GenerationResult = {
        id: data.generationId || `gen-${Date.now()}`,
        url: data.imageUrl,
        prompt,
        mode: 'image',
        settings: { model: 'flux-2-pro', size: aspectRatio, quality: QUALITY_MAPPING[quality] },
        timestamp: Date.now(),
        status: 'completed',
      };

      setImages(prev => [newImage, ...prev]);
      await refreshCredits();
      await invalidateCache();
      refreshHistory();
      celebrateGeneration();
      toast.success('Изображение создано!');
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Generation error:', error);
      }
      toast.error(error.message || 'Ошибка при генерации');
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, prompt, credits, estimatedCost, quality, aspectRatio, quantity, negativePrompt, seed, steps, referenceImage, showPopup, refreshCredits, refreshHistory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative pb-64">
      {!isAuthenticated && !authLoading && (
        <div className="fixed top-20 left-0 right-0 z-30 px-4">
          <div className="max-w-4xl mx-auto">
            <NotificationBannerCompact onConnect={showPopup} />
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-7xl mx-auto">
          {allImages.length > 0 ? (
            <ImageGalleryMasonry images={allImages} isGenerating={isGenerating} />
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <p className="text-[#A1A1AA] text-lg mb-2">Ваши изображения появятся здесь</p>
                <p className="text-[#6B6B6E] text-sm">FLUX.2 Pro — резко, детально, премиум-визуал</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ControlBarBottom
        prompt={prompt}
        onPromptChange={setPrompt}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        quality={quality}
        onQualityChange={setQuality}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        disabled={authLoading || !isAuthenticated}
        credits={credits}
        estimatedCost={estimatedCost}
        modelId="flux-2-pro"
        qualityOptions={['1K', '2K']}
        aspectRatioOptions={['1:1', '16:9', '9:16', '4:3']}
        referenceImage={referenceImage}
        onReferenceImageChange={setReferenceImage}
        onReferenceFileChange={setReferenceFile}
        negativePrompt={negativePrompt}
        onNegativePromptChange={setNegativePrompt}
        seed={seed}
        onSeedChange={setSeed}
        steps={steps}
        onStepsChange={setSteps}
      />

      <BotConnectPopup isOpen={popupIsOpen} onClose={hidePopup} />
    </div>
  );
}
