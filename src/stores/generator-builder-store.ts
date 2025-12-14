import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ContentType, ModeId, GeneratorFormState, ValidationResult } from "@/config/generator-types";
import { 
  getModelsByContentType, 
  getDefaultModel, 
  getDefaultMode, 
  getModelById,
  getModeById,
  calculateTotalCredits,
} from "@/config/model-registry";

// ===== INITIAL STATE =====

const getInitialState = (): GeneratorFormState => {
  const defaultModel = getDefaultModel("photo");
  const defaultMode = getDefaultMode(defaultModel);
  
  return {
    contentType: "photo",
    modelId: defaultModel.id,
    modeId: defaultMode.id as ModeId,
    prompt: "",
    negativePrompt: "",
    refA: null,
    refB: null,
    aspectRatio: "1:1",
    variants: 1,
    duration: 5,
    fps: 30,
    seed: null,
    guidance: 7.5,
    steps: 30,
    stylize: 50,
    motionStrength: 50,
  };
};

// ===== STORE INTERFACE =====

interface GeneratorBuilderStore extends GeneratorFormState {
  // Computed
  isGenerating: boolean;
  progress: number;
  error: string | null;
  
  // Results
  results: GenerationResult[];
  selectedResultIndex: number;
  
  // Actions
  setContentType: (type: ContentType) => void;
  setModelId: (id: string) => void;
  setModeId: (id: ModeId) => void;
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (prompt: string) => void;
  setRefA: (ref: File | string | null) => void;
  setRefB: (ref: File | string | null) => void;
  setAspectRatio: (ratio: string) => void;
  setVariants: (count: number) => void;
  setDuration: (seconds: number) => void;
  setFps: (fps: number) => void;
  setSeed: (seed: number | null) => void;
  setGuidance: (value: number) => void;
  setSteps: (value: number) => void;
  setStylize: (value: number) => void;
  setMotionStrength: (value: number) => void;
  setSelectedResultIndex: (index: number) => void;
  
  // Generation
  validate: () => ValidationResult;
  startGeneration: () => void;
  updateProgress: (progress: number) => void;
  completeGeneration: (results: GenerationResult[]) => void;
  failGeneration: (error: string) => void;
  
  // Utils
  getTotalCredits: () => number | null;
  reset: () => void;
}

interface GenerationResult {
  id: string;
  url: string;
  thumbnail?: string;
  type: "image" | "video";
}

// ===== STORE =====

export const useGeneratorBuilderStore = create<GeneratorBuilderStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),
      
      // State
      isGenerating: false,
      progress: 0,
      error: null,
      results: [],
      selectedResultIndex: 0,
      
      // Actions
      setContentType: (type) => {
        const models = getModelsByContentType(type);
        const defaultModel = models[0];
        const defaultMode = getDefaultMode(defaultModel);
        
        set({
          contentType: type,
          modelId: defaultModel.id,
          modeId: defaultMode.id as ModeId,
          refA: null,
          refB: null,
          results: [],
        });
      },
      
      setModelId: (id) => {
        const model = getModelById(id);
        if (!model) return;
        
        const currentModeId = get().modeId;
        const modeExists = model.modes.some((m) => m.id === currentModeId);
        const newMode = modeExists 
          ? getModeById(model, currentModeId) 
          : getDefaultMode(model);
        
        set({
          modelId: id,
          modeId: (newMode?.id || model.modes[0].id) as ModeId,
        });
      },
      
      setModeId: (id) => {
        set({ 
          modeId: id,
          refA: null,
          refB: null,
        });
      },
      
      setPrompt: (prompt) => set({ prompt }),
      setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
      setRefA: (ref) => set({ refA: ref }),
      setRefB: (ref) => set({ refB: ref }),
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setVariants: (count) => set({ variants: count }),
      setDuration: (seconds) => set({ duration: seconds }),
      setFps: (fps) => set({ fps }),
      setSeed: (seed) => set({ seed }),
      setGuidance: (value) => set({ guidance: value }),
      setSteps: (value) => set({ steps: value }),
      setStylize: (value) => set({ stylize: value }),
      setMotionStrength: (value) => set({ motionStrength: value }),
      setSelectedResultIndex: (index) => set({ selectedResultIndex: index }),
      
      // Validation
      validate: () => {
        const state = get();
        const errors: ValidationResult["errors"] = [];
        
        const model = getModelById(state.modelId);
        if (!model) {
          errors.push({ field: "model", message: "Модель не найдена" });
          return { valid: false, errors };
        }
        
        const mode = getModeById(model, state.modeId);
        if (!mode) {
          errors.push({ field: "mode", message: "Режим не найден" });
          return { valid: false, errors };
        }
        
        // Check prompt
        if (mode.showPrompt && !state.prompt.trim()) {
          errors.push({ field: "prompt", message: "Введите описание" });
        }
        
        // Check required refs
        if (mode.requiredRefs.a && !state.refA) {
          errors.push({ 
            field: "refA", 
            message: `Загрузите ${mode.refLabels.a || "референс A"}` 
          });
        }
        
        if (mode.requiredRefs.b && !state.refB) {
          errors.push({ 
            field: "refB", 
            message: `Загрузите ${mode.refLabels.b || "референс B"}` 
          });
        }
        
        return { valid: errors.length === 0, errors };
      },
      
      // Generation
      startGeneration: () => {
        set({ isGenerating: true, progress: 0, error: null, results: [] });
      },
      
      updateProgress: (progress) => {
        set({ progress });
      },
      
      completeGeneration: (results) => {
        set({ 
          isGenerating: false, 
          progress: 100, 
          results,
          selectedResultIndex: 0,
        });
      },
      
      failGeneration: (error) => {
        set({ isGenerating: false, error, progress: 0 });
      },
      
      // Utils
      getTotalCredits: () => {
        const state = get();
        const model = getModelById(state.modelId);
        if (!model) return null;
        
        return calculateTotalCredits(
          model,
          state.variants,
          model.contentType === "video" ? state.duration : undefined
        );
      },
      
      reset: () => {
        set(getInitialState());
      },
    }),
    {
      name: "generator-builder-storage",
      partialize: (state) => ({
        contentType: state.contentType,
        modelId: state.modelId,
        modeId: state.modeId,
        aspectRatio: state.aspectRatio,
        variants: state.variants,
        duration: state.duration,
        fps: state.fps,
        guidance: state.guidance,
        steps: state.steps,
      }),
    }
  )
);


