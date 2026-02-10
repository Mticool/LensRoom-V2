'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GeneratorMode, GenerationSettings, GenerationResult } from '../GeneratorV2';
import logger from '@/lib/logger';
import { apiFetch } from '@/lib/api-fetch';
import { fetchWithTimeout, FetchTimeoutError, FetchAbortedError } from '@/lib/api/fetch-with-timeout';

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
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      abortInFlight();
    };
  }, [stopPolling, abortInFlight]);

  const generate = useCallback(async (
    prompt: string,
    mode: GeneratorMode,
    settings: GenerationSettings,
    referenceImage?: string | null,
    referenceVideo?: string | null,
    videoDuration?: number | null,
    autoTrim?: boolean,
    threadId?: string
  ): Promise<GenerationResult | null> => {
    // Prevent concurrent generations (race condition protection)
    if (isGeneratingRef.current) {
      return null;
    }

    // Atomically set generating flag
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);

    // Ensure previous request/poll is cancelled (defensive).
    stopPolling();
    abortInFlight();
    abortControllerRef.current = new AbortController();

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
      if (settings.outputFormat) body.outputFormat = settings.outputFormat;
      if (typeof settings.variants === "number") body.variants = settings.variants;
      if (typeof settings.seed === "number") body.seed = settings.seed;
      if (typeof settings.steps === "number") body.steps = settings.steps;
      if (referenceImage) body.referenceImage = referenceImage;
      if (threadId) body.threadId = threadId;
      
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

      // Some upstreams can take a while to return task ids (especially for photo models under load).
      // Do not fail the whole UX at 90s; keep 2 minutes for photo. Video stays at 30s because most
      // providers return task ids quickly and long work happens async behind the job id.
      const requestTimeoutMs = mode === 'video' ? 30_000 : 120_000;
      const response = await fetchWithTimeout(endpoint, {
        timeout: requestTimeoutMs,
        abortSignal: abortControllerRef.current.signal,
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

      // Poll for completion with adaptive intervals
      const result = await new Promise<GenerationResult | null>((resolve) => {
        let attempts = 0;
        const maxAttempts = 120;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 5;
        const jobId = data.jobId;
        const generationId = data.generationId;
        const provider = data.provider || 'kie_market';

        const poll = async () => {
          attempts++;

          if (abortControllerRef.current?.signal.aborted) {
            stopPolling();
            resolve(null);
            return;
          }

          if (attempts > maxAttempts) {
            stopPolling();
            const msg = 'Таймаут генерации';
            setError(msg);
            optionsRef.current.onError?.(msg, pendingId);
            resolve(null);
            return;
          }

          try {
            // Use optimized fetch with retry and deduplication
            const res = await apiFetch(`/api/jobs/${jobId}?provider=${provider}`, {
              signal: abortControllerRef.current?.signal,
              retry: {
                maxRetries: 2,
                initialDelay: 500,
              },
            });
            const raw = await res.text().catch(() => '');
            let jobData: any = null;
            try {
              jobData = raw ? JSON.parse(raw) : null;
            } catch {
              jobData = { error: raw };
            }

            if (!res.ok) {
              const msg =
                typeof jobData?.error === 'string' && jobData.error.trim()
                  ? jobData.error
                  : `Job status error (${res.status})`;
              throw new Error(msg);
            }

            consecutiveErrors = 0;

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
              const msg = jobData.error || 'Генерация не удалась';
              setError(msg);
              optionsRef.current.onError?.(msg, pendingId);
              resolve(null);
              return;
            }

            // Adaptive polling: start at 1s, gradually increase to 5s
            const baseInterval = 1000;
            const maxInterval = 5000;
            const nextInterval = Math.min(
              baseInterval * Math.pow(1.2, Math.min(attempts, 10)),
              maxInterval
            );

            // Schedule next poll
            pollIntervalRef.current = setTimeout(poll, nextInterval);
          } catch (e) {
            if (abortControllerRef.current?.signal.aborted) {
              stopPolling();
              resolve(null);
              return;
            }

            consecutiveErrors++;
            logger.error('Poll error:', e);

            if (consecutiveErrors >= maxConsecutiveErrors) {
              stopPolling();
              const msg =
                e instanceof FetchTimeoutError
                  ? 'Сервис генерации не отвечает. Попробуйте позже.'
                  : e instanceof Error
                    ? e.message
                    : 'Ошибка получения результата';
              setError(msg);
              optionsRef.current.onError?.(msg, pendingId);
              resolve(null);
              return;
            }

            // On transient error, retry with exponential backoff (capped).
            const errorBackoff = Math.min(1000 * Math.pow(2, Math.min(consecutiveErrors, 6)), 8000);
            pollIntervalRef.current = setTimeout(poll, errorBackoff);
          }
        };

        // Start first poll
        poll();
      });

      if (result) {
        optionsRef.current.onSuccess?.(result);
      }

      return result;

    } catch (e: unknown) {
      if (e instanceof FetchTimeoutError) {
        const msg = 'Сервер долго отвечает. Попробуйте еще раз.';
        setError(msg);
        optionsRef.current.onError?.(msg, pendingId);
        return null;
      }
      if (e instanceof FetchAbortedError) {
        return null;
      }
      const errorMessage = e instanceof Error ? e.message : 'Неизвестная ошибка';
      setError(errorMessage);
      optionsRef.current.onError?.(errorMessage, pendingId);
      return null;
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [stopPolling, abortInFlight]);

  const cancel = useCallback(() => {
    stopPolling();
    abortInFlight();
    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [stopPolling, abortInFlight]);

  return {
    generate,
    cancel,
    isGenerating,
    error,
    clearError: useCallback(() => setError(null), []),
  };
}
