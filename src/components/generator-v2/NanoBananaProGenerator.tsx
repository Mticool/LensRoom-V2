'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { ControlBarBottom } from './ControlBarBottom';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { LoginDialog } from '@/components/auth/login-dialog';
import type { GenerationResult, GenerationSettings } from './GeneratorV2';
import './theme.css';

// Quality mapping: UI labels → API values
const QUALITY_MAPPING: Record<string, string> = {
  '1K': 'balanced',
  '2K': 'balanced', // uses apiId2k
  '4K': 'quality', // uses apiId4k
};

// Cost calculation for Nano Banana Pro
const COST_PER_IMAGE: Record<string, number> = {
  '1K': 30,    // 1k_2k pricing
  '2K': 30,    // 1k_2k pricing (uses apiId2k)
  '4K': 40,    // 4k pricing
};

export function NanoBananaProGenerator() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Core state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [quantity, setQuantity] = useState(1);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  
  // Reference image for i2i
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // Advanced settings
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load history (show all models)
  const { history, isLoading: historyLoading, refresh: refreshHistory, invalidateCache } = useHistory('image', undefined);
  
  // Use credits from auth hook
  const credits = authCredits;

  // Calculate cost
  const estimatedCost = COST_PER_IMAGE[quality] * quantity;

  // Demo images for non-authenticated users
  const demoImages: GenerationResult[] = !isAuthenticated && images.length === 0 && history.length === 0 ? [
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1680382750218-ea0e0cdcc741?w=800&q=80',
      prompt: 'A futuristic cityscape at sunset with flying cars',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '16:9', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-2',
      url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
      prompt: 'Magical forest with glowing mushrooms and fireflies',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '1:1', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-3',
      url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80',
      prompt: 'Abstract geometric patterns in vibrant colors',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '9:16', quality: 'balanced' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-4',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Cyberpunk street scene with neon lights',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '4:3', quality: 'balanced' },
      timestamp: Date.now(),
    },
  ] : [];
  
  // Combine current images with history and demo
  const allImages = [...images, ...history, ...demoImages];

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
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
          model: 'nano-banana-pro',
          size: aspectRatio,
          quality: QUALITY_MAPPING[quality],
        },
        timestamp: Date.now(),
        status: 'pending',
      }));

      setImages(prev => [...pendingImages, ...prev]);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          quality: QUALITY_MAPPING[quality],
          outputFormat,
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
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Ошибка генерации');
      }

      const data = await response.json();

      // Poll for results
      if (data.jobId) {
        await pollJobStatus(data.jobId, pendingImages.map(img => img.id));
      } else if (data.urls) {
        // Direct URLs (less likely for Nano Banana Pro)
        const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
          id: `${Date.now()}-${i}`,
          url,
          prompt,
          mode: 'image' as const,
          settings: {
            model: 'nano-banana-pro',
            size: aspectRatio,
            quality: QUALITY_MAPPING[quality],
          },
          timestamp: Date.now(),
        }));

        setImages(prev => {
          const filtered = prev.filter(img => !img.id.startsWith('pending-'));
          return [...newImages, ...filtered];
        });

        celebrateGeneration();
        toast.success(`Сгенерировано ${newImages.length} изображений!`);
      }

      // Refresh credits
      await refreshCredits();
      
      // Invalidate cache and refresh history
      invalidateCache();
      refreshHistory();

    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Generation error:', error);
      }
      toast.error(error.message || 'Ошибка при генерации');
      
      // Remove pending images on error
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, prompt, aspectRatio, quality, quantity, negativePrompt, seed, steps, credits, estimatedCost, refreshCredits, refreshHistory]);

  // Poll job status
  const pollJobStatus = async (jobId: string, pendingIds: string[]) => {
    const maxAttempts = 60; // 60 attempts * 2s = 2 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed' && data.urls) {
          const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
            id: `${Date.now()}-${i}`,
            url,
            prompt,
            mode: 'image' as const,
            settings: {
              model: 'nano-banana-pro',
              size: aspectRatio,
              quality: QUALITY_MAPPING[quality],
            },
            timestamp: Date.now(),
          }));

          // Replace pending with real images
          setImages(prev => {
            const filtered = prev.filter(img => !pendingIds.includes(img.id));
            return [...newImages, ...filtered];
          });

          celebrateGeneration();
          toast.success(`Сгенерировано ${newImages.length} изображений!`);
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Генерация не удалась');
        }

        // Continue polling
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          throw new Error('Превышено время ожидания');
        }
      } catch (error: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Polling error:', error);
        }
        toast.error(error.message || 'Ошибка получения результата');
        
        // Remove pending images
        setImages(prev => prev.filter(img => !pendingIds.includes(img.id)));
      }
    };

    poll();
  };

  // Regenerate handler
  const handleRegenerate = useCallback((regeneratePrompt: string, settings: GenerationSettings) => {
    setPrompt(regeneratePrompt);
    if (settings.size) setAspectRatio(settings.size);
    if (settings.quality) {
      // Find UI quality from API value
      const uiQuality = Object.entries(QUALITY_MAPPING).find(([_, apiVal]) => apiVal === settings.quality)?.[0];
      if (uiQuality) setQuality(uiQuality);
    }
    
    // Scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, []);

  return (
    <>
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col pb-40">
        {/* Auth Required Banner for non-authenticated users */}
        {!authLoading && !isAuthenticated && (
          <div className="sticky top-0 z-40 bg-[#CDFF00] px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                <p className="text-sm font-medium text-black">
                  Войдите для генерации изображений • Получите 50⭐ в подарок
                </p>
              </div>
              <button
                onClick={() => setLoginOpen(true)}
                className="px-4 py-1.5 bg-black text-[#CDFF00] text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap"
              >
                Войти через Telegram
              </button>
            </div>
          </div>
        )}
        
        {/* Image Gallery */}
        <ImageGalleryMasonry
          images={allImages}
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
        />

        {/* Control Bar (Sticky Bottom) */}
        <ControlBarBottom
          prompt={prompt}
          onPromptChange={setPrompt}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          quality={quality}
          onQualityChange={setQuality}
          outputFormat={outputFormat}
          onOutputFormatChange={setOutputFormat}
          outputFormatOptions={['png', 'jpg']}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          disabled={authLoading || !isAuthenticated}
          credits={credits}
          estimatedCost={estimatedCost}
          modelId="nano-banana-pro"
          qualityOptions={['1K', '2K', '4K']}
          aspectRatioOptions={['1:1', '16:9', '9:16', '4:3', '3:4']}
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
      </div>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
