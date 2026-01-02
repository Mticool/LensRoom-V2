import { ImageIcon, Video, Mic, Sparkles, Star, Brain, Zap, Flame } from 'lucide-react';

// ===== TYPES =====
export type SectionType = 'image' | 'video' | 'audio';

export interface ModelInfo {
  id: string;
  name: string;
  icon: typeof ImageIcon;
  cost: number;
  badge?: string;
  description: string;
  dynamicPrice?: boolean;
}

export interface SectionConfig {
  section: string;
  icon: typeof ImageIcon;
  models: ModelInfo[];
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: SectionType;
  model?: string;
  url?: string;
  isGenerating?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  section: SectionType;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ===== MODELS CONFIG =====
export const MODELS_CONFIG: Record<SectionType, SectionConfig> = {
  image: {
    section: 'Дизайн',
    icon: ImageIcon,
    models: [
      { id: 'grok-imagine', name: 'Grok Imagine', icon: Flame, cost: 15, badge: 'xAI 🌶️', description: 'Spicy Mode + Upscale' },
      { id: 'nano-banana', name: 'Nano Banana', icon: Sparkles, cost: 7, badge: 'Fast', description: 'Быстрая генерация' },
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', icon: Star, cost: 35, badge: 'Premium', description: '4K качество' },
      { id: 'gpt-image', name: 'GPT Image 1.5', icon: Brain, cost: 42, badge: 'OpenAI', description: 'Текст в фото + Редактор' },
      { id: 'flux-2-pro', name: 'FLUX.2 Pro', icon: Zap, cost: 10, badge: 'Popular', description: 'Детализация' },
      { id: 'seedream-4.5', name: 'Seedream 4.5', icon: Sparkles, cost: 11, badge: 'Новинка', description: '4K нового поколения' },
      { id: 'z-image', name: 'Z-Image', icon: ImageIcon, cost: 2, badge: 'Быстрый', description: 'Самый дешёвый' },
    ],
  },
  video: {
    section: 'Видео',
    icon: Video,
    models: [
      { id: 'grok-video', name: 'Grok Video', icon: Flame, cost: 25, badge: 'xAI 🌶️', description: 'T2V + I2V + Аудио' },
      { id: 'veo-3.1', name: 'Veo 3.1', icon: Video, cost: 260, badge: 'Google', description: 'Со звуком' },
      { id: 'kling', name: 'Kling AI', icon: Zap, cost: 105, badge: 'Trending', description: '3 версии' },
      { id: 'kling-o1', name: 'Kling O1', icon: Sparkles, cost: 56, badge: 'FAL.ai', description: 'First→Last', dynamicPrice: true },
      { id: 'sora-2', name: 'Sora 2', icon: Video, cost: 50, badge: 'OpenAI', description: 'Баланс' },
      { id: 'sora-2-pro', name: 'Sora 2 Pro', icon: Star, cost: 650, badge: 'Premium', description: '1080p' },
      { id: 'wan', name: 'WAN AI', icon: Video, cost: 217, badge: 'Новинка', description: 'До 15 сек' },
    ],
  },
  audio: {
    section: 'Аудио',
    icon: Mic,
    models: [
      { id: 'suno', name: 'Suno AI', icon: Sparkles, cost: 12, badge: 'V5', description: '🎵 Создать • ⏩ Продлить • 🎤 Кавер' },
    ],
  },
};

// ===== QUICK PROMPTS =====
export const QUICK_PROMPTS: Record<SectionType, string[]> = {
  image: [
    'Портрет девушки в студии',
    'Футуристичный город',
    'Минималистичный интерьер',
  ],
  video: [
    'Закат на пляже',
    'Кинематографичный полёт',
    'Таймлапс природы',
  ],
  audio: [
    'Энергичная поп-песня',
    'Расслабляющая инструментальная музыка',
    'Эпический саундтрек',
  ],
};

