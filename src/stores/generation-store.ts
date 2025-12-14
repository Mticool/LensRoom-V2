import { create } from 'zustand';

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentJobId: string | null;
  error: string | null;
  startGeneration: (jobId: string) => void;
  updateProgress: (progress: number) => void;
  completeGeneration: () => void;
  failGeneration: (error: string) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  isGenerating: false,
  progress: 0,
  currentJobId: null,
  error: null,
  startGeneration: (jobId) =>
    set({
      isGenerating: true,
      progress: 0,
      currentJobId: jobId,
      error: null,
    }),
  updateProgress: (progress) => set({ progress }),
  completeGeneration: () =>
    set({
      isGenerating: false,
      progress: 100,
      currentJobId: null,
    }),
  failGeneration: (error) =>
    set({
      isGenerating: false,
      progress: 0,
      error,
      currentJobId: null,
    }),
  reset: () =>
    set({
      isGenerating: false,
      progress: 0,
      currentJobId: null,
      error: null,
    }),
}));


