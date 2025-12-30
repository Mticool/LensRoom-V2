/**
 * Models Configuration
 * Centralized pricing and settings for all AI models
 */

export interface ModelQualityOption {
  value: string;
  label: string;
  cost?: number; // Optional cost multiplier
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  costPerGeneration: number | Record<string, number>; // Flat or variant-based pricing
  
  // Options
  qualityOptions?: ModelQualityOption[];
  formatOptions?: string[];
  styleOptions?: string[];
  durationOptions?: string[];
  
  // Limits
  maxDuration?: number; // For video (seconds)
  maxResolution?: string;
  
  // Features
  features?: string[];
  badge?: 'Popular' | 'Premium' | 'Fast' | 'Budget' | 'New' | 'TOP' | 'Audio' | 'Music' | 'V2V';
  featured?: boolean;
}

export interface SectionConfig {
  [modelId: string]: ModelConfig;
}

export const MODELS_CONFIG = {
  // ========================================
  // ДИЗАЙН (изображения)
  // ========================================
  design: {
    'nano-banana': {
      id: 'nano-banana',
      name: 'Nano Banana',
      provider: 'Google',
      description: 'Фотореализм, быстрые тесты идей',
      costPerGeneration: 7,
      badge: 'Fast',
      qualityOptions: [
        { value: '1K', label: '1K (1024×1024)', cost: 0 },
        { value: '2K', label: '2K (2048×2048)', cost: 3 },
        { value: '4K', label: '4K (4096×4096)', cost: 7 },
      ],
      formatOptions: ['1:1', '16:9', '9:16', '4:3', '3:4'],
      styleOptions: ['Реалистичный', 'Аниме', 'Художественный', 'Минимализм', '3D'],
      features: ['Быстрая генерация', 'Качественный фотореализм'],
    },
    
    'nano-banana-pro': {
      id: 'nano-banana-pro',
      name: 'Nano Banana Pro',
      provider: 'Google Gemini Flash 3.0',
      description: 'Премиум: детали, кожа, свет. Поддержка до 4 изображений для Remix',
      costPerGeneration: 35,
      badge: 'Premium',
      featured: true,
      qualityOptions: [
        { value: '1K', label: '1K (1024×1024)', cost: 0 },
        { value: '2K', label: '2K (2048×2048)', cost: 5 },
        { value: '4K', label: '4K (4096×4096)', cost: 15 },
      ],
      formatOptions: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
      styleOptions: ['Реалистичный', 'Аниме', 'Художественный', 'Минимализм', '3D', 'Концепт-арт'],
      features: ['Премиум качество', 'Remix mode (до 4 изображений)', 'Лучшие детали'],
    },
    
    'flux-2-pro': {
      id: 'flux-2-pro',
      name: 'FLUX.2 Pro',
      provider: 'Black Forest Labs',
      description: 'Резко, детально, "дорого" выглядит',
      costPerGeneration: 10,
      badge: 'Popular',
      featured: true,
      qualityOptions: [
        { value: '1024x1024', label: 'Standard (1024×1024)' },
        { value: '1536x1536', label: 'High (1536×1536)', cost: 5 },
      ],
      formatOptions: ['1:1', '16:9', '9:16', '4:3'],
      styleOptions: ['Реалистичный', 'Художественный', 'Профессиональный'],
      features: ['Высокая детализация', 'Профессиональный вид'],
    },
    
    'gpt-image': {
      id: 'gpt-image',
      name: 'GPT Image',
      provider: 'OpenAI DALL-E 3',
      description: 'Точное следование промпту',
      costPerGeneration: 42,
      qualityOptions: [
        { value: 'standard', label: 'Standard (1024×1024)' },
        { value: 'hd', label: 'HD (1792×1024)', cost: 20 },
      ],
      formatOptions: ['1:1', '16:9', '9:16'],
      styleOptions: ['Реалистичный', 'Художественный', 'Цифровой'],
      features: ['DALL-E 3', 'Точное понимание запросов'],
    },
    
    'seedream-4.5': {
      id: 'seedream-4.5',
      name: 'Seedream 4.5',
      provider: 'ByteDance',
      description: 'Современные визуалы',
      costPerGeneration: 11,
      badge: 'New',
      qualityOptions: [
        { value: 'standard', label: 'Standard' },
        { value: 'hd', label: 'HD', cost: 5 },
      ],
      formatOptions: ['1:1', '16:9', '9:16', '4:3'],
      styleOptions: ['Реалистичный', 'Аниме', 'Художественный'],
      features: ['Новейшая модель', 'Баланс скорости и качества'],
    },
    
    'z-image': {
      id: 'z-image',
      name: 'Z-image',
      provider: 'Qwen',
      description: 'Универсальный генератор изображений',
      costPerGeneration: 2,
      badge: 'Budget',
      qualityOptions: [
        { value: 'standard', label: 'Standard (1024×1024)' },
      ],
      formatOptions: ['1:1', '16:9', '9:16'],
      styleOptions: ['Реалистичный', 'Художественный'],
      features: ['Доступная цена', 'Базовое качество'],
    },
  } as SectionConfig,

  // ========================================
  // ВИДЕО
  // ========================================
  video: {
    'veo-3.1': {
      id: 'veo-3.1',
      name: 'Veo 3.1',
      provider: 'Google',
      description: 'Флагманская модель Google с превосходным качеством',
      costPerGeneration: {
        '8s_hd': 260,
      },
      badge: 'TOP',
      featured: true,
      durationOptions: ['8'],
      qualityOptions: [
        { value: 'hd', label: 'HD (1280×720)' },
      ],
      formatOptions: ['9:16', '16:9', '1:1'],
      maxDuration: 8,
      features: ['Быстрая генерация 8 сек', 'Google качество', 'Лучший T2V'],
    },
    
    'kling-2.5-turbo': {
      id: 'kling-2.5-turbo',
      name: 'Kling 2.5 Turbo',
      provider: 'Kuaishou',
      description: 'Быстрый универсал',
      costPerGeneration: {
        '5s_standard': 52,
        '5s_pro': 105,
        '10s_standard': 105,
        '10s_pro': 210,
      },
      badge: 'Fast',
      durationOptions: ['5', '10'],
      qualityOptions: [
        { value: 'standard', label: 'Standard (720p)' },
        { value: 'pro', label: 'Pro (1080p)', cost: 105 },
      ],
      formatOptions: ['9:16', '16:9', '1:1', '4:3'],
      maxDuration: 10,
      features: ['Оптимальный баланс скорости и качества'],
    },
    
    'kling-2.6': {
      id: 'kling-2.6',
      name: 'Kling 2.6',
      provider: 'Kuaishou',
      description: '+Аудио генерация. 15 сек, Multi-shot',
      costPerGeneration: {
        '5s_standard': 57,
        '5s_pro': 115,
        '10s_standard': 115,
        '10s_pro': 230,
        '15s_standard': 172,
        '15s_pro': 345,
      },
      badge: 'Audio',
      featured: true,
      durationOptions: ['5', '10', '15'],
      qualityOptions: [
        { value: 'standard', label: 'Standard (720p/1080p)' },
        { value: 'pro', label: 'Pro (1080p)', cost: 115 },
        { value: 'multi', label: 'Multi-shot 1080p', cost: 230 },
      ],
      formatOptions: ['9:16', '16:9', '1:1', '4:3'],
      maxDuration: 15,
      features: ['Уникальная аудио генерация', 'V2V mode', 'Multi-shot support'],
    },
    
    'kling-2.1-pro': {
      id: 'kling-2.1-pro',
      name: 'Kling 2.1 Pro',
      provider: 'Kuaishou',
      description: 'Максимальное качество',
      costPerGeneration: {
        '5s_pro': 201,
        '10s_pro': 402,
      },
      badge: 'Premium',
      durationOptions: ['5', '10'],
      qualityOptions: [
        { value: 'pro', label: 'Pro (1080p)' },
      ],
      formatOptions: ['9:16', '16:9', '1:1'],
      maxDuration: 10,
      features: ['Профессиональное качество', 'Коммерческие проекты'],
    },
    
    'sora-2-std': {
      id: 'sora-2-std',
      name: 'Sora 2 Standard',
      provider: 'OpenAI',
      description: 'Универсал, баланс скорость/качество',
      costPerGeneration: {
        '10s_standard': 50,
      },
      durationOptions: ['10'],
      qualityOptions: [
        { value: 'standard', label: 'Standard (720p)' },
      ],
      formatOptions: ['9:16', '16:9', '1:1'],
      maxDuration: 10,
      features: ['Сбалансированная модель от OpenAI'],
    },
    
    'sora-2-pro': {
      id: 'sora-2-pro',
      name: 'Sora 2 Pro',
      provider: 'OpenAI',
      description: 'Киношное качество',
      costPerGeneration: {
        '10s_high': 325,
        '20s_high': 650,
      },
      badge: 'Premium',
      featured: true,
      durationOptions: ['10', '20'],
      qualityOptions: [
        { value: 'high', label: 'High (1080p+)' },
      ],
      formatOptions: ['9:16', '16:9', '1:1', '21:9'],
      maxDuration: 20,
      features: ['Кинематографическое качество', 'До 20 секунд'],
    },
    
    'wan-2.5': {
      id: 'wan-2.5',
      name: 'WAN 2.5',
      provider: 'WAN AI',
      description: 'Кинематограф, T2V/I2V',
      costPerGeneration: {
        '5s_720p': 108,
        '5s_1080p': 217,
        '10s_720p': 217,
        '10s_1080p': 434,
      },
      durationOptions: ['5', '10'],
      qualityOptions: [
        { value: '720p', label: '720p' },
        { value: '1080p', label: '1080p', cost: 217 },
      ],
      formatOptions: ['9:16', '16:9', '1:1'],
      maxDuration: 10,
      features: ['Кинематографическое качество', 'T2V/I2V modes'],
    },
    
    'wan-2.6': {
      id: 'wan-2.6',
      name: 'WAN 2.6',
      provider: 'WAN AI',
      description: '+V2V, 15 сек, Multi-shot',
      costPerGeneration: {
        '15s_720p': 325,
        '15s_1080p': 389,
        '15s_multi': 778,
      },
      badge: 'New',
      featured: true,
      durationOptions: ['15'],
      qualityOptions: [
        { value: '720p', label: '720p' },
        { value: '1080p', label: '1080p', cost: 64 },
        { value: 'multi', label: 'Multi-shot 1080p', cost: 453 },
      ],
      formatOptions: ['9:16', '16:9', '1:1'],
      maxDuration: 15,
      features: ['Расширенная версия', 'V2V mode', 'Multi-shot', '15 секунд'],
    },
    
    'kling-o1-edit': {
      id: 'kling-o1-edit',
      name: 'Kling O1',
      provider: 'fal.ai',
      description: 'Video-to-Video редактирование',
      costPerGeneration: 0, // Calculated per second: duration × 0.168 USD
      badge: 'V2V',
      durationOptions: ['auto'], // 3-10s based on input
      qualityOptions: [
        { value: 'auto', label: 'Auto (from input video)' },
      ],
      formatOptions: ['auto'], // From input video
      maxDuration: 10,
      features: ['V2V редактирование', 'I2V', 'FLFV', 'Цена за секунду'],
    },
  } as SectionConfig,

  // ========================================
  // ТЕКСТ
  // ========================================
  text: {
    'chatgpt-4.5': {
      id: 'chatgpt-4.5',
      name: 'ChatGPT 4.5',
      provider: 'OpenAI',
      description: 'Общий текстовой ИИ ассистент от OpenAI',
      costPerGeneration: 30,
      badge: 'Popular',
      featured: true,
      features: ['Помощь в написании', 'Анализ', 'Создание контента'],
    },
    
    'claude-3.5': {
      id: 'claude-3.5',
      name: 'Claude 3.5',
      provider: 'Anthropic',
      description: 'Продвинутый языковой модель от Anthropic',
      costPerGeneration: 35,
      badge: 'Premium',
      featured: true,
      features: ['Глубокий анализ', 'Сложный контент', 'Длинный контекст'],
    },
    
    'gemini-advanced': {
      id: 'gemini-advanced',
      name: 'Gemini Advanced',
      provider: 'Google',
      description: 'Мультимодальная модель от Google',
      costPerGeneration: 25,
      features: ['Работа с текстом', 'Изображения', 'Код'],
    },
    
    'grok-3': {
      id: 'grok-3',
      name: 'Grok 3',
      provider: 'xAI',
      description: 'Языковая модель от xAI',
      costPerGeneration: 28,
      badge: 'New',
      features: ['Юмор', 'Актуальная информация'],
    },
    
    'deepseek': {
      id: 'deepseek',
      name: 'DeepSeek',
      provider: 'DeepSeek AI',
      description: 'Высокопроизводительная модель',
      costPerGeneration: 20,
      features: ['Быстрые ответы', 'Кодинг'],
    },
  } as SectionConfig,

  // ========================================
  // АУДИО
  // ========================================
  audio: {
    'elevenlabs': {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      provider: 'ElevenLabs',
      description: 'Синтез естественной речи премиум качества',
      costPerGeneration: 15,
      badge: 'Premium',
      featured: true,
      qualityOptions: [
        { value: 'standard', label: 'Standard' },
        { value: 'high', label: 'High Quality', cost: 5 },
      ],
      features: ['Премиум качество голоса', 'Множество голосов', 'Языки'],
    },
    
    'suno': {
      id: 'suno',
      name: 'Suno',
      provider: 'Suno AI',
      description: 'AI генерация музыки. Создание полных песен',
      costPerGeneration: 20,
      badge: 'Music',
      featured: true,
      durationOptions: ['30', '60', '120'],
      features: ['Генерация музыки', 'Полные песни', 'Разные стили'],
    },
    
    'google-tts': {
      id: 'google-tts',
      name: 'Google TTS',
      provider: 'Google',
      description: 'Быстрый text-to-speech от Google',
      costPerGeneration: 5,
      badge: 'Fast',
      qualityOptions: [
        { value: 'standard', label: 'Standard' },
      ],
      features: ['Быстрая генерация', 'Множество языков'],
    },
    
    'azure-tts': {
      id: 'azure-tts',
      name: 'Azure TTS',
      provider: 'Microsoft',
      description: 'Microsoft Azure text-to-speech',
      costPerGeneration: 7,
      qualityOptions: [
        { value: 'standard', label: 'Standard' },
        { value: 'neural', label: 'Neural', cost: 3 },
      ],
      features: ['Azure Neural Voices', 'Качественный TTS'],
    },
  } as SectionConfig,
};

