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
import './theme.css';

// Quality mapping: UI labels → API values for Nano Banana
const QUALITY_MAPPING: Record<string, string> = {
  'Быстро': 'turbo',
  'Баланс': 'balanced',
  'Качество': 'quality',
};

// Cost calculation for Nano Banana (from config/models.ts)
const COST_PER_IMAGE: Record<string, number> = {
  'Быстро': 9,    // turbo
  'Баланс': 9,    // balanced
  'Качество': 7,  // quality
};

export function NanoBananaGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  // Core state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('Баланс');
  const [quantity, setQuantity] = useState(1);
  
  // Reference image for i2i
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  
  // Gallery zoom (0.5–1.5)
  const [galleryZoom, setGalleryZoom] = useState(1);
  
  // Advanced settings
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Load history
  const { history, isLoadingMore, hasMore, loadMore, refresh: refreshHistory, invalidateCache } = useHistory('image');
  
  // Use credits from auth hook
  const credits = authCredits;

  // Calculate cost - flat pricing for Nano Banana
  const estimatedCost = useMemo(() => COST_PER_IMAGE[quality] * quantity, [quality, quantity]);

  // Demo images for non-authenticated users
  const demoImages = useMemo<GenerationResult[]>(() => {
    if (isAuthenticated || images.length > 0 || history.length > 0) return [];
    return [
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1680382750218-ea0e0cdcc741?w=800&q=80',
      prompt: 'A futuristic cityscape at sunset with flying cars',
      mode: 'image',
      settings: { model: 'nano-banana', size: '16:9', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-2',
      url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
      prompt: 'Magical forest with glowing mushrooms and fireflies',
      mode: 'image',
      settings: { model: 'nano-banana', size: '1:1', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-3',
      url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80',
      prompt: 'Abstract geometric patterns in vibrant colors',
      mode: 'image',
      settings: { model: 'nano-banana', size: '9:16', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-4',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Cyberpunk street scene with neon lights',
      mode: 'image',
      settings: { model: 'nano-banana', size: '4:3', quality: 'balanced' },
      timestamp: Date.now(),
    },
  ];
  }, [isAuthenticated, images.length, history.length]);
  
  // Oldest → newest. New generations should appear at the bottom.
  const allImages = useMemo(() => [...history, ...images, ...demoImages], [history, images, demoImages]);

  // Generate handler
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
      // Create pending placeholders
      const pendingImages: GenerationResult[] = Array.from({ length: quantity }, (_, i) => ({
        id: `pending-${Date.now()}-${i}`,
        url: '',
        prompt,
        mode: 'image' as const,
        settings: {
          model: 'nano-banana',
          size: aspectRatio,
          quality: QUALITY_MAPPING[quality],
        },
        timestamp: Date.now(),
        status: 'pending',
      }));

      // Add pending placeholders at the end (bottom of gallery)
      setImages(prev => [...prev, ...pendingImages]);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana',
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
          toast.error('Слишком много запросов. Подождите минуту.');
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
          settings: {
            model: 'nano-banana',
            size: aspectRatio,
            quality: QUALITY_MAPPING[quality],
          },
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
          settings: {
            model: 'nano-banana',
            size: aspectRatio,
            quality: QUALITY_MAPPING[quality],
          },
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
      
      // Remove pending placeholders on error
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, prompt, credits, estimatedCost, quality, aspectRatio, quantity, negativePrompt, seed, steps, referenceImage, showPopup, refreshCredits, refreshHistory, invalidateCache]);

  // Cleanup polling on unmount
  useEffect(() => {
    const timeout = pollingTimeoutRef.current;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative pb-64">
      {/* Not Authenticated Banner */}
      {!isAuthenticated && !authLoading && (
        <div className="fixed top-20 left-0 right-0 z-30 px-4">
          <div className="max-w-4xl mx-auto">
            <NotificationBannerCompact onConnect={showPopup} />
          </div>
        </div>
      )}

      {/* Gallery with zoom */}
      <div className="pt-8 flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        <div
          style={{
            transform: `scale(${galleryZoom})`,
            transformOrigin: 'top left',
            width: galleryZoom !== 1 ? `${100 / galleryZoom}%` : '100%',
            minHeight: galleryZoom !== 1 ? `${100 / galleryZoom}%` : 'auto',
          }}
        >
        {allImages.length > 0 ? (
          <ImageGalleryMasonry 
            images={allImages} 
            isGenerating={isGenerating}
            layout="grid"
            fullWidth
            autoScrollToBottom
            autoScrollBehavior="always"
            hasMore={hasMore}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[60vh] px-8">
            <div className="text-center max-w-md">
              <p className="text-[#A1A1AA] text-lg mb-2">
                Ваши изображения появятся здесь
              </p>
              <p className="text-[#6B6B6E] text-sm">
                Nano Banana — быстрый фотореализм для каждого дня
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Control Bar (Sticky Bottom) */}
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
        modelId="nano-banana"
        qualityOptions={['Быстро', 'Баланс', 'Качество']}
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

      {/* Bot Connect Popup */}
      <BotConnectPopup
        isOpen={popupIsOpen}
        onClose={hidePopup}
      />
    </div>
  );
}
