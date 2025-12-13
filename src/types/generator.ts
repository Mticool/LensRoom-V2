// ===== GENERATOR TYPES =====

export type ContentType = "photo" | "video" | "product";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "21:9";

export type ModelSpeed = "fast" | "medium" | "slow";
export type ModelQuality = "standard" | "high" | "ultra";

export interface AIModelCapabilities {
  textToImage?: boolean;
  imageToImage?: boolean;
  textToVideo?: boolean;
  imageToVideo?: boolean;
  aspectRatios: string[];
  maxResolution: string;
  maxDuration?: number; // для видео, в секундах
}

export interface AIModelDefaultParams {
  steps?: number;
  cfgScale?: number;
  sampler?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: ContentType;
  
  // API данные
  apiId: string;
  endpoint: string;
  
  // Информация для UI
  logo: string;
  description: string;
  creditCost: number;
  speed: ModelSpeed;
  quality: ModelQuality;
  bestFor: string[];
  
  // Capabilities
  capabilities: AIModelCapabilities;
  
  // Параметры
  defaultParams: AIModelDefaultParams;
}

export interface GenerationResult {
  id: string;
  url: string;
  thumbnail: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  contentType: ContentType;
  width: number;
  height: number;
  seed?: number;
  cfgScale?: number;
  steps?: number;
  createdAt: Date;
  isFavorite: boolean;
}

export interface GeneratorSettings {
  aspectRatio: AspectRatio;
  variants: number;
  seed?: number;
  cfgScale: number;
  steps: number;
}

export interface GeneratorState {
  // Content settings
  contentType: ContentType;
  selectedModel: string;
  prompt: string;
  negativePrompt: string;
  
  // Generation settings
  aspectRatio: AspectRatio;
  variants: number;
  seed?: number;
  cfgScale: number;
  steps: number;
  
  // Generation state
  isGenerating: boolean;
  progress: number;
  error?: string;
  
  // Results
  results: GenerationResult[];
  selectedResult?: GenerationResult;
  
  // History
  history: GenerationResult[];
}

export interface GeneratorActions {
  // Setters
  setContentType: (type: ContentType) => void;
  setSelectedModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (negativePrompt: string) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setVariants: (variants: number) => void;
  setSeed: (seed?: number) => void;
  setCfgScale: (cfgScale: number) => void;
  setSteps: (steps: number) => void;
  setSelectedResult: (result?: GenerationResult) => void;
  
  // Generation actions
  startGeneration: () => void;
  updateProgress: (progress: number) => void;
  completeGeneration: (results: GenerationResult[]) => void;
  failGeneration: (error: string) => void;
  
  // History actions
  addToHistory: (result: GenerationResult) => void;
  removeFromHistory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
  
  // Reset
  resetGenerator: () => void;
}

export type GeneratorStore = GeneratorState & GeneratorActions;
