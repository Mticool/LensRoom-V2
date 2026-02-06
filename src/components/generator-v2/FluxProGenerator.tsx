'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { ControlBarBottom } from './ControlBarBottom';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import type { GenerationResult } from './GeneratorV2';
import { computePrice } from '@/lib/pricing/pricing';
import './theme.css';

const QUALITY_MAPPING: Record<string, string> = {
  '1K': '1k',
  '2K': '2k',
};

export function FluxProGenerator() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  // Get current thread ID from URL
  const currentThreadId = searchParams?.get('thread') || null;
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [quantity, setQuantity] = useState(1);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [galleryZoom, setGalleryZoom] = useState(1);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Load history (filter by current thread)
  const { history, isLoadingMore, hasMore, loadMore, refresh: refreshHistory, invalidateCache } = useHistory('image', undefined, currentThreadId || undefined);
  
  // Clear local images when thread changes (new chat = clean slate)
  useEffect(() => {
    setImages([]);
  }, [currentThreadId]);
  
  const credits = authCredits;
  const estimatedCost = useMemo(
    () => computePrice('flux-2-pro', { quality: QUALITY_MAPPING[quality], variants: quantity }).stars,
    [quality, quantity]
  );

  const demoImages = useMemo<GenerationResult[]>(() => {
    if (isAuthenticated || images.length > 0 || history.length > 0) return [];
    return [
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Premium product photography with dramatic lighting',
      mode: 'image',
      settings: { model: 'flux-2-pro', size: '16:9', quality: '1k' },
      timestamp: Date.now(),
    },
  ];
  }, [isAuthenticated, images.length, history.length]);
  
  // Oldest → newest. New generations should appear at the bottom.
  const allImages = useMemo(() => [...history, ...images, ...demoImages], [history, images, demoImages]);

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

      // Add pending placeholders at the end (bottom of gallery)
      setImages(prev => [...prev, ...pendingImages]);

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

      // Replace pending placeholders (if any) and append to bottom
      setImages(prev => {
        const filtered = prev.filter(img => !img.id.startsWith('pending-'));
        return [...filtered, newImage];
      });
      // Refresh credits and history asynchronously to avoid render loops
      setTimeout(async () => {
        await refreshCredits();
        invalidateCache();
        refreshHistory();
      }, 0);
      
      celebrateGeneration();
      toast.success('Изображение создано!');
    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Generation error:', error);
      }
      const message = error instanceof Error ? error.message : 'Ошибка при генерации';
      toast.error(message);
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, prompt, credits, estimatedCost, quality, aspectRatio, quantity, negativePrompt, seed, steps, referenceImage, showPopup, refreshCredits, refreshHistory, invalidateCache]);

  // Cleanup polling on unmount
  useEffect(() => {
    const timeout = pollingTimeoutRef.current;
    return () => {
      if (timeout) clearTimeout(timeout);
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

      <div className="pt-8">
        {allImages.length > 0 ? (
          <ImageGalleryMasonry 
            images={allImages} 
            isGenerating={isGenerating}
            layout="grid"
            fullWidth
            galleryZoom={galleryZoom}
            autoScrollToBottom
            autoScrollBehavior="always"
            hasMore={hasMore}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[60vh] px-8">
            <div className="text-center max-w-md">
              <p className="text-[#A1A1AA] text-lg mb-2">Ваши изображения появятся здесь</p>
              <p className="text-[#6B6B6E] text-sm">FLUX.2 Pro — резко, детально, премиум-визуал</p>
            </div>
          </div>
        )}
      </div>

      <ControlBarBottom
        showGalleryZoom
        galleryZoom={galleryZoom}
        onGalleryZoomChange={setGalleryZoom}
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
