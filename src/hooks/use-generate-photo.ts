import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGeneratorStore } from '@/stores/generator-store';
import { toast } from 'sonner';
import { PHOTO_MODELS } from '@/lib/models';

interface GeneratePhotoParams {
  prompt: string;
  model: string;
  aspectRatio: string;
  variants: number;
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
}

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  model: string;
}

// Create generation record in DB
async function createGenerationRecord(params: {
  type: 'photo' | 'video' | 'product';
  modelId: string;
  modelName: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  variants: number;
  cfgScale?: number;
  steps?: number;
  taskId?: string;
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
    
    const data = await response.json();
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
    await fetch(`/api/generations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
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
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  const data = await response.json();
  
  // Poll for results if async
  if (data.jobId) {
    // Update DB record with task ID
    if (dbRecordId) {
      await updateGenerationRecord(dbRecordId, { status: 'processing' });
    }
    
    return pollForResults(data.jobId, onProgress, dbRecordId);
  }

  return data.results;
}

async function pollForResults(
  jobId: string,
  onProgress?: (progress: number) => void,
  dbRecordId?: string
): Promise<GenerationResult[]> {
  const maxAttempts = 120; // 4 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();

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
  
  const generate = () => {
    if (!store.prompt.trim()) {
      toast.error('Введите промпт');
      return;
    }
    
    generatePhotoMutation.mutate({
      prompt: store.prompt,
      model: store.selectedModel,
      aspectRatio: store.aspectRatio,
      variants: store.variants,
      negativePrompt: store.negativePrompt,
      cfgScale: store.cfgScale,
      steps: store.steps,
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
      // Get model info
      const modelData = PHOTO_MODELS.find(m => m.id === params.model);
      const modelName = modelData?.name || params.model;
      
      // Create DB record first
      const dbRecord = await createGenerationRecord({
        type: 'photo',
        modelId: params.model,
        modelName,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        aspectRatio: params.aspectRatio,
        variants: params.variants,
        cfgScale: params.cfgScale,
        steps: params.steps,
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
