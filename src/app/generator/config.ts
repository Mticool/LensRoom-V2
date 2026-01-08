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
  supportsI2i?: boolean; // For batch mode
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
  batchResults?: Array<{ url: string; clientId?: string }>;
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
// ОБНОВЛЕНО 2025-01-03: минимальные цены ("от X⭐") по юнитке
// cost = минимальная цена для отображения "от X⭐" на карточке
// dynamicPrice = true для моделей с вариантами (цена зависит от настроек)
export const MODELS_CONFIG: Record<SectionType, SectionConfig> = {
  image: {
    section: 'Дизайн',
    icon: ImageIcon,
    models: [
      { id: 'grok-imagine', name: 'Grok Imagine', icon: Flame, cost: 15, badge: 'xAI 🌶️', description: 'Spicy Mode + Upscale', supportsI2i: false },
      { id: 'nano-banana', name: 'Nano Banana', icon: Sparkles, cost: 7, badge: 'Fast', description: '7⭐ • Быстрая генерация', supportsI2i: true },
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', icon: Star, cost: 30, badge: 'Premium', description: '30-40⭐ • 1K-4K качество', supportsI2i: true, dynamicPrice: true },
      { id: 'gpt-image', name: 'GPT Image 1.5', icon: Brain, cost: 17, badge: 'OpenAI', description: '17-67⭐ • Текст + Редактор', supportsI2i: true, dynamicPrice: true },
      { id: 'flux-2-pro', name: 'FLUX.2 Pro', icon: Zap, cost: 9, badge: 'Popular', description: '9-12⭐ • 1K/2K детализация', supportsI2i: true, dynamicPrice: true },
      { id: 'seedream-4.5', name: 'Seedream 4.5', icon: Sparkles, cost: 11, badge: 'Новинка', description: '11⭐ • 4K нового поколения', supportsI2i: true },
      { id: 'z-image', name: 'Z-Image', icon: ImageIcon, cost: 2, badge: 'Быстрый', description: '2⭐ • Самый дешёвый', supportsI2i: true },
    ],
  },
  video: {
    section: 'Видео',
    icon: Video,
    models: [
      { id: 'grok-video', name: 'Grok Video', icon: Flame, cost: 25, badge: 'xAI 🌶️', description: '25⭐ • T2V + I2V + Аудио' },
      { id: 'veo-3.1', name: 'Veo 3.1', icon: Video, cost: 99, badge: 'Google', description: '99-490⭐ • Fast/Quality 8s', dynamicPrice: true },
      { id: 'kling', name: 'Kling AI', icon: Zap, cost: 105, badge: 'Trending', description: '105-400⭐ • Turbo/Audio/Pro', dynamicPrice: true },
      { id: 'kling-motion-control', name: 'Motion Control', icon: Zap, cost: 80, badge: 'Motion', description: 'от 80⭐ • Перенос движений', dynamicPrice: true },
      { id: 'kling-o1', name: 'Kling O1', icon: Sparkles, cost: 56, badge: 'FAL.ai', description: '56-112⭐ • First→Last 5-10s', dynamicPrice: true },
      { id: 'sora-2', name: 'Sora 2', icon: Video, cost: 50, badge: 'OpenAI', description: '50⭐ • 10-15s баланс' },
      { id: 'sora-2-pro', name: 'Sora 2 Pro', icon: Star, cost: 250, badge: 'Premium', description: '250-1050⭐ • 1080p 10-15s', dynamicPrice: true },
      { id: 'wan', name: 'WAN AI', icon: Video, cost: 100, badge: 'Новинка', description: '100-660⭐ • 5-15s 720-1080p', dynamicPrice: true },
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
