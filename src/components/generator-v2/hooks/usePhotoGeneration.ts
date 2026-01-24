'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useHistory } from './useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import type { GenerationResult, GenerationSettings, GeneratorMode } from '../GeneratorV2';

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export interface PhotoGenerationConfig {
  modelId: string;
  modelName: string;
  /** Quality mapping: UI labels → API values */
  qualityMapping: Record<string, string>;
  /** Cost per image by quality */
  costPerImage: Record<string, number> | number;
  /** Default quality option */
  defaultQuality: string;
  /** Default aspect ratio */
  defaultAspectRatio?: string;
  /** Whether this is a tool (like upscale/remove bg) that requires image input */
  isTool?: boolean;
  /** Filter history by this model ID (undefined = show all) */
  historyModelId?: string;
  /** Callback when auth is required (e.g., to show login popup) */
  onRequireAuth?: () => void;
}

export interface PhotoGenerationState {
  prompt: string;
  aspectRatio: string;
  quality: string;
  quantity: number;
  outputFormat: 'png' | 'jpg' | 'webp';
  referenceImage: string | null;
  referenceFile: File | null;
  negativePrompt: string;
  seed: number | null;
  steps: number;
  isGenerating: boolean;
  images: GenerationResult[];
}

export interface PhotoGenerationActions {
  setPrompt: (value: string) => void;
  setAspectRatio: (value: string) => void;
  setQuality: (value: string) => void;
  setQuantity: (value: number) => void;
  setOutputFormat: (value: 'png' | 'jpg' | 'webp') => void;
  setReferenceImage: (value: string | null) => void;
  setReferenceFile: (value: File | null) => void;
  setNegativePrompt: (value: string) => void;
  setSeed: (value: number | null) => void;
  setSteps: (value: number) => void;
  handleGenerate: () => Promise<void>;
  handleRegenerate: (prompt: string, settings: GenerationSettings) => void;
  validateReferenceImage: (file: File) => Promise<{ valid: boolean; error?: string; base64?: string }>;
}

export interface UsePhotoGenerationReturn extends PhotoGenerationState, PhotoGenerationActions {
  // Auth
  isAuthenticated: boolean;
  authLoading: boolean;
  credits: number;
  
  // History
  history: GenerationResult[];
  historyLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refreshHistory: () => void;
  
  // Computed
  estimatedCost: number;
  allImages: GenerationResult[];
  canGenerate: boolean;
}

/**
 * Retry wrapper for async functions
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; onRetry?: (attempt: number, error: Error) => void } = {}
): Promise<T> {
  const { maxRetries = MAX_RETRIES, delayMs = RETRY_DELAY_MS, onRetry } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx) except 429
      if (error instanceof Response && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise(r => setTimeout(r, delayMs * attempt)); // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

/**
 * Validate reference image file
 */