// ========================================
// Helper Functions
// ========================================

/**
 * Get model configuration by ID and section
 */
export function getModelConfig(section: keyof typeof MODELS_CONFIG, modelId: string): ModelConfig | undefined {
  return MODELS_CONFIG[section]?.[modelId];
}

/**
 * Get all models for a section
 */
export function getModelsForSection(section: keyof typeof MODELS_CONFIG): ModelConfig[] {
  const sectionConfig = MODELS_CONFIG[section];
  if (!sectionConfig) return [];
  
  return Object.values(sectionConfig);
}

/**
 * Calculate cost for a model with specific settings
 */
export function calculateCost(
  section: keyof typeof MODELS_CONFIG,
  modelId: string,
  settings: {
    duration?: string;
    quality?: string;
    [key: string]: any;
  }
): number {
  const model = getModelConfig(section, modelId);
  if (!model) return 0;

  const baseCost = model.costPerGeneration;

  // If flat pricing
  if (typeof baseCost === 'number') {
    // Check for quality multiplier
    if (settings.quality && model.qualityOptions) {
      const qualityOption = model.qualityOptions.find(q => q.value === settings.quality);
      if (qualityOption?.cost) {
        return baseCost + qualityOption.cost;
      }
    }
    return baseCost;
  }

  // If variant-based pricing (video)
  if (typeof baseCost === 'object') {
    const duration = settings.duration || '10';
    const quality = settings.quality || 'standard';
    const key = `${duration}s_${quality}`;
    
    return baseCost[key] || baseCost[Object.keys(baseCost)[0]] || 0;
  }

  return 0;
}

