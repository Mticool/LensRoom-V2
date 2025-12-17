import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cachedJson, invalidateCached } from "@/lib/client/generations-cache";

// Types
export interface Generation {
  id: string;
  user_id: string;
  type: "photo" | "video" | "product";
  model: string; // Model ID
  prompt: string;
  aspect_ratio: string;
  status: "pending" | "processing" | "completed" | "failed";
  results: { url: string; thumbnail?: string }[];
  thumbnail_url?: string;
  credits_used: number;
  is_favorite: boolean;
  is_public: boolean;
  tags: string[];
  created_at: string;
  completed_at?: string;
}

export interface CreateGenerationInput {
  type: "photo" | "video" | "product";
  modelId: string;
  prompt: string;
  aspectRatio?: string;
}

export interface UpdateGenerationInput {
  status?: "pending" | "processing" | "completed" | "failed";
  results?: { url: string; thumbnail?: string }[];
  thumbnailUrl?: string;
  creditsUsed?: number;
  isFavorite?: boolean;
  isPublic?: boolean;
  tags?: string[];
}

interface FetchOptions {
  type?: "photo" | "video" | "product";
  status?: string;
  favorites?: boolean;
  limit?: number;
  offset?: number;
}

// API functions
async function fetchGenerations(options: FetchOptions = {}): Promise<Generation[]> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.status) params.set("status", options.status);
  if (options.favorites) params.set("favorites", "true");
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const url = `/api/generations?${params.toString()}`;
  const cacheKey = `generations:${url}`;
  const data = await cachedJson(cacheKey, async () => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[generations] fetch", { url });
    }
    const response = await fetch(url);
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Failed to fetch generations");
    return json;
  });
  return (data as any).generations;
}

async function fetchGeneration(id: string): Promise<Generation> {
  const response = await fetch(`/api/generations/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch generation");
  }
  const data = await response.json();
  return data.generation;
}

async function createGeneration(input: CreateGenerationInput): Promise<Generation> {
  const response = await fetch("/api/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create generation");
  }
  const data = await response.json();
  return data.generation;
}

async function updateGeneration(
  id: string,
  input: UpdateGenerationInput
): Promise<Generation> {
  const response = await fetch(`/api/generations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update generation");
  }
  const data = await response.json();
  return data.generation;
}

async function deleteGeneration(id: string): Promise<void> {
  const response = await fetch(`/api/generations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete generation");
  }
}

// Hooks

// Fetch all generations with filters
export function useGenerations(options: FetchOptions = {}) {
  return useQuery({
    queryKey: ["generations", options],
    queryFn: () => fetchGenerations(options),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Fetch single generation
export function useGeneration(id: string | null) {
  return useQuery({
    queryKey: ["generation", id],
    queryFn: () => (id ? fetchGeneration(id) : null),
    enabled: !!id,
  });
}

// Create generation
export function useCreateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGeneration,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      invalidateCached("generations:");
      console.log("[useCreateGeneration] Created:", data.id);
    },
    onError: (error) => {
      console.error("[useCreateGeneration] Error:", error);
      toast.error("Ошибка создания записи генерации");
    },
  });
}

// Update generation
export function useUpdateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGenerationInput }) =>
      updateGeneration(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      queryClient.invalidateQueries({ queryKey: ["generation", data.id] });
      invalidateCached("generations:");
    },
    onError: (error) => {
      console.error("[useUpdateGeneration] Error:", error);
    },
  });
}

// Delete generation
export function useDeleteGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteGeneration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      invalidateCached("generations:");
      toast.success("Генерация удалена");
    },
    onError: (error) => {
      console.error("[useDeleteGeneration] Error:", error);
      toast.error("Ошибка удаления генерации");
    },
  });
}

// Toggle favorite
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      return updateGeneration(id, { isFavorite });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generations"] });
      toast.success(data.is_favorite ? "Добавлено в избранное" : "Удалено из избранного");
    },
    onError: (error) => {
      console.error("[useToggleFavorite] Error:", error);
      toast.error("Ошибка обновления избранного");
    },
  });
}

// Hook for generation history (combines with local state for real-time updates)
export function useGenerationHistory(type?: "photo" | "video" | "product") {
  const { data: generations, isLoading, error, refetch } = useGenerations({
    type,
    status: "completed",
    limit: 100,
  });

  const createMutation = useCreateGeneration();
  const updateMutation = useUpdateGeneration();
  const deleteMutation = useDeleteGeneration();
  const toggleFavoriteMutation = useToggleFavorite();

  return {
    // Data
    generations: generations || [],
    isLoading,
    error,
    
    // Actions
    refetch,
    
    create: createMutation.mutateAsync,
    update: (id: string, input: UpdateGenerationInput) =>
      updateMutation.mutateAsync({ id, input }),
    remove: deleteMutation.mutateAsync,
    toggleFavorite: (id: string, isFavorite: boolean) =>
      toggleFavoriteMutation.mutateAsync({ id, isFavorite }),
    
    // States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

