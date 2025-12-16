import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGeneratorStore } from '@/stores/generator-store';
import { toast } from 'sonner';

interface GeneratePhotoParams {
  prompt: string;
  model: string;
  aspectRatio: string;
  variants: number;
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
  // i2i support
  mode?: 't2i' | 'i2i';
  referenceImage?: string | null;
  // quality/resolution passthrough
  quality?: string;
  resolution?: string;
}

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  model: string;
}

async function safeReadJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || text.trim() === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

// Create generation record in DB
async function createGenerationRecord(params: {
  type: 'photo' | 'video' | 'product';
  modelId: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ id: string } | null> {
  try {
    const response = await fetch('/api/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      console.warn('[Generation] Failed to create DB record');
      return null;
    }
    
    const data = await safeReadJson(response);
    if (!data?.generation?.id) return null;
    return { id: data.generation.id };
  } catch (error) {
    console.warn('[Generation] Failed to create DB record:', error);
    return null;
  }
}

// Update generation record in DB
async function updateGenerationRecord(
  id: string,
  update: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    results?: { url: string; thumbnail?: string }[];
    creditsUsed?: number;
  }
): Promise<void> {
  try {
    await fetch(`/api/generations`, {
      method: "PATCH",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...update }),
    });
  } catch (error) {
    console.warn('[Generation] Failed to update DB record:', error);
  }
}

async function generatePhoto(
  params: GeneratePhotoParams,
  onProgress?: (progress: number) => void,
  dbRecordId?: string
): Promise<GenerationResult[]> {
  const response = await fetch('/api/generate/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await safeReadJson(response);
    throw new Error(error?.error || 'Generation failed');
  }

  const data = await safeReadJson(response);
  if (!data) throw new Error('Empty response from server');
  
  // Poll for results if async
  if (data.jobId) {
    // Update DB record with task ID
    if (dbRecordId) {
      await updateGenerationRecord(dbRecordId, { status: 'processing' });
    }
    
    return pollForResults(data.jobId, onProgress, dbRecordId, data.provider);
  }

  return data.results;
}

async function pollForResults(
  jobId: string,
  onProgress?: (progress: number) => void,
  dbRecordId?: string,
  provider?: string
): Promise<GenerationResult[]> {
  const maxAttempts = 120; // 4 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const qs = provider ? `?kind=image&provider=${encodeURIComponent(provider)}` : '';
    const response = await fetch(`/api/jobs/${jobId}${qs}`);
    const data = await safeReadJson(response);
    if (!response.ok) {
      throw new Error(data?.error || `Job status error (${response.status})`);
    }

    // Update progress
    if (data.progress && onProgress) {
      onProgress(data.progress);
    }

    if (data.status === 'completed') {
      // Update DB record with results
      if (dbRecordId && data.results) {
        await updateGenerationRecord(dbRecordId, {
          status: 'completed',
          results: data.results.map((r: GenerationResult) => ({
            url: r.url,
            thumbnail: r.url,
          })),
          creditsUsed: data.creditsUsed || 0,
        });
      }
      
      return data.results;
    }

    if (data.status === 'failed') {
      // Update DB record with failed status
      if (dbRecordId) {
        await updateGenerationRecord(dbRecordId, { status: 'failed' });
      }
      
      throw new Error(data.error || 'Generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  // Timeout
  if (dbRecordId) {
    await updateGenerationRecord(dbRecordId, { status: 'failed' });
  }
  
  throw new Error('Generation timeout');
}

export function useGenerateFromStore() {
  const store = useGeneratorStore();
  const generatePhotoMutation = useGeneratePhoto();
  
  const canGenerate = store.prompt.trim().length > 0 && !generatePhotoMutation.isPending;
  
  const generate = (overrides?: Partial<GeneratePhotoParams>) => {
    const prompt = overrides?.prompt ?? store.prompt;
    if (!prompt.trim()) {
      toast.error('Введите промпт');
      return;
    }
    
    generatePhotoMutation.mutate({
      prompt,
      model: overrides?.model ?? store.selectedModel,
      aspectRatio: overrides?.aspectRatio ?? store.aspectRatio,
      variants: overrides?.variants ?? store.variants,
      negativePrompt: overrides?.negativePrompt ?? store.negativePrompt,
      cfgScale: overrides?.cfgScale ?? store.cfgScale,
      steps: overrides?.steps ?? store.steps,
      mode: overrides?.mode ?? (store as any).mode,
      referenceImage: overrides?.referenceImage ?? (store as any).referenceImage,
      quality: overrides?.quality,
      resolution: overrides?.resolution,
    });
  };
  
  return {
    generate,
    isGenerating: generatePhotoMutation.isPending,
    canGenerate,
  };
}

export function useGeneratePhoto() {
  const queryClient = useQueryClient();
  const { 
    prompt,
    selectedModel,
    aspectRatio,
    variants,
    negativePrompt,
    cfgScale,
    steps,
    startGeneration,
    updateProgress,
    completeGeneration,
    failGeneration,
  } = useGeneratorStore();

  return useMutation({
    mutationFn: async (params: GeneratePhotoParams) => {
      // Create DB record first
      const dbRecord = await createGenerationRecord({
        type: 'photo',
        modelId: params.model,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
      });
      
      // Generate with progress callback
      return generatePhoto(
        params,
        (progress) => updateProgress(progress),
        dbRecord?.id
      );
    },
    onMutate: () => {
      startGeneration();
      toast.info('Генерация началась...');
    },
    onSuccess: (results) => {
      const formattedResults = results.map(result => ({
        id: result.id,
        url: result.url,
        thumbnail: result.url,
        prompt: result.prompt,
        model: result.model,
        contentType: 'photo' as const,
        width: 1024,
        height: 1024,
        createdAt: new Date(),
        isFavorite: false,
      }));
      
      completeGeneration(formattedResults);
      toast.success(`Сгенерировано ${results.length} изображений!`);
      
      // Invalidate generations cache to refresh history
      queryClient.invalidateQueries({ queryKey: ['generations'] });
    },
    onError: (error: Error) => {
      failGeneration(error.message);
      toast.error(error.message);
    },
  });
}
