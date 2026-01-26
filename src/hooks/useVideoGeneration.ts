/**
 * Hook for video generation with polling
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { VideoGenerationParams, VideoStatus } from '@/types/video-generator';

interface UseVideoGenerationOptions {
  onSuccess?: (videoUrl: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

interface UseVideoGenerationReturn {
  generate: (params: VideoGenerationParams) => Promise<void>;
  cancel: () => void;
  isGenerating: boolean;
  progress: number;
  status: VideoStatus;
  resultUrl: string | null;
  error: string | null;
  jobId: string | null;
}

export function useVideoGeneration(options: UseVideoGenerationOptions = {}): UseVideoGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<VideoStatus>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cancel generation
  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    stopPolling();
    setIsGenerating(false);
    setStatus('idle');
    setProgress(0);
    toast.info('Генерация отменена');
  }, [stopPolling]);

  // Poll job status
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      const maxAttempts = 60; // 3 minutes max
      let attempts = 0;

      const poll = async () => {
        if (isCancelledRef.current) {
          stopPolling();
          return;
        }

        try {
          const response = await fetch(`/api/jobs/${jobId}`);

          if (!response.ok) {
            throw new Error('Failed to fetch job status');
          }

          const data = await response.json();

          // Update progress
          if (typeof data.progress === 'number') {
            setProgress(data.progress);
            options.onProgress?.(data.progress);
          }

          // Check status
          if (data.status === 'completed' || data.status === 'success') {
            stopPolling();
            setIsGenerating(false);
            setStatus('success');
            setProgress(100);
            setResultUrl(data.resultUrl || data.videoUrl || null);

            if (data.resultUrl || data.videoUrl) {
              options.onSuccess?.(data.resultUrl || data.videoUrl);
              toast.success('Видео готово!');
            } else {
              const errorMsg = 'Видео сгенерировано, но URL не получен';
              setError(errorMsg);
              setStatus('error');
              options.onError?.(errorMsg);
              toast.error(errorMsg);
            }
            return;
          }

          if (data.status === 'failed' || data.status === 'error') {
            stopPolling();
            setIsGenerating(false);
            setStatus('error');
            const errorMsg = data.error || 'Ошибка генерации';
            setError(errorMsg);
            options.onError?.(errorMsg);
            toast.error(errorMsg);
            return;
          }

          // Still processing
          if (data.status === 'processing' && status !== 'processing') {
            setStatus('processing');
          }

          // Check max attempts
          attempts++;
          if (attempts >= maxAttempts) {
            stopPolling();
            setIsGenerating(false);
            setStatus('error');
            const errorMsg = 'Превышено время ожидания (3 минуты)';
            setError(errorMsg);
            options.onError?.(errorMsg);
            toast.error(errorMsg);
          }
        } catch (err) {
          console.error('[useVideoGeneration] Polling error:', err);
          // Don't stop on polling errors, continue trying
        }
      };

      // Start polling (every 3 seconds)
      pollingIntervalRef.current = setInterval(poll, 3000);

      // Initial poll
      poll();
    },
    [status, options, stopPolling]
  );

  // Generate video
  const generate = useCallback(
    async (params: VideoGenerationParams) => {
      // Reset state
      isCancelledRef.current = false;
      setIsGenerating(true);
      setProgress(0);
      setStatus('queued');
      setResultUrl(null);
      setError(null);
      setJobId(null);

      try {
        // Prepare request body
        // Map UI mode to API mode
        let apiMode: string;
        switch (params.mode) {
          case 'text':
            apiMode = 't2v';
            break;
          case 'image':
            apiMode = 'i2v';
            break;
          case 'v2v':
            apiMode = 'v2v';
            break;
          case 'reference':
            // Detect if start/end frames or reference video
            apiMode = params.startFrame && params.endFrame ? 'start_end' : 'v2v';
            break;
          case 'motion':
            apiMode = 'motion';
            break;
          case 'edit':
            apiMode = 'edit';
            break;
          default:
            apiMode = 't2v';
        }

        const requestBody: any = {
          model: params.selectedModel,
          prompt: params.prompt,
          mode: apiMode,
          duration: params.duration,
          quality: params.quality,
          aspectRatio: params.aspectRatio,
          audio: params.withSound,
          variants: 1,
        };

        // Add reference files based on mode
        if (params.mode === 'image' && params.referenceImage) {
          requestBody.referenceImage = params.referenceImage;
        }

        if (params.mode === 'reference') {
          if (params.startFrame && params.endFrame) {
            // Start/End Frame mode
            requestBody.startFrame = params.startFrame;
            requestBody.endFrame = params.endFrame;
          } else if (params.referenceVideo) {
            // Reference video mode
            requestBody.referenceVideo = params.referenceVideo;
          }
        }

        // V2V mode
        if (params.mode === 'v2v' && params.v2vInputVideo) {
          requestBody.inputVideo = params.v2vInputVideo;
        }

        // Motion Control mode (Kling Motion)
        if (params.mode === 'motion') {
          if (params.motionVideo) {
            requestBody.motionVideo = params.motionVideo;
          }
          if (params.characterImage) {
            requestBody.characterImage = params.characterImage;
          }
        }

        // Video Edit mode (Kling O1 Edit)
        if (params.mode === 'edit') {
          if (params.editVideo) {
            requestBody.editVideo = params.editVideo;
          }
          if (params.editRefImage) {
            requestBody.editRefImage = params.editRefImage;
          }
          if (typeof params.keepAudio === 'boolean') {
            requestBody.keepAudio = params.keepAudio;
          }
        }

        // Phase 2: Advanced settings
        if (params.negativePrompt && params.negativePrompt.trim()) {
          requestBody.negativePrompt = params.negativePrompt.trim();
        }

        if (params.modelVariant && params.modelVariant.trim()) {
          requestBody.modelVariant = params.modelVariant;
        }

        if (params.resolution && params.resolution.trim()) {
          requestBody.resolution = params.resolution;
        }

        if (params.soundPreset && params.soundPreset.trim()) {
          requestBody.soundPreset = params.soundPreset;
        }

        // Call API
        console.log('[useVideoGeneration] Request body:', {
          model: requestBody.model,
          prompt: requestBody.prompt,
          mode: requestBody.mode,
          duration: requestBody.duration,
          quality: requestBody.quality,
          aspectRatio: requestBody.aspectRatio,
          hasReferenceImage: !!requestBody.referenceImage,
          referenceImageSize: requestBody.referenceImage?.length,
        });

        const response = await fetch('/api/generate/video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[useVideoGeneration] Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[useVideoGeneration] Error response:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check if generation succeeded
        if (!data.success || !data.jobId) {
          throw new Error(data.error || 'Failed to start generation');
        }

        // Start polling
        setJobId(data.jobId);
        setStatus('queued');
        toast.loading('Генерация началась...', { id: 'video-gen' });

        await pollJobStatus(data.jobId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
        console.error('[useVideoGeneration] Generation error:', err);

        setIsGenerating(false);
        setStatus('error');
        setError(errorMsg);
        options.onError?.(errorMsg);
        toast.error(errorMsg);
      } finally {
        toast.dismiss('video-gen');
      }
    },
    [pollJobStatus, options]
  );

  return {
    generate,
    cancel,
    isGenerating,
    progress,
    status,
    resultUrl,
    error,
    jobId,
  };
}
