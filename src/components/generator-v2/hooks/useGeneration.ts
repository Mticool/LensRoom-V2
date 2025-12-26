'use client';

import { useState, useCallback, useRef } from 'react';
import { GeneratorMode, GenerationSettings, GenerationResult } from '../GeneratorV2';
import { notificationService } from '@/lib/notifications';

interface GenerationProgress {
  stage: 'queued' | 'generating' | 'processing' | 'finalizing';
  progress: number;
  eta?: string;
}

interface UseGenerationOptions {
  onSuccess?: (result: GenerationResult) => void;
  onError?: (error: string) => void;
  onCreditsUsed?: (amount: number) => void;
  enableNotifications?: boolean;
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string, generationId: string, provider: string): Promise<GenerationResult | null> => {
    console.log('[useGeneration] Starting poll for job:', jobId, 'provider:', provider);
    
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          console.log('[useGeneration] Poll timeout after', attempts, 'attempts');
          stopPolling();
          setError('Таймаут генерации. Попробуйте ещё раз.');
          resolve(null);
          return;
        }

        try {
          const response = await fetch(`/api/jobs/${jobId}?provider=${provider}`);
          const data = await response.json();
          
          console.log('[useGeneration] Poll attempt', attempts, 'status:', data.status, 'results:', data.results?.length || 0);

          if (data.status === 'completed' || data.status === 'success') {
            stopPolling();
            
            const resultUrl = data.results?.[0]?.url || data.url || '';
            console.log('[useGeneration] Generation complete! URL:', resultUrl);
            
            const result: GenerationResult = {
              id: generationId,
              url: resultUrl,
              prompt: data.prompt || '',
              mode: data.kind === 'video' ? 'video' : 'image',
              settings: {} as GenerationSettings,
              timestamp: Date.now(),
              previewUrl: resultUrl,
            };
            
            resolve(result);
            return;
          }

          if (data.status === 'failed') {
            console.log('[useGeneration] Generation failed:', data.error);
            stopPolling();
            setError(data.error || 'Генерация не удалась');
            resolve(null);
            return;
          }

          // Update progress
          setProgress({
            stage: data.status === 'queued' ? 'queued' : 'generating',
            progress: Math.min(attempts * 2, 95),
            eta: data.estimatedTime ? `~${data.estimatedTime}с` : undefined,
          });

        } catch (e) {
          console.error('[useGeneration] Poll error:', e);
        }
      }, 1000);
    });
  }, [stopPolling]);

  // Store options in ref to avoid re-creating generate on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const generate = useCallback(async (
    prompt: string,
    mode: GeneratorMode,
    settings: GenerationSettings,
    referenceImage?: string | null
  ): Promise<GenerationResult | null> => {
    if (isGenerating) return null;

    setIsGenerating(true);
    setError(null);
    setProgress({ stage: 'queued', progress: 0 });

    try {
      const endpoint = mode === 'video' ? '/api/generate/video' : '/api/generate/photo';
      
      const body: any = {
        prompt,
        model: settings.model,
        aspectRatio: settings.size,
        negativePrompt: settings.negativePrompt,
        mode: referenceImage ? (mode === 'video' ? 'i2v' : 'i2i') : (mode === 'video' ? 't2v' : 't2i'),
      };

      // Add quality/resolution based on model
      if (settings.quality) {
        body.quality = settings.quality;
      }

      // Add reference image for i2i/i2v
      if (referenceImage) {
        body.referenceImage = referenceImage;
      }

      // Video-specific settings
      if (mode === 'video') {
        body.duration = settings.duration || 5;
        body.audio = settings.audio ?? false;
        if (settings.modelVariant) {
          body.modelVariant = settings.modelVariant;
        }
        if (settings.resolution) {
          body.resolution = settings.resolution;
        }
      }

      // Midjourney-specific settings
      if (settings.model === 'midjourney' && settings.mjSettings) {
        body.mjSettings = settings.mjSettings;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ошибка генерации');
      }

      // Notify about credits used
      if (data.creditCost && optionsRef.current.onCreditsUsed) {
        optionsRef.current.onCreditsUsed(data.creditCost);
      }

      // If already completed (e.g., OpenAI)
      if (data.status === 'completed' && data.results?.[0]?.url) {
        const result: GenerationResult = {
          id: data.generationId || data.jobId,
          url: data.results[0].url,
          prompt,
          mode,
          settings,
          timestamp: Date.now(),
          previewUrl: data.results[0].url,
        };
        
        setProgress(null);
        optionsRef.current.onSuccess?.(result);
        
        // Send browser notification if enabled
        if (optionsRef.current.enableNotifications !== false) {
          notificationService.showGenerationComplete(mode, prompt);
        }
        
        return result;
      }

      // Poll for completion
      console.log('[useGeneration] Starting job poll. jobId:', data.jobId, 'generationId:', data.generationId);
      setProgress({ stage: 'generating', progress: 10 });
      const result = await pollJobStatus(data.jobId, data.generationId, data.provider || 'kie_market');

      console.log('[useGeneration] Poll finished. Result:', result ? 'SUCCESS' : 'NULL', 'URL:', result?.url);

      if (result) {
        result.prompt = prompt;
        result.settings = settings;
        result.mode = mode;
        console.log('[useGeneration] Calling onSuccess with result');
        optionsRef.current.onSuccess?.(result);
        
        // Send browser notification if enabled
        if (optionsRef.current.enableNotifications !== false) {
          notificationService.showGenerationComplete(mode, prompt);
        }
      }

      return result;

    } catch (e: any) {
      const errorMessage = e.message || 'Неизвестная ошибка';
      setError(errorMessage);
      optionsRef.current.onError?.(errorMessage);
      
      // Send error notification if enabled
      if (optionsRef.current.enableNotifications !== false) {
        notificationService.showGenerationError(errorMessage);
      }
      
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [isGenerating, pollJobStatus]);

  const cancel = useCallback(() => {
    stopPolling();
    setIsGenerating(false);
    setProgress(null);
  }, [stopPolling]);

  return {
    generate,
    cancel,
    isGenerating,
    progress,
    error,
    clearError: () => setError(null),
  };
}

