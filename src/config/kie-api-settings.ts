/**
 * KIE.AI API Settings Configuration
 * 
 * Этот файл содержит ТОЧНЫЕ настройки для каждой модели,
 * которые поддерживаются KIE.ai API.
 * 
 * Документация: https://docs.kie.ai
 * Модели: https://kie.ai/market
 */

// ===== ТИПЫ =====

export type SettingType = 'select' | 'buttons' | 'textarea' | 'number' | 'slider' | 'checkbox';

export interface SettingOption {
  value: string | number | boolean;
  label: string;
}

export interface ModelSetting {
  label: string;
  type: SettingType;
  options?: SettingOption[];
  default?: string | number | boolean;
  placeholder?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  required?: boolean;
  order?: number;
  apiKey?: string; // Название поля в API (если отличается)
}

export interface KieModelSettings {
  name: string;
  apiModel: string; // Точное название модели для API
  settings: Record<string, ModelSetting>;
}

// ===== ФОТО МОДЕЛИ =====

export const KIE_IMAGE_MODELS: Record<string, KieModelSettings> = {
  // Z-image - простой и дешевый
  "z-image": {
    name: "Z-image",
    apiModel: "z-image",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 1
      }
    }
  },

  // Nano Banana - Google
  "nano-banana": {
    name: "Nano Banana",
    apiModel: "google/nano-banana",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" }
        ],
        default: "9:16",
        description: "Пропорции изображения",
        required: true,
        order: 1
      }
    }
  },

  // Nano Banana Pro
  "nano-banana-pro": {
    name: "Nano Banana Pro",
    apiModel: "nano-banana-pro",
    settings: {
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" },
          { value: "4K", label: "4K" }
        ],
        default: "2K",
        description: "Разрешение изображения",
        required: true,
        order: 1
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "9:16", label: "9:16" },
          { value: "16:9", label: "16:9" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "auto", label: "Auto" }
        ],
        default: "9:16",
        description: "Пропорции изображения",
        required: true,
        order: 2
      }
    }
  },

  // FLUX.2 Pro - требует resolution + aspect_ratio
  "flux-2-pro": {
    name: "FLUX.2 Pro",
    apiModel: "flux-2/pro-text-to-image",
    settings: {
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" }
        ],
        default: "2K",
        description: "Качество выходного изображения",
        required: true,
        order: 1
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" }
        ],
        default: "16:9",
        description: "Пропорции изображения",
        required: true,
        order: 2
      }
    }
  },

  // FLUX.2 Flex
  "flux-2-flex": {
    name: "FLUX.2 Flex",
    apiModel: "flux-2/flex-text-to-image",
    settings: {
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" }
        ],
        default: "2K",
        description: "Качество выходного изображения",
        required: true,
        order: 1
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" }
        ],
        default: "9:16",
        description: "Пропорции изображения",
        required: true,
        order: 2
      }
    }
  },

  // Seedream 4.5 - требует quality (basic/high) + aspect_ratio
  "seedream-4.5": {
    name: "Seedream 4.5",
    apiModel: "seedream/4.5-text-to-image",
    settings: {
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "basic", label: "Basic (2K)" },
          { value: "high", label: "High (4K)" }
        ],
        default: "basic",
        description: "basic = 2K, high = 4K качество",
        required: true,
        order: 1
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 2
      }
    }
  },

  // GPT Image
  "gpt-image": {
    name: "GPT Image",
    apiModel: "gpt-image-1",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 1
      }
    }
  },

  // Topaz Upscale
  "topaz-image-upscale": {
    name: "Topaz Upscale",
    apiModel: "topaz/image-upscale",
    settings: {
      scale: {
        label: "Масштаб",
        type: "buttons",
        options: [
          { value: "2x", label: "2x" },
          { value: "4x", label: "4x" }
        ],
        default: "2x",
        description: "Во сколько раз увеличить",
        required: true,
        order: 1
      }
    }
  },

  // Midjourney
  "midjourney": {
    name: "Midjourney V7",
    apiModel: "midjourney",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 1
      }
    }
  }
};

// ===== ВИДЕО МОДЕЛИ =====

