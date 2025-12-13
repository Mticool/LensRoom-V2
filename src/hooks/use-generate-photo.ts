import { useMutation } from '@tanstack/react-query';
import { useGeneratorStore } from '@/stores/generator-store';
import { toast } from 'sonner';

interface GeneratePhotoParams {
  prompt: string;
  model: string;
  aspectRatio: string;
  variants: number;
}

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  model: string;
}

async function generatePhoto(params: GeneratePhotoParams): Promise<GenerationResult[]> {
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
    return pollForResults(data.jobId);
  }

  return data.results;
}

async function pollForResults(jobId: string): Promise<GenerationResult[]> {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();

    if (data.status === 'completed') {
      return data.results;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Generation timeout');
}

export function useGenerateFromStore() {
  const store = useGeneratorStore();
  
  const generatePhoto = useGeneratePhoto();
  
  const canGenerate = store.prompt.trim().length > 0 && !generatePhoto.isPending;
  
  const generate = () => {
    if (!store.prompt.trim()) {
      toast.error('Введите промпт');
      return;
    }
    
    generatePhoto.mutate({
      prompt: store.prompt,
      model: store.selectedModel,
      aspectRatio: store.aspectRatio,
      variants: store.variants,
    });
  };
  
  return {
    generate,
    isGenerating: generatePhoto.isPending,
    canGenerate,
  };
}

export function useGeneratePhoto() {
  const { 
    startGeneration,
    updateProgress,
    completeGeneration,
    failGeneration,
  } = useGeneratorStore();

  return useMutation({
    mutationFn: generatePhoto,
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
    },
    onError: (error: Error) => {
      failGeneration(error.message);
      toast.error(error.message);
    },
  });
}

