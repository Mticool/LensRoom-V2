'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { ControlBarBottom } from './ControlBarBottom';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import type { GenerationResult } from './GeneratorV2';
import { getDefaultImageParams, getImageModelCapability } from '@/lib/imageModels/capabilities';
import { computePrice } from '@/lib/pricing/pricing';
import './theme.css';

export function GPTImageGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  const capability = useMemo(() => getImageModelCapability('gpt-image'), []);
  const defaults = useMemo(() => getDefaultImageParams('gpt-image'), []);

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(defaults.aspectRatio || '1:1');
  const [quality, setQuality] = useState(defaults.quality || 'medium');
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
  
  const { history, isLoadingMore, hasMore, loadMore, refresh: refreshHistory, invalidateCache } = useHistory('image', undefined);
  const credits = authCredits;
  const estimatedCost = useMemo(() => computePrice('gpt-image', { quality, variants: quantity }).stars, [quality, quantity]);
  const aspectRatioOptions = useMemo(() => capability?.supportedAspectRatios || ['1:1'], [capability]);
  const qualityOptions = useMemo(() => capability?.supportedQualities || ['medium', 'high'], [capability]);

  const demoImages = useMemo<GenerationResult[]>(() => {
    if (isAuthenticated || images.length > 0 || history.length > 0) return [];
    return [{
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Product label with clear text "Premium Coffee"',
      mode: 'image',
      settings: { model: 'gpt-image', size: '1:1', quality: 'medium' },
      timestamp: Date.now(),
    }];
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
        settings: { model: 'gpt-image', size: aspectRatio, quality },
        timestamp: Date.now(),
        status: 'pending',
      }));

      // Add pending placeholders at the end (bottom of gallery)
      setImages(prev => [...prev, ...pendingImages]);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-image',
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          quality,
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

      // Remove pending placeholders
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));

      // Handle parallel generation results
      if (data.status === 'completed' && data.results && data.results.length > 0) {
        const newImages: GenerationResult[] = data.results.map((result: { url: string }, i: number) => ({
          id: `${data.generationId || Date.now()}-${i}`,
          url: result.url,
          prompt,
          mode: 'image' as const,
          settings: { model: 'gpt-image', size: aspectRatio, quality },
          timestamp: Date.now(),
          status: 'completed',
        }));

        setImages(prev => [...prev, ...newImages]);
        celebrateGeneration();
        toast.success(`Создано ${newImages.length} ${newImages.length === 1 ? 'изображение' : 'изображений'}!`);
      } else if (data.imageUrl) {
        // Legacy single image response
        const newImage: GenerationResult = {
          id: data.generationId || `gen-${Date.now()}`,
          url: data.imageUrl,
          prompt,
          mode: 'image',
          settings: { model: 'gpt-image', size: aspectRatio, quality },
          timestamp: Date.now(),
          status: 'completed',
        };

        setImages(prev => [...prev, newImage]);
        celebrateGeneration();
        toast.success('Изображение создано!');
      }

      // Refresh credits and history asynchronously to avoid render loops
      setTimeout(async () => {
        await refreshCredits();
        invalidateCache();
        refreshHistory();
      }, 0);
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
              <p className="text-[#6B6B6E] text-sm">GPT Image 1.5 — лучше всех рендерит текст на изображениях</p>
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
        modelId="gpt-image"
        qualityOptions={qualityOptions}
        aspectRatioOptions={aspectRatioOptions}
        quantityMaxOverride={capability?.requestVariants?.max}
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
