'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SimpleGallery } from './components/SimpleGallery';
import { PromptInput } from './components/PromptInput';
import { SettingsBar } from './components/SettingsBar';
import { useAuth } from './hooks/useAuth';
import { useSimpleHistory } from './hooks/useSimpleHistory';
import { useCostCalculation } from './hooks/useCostCalculation';
import type { GenerationResult, GenerationSettings } from './GeneratorV2';
import { fetchWithTimeout, FetchTimeoutError, FetchAbortedError } from '@/lib/api/fetch-with-timeout';

interface NanoBananaProV2Props {
  threadId?: string;
}

const QUALITY_MAPPING: Record<string, string> = {
  '1K': 'nano-banana-pro-1k-balanced',
  '2K': 'nano-banana-pro-2k-balanced',
  '4K': 'nano-banana-pro-4k-quality',
};

export function NanoBananaProV2({ threadId }: NanoBananaProV2Props) {
  // State
  const [prompt, setPrompt] = useState('');
  const [variants, setVariants] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('2K');
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks
  const { isAuthenticated, credits, refreshCredits } = useAuth();
  const { history, isLoading, isLoadingMore, hasMore, loadMore, addNew, refresh: refreshHistory } = useSimpleHistory({
    modelId: 'nano-banana-pro',
    threadId,
  });
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = null;
    };
  }, []);

  // Cost calculation
  const settings: GenerationSettings = {
    model: 'nano-banana-pro',
    size: aspectRatio,
    quality: QUALITY_MAPPING[quality],
    variants,
  };
  const { stars } = useCostCalculation('image', settings);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Пожалуйста, войдите в аккаунт');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    if (credits < stars) {
      toast.error('Недостаточно звёзд');
      return;
    }

    setIsGenerating(true);

    try {
      // Cancel any in-flight run
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      // Create pending placeholders
      const pendingImages: GenerationResult[] = Array.from({ length: variants }, (_, i) => ({
        id: `pending-${Date.now()}-${i}`,
        url: '',
        prompt,
        mode: 'image' as const,
        settings,
        timestamp: Date.now(),
        status: 'pending',
      }));

      // Add pending images to history (will appear at bottom)
      pendingImages.forEach(img => addNew(img));

      // Call API directly (simpler than using useGeneration hook)
      const response = await fetchWithTimeout('/api/generate/photo', {
        timeout: 30_000,
        abortSignal: abortControllerRef.current.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          aspectRatio,
          quality: QUALITY_MAPPING[quality],
          outputFormat: 'png',
          variants,
          mode: 't2i',
          threadId: threadId || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Слишком много запросов. Подождите минуту и попробуйте снова.');
          return;
        }
        const raw = await response.text().catch(() => "");
        let err: any = null;
        try { err = raw ? JSON.parse(raw) : null; } catch { err = { error: raw }; }
        throw new Error(err?.error || err?.message || 'Ошибка генерации');
      }

      const rawOk = await response.text().catch(() => "");
      let data: any = null;
      try { data = rawOk ? JSON.parse(rawOk) : null; } catch { data = { error: rawOk }; }

      // Poll for completion
      const jobId = data.jobId;
      const generationId = data.generationId;
      const provider = data.provider || 'kie_market';

      if (data.status === 'completed' && data.results?.[0]?.url) {
        addNew({
          id: generationId,
          url: data.results[0].url,
          prompt,
          mode: 'image' as const,
          settings,
          timestamp: Date.now(),
          status: 'success',
        });
        toast.success('Готово!');
        await refreshCredits();
        refreshHistory();
        return;
      }

      // If no jobId - nothing to poll
      if (!jobId) {
        throw new Error('Нет jobId для отслеживания');
      }

      await new Promise<void>((resolve) => {
        let attempts = 0;
        let consecutiveErrors = 0;
        const maxAttempts = 120; // ~4 minutes at 2s
        const maxConsecutiveErrors = 5;

        const poll = async () => {
          try {
            if (abortControllerRef.current?.signal.aborted) return resolve();
            attempts++;

            if (attempts > maxAttempts) {
              toast.error('Таймаут генерации');
              return resolve();
            }

            const res = await fetchWithTimeout(`/api/jobs/${jobId}?provider=${encodeURIComponent(provider)}`, {
              timeout: 15_000,
              abortSignal: abortControllerRef.current?.signal,
            });
            const raw = await res.text().catch(() => "");
            let jobData: any = null;
            try { jobData = raw ? JSON.parse(raw) : null; } catch { jobData = { error: raw }; }
            if (!res.ok) throw new Error(jobData?.error || `Job status error (${res.status})`);

            consecutiveErrors = 0;

            if (jobData.status === 'completed' || jobData.status === 'success') {
              const resultUrl = jobData.results?.[0]?.url || jobData.url;
              if (resultUrl) {
                addNew({
                  id: generationId,
                  url: resultUrl,
                  prompt,
                  mode: 'image' as const,
                  settings,
                  timestamp: Date.now(),
                  status: 'success',
                });
                toast.success('Готово!');
              }
              return resolve();
            }

            if (jobData.status === 'failed') {
              toast.error(jobData.error || 'Генерация не удалась');
              return resolve();
            }

            // Continue polling
            pollingTimeoutRef.current = setTimeout(poll, 2000);
          } catch (e) {
            if (e instanceof FetchAbortedError) return resolve();
            consecutiveErrors++;
            if (consecutiveErrors >= maxConsecutiveErrors) {
              const msg =
                e instanceof FetchTimeoutError ? 'Сервис генерации не отвечает. Попробуйте позже.' : (e instanceof Error ? e.message : 'Ошибка');
              toast.error(msg);
              return resolve();
            }
            const backoff = Math.min(2000 * Math.pow(2, consecutiveErrors - 1), 8000);
            pollingTimeoutRef.current = setTimeout(poll, backoff);
          }
        };

        poll();
      });

      await refreshCredits();
      refreshHistory(); // also removes local pending placeholders (API returns only success)

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  }, [
    isAuthenticated,
    prompt,
    credits,
    stars,
    variants,
    aspectRatio,
    quality,
    settings,
    threadId,
    addNew,
    refreshCredits,
    refreshHistory,
  ]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#27272A] px-4 py-3">
        <h2 className="text-xl font-bold text-white">Nano Banana Pro</h2>
        <p className="text-sm text-[#71717A]">Next generation image generation</p>
      </div>

      {/* Gallery */}
      <SimpleGallery
        images={history}
        isGenerating={isGenerating}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
      />

      {/* Prompt Input */}
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        costInfo={{ stars, credits }}
        disabled={!isAuthenticated}
      />

      {/* Settings Bar */}
      <SettingsBar
        variants={variants}
        aspectRatio={aspectRatio}
        quality={quality}
        onVariantsChange={setVariants}
        onAspectChange={setAspectRatio}
        onQualityChange={setQuality}
        disabled={isGenerating}
      />
    </div>
  );
}