export const KIE_VIDEO_MODELS: Record<string, KieModelSettings> = {
  // Veo 3.1 - Google
  "veo-3.1": {
    name: "Veo 3.1",
    apiModel: "veo3",
    settings: {
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "fast", label: "Fast (быстро)" },
          { value: "quality", label: "Quality (качество)" }
        ],
        default: "fast",
        description: "Fast = ~1 мин, Quality = ~3 мин",
        required: true,
        order: 1
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Veo поддерживает только 16:9 и 9:16",
        required: true,
        order: 2
      }
    }
  },

  // Kling - объединённая модель
  "kling": {
    name: "Kling AI",
    apiModel: "kling-2.6/text-to-video",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5-turbo", label: "2.5 Turbo - быстро" },
          { value: "2.6", label: "2.6 - со звуком" },
          { value: "2.1-pro", label: "2.1 Pro - премиум" }
        ],
        default: "2.5-turbo",
        description: "Выберите версию Kling",
        required: true,
        order: 1,
        apiKey: "model" // Будет использоваться для выбора apiModel
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "5", label: "5 сек" },
          { value: "10", label: "10 сек" }
        ],
        default: "5",
        description: "Длительность видео в секундах",
        required: true,
        order: 2
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 3
      },
      sound: {
        label: "Звук",
        type: "checkbox",
        default: false,
        description: "Добавить звук (только для Kling 2.6)",
        optional: true,
        order: 4
      }
    }
  },

  // Sora 2
  "sora-2": {
    name: "Sora 2",
    apiModel: "sora-2-image-to-video",
    settings: {
      n_frames: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "10", label: "10 сек" },
          { value: "15", label: "15 сек" }
        ],
        default: "10",
        description: "Длительность видео",
        required: true,
        order: 1,
        apiKey: "n_frames"
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "landscape", label: "Альбомная" },
          { value: "portrait", label: "Портретная" }
        ],
        default: "landscape",
        description: "Ориентация видео",
        required: true,
        order: 2
      }
    }
  },

  // Sora 2 Pro
  "sora-2-pro": {
    name: "Sora 2 Pro",
    apiModel: "sora-2-pro-image-to-video",
    settings: {
      n_frames: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "10", label: "10 сек" },
          { value: "15", label: "15 сек" }
        ],
        default: "10",
        description: "Длительность видео",
        required: true,
        order: 1,
        apiKey: "n_frames"
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "landscape", label: "Альбомная" },
          { value: "portrait", label: "Портретная" }
        ],
        default: "landscape",
        description: "Ориентация видео",
        required: true,
        order: 2
      },
      size: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "standard", label: "720p" },
          { value: "high", label: "1080p" }
        ],
        default: "standard",
        description: "Разрешение видео",
        required: true,
        order: 3
      }
    }
  },

  // Sora Storyboard
  "sora-storyboard": {
    name: "Sora Storyboard",
    apiModel: "sora-2-pro-storyboard",
    settings: {
      num_shots: {
        label: "Количество сцен",
        type: "select",
        options: [
          { value: 2, label: "2 сцены" },
          { value: 3, label: "3 сцены" },
          { value: 4, label: "4 сцены" }
        ],
        default: 2,
        description: "Сколько сцен в видео",
        required: true,
        order: 1,
        apiKey: "shots"
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "landscape", label: "Альбомная" },
          { value: "portrait", label: "Портретная" }
        ],
        default: "landscape",
        description: "Ориентация видео",
        required: true,
        order: 2
      }
    }
  },

  // WAN - объединённая модель
  "wan": {
    name: "WAN AI",
    apiModel: "wan/2-5-text-to-video",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5", label: "WAN 2.5" },
          { value: "2.6", label: "WAN 2.6 (V2V, 15s)" }
        ],
        default: "2.5",
        description: "Выберите версию WAN",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "5", label: "5 сек" },
          { value: "10", label: "10 сек" },
          { value: "15", label: "15 сек" }
        ],
        default: "5",
        description: "15 сек только для WAN 2.6",
        required: true,
        order: 2
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 3
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "720p",
        description: "Качество видео",
        optional: true,
        order: 4
      }
    }
  }
};

// ===== HELPER FUNCTIONS =====

export function getImageModelSettings(modelId: string): KieModelSettings | undefined {
  return KIE_IMAGE_MODELS[modelId];
}

export function getVideoModelSettings(modelId: string): KieModelSettings | undefined {
  return KIE_VIDEO_MODELS[modelId];
}

export function getDefaultImageSettings(modelId: string): Record<string, unknown> {
  const model = KIE_IMAGE_MODELS[modelId];
  if (!model) return {};
  
  const defaults: Record<string, unknown> = {};
  Object.entries(model.settings).forEach(([key, setting]) => {
    if (setting.default !== undefined) {
      defaults[key] = setting.default;
    }
  });
  return defaults;
}

export function getDefaultVideoSettings(modelId: string): Record<string, unknown> {
  const model = KIE_VIDEO_MODELS[modelId];
  if (!model) return {};
  
  const defaults: Record<string, unknown> = {};
  Object.entries(model.settings).forEach(([key, setting]) => {
    if (setting.default !== undefined) {
      defaults[key] = setting.default;
    }
  });
  return defaults;
}

// Получить apiModel для Kling в зависимости от версии
export function getKlingApiModel(version: string, mode: 't2v' | 'i2v' = 't2v'): string {
  const models: Record<string, { t2v: string; i2v: string }> = {
    '2.5-turbo': {
      t2v: 'kling-2.5-turbo/text-to-video',
      i2v: 'kling-2.5-turbo/image-to-video'
    },
    '2.6': {
      t2v: 'kling-2.6/text-to-video',
      i2v: 'kling-2.6/image-to-video'
    },
    '2.1-pro': {
      t2v: 'kling/v2-1-pro',
      i2v: 'kling/v2-1-pro'
    }
  };
  return models[version]?.[mode] || models['2.5-turbo'][mode];
}

// Получить apiModel для WAN в зависимости от версии
export function getWanApiModel(version: string, mode: 't2v' | 'i2v' | 'v2v' = 't2v'): string {
  const models: Record<string, { t2v: string; i2v: string; v2v: string }> = {
    '2.5': {
      t2v: 'wan/2-5-text-to-video',
      i2v: 'wan/2-5-image-to-video',
      v2v: 'wan/2-5-text-to-video' // 2.5 не поддерживает v2v
    },
    '2.6': {
      t2v: 'wan/2-6-text-to-video',
      i2v: 'wan/2-6-image-to-video',
      v2v: 'wan/2-6-video-to-video'
    }
  };
  return models[version]?.[mode] || models['2.5'][mode];
}

