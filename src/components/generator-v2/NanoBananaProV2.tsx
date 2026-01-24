'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { SimpleGallery } from './components/SimpleGallery';
import { PromptInput } from './components/PromptInput';
import { SettingsBar } from './components/SettingsBar';
import { useAuth } from './hooks/useAuth';
import { useSimpleHistory } from './hooks/useSimpleHistory';
import { useCostCalculation } from './hooks/useCostCalculation';
import type { GenerationResult, GenerationSettings } from './GeneratorV2';

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
  const { history, isLoading, isLoadingMore, hasMore, loadMore, addNew } = useSimpleHistory({
    modelId: 'nano-banana-pro',
    threadId,
  });

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
      const response = await fetch('/api/generate/photo', {
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
        const error = await response.json();
        throw new Error(error.error || 'Ошибка генерации');
      }

      const data = await response.json();

      // Poll for completion
      const jobId = data.jobId;
      const generationId = data.generationId;
      const provider = data.provider || 'kie_market';

      let attempts = 0;
      const maxAttempts = 120; // 4 minutes
      const pollInterval = 2000; // 2 seconds

      const poll = async (): Promise<void> => {
        attempts++;

        if (attempts > maxAttempts) {
          toast.error('Таймаут генерации');
          return;
        }

        try {
          const res = await fetch(`/api/jobs/${jobId}?provider=${provider}`);
          const jobData = await res.json();

          if (jobData.status === 'completed' || jobData.status === 'success') {
            // Success! Update pending images with real results
            const resultUrl = jobData.results?.[0]?.url || jobData.url;

            if (resultUrl) {
              // Note: In real app, we'd update each variant individually
              // For simplicity, we'll just add the successful result
              const successResult: GenerationResult = {
                id: generationId,
                url: resultUrl,
                prompt,
                mode: 'image' as const,
                settings,
                timestamp: Date.now(),
                status: 'success',
              };

              addNew(successResult);
              toast.success('Готово!');
            }

            // Refresh credits
            await refreshCredits();
            return;
          }

          if (jobData.status === 'failed') {
            toast.error(jobData.error || 'Генерация не удалась');
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (e) {
          console.error('Poll error:', e);
          // Retry
          setTimeout(poll, pollInterval);
        }
      };

      // Start polling
      poll();

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
