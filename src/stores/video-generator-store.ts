import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoMode = "text-to-video" | "image-to-video";

export interface VideoResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  model: string;
  duration: number;
  resolution: string;
  prompt: string;
  createdAt: Date;
  isFavorite?: boolean;
}

interface VideoGeneratorState {
  // Settings
  mode: VideoMode;
  selectedModel: string;
  prompt: string;
  duration: number;
  cameraMovement: string;
  motionIntensity: number;
  fps: number;
  uploadedImage: string | null;

  // Generation state
  isGenerating: boolean;
  progress: number;
  error: string | null;
  result: VideoResult | null;

  // History
  history: VideoResult[];

  // Actions
  setMode: (mode: VideoMode) => void;
  setSelectedModel: (modelId: string) => void;
  setPrompt: (prompt: string) => void;
  setDuration: (duration: number) => void;
  setCameraMovement: (movement: string) => void;
  setMotionIntensity: (intensity: number) => void;
  setFps: (fps: number) => void;
  setUploadedImage: (image: string | null) => void;

  startGeneration: (jobId: string) => void;
  updateProgress: (progress: number) => void;
  completeGeneration: (result: VideoResult) => void;
  failGeneration: (error: string) => void;
  resetGeneration: () => void;

  addToHistory: (result: VideoResult) => void;
  removeFromHistory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
}

export const useVideoGeneratorStore = create<VideoGeneratorState>()(
  persist(
    (set) => ({
      // Initial state
      mode: "text-to-video",
      selectedModel: "veo-3.1",
      prompt: "",
      duration: 5,
      cameraMovement: "static",
      motionIntensity: 50,
      fps: 30,
      uploadedImage: null,

      isGenerating: false,
      progress: 0,
      error: null,
      result: null,

      history: [],

      // Actions
      setMode: (mode) => set({ mode }),
      setSelectedModel: (modelId) => set({ selectedModel: modelId }),
      setPrompt: (prompt) => set({ prompt }),
      setDuration: (duration) => set({ duration }),
      setCameraMovement: (movement) => set({ cameraMovement: movement }),
      setMotionIntensity: (intensity) => set({ motionIntensity: intensity }),
      setFps: (fps) => set({ fps }),
      setUploadedImage: (image) => set({ uploadedImage: image }),

      startGeneration: () =>
        set({
          isGenerating: true,
          progress: 0,
          error: null,
          result: null,
        }),

      updateProgress: (progress) => set({ progress }),

      completeGeneration: (result) =>
        set((state) => ({
          isGenerating: false,
          progress: 100,
          result,
          history: [result, ...state.history].slice(0, 20),
        })),

      failGeneration: (error) =>
        set({
          isGenerating: false,
          error,
          progress: 0,
        }),

      resetGeneration: () =>
        set({
          isGenerating: false,
          progress: 0,
          error: null,
          result: null,
        }),

      addToHistory: (result) =>
        set((state) => ({
          history: [result, ...state.history].slice(0, 50),
        })),

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
          result: state.result?.id === id ? null : state.result,
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
          ),
          result:
            state.result?.id === id
              ? { ...state.result, isFavorite: !state.result.isFavorite }
              : state.result,
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "video-generator-storage",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        duration: state.duration,
        cameraMovement: state.cameraMovement,
        motionIntensity: state.motionIntensity,
        fps: state.fps,
        history: state.history,
      }),
    }
  )
);