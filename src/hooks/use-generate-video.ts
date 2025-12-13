import { useMutation } from "@tanstack/react-query";
import { useVideoGeneratorStore } from "@/stores/video-generator-store";
import { toast } from "sonner";

interface GenerateVideoParams {
  model: string;
  mode: "text-to-video" | "image-to-video";
  prompt: string;
  imageUrl?: string;
  duration: number;
  cameraMovement: string;
  motionIntensity: number;
  fps?: number;
}

export function useGenerateVideo() {
  const { startGeneration, updateProgress, completeGeneration, failGeneration } =
    useVideoGeneratorStore();

  return useMutation({
    mutationFn: async (params: GenerateVideoParams) => {
      const response = await fetch("/api/generate/video", {
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
      startGeneration("");
    },

    onSuccess: (data, variables) => {
      toast.success("Генерация видео началась! 🎬", {
        description: `Примерное время: ${Math.ceil(data.estimatedTime / 60)} мин`,
      });

      // Start polling
      pollVideoStatus(data.jobId, variables.prompt, variables.model);
    },

    onError: (error: Error) => {
      failGeneration(error.message);
      toast.error(`Ошибка: ${error.message}`);
    },
  });
}

// Polling function
function pollVideoStatus(jobId: string, prompt: string, model: string) {
  const { updateProgress, completeGeneration, failGeneration } =
    useVideoGeneratorStore.getState();

  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/jobs/video/${jobId}`);
      const data = await response.json();

      if (data.status === "processing") {
        updateProgress(data.progress);
      } else if (data.status === "completed" && data.result) {
        clearInterval(interval);
        completeGeneration({
          id: data.result.id,
          url: data.result.url,
          thumbnailUrl: data.result.thumbnailUrl,
          model: model,
          duration: data.result.duration,
          resolution: data.result.resolution,
          prompt: prompt,
          createdAt: new Date(),
        });
        toast.success("Видео готово! 🎉", {
          description: "Теперь можете скачать или поделиться",
        });
      } else if (data.status === "failed") {
        clearInterval(interval);
        failGeneration(data.error || "Generation failed");
        toast.error("Генерация не удалась", {
          description: data.error || "Попробуйте еще раз",
        });
      }
    } catch (error) {
      clearInterval(interval);
      failGeneration("Network error");
      toast.error("Ошибка сети");
    }
  }, 2000); // Poll every 2 seconds

  // Timeout after 10 minutes
  setTimeout(() => {
    clearInterval(interval);
    const { isGenerating } = useVideoGeneratorStore.getState();
    if (isGenerating) {
      failGeneration("Timeout");
      toast.error("Превышено время ожидания");
    }
  }, 10 * 60 * 1000);
}

