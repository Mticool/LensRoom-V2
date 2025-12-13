"use client";

import { useMutation } from "@tanstack/react-query";
import { useGeneratorStore } from "@/stores/generator-store";
import { toast } from "sonner";
import type { GenerationResult } from "@/types/generator";

interface GeneratePhotoParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  variants: number;
  seed?: number;
  cfgScale?: number;
  steps?: number;
}

interface GeneratePhotoResponse {
  jobId: string;
  status: string;
  estimatedTime: number;
  creditsCost: number;
}

interface JobStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  results?: {
    id: string;
    url: string;
    thumbnail: string;
    width: number;
    height: number;
    seed: number;
  }[];
  error?: string;
}

// Polling function
async function pollJobStatus(
  jobId: string,
  onProgress: (progress: number) => void,
  onComplete: (results: GenerationResult[]) => void,
  onError: (error: string) => void
): Promise<void> {
  const maxAttempts = 150; // 5 minutes with 2s interval
  let attempts = 0;

  const poll = async (): Promise<void> => {
    if (attempts >= maxAttempts) {
      onError("Timeout: generation took too long");
      return;
    }

    attempts++;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data: JobStatusResponse = await response.json();

      if (!response.ok) {
        onError(data.error || "Failed to get status");
        return;
      }

      switch (data.status) {
        case "queued":
        case "processing":
          onProgress(data.progress || 0);
          // Continue polling
          setTimeout(poll, 2000);
          break;

        case "completed":
          if (data.results && data.results.length > 0) {
            const results: GenerationResult[] = data.results.map((r) => ({
              id: r.id,
              url: r.url,
              thumbnail: r.thumbnail,
              prompt: "", // Will be filled by the store
              model: "",
              contentType: "photo" as const,
              width: r.width,
              height: r.height,
              seed: r.seed,
              createdAt: new Date(),
              isFavorite: false,
            }));
            onComplete(results);
          } else {
            onError("No results returned");
          }
          break;

        case "failed":
          onError(data.error || "Generation failed");
          break;

        default:
          onError("Unknown status");
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Network error");
    }
  };

  // Start polling
  await poll();
}

export function useGeneratePhoto() {
  const store = useGeneratorStore();

  const mutation = useMutation({
    mutationFn: async (params: GeneratePhotoParams): Promise<GeneratePhotoResponse> => {
      const response = await fetch("/api/generate/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      return response.json();
    },

    onMutate: () => {
      store.startGeneration();
    },

    onSuccess: async (data, variables) => {
      toast.success("Генерация началась!", {
        description: `Примерное время: ${data.estimatedTime} сек`,
      });

      // Start polling
      await pollJobStatus(
        data.jobId,
        // onProgress
        (progress) => {
          store.updateProgress(progress);
        },
        // onComplete
        (results) => {
          // Enrich results with prompt and model info
          const enrichedResults = results.map((r) => ({
            ...r,
            prompt: variables.prompt,
            negativePrompt: variables.negativePrompt,
            model: variables.model,
          }));
          
          store.completeGeneration(enrichedResults);
          toast.success("Готово! 🎉", {
            description: `Создано ${results.length} изображений`,
          });
        },
        // onError
        (error) => {
          store.failGeneration(error);
          toast.error("Ошибка генерации", {
            description: error,
          });
        }
      );
    },

    onError: (error: Error) => {
      store.failGeneration(error.message);
      toast.error("Ошибка", {
        description: error.message,
      });
    },
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// Hook for generating with current store state
export function useGenerateFromStore() {
  const { generate, isLoading, error } = useGeneratePhoto();
  const {
    selectedModel,
    prompt,
    negativePrompt,
    aspectRatio,
    variants,
    seed,
    cfgScale,
    steps,
  } = useGeneratorStore();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Введите промпт");
      return;
    }

    generate({
      model: selectedModel,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim() || undefined,
      aspectRatio,
      variants,
      seed,
      cfgScale,
      steps,
    });
  };

  return {
    generate: handleGenerate,
    isLoading,
    error,
    canGenerate: prompt.trim().length > 0 && !isLoading,
  };
}

