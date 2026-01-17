// ===== COMMON TYPES =====

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

// ===== USER TYPES =====

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  credits: number;
  plan: "free" | "starter" | "optimal" | "maximum";
}

// ===== GENERATION TYPES =====

export type GenerationType = "photo" | "video" | "product";

export type AIModel = 
  | "flux" 
  | "dalle" 
  | "stable-diffusion"
  | "runway"
  | "kling"
  | "luma";

export interface Generation extends BaseEntity {
  userId: ID;
  type: GenerationType;
  model: AIModel;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  creditsUsed: number;
  settings: GenerationSettings;
}

export interface GenerationSettings {
  width?: number;
  height?: number;
  aspectRatio?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  style?: string;
}

// ===== PROMPT LIBRARY TYPES =====

export interface PromptTemplate extends BaseEntity {
  title: string;
  description: string;
  prompt: string;
  category: string;
  tags: string[];
  previewUrl?: string;
  usageCount: number;
  isPremium: boolean;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
