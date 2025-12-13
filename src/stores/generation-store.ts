import { create } from "zustand";
import type { Generation, GenerationType, AIModel, GenerationSettings } from "@/types";

interface GenerationState {
  // Current generation form state
  type: GenerationType;
  model: AIModel;
  prompt: string;
  negativePrompt: string;
  settings: GenerationSettings;
  
  // Generation history
  generations: Generation[];
  currentGeneration: Generation | null;
  isGenerating: boolean;
  
  // Actions
  setType: (type: GenerationType) => void;
  setModel: (model: AIModel) => void;
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (negativePrompt: string) => void;
  setSettings: (settings: Partial<GenerationSettings>) => void;
  resetForm: () => void;
  
  // Generation actions
  addGeneration: (generation: Generation) => void;
  setCurrentGeneration: (generation: Generation | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
}

const defaultSettings: GenerationSettings = {
  width: 1024,
  height: 1024,
  aspectRatio: "1:1",
  steps: 30,
  guidance: 7.5,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  type: "photo",
  model: "flux",
  prompt: "",
  negativePrompt: "",
  settings: defaultSettings,
  generations: [],
  currentGeneration: null,
  isGenerating: false,

  setType: (type) => set({ type }),
  setModel: (model) => set({ model }),
  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
  resetForm: () =>
    set({
      prompt: "",
      negativePrompt: "",
      settings: defaultSettings,
    }),

  addGeneration: (generation) =>
    set((state) => ({
      generations: [generation, ...state.generations],
    })),
  setCurrentGeneration: (currentGeneration) => set({ currentGeneration }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  updateGeneration: (id, updates) =>
    set((state) => ({
      generations: state.generations.map((gen) =>
        gen.id === id ? { ...gen, ...updates } : gen
      ),
    })),
}));

