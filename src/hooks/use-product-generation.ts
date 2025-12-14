'use client';

import { useState, useCallback, useRef } from 'react';

interface GenerationParams {
  productImage: File;
  productName: string;
  scene: string;
  templateId?: string;
  aspectRatio?: string;
}

interface GenerationResult {
  taskId: string;
  creditsUsed: number;
  remainingCredits: number;
}

interface GenerationStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  progress: number;
  error?: string;
}

interface UseProductGenerationReturn {
  generate: (params: GenerationParams) => Promise<GenerationResult | null>;
  checkStatus: (taskId: string) => Promise<GenerationStatus | null>;
  isGenerating: boolean;
  isPolling: boolean;
  error: string | null;
  result: GenerationStatus | null;
  startPolling: (taskId: string) => void;
  stopPolling: () => void;
}

export function useProductGeneration(): UseProductGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationStatus | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const generate = useCallback(async (params: GenerationParams): Promise<GenerationResult | null> => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('productImage', params.productImage);
      formData.append('productName', params.productName);
      formData.append('scene', params.scene);
      
      if (params.templateId) {
        formData.append('templateId', params.templateId);
      }
      
      if (params.aspectRatio) {
        formData.append('aspectRatio', params.aspectRatio);
      }

      const response = await fetch('/api/generate/product', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      return {
        taskId: data.taskId,
        creditsUsed: data.creditsUsed,
        remainingCredits: data.remainingCredits,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const checkStatus = useCallback(async (taskId: string): Promise<GenerationStatus | null> => {
    try {
      const response = await fetch(`/api/generate/product/status?taskId=${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Status check failed');
      }

      const status: GenerationStatus = {
        status: data.status,
        imageUrl: data.imageUrl,
        progress: data.progress || 0,
        error: data.error,
      };

      setResult(status);
      return status;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  }, []);

  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setIsPolling(true);
    setResult({ status: 'processing', progress: 0 });

    // Initial check
    checkStatus(taskId);

    // Poll every 2 seconds
    pollingRef.current = setInterval(async () => {
      const status = await checkStatus(taskId);
      
      if (status?.status === 'completed' || status?.status === 'failed') {
        stopPolling();
      }
    }, 2000);
  }, [checkStatus]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  return {
    generate,
    checkStatus,
    isGenerating,
    isPolling,
    error,
    result,
    startPolling,
    stopPolling,
  };
}

