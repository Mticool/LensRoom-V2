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
            
            // Check for video URL in multiple formats
            const videoUrl = data.resultUrl || data.videoUrl || data.results?.[0]?.url || null;
            setResultUrl(videoUrl);

            if (videoUrl) {
              options.onSuccess?.(videoUrl);
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
            // Reference maps to start_end (frames) or v2v (video)
            if (params.startFrame || params.endFrame) {
              apiMode = 'start_end'; // Start/end frames (at least one)
            } else if (params.referenceVideo) {
              apiMode = 'v2v'; // Reference video
            } else {
              apiMode = 'start_end'; // Default to start_end for reference mode
            }
            break;
          case 'motion':
            apiMode = 'motion';
            break;
          case 'edit':
            apiMode = 'edit';
            break;
          case 'extend':
            apiMode = 'extend';
            break;
          default:
            apiMode = 't2v';
        }

        // Motion Control: API expects model kling-motion-control, referenceVideo, referenceImage, characterOrientation, videoDuration
        const isMotion = params.mode === 'motion';
        const requestBody: any = {
          model: isMotion ? 'kling-motion-control' : params.selectedModel,
          prompt: params.prompt,
          mode: isMotion ? 'motion_control' : apiMode,
          duration: params.duration,
          quality: params.quality,
          aspectRatio: params.aspectRatio,
          audio: params.withSound,
          variants: 1,
        };
        if (params.style) requestBody.style = params.style;
        if (params.cameraMotion) requestBody.cameraMotion = params.cameraMotion;
        if (params.stylePreset) requestBody.stylePreset = params.stylePreset;
        if (typeof params.motionStrength === 'number') requestBody.motionStrength = params.motionStrength;
        if (isMotion) {
          requestBody.referenceVideo = params.motionVideo;
          requestBody.referenceImage = params.characterImage;
          if (params.characterOrientation) requestBody.characterOrientation = params.characterOrientation;
          if (params.videoDuration != null) requestBody.videoDuration = params.videoDuration;
          if (params.quality) requestBody.resolution = params.quality;
          if (params.cameraControl) requestBody.cameraControl = params.cameraControl;
        }
        if (params.cfgScale !== undefined) {
          requestBody.cfgScale = params.cfgScale;
        }
        if (params.qualityTier) {
          requestBody.qualityTier = params.qualityTier;
        }

        // Add reference files based on mode
        if (params.mode === 'image') {
          // For i2v: use start/end frames if provided, else referenceImage
          if (params.startFrame || params.endFrame) {
            if (params.startFrame) requestBody.startImage = params.startFrame;
            if (params.endFrame) requestBody.endImage = params.endFrame;
          } else if (params.referenceImage) {
            requestBody.referenceImage = params.referenceImage;
          }
        }

        // Veo 3.1 reference images (array of up to 3 images)
        if (params.referenceImages && params.referenceImages.length > 0) {
          requestBody.referenceImages = params.referenceImages;
        }

        if (params.mode === 'reference') {
          if (params.startFrame || params.endFrame) {
            // Start/End Frame mode - API expects startImage/endImage
            if (params.startFrame) requestBody.startImage = params.startFrame;
            if (params.endFrame) requestBody.endImage = params.endFrame;
          } else if (params.referenceVideo) {
            // Reference video mode
            requestBody.referenceVideo = params.referenceVideo;
          }
        }

        // V2V mode
        if (params.mode === 'v2v' && params.v2vInputVideo) {
          requestBody.videoUrl = params.v2vInputVideo;
        }

        // Motion Control: referenceVideo and referenceImage already set above when isMotion

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

        // Extend mode (Veo 3.1 продление видео)
        if (params.mode === 'extend') {
          if (params.sourceGenerationId) {
            requestBody.sourceGenerationId = params.sourceGenerationId;
          }
          if (params.taskId) {
            requestBody.taskId = params.taskId;
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

        setJobId(data.jobId);

        // Check if video already completed (LaoZhang sync response)
        const videoUrl = data.resultUrl || data.videoUrl || data.results?.[0]?.url;
        if (data.status === 'completed' && videoUrl) {
          console.log('[useVideoGeneration] Video ready immediately:', videoUrl);
          setIsGenerating(false);
          setStatus('success');
          setProgress(100);
          setResultUrl(videoUrl);
          options.onSuccess?.(videoUrl);
          toast.success('Видео готово!');
          return;
        }

        // Start polling for async providers (KIE)
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
