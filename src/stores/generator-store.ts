import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  GeneratorStore,
  GeneratorState,
  ContentType,
  AspectRatio,
  GenerationResult,
} from "@/types/generator";

// Default state
const defaultState: GeneratorState = {
  // Content settings
  contentType: "photo",
  selectedModel: "nano-banana-pro",
  prompt: "",
  negativePrompt: "",
  
  // Generation settings
  aspectRatio: "1:1",
  variants: 1,
  seed: undefined,
  cfgScale: 7,
  steps: 20,
  
  // Generation state
  isGenerating: false,
  progress: 0,
  error: undefined,
  
  // Results
  results: [],
  selectedResult: undefined,
  
  // History
  history: [],
};

// Default models by content type
const defaultModels: Record<ContentType, string> = {
  photo: "nano-banana-pro",
  video: "sora-2",
  product: "product-nano-banana",
};

// Helper to generate unique ID
const generateId = () => `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useGeneratorStore = create<GeneratorStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // === SETTERS ===
      
      setContentType: (contentType: ContentType) => {
        set({
          contentType,
          selectedModel: defaultModels[contentType],
          // Reset results when changing type
          results: [],
          selectedResult: undefined,
        });
      },

      setSelectedModel: (selectedModel: string) => {
        set({ selectedModel });
      },

      setPrompt: (prompt: string) => {
        set({ prompt });
      },

      setNegativePrompt: (negativePrompt: string) => {
        set({ negativePrompt });
      },

      setAspectRatio: (aspectRatio: AspectRatio) => {
        set({ aspectRatio });
      },

      setVariants: (variants: number) => {
        // Clamp between 1 and 4
        set({ variants: Math.min(4, Math.max(1, variants)) });
      },

      setSeed: (seed?: number) => {
        set({ seed });
      },

      setCfgScale: (cfgScale: number) => {
        // Clamp between 1 and 20
        set({ cfgScale: Math.min(20, Math.max(1, cfgScale)) });
      },

      setSteps: (steps: number) => {
        // Clamp between 10 and 50
        set({ steps: Math.min(50, Math.max(10, steps)) });
      },

      setSelectedResult: (selectedResult?: GenerationResult) => {
        set({ selectedResult });
      },

      // === GENERATION ACTIONS ===

      startGeneration: () => {
        set({
          isGenerating: true,
          progress: 0,
          error: undefined,
          results: [],
          selectedResult: undefined,
        });
      },

      updateProgress: (progress: number) => {
        set({ progress: Math.min(100, Math.max(0, progress)) });
      },

      completeGeneration: (results: GenerationResult[]) => {
        const state = get();
        
        // Add results to history
        const updatedHistory = [...results, ...state.history].slice(0, 100); // Keep last 100
        
        set({
          isGenerating: false,
          progress: 100,
          results,
          selectedResult: results[0],
          history: updatedHistory,
        });
      },

      failGeneration: (error: string) => {
        set({
          isGenerating: false,
          progress: 0,
          error,
          results: [],
        });
      },

      // === HISTORY ACTIONS ===

      addToHistory: (result: GenerationResult) => {
        set((state) => ({
          history: [result, ...state.history].slice(0, 100),
        }));
      },

      removeFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
          // Clear selected if it was the removed one
          selectedResult:
            state.selectedResult?.id === id ? undefined : state.selectedResult,
        }));
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
          results: state.results.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
          selectedResult:
            state.selectedResult?.id === id
              ? { ...state.selectedResult, isFavorite: !state.selectedResult.isFavorite }
              : state.selectedResult,
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      // === RESET ===

      resetGenerator: () => {
        set({
          ...defaultState,
          // Keep history
          history: get().history,
        });
      },
    }),
    {
      name: "lensroom-generator",
      storage: createJSONStorage(() => localStorage),
      // Only persist history and favorites
      partialize: (state) => ({
        history: state.history,
      }),
      // Merge persisted state with default state
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<GeneratorState>),
      }),
    }
  )
);

// === SELECTORS ===

export const selectHistory = (state: GeneratorStore) => state.history;
export const selectFavorites = (state: GeneratorStore) => 
  state.history.filter((item) => item.isFavorite);
export const selectIsGenerating = (state: GeneratorStore) => state.isGenerating;
export const selectProgress = (state: GeneratorStore) => state.progress;
export const selectResults = (state: GeneratorStore) => state.results;
export const selectCurrentSettings = (state: GeneratorStore) => ({
  contentType: state.contentType,
  selectedModel: state.selectedModel,
  aspectRatio: state.aspectRatio,
  variants: state.variants,
  seed: state.seed,
  cfgScale: state.cfgScale,
  steps: state.steps,
});

// === HELPER HOOKS ===

export const useGeneratorSettings = () => {
  return useGeneratorStore((state) => ({
    contentType: state.contentType,
    selectedModel: state.selectedModel,
    prompt: state.prompt,
    negativePrompt: state.negativePrompt,
    aspectRatio: state.aspectRatio,
    variants: state.variants,
    seed: state.seed,
    cfgScale: state.cfgScale,
    steps: state.steps,
  }));
};

export const useGeneratorActions = () => {
  return useGeneratorStore((state) => ({
    setContentType: state.setContentType,
    setSelectedModel: state.setSelectedModel,
    setPrompt: state.setPrompt,
    setNegativePrompt: state.setNegativePrompt,
    setAspectRatio: state.setAspectRatio,
    setVariants: state.setVariants,
    setSeed: state.setSeed,
    setCfgScale: state.setCfgScale,
    setSteps: state.setSteps,
    startGeneration: state.startGeneration,
    updateProgress: state.updateProgress,
    completeGeneration: state.completeGeneration,
    failGeneration: state.failGeneration,
    resetGenerator: state.resetGenerator,
  }));
};

export const useGeneratorStatus = () => {
  return useGeneratorStore((state) => ({
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
    results: state.results,
    selectedResult: state.selectedResult,
  }));
};

// Export ID generator for external use
export { generateId };
