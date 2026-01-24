'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  // Server-side expects resolution tiers for Nano Banana Pro
  // (used for model selection + size mapping)
  '1K': '1k_2k',
  '2K': '1k_2k',
  '4K': '4k',
};

// Cost calculation for Nano Banana Pro
const COST_PER_IMAGE: Record<string, number> = {
  '1K': 30,    // 1k_2k pricing
  '2K': 30,    // 1k_2k pricing (uses apiId2k)
  '4K': 40,    // 4k pricing
};

export function NanoBananaProGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Get current thread ID from URL
  const currentThreadId = searchParams?.get('thread') || null;
  
  // Core state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('1K');
  const [quantity, setQuantity] = useState(1);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg'>('png');
  
  // Reference image for i2i
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  
  // Advanced settings
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load history (filter by current thread)
  const { history, isLoading: historyLoading, isLoadingMore, hasMore, loadMore, refresh: refreshHistory, invalidateCache } = useHistory('image', undefined, currentThreadId || undefined);
  
  // Clear local images when thread changes (new chat = clean slate)
  useEffect(() => {
    setImages([]);
  }, [currentThreadId]);
  
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
      settings: { model: 'nano-banana-pro', size: '16:9', quality: '1k_2k' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-2',
      url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&q=80',
      prompt: 'Magical forest with glowing mushrooms and fireflies',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '1:1', quality: '1k_2k' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-3',
      url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80',
      prompt: 'Abstract geometric patterns in vibrant colors',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '9:16', quality: '1k_2k' },
      timestamp: Date.now(),
    },
    {
      id: 'demo-4',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Cyberpunk street scene with neon lights',
      mode: 'image',
      settings: { model: 'nano-banana-pro', size: '4:3', quality: '1k_2k' },
      timestamp: Date.now(),
    },
  ] : [];
  
  // Oldest → newest. New generations should appear at the bottom.
  const allImages = [...history, ...images, ...demoImages];

  function extractGenerationUuid(rawId: string | undefined | null): string | null {
    const id = String(rawId || "").trim();
    if (!id) return null;
    // Accept `uuid` or `uuid-0` (we suffix local results for uniqueness).
    const m = id.match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-\d+)?$/i
    );
    return m ? m[1] : null;
  }

  const readBlobAsDataUrl = useCallback(async (blob: Blob): Promise<string> => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  }, []);

  const fetchAsReferenceDataUrl = useCallback(
    async (img: GenerationResult): Promise<string> => {
      const genId = extractGenerationUuid(img.id);
      // Prefer same-origin proxy (avoids CORS).
      if (genId) {
        const resp = await fetch(
          `/api/generations/${encodeURIComponent(genId)}/download?kind=original&proxy=1`,
          { credentials: "include" }
        );
        if (!resp.ok) throw new Error("download_failed");
        const blob = await resp.blob();
        return await readBlobAsDataUrl(blob);
      }

      // Fallback: try direct fetch (may fail on CORS for some providers).
      if (!img.url) throw new Error("no_url");
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error("fetch_failed");
      const blob = await resp.blob();
      return await readBlobAsDataUrl(blob);
    },
    [readBlobAsDataUrl]
  );

  const handleUseAsReference = useCallback(
    async (img: GenerationResult) => {
      try {
        const dataUrl = await fetchAsReferenceDataUrl(img);
        setReferenceImages([dataUrl]);
        setPrompt(String(img.prompt || ""));
        if (img.settings?.size) setAspectRatio(String(img.settings.size));
        toast.success("Фото добавлено как референс");
      } catch {
        toast.error("Не удалось загрузить референс");
      }
    },
    [fetchAsReferenceDataUrl]
  );

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

      // Add pending placeholders at the end (bottom of gallery)
      setImages(prev => [...prev, ...pendingImages]);

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
          mode: referenceImages.length ? 'i2i' : 't2i',
          referenceImages: referenceImages.length ? referenceImages : undefined,
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
      const baseGenerationId = String(data.generationId || "");

      // Check if results are immediately available (parallel generation)
      if (data.status === 'completed' && data.results && data.results.length > 0) {
        const newImages: GenerationResult[] = data.results.map((result: { url: string }, i: number) => ({
          // Keep DB generationId for downloads; add suffix for React list uniqueness.
          id: `${baseGenerationId || Date.now()}-${i}`,
          url: result.url,
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
          return [...filtered, ...newImages];
        });

        celebrateGeneration();
        toast.success(`Сгенерировано ${newImages.length} ${newImages.length === 1 ? 'изображение' : 'изображений'}!`);
      } else if (data.jobId) {
        // Poll for results (async generation)
        await pollJobStatus(data.jobId, pendingImages.map(img => img.id), baseGenerationId);
      } else if (data.urls) {
        // Direct URLs (legacy format)
        const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
          id: `${baseGenerationId || Date.now()}-${i}`,
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
          return [...filtered, ...newImages];
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
  const pollJobStatus = async (jobId: string, pendingIds: string[], generationId?: string) => {
    const maxAttempts = 60; // 60 attempts * 2s = 2 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed' && data.urls) {
          const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
            id: `${generationId || Date.now()}-${i}`,
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
            return [...filtered, ...newImages];
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
          autoScrollToBottom
          onRegenerate={handleRegenerate}
          onUseAsReference={handleUseAsReference}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
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
          onOutputFormatChange={(v) => setOutputFormat(v === "jpg" ? "jpg" : "png")}
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
          aspectRatioOptions={['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '21:9', '2:1', '1:2', '6:5', '5:6', '9:21']}
          referenceImages={referenceImages}
          onReferenceImagesChange={setReferenceImages}
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
