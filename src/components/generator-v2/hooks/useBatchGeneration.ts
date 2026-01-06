'use client';

import { useState, useCallback, useRef } from 'react';
import { GenerationSettings, GenerationResult } from '../GeneratorV2';
import type { UploadedImage } from '../BatchImageUploader';

export interface BatchResult {
  generationId: string;
  clientId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  imageUrl?: string;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  status: 'idle' | 'processing' | 'completed';
  isComplete: boolean;
}

interface UseBatchGenerationOptions {
  onProgress?: (progress: BatchProgress) => void;
  onComplete?: (results: BatchResult[]) => void;
  onError?: (error: string) => void;
  onCreditsUsed?: (amount: number) => void;
}

export function useBatchGeneration(options: UseBatchGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    status: 'idle',
    isComplete: false,
  });
  const [results, setResults] = useState<BatchResult[]>([]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGeneratingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const generateBatch = useCallback(async (
    prompt: string,
    images: UploadedImage[],
    settings: GenerationSettings
  ): Promise<BatchResult[] | null> => {
    if (isGeneratingRef.current) return null;
    if (!images.length) {
      setError('No images provided');
      return null;
    }

    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);
    setResults([]);
    setProgress({
      total: images.length,
      completed: 0,
      failed: 0,
      pending: images.length,
      status: 'processing',
      isComplete: false,
    });

    try {
      // 1. Send batch request
      const response = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: settings.model,
          quality: settings.quality,
          aspectRatio: settings.size,
          negativePrompt: settings.negativePrompt,
          images: images.map(img => ({
            id: img.id,
            data: img.preview,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Batch generation failed');
      }

      const { batchId, jobs, totalCost } = data;

      // Notify about credits used
      if (totalCost) {
        optionsRef.current.onCreditsUsed?.(totalCost);
      }

      // Initialize results
      const jobIds = jobs.map((j: { generationId: string }) => j.generationId).join(',');
      
      // 2. Poll for completion
      const finalResults = await new Promise<BatchResult[]>((resolve) => {
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes at 1s intervals

        pollIntervalRef.current = setInterval(async () => {
          attempts++;

          if (attempts > maxAttempts) {
            stopPolling();
            setError('Batch generation timeout');
            resolve([]);
            return;
          }

          try {
            const statusRes = await fetch(`/api/generate/batch?batchId=${batchId}&jobIds=${jobIds}`);
            const statusData = await statusRes.json();

            if (!statusRes.ok) {
              console.error('Batch status error:', statusData);
              return;
            }

            const { results: batchResults, summary, isComplete } = statusData;

            // Update progress
            const newProgress: BatchProgress = {
              total: summary.total,
              completed: summary.completed,
              failed: summary.failed,
              pending: summary.pending,
              status: isComplete ? 'completed' : 'processing',
              isComplete,
            };
            setProgress(newProgress);
            optionsRef.current.onProgress?.(newProgress);

            // Update results
            setResults(batchResults);

            if (isComplete) {
              stopPolling();
              resolve(batchResults);
            }
          } catch (e) {
            console.error('Batch poll error:', e);
          }
        }, 2000); // Poll every 2 seconds
      });

      if (finalResults.length > 0) {
        optionsRef.current.onComplete?.(finalResults);
      }

      return finalResults;

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMessage);
      optionsRef.current.onError?.(errorMessage);
      return null;
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
      setProgress(prev => ({ ...prev, status: 'completed', isComplete: true }));
    }
  }, [stopPolling]);

  const cancel = useCallback(() => {
    stopPolling();
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setProgress(prev => ({ ...prev, status: 'idle', isComplete: true }));
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setError(null);
    setResults([]);
    setProgress({
      total: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      status: 'idle',
      isComplete: false,
    });
  }, [stopPolling]);

  return {
    generateBatch,
    cancel,
    reset,
    isGenerating,
    error,
    progress,
    results,
    clearError: useCallback(() => setError(null), []),
  };
}







