'use client';

import { useState, useCallback, useRef } from 'react';
import { GeneratorMode, GenerationSettings, GenerationResult } from '../GeneratorV2';

interface UseGenerationOptions {
  onSuccess?: (result: GenerationResult) => void;
  onError?: (error: string, pendingId?: string) => void;
  onCreditsUsed?: (amount: number) => void;
  onPending?: (pendingResult: GenerationResult) => void;
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store options in ref to avoid dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Track if currently generating
  const isGeneratingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const generate = useCallback(async (
    prompt: string,
    mode: GeneratorMode,
    settings: GenerationSettings,
    referenceImage?: string | null,
    referenceVideo?: string | null,
    videoDuration?: number | null,
    autoTrim?: boolean
  ): Promise<GenerationResult | null> => {
    // Use ref to check if generating
    if (isGeneratingRef.current) return null;
    
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);

    // Create a pending placeholder ID
    const pendingId = `pending_${Date.now()}`;
    
    // Immediately show pending placeholder in history
    const pendingResult: GenerationResult = {
      id: pendingId,
      url: '', // Empty - will be filled on success
      prompt,
      mode,
      settings,
      timestamp: Date.now(),
      status: 'pending',
    };
    optionsRef.current.onPending?.(pendingResult);

    try {
      const endpoint = mode === 'video' ? '/api/generate/video' : '/api/generate/photo';
      
      // Determine mode based on model and inputs
      let generationMode = mode === 'video' ? 't2v' : 't2i';
      if (settings.model === 'kling-motion-control') {
        generationMode = 'i2v'; // Motion Control always uses i2v with video reference
      } else if (referenceImage) {
        generationMode = mode === 'video' ? 'i2v' : 'i2i';
      }
      
      const body: Record<string, unknown> = {
        prompt,
        model: settings.model,
        aspectRatio: settings.size,
        negativePrompt: settings.negativePrompt,
        mode: generationMode,
      };

      if (settings.quality) body.quality = settings.quality;
      if (referenceImage) body.referenceImage = referenceImage;
      
      // For Motion Control: pass reference video with duration info
      if (referenceVideo && settings.model === 'kling-motion-control') {
        body.referenceVideo = referenceVideo;
        if (videoDuration != null) {
          body.videoDuration = videoDuration;
        }
        body.autoTrim = autoTrim ?? true;
      }
      
      if (mode === 'video') {
        body.duration = settings.duration || 5;
        body.audio = settings.audio ?? false;
        if (settings.modelVariant) body.modelVariant = settings.modelVariant;
        if (settings.resolution) body.resolution = settings.resolution;
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
      if (data.creditCost) {
        optionsRef.current.onCreditsUsed?.(data.creditCost);
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
          status: 'success',
          pendingId, // Link to pending placeholder for update
        };
        
        optionsRef.current.onSuccess?.(result);
        return result;
      }

      // Poll for completion
      const result = await new Promise<GenerationResult | null>((resolve) => {
        let attempts = 0;
        const maxAttempts = 120;
        const jobId = data.jobId;
        const generationId = data.generationId;
        const provider = data.provider || 'kie_market';

        pollIntervalRef.current = setInterval(async () => {
          attempts++;
          
          if (attempts > maxAttempts) {
            stopPolling();
            setError('Таймаут генерации');
            resolve(null);
            return;
          }

          try {
            const res = await fetch(`/api/jobs/${jobId}?provider=${provider}`);
            const jobData = await res.json();

            if (jobData.status === 'completed' || jobData.status === 'success') {
              stopPolling();
              resolve({
                id: generationId,
                url: jobData.results?.[0]?.url || jobData.url || '',
                prompt,
                mode,
                settings,
                timestamp: Date.now(),
                status: 'success',
                pendingId, // Link to pending placeholder for update
              });
              return;
            }

            if (jobData.status === 'failed') {
              stopPolling();
              setError(jobData.error || 'Генерация не удалась');
              resolve(null);
              return;
            }
          } catch (e) {
            console.error('Poll error:', e);
          }
        }, 1000);
      });

      if (result) {
        optionsRef.current.onSuccess?.(result);
      }

      return result;

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Неизвестная ошибка';
      setError(errorMessage);
      optionsRef.current.onError?.(errorMessage, pendingId);
      return null;
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [stopPolling]);

  return {
    generate,
    cancel,
    isGenerating,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