/**
 * Get featured models for a section
 */
export function getFeaturedModels(section: keyof typeof MODELS_CONFIG): ModelConfig[] {
  return getModelsForSection(section).filter(m => m.featured);
}

/**
 * Get models sorted by cost (ascending)
 */
export function getModelsSortedByCost(section: keyof typeof MODELS_CONFIG): ModelConfig[] {
  return getModelsForSection(section).sort((a, b) => {
    const costA = typeof a.costPerGeneration === 'number' 
      ? a.costPerGeneration 
      : Math.min(...Object.values(a.costPerGeneration));
    const costB = typeof b.costPerGeneration === 'number' 
      ? b.costPerGeneration 
      : Math.min(...Object.values(b.costPerGeneration));
    return costA - costB;
  });
}

/**
 * Format cost display
 */
export function formatCost(cost: number): string {
  return `${cost} ⭐`;
}

/**
 * Get cost range for a model
 */
export function getCostRange(model: ModelConfig): { min: number; max: number } {
  const baseCost = model.costPerGeneration;
  
  if (typeof baseCost === 'number') {
    const qualityCosts = model.qualityOptions?.map(q => q.cost || 0) || [0];
    const maxQualityCost = Math.max(...qualityCosts);
    return { min: baseCost, max: baseCost + maxQualityCost };
  }
  
  const costs = Object.values(baseCost);
  return { min: Math.min(...costs), max: Math.max(...costs) };
}