export async function validateReferenceImage(
  file: File
): Promise<{ valid: boolean; error?: string; base64?: string }> {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Выберите изображение (PNG, JPG, WEBP)' };
  }
  
  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Максимальный размер файла: ${MAX_IMAGE_SIZE_MB}МБ. Ваш файл: ${(file.size / 1024 / 1024).toFixed(1)}МБ` 
    };
  }
  
  // Convert to base64
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      
      // Check base64 size (some browsers may produce large base64)
      if (base64.length > MAX_IMAGE_SIZE_BYTES * 1.4) { // Base64 is ~1.33x larger
        resolve({ 
          valid: false, 
          error: 'Изображение слишком большое после кодирования. Попробуйте уменьшить размер.' 
        });
        return;
      }
      
      resolve({ valid: true, base64 });
    };
    reader.onerror = () => {
      resolve({ valid: false, error: 'Не удалось прочитать файл' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Common hook for photo generation with retry logic and validation
 */
export function usePhotoGeneration(config: PhotoGenerationConfig): UsePhotoGenerationReturn {
  const {
    modelId,
    modelName,
    qualityMapping,
    costPerImage,
    defaultQuality,
    defaultAspectRatio = '1:1',
    isTool = false,
    historyModelId,
    onRequireAuth,
  } = config;
  
  // Auth
  const { isAuthenticated, isLoading: authLoading, credits, refreshCredits } = useAuth();
  
  // History
  const {
    history,
    isLoading: historyLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh: refreshHistory,
    invalidateCache,
    addToHistory,
  } = useHistory('image', historyModelId);
  
  // State
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [quality, setQuality] = useState(defaultQuality);
  const [quantity, setQuantity] = useState(1);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GenerationResult[]>([]);
  
  // Polling ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Computed values
  const estimatedCost = useMemo(() => {
    const baseCost = typeof costPerImage === 'number' 
      ? costPerImage 
      : (costPerImage[quality] || 0);
    return baseCost * quantity;
  }, [costPerImage, quality, quantity]);
  
  // Oldest → newest. New generations should appear at the bottom.
  const allImages = useMemo(() => [...history, ...images], [history, images]);
  
  const canGenerate = useMemo(() => {
    if (!isAuthenticated) return false;
    if (credits < estimatedCost) return false;
    if (isTool && !referenceImage) return false;
    if (!isTool && !prompt.trim()) return false;
    return true;
  }, [isAuthenticated, credits, estimatedCost, isTool, referenceImage, prompt]);
  
  // Validate and set reference image
  const handleValidateReferenceImage = useCallback(async (file: File) => {
    const result = await validateReferenceImage(file);
    if (result.valid && result.base64) {
      setReferenceImage(result.base64);
      setReferenceFile(file);
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }, []);
  
  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string, pendingIds: string[]) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();
        
        if (data.status === 'completed' && data.urls) {
          const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
            id: `${Date.now()}-${i}`,
            url,
            prompt,
            mode: 'image' as GeneratorMode,
            settings: {
              model: modelId,
              size: aspectRatio,
              quality: qualityMapping[quality],
            },
            timestamp: Date.now(),
          }));
          
          setImages(prev => {
            const filtered = prev.filter(img => !img.id.startsWith('pending-'));
            return [...filtered, ...newImages];
          });
          
          celebrateGeneration();
          toast.success(`Создано ${newImages.length} ${newImages.length === 1 ? 'изображение' : 'изображений'}!`);
          
          await refreshCredits();
          invalidateCache();
          refreshHistory();
        } else if (data.status === 'failed') {
          toast.error(data.error || 'Ошибка генерации');
          setImages(prev => prev.filter(img => !pendingIds.includes(img.id)));
        } else if (data.status === 'processing' || data.status === 'pending') {
          pollingTimeoutRef.current = setTimeout(poll, 3000);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Polling error:', error);
        }
        pollingTimeoutRef.current = setTimeout(poll, 5000);
      }
    };
    
    await poll();
  }, [prompt, aspectRatio, quality, qualityMapping, modelId, refreshCredits, invalidateCache, refreshHistory]);
  
  // Main generation function
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    
    if (!canGenerate) {
      if (isTool && !referenceImage) {
        toast.error('Загрузите изображение');
      } else if (!isTool && !prompt.trim()) {
        toast.error('Введите описание');
      } else if (credits < estimatedCost) {
        toast.error(`Недостаточно звёзд. Нужно ${estimatedCost}⭐, у вас ${credits}⭐`);
      }
      return;
    }
    
    setIsGenerating(true);
    
    // Create pending placeholders
    const pendingImages: GenerationResult[] = Array.from({ length: quantity }, (_, i) => ({
      id: `pending-${Date.now()}-${i}`,
      url: '',
      prompt,
      mode: 'image' as GeneratorMode,
      settings: {
        model: modelId,
        size: aspectRatio,
        quality: qualityMapping[quality],
      },
      timestamp: Date.now(),
      status: 'pending',
    }));
    
    // Add pending placeholders at the end (bottom of gallery)
    setImages(prev => [...prev, ...pendingImages]);
    
    try {
      const response = await withRetry(
        async () => {
          const res = await fetch('/api/generate/photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompt || undefined,
              model: modelId,
              negativePrompt: negativePrompt || undefined,
              aspectRatio,
              quality: qualityMapping[quality],
              variants: quantity,
              seed: seed || undefined,
              steps,
              mode: referenceImage ? 'i2i' : 't2i',
              referenceImage: referenceImage || undefined,
              outputFormat,
            }),
          });
          
          if (!res.ok) {
            if (res.status === 429) {
              throw new Error('Слишком много запросов. Подождите минуту.');
            }
            const error = await res.json();
            throw new Error(error.error || 'Ошибка генерации');
          }
          
          return res;
        },
        {
          maxRetries: MAX_RETRIES,
          onRetry: (attempt) => {
            toast.info(`Повторная попытка ${attempt}/${MAX_RETRIES}...`);
          },
        }
      );
      
      const data = await response.json();
      
      // Handle immediate results (parallel generation)
      if (data.status === 'completed' && data.results && data.results.length > 0) {
        const newImages: GenerationResult[] = data.results.map((result: { url: string }, i: number) => ({
          id: `${data.generationId || Date.now()}-${i}`,
          url: result.url,
          prompt,
          mode: 'image' as GeneratorMode,
          settings: {
            model: modelId,
            size: aspectRatio,
            quality: qualityMapping[quality],
          },
          timestamp: Date.now(),
          status: 'completed',
        }));
        
        setImages(prev => {
          const filtered = prev.filter(img => !img.id.startsWith('pending-'));
          return [...filtered, ...newImages];
        });
        
        celebrateGeneration();
        toast.success(`Создано ${newImages.length} ${newImages.length === 1 ? 'изображение' : 'изображений'}!`);
      } else if (data.jobId) {
        // Poll for results (async generation)
        await pollJobStatus(data.jobId, pendingImages.map(img => img.id));
      } else if (data.imageUrl) {
        // Legacy single image response
        const newImage: GenerationResult = {
          id: data.generationId || `gen-${Date.now()}`,
          url: data.imageUrl,
          prompt,
          mode: 'image',
          settings: {
            model: modelId,
            size: aspectRatio,
            quality: qualityMapping[quality],
          },
          timestamp: Date.now(),
          status: 'completed',
        };
        
        setImages(prev => {
          const filtered = prev.filter(img => !img.id.startsWith('pending-'));
          return [...filtered, newImage];
        });
        
        celebrateGeneration();
        toast.success('Изображение создано!');
      }
      
      // Refresh credits and history
      await refreshCredits();
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
  }, [
    isAuthenticated,
    canGenerate,
    isTool,
    referenceImage,
    prompt,
    credits,
    estimatedCost,
    quantity,
    modelId,
    aspectRatio,
    quality,
    qualityMapping,
    negativePrompt,
    seed,
    steps,
    outputFormat,
    onRequireAuth,
    pollJobStatus,
    refreshCredits,
    invalidateCache,
    refreshHistory,
  ]);
  
  // Handle regenerate from history
  const handleRegenerate = useCallback((regeneratePrompt: string, settings: GenerationSettings) => {
    setPrompt(regeneratePrompt);
    if (settings.size) setAspectRatio(settings.size);
    if (settings.quality) {
      // Find UI quality from API value
      const uiQuality = Object.entries(qualityMapping).find(([_, apiVal]) => apiVal === settings.quality)?.[0];
      if (uiQuality) setQuality(uiQuality);
    }
    
    // Scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [qualityMapping]);
  
  return {
    // State
    prompt,
    aspectRatio,
    quality,
    quantity,
    outputFormat,
    referenceImage,
    referenceFile,
    negativePrompt,
    seed,
    steps,
    isGenerating,
    images,
    
    // Actions
    setPrompt,
    setAspectRatio,
    setQuality,
    setQuantity,
    setOutputFormat,
    setReferenceImage,
    setReferenceFile,
    setNegativePrompt,
    setSeed,
    setSteps,
    handleGenerate,
    handleRegenerate,
    validateReferenceImage: handleValidateReferenceImage,
    
    // Auth
    isAuthenticated,
    authLoading,
    credits,
    
    // History
    history,
    historyLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refreshHistory,
    
    // Computed
    estimatedCost,
    allImages,
    canGenerate,
  };
}
