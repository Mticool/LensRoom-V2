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

// ===== ТИПЫ ДЛЯ ДИНАМИЧЕСКОГО ЦЕНООБРАЗОВАНИЯ =====

export interface PriceModifier {
  settingKey: string;
  values: Record<string, number>; // value -> множитель или фиксированная цена
  type: 'multiplier' | 'fixed' | 'perSecond';
}

export interface KieModelSettingsWithPricing extends KieModelSettings {
  baseCost?: number; // Базовая стоимость в звёздах
  priceModifiers?: PriceModifier[]; // Модификаторы цены
  provider?: 'kie' | 'fal'; // Провайдер API
}

// ===== ВИДЕО МОДЕЛИ =====

export const KIE_VIDEO_MODELS: Record<string, KieModelSettingsWithPricing> = {
  // Kling O1 - FAL.ai (First Frame Last Frame)
  // Документация: https://fal.ai/models/fal-ai/kling-video/o1/image-to-video
  "kling-o1": {
    name: "Kling O1",
    apiModel: "fal-ai/kling-video/o1/image-to-video",
    provider: "fal",
    baseCost: 56, // $0.56 = 56⭐ за 5 сек
    priceModifiers: [
      {
        settingKey: "duration",
        type: "fixed",
        values: {
          "5": 56,   // $0.56 = 56⭐
          "10": 112  // $1.12 = 112⭐
        }
      }
    ],
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "5", label: "5 сек • 56⭐" },
          { value: "10", label: "10 сек • 112⭐" }
        ],
        default: "5",
        description: "$0.112/сек. First Frame → Last Frame анимация",
        required: true,
        order: 1
      },
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "start-end", label: "Старт + Финиш" },
          { value: "start-only", label: "Только старт" }
        ],
        default: "start-end",
        description: "С финальным кадром - точный контроль перехода",
        required: true,
        order: 2
      }
    }
  },

  // Veo 3.1 - Google
  // Поддерживает: text-to-video, image-to-video, reference-to-video
  "veo-3.1": {
    name: "Veo 3.1",
    apiModel: "veo3",
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст → Видео" },
          { value: "image-to-video", label: "Фото → Видео" },
          { value: "reference-to-video", label: "Референс" }
        ],
        default: "text-to-video",
        description: "Выберите тип генерации",
        required: true,
        order: 1,
        apiKey: "generationType"
      },
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "fast", label: "Fast (быстро)" },
          { value: "quality", label: "Quality (детали)" }
        ],
        default: "fast",
        description: "Fast ~1 мин, Quality ~3 мин",
        required: true,
        order: 2,
        apiKey: "model"
      },
      aspect_ratio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "auto", label: "Auto" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 3,
        apiKey: "ratio"
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "10000-99999",
        min: 10000,
        max: 99999,
        description: "Для воспроизводимых результатов",
        optional: true,
        order: 4
      }
    }
  },

  // Kling - объединённая модель
  // Поддерживает: text-to-video, image-to-video
  // 2.1 Pro дополнительно: master-image-to-video, master-text-to-video
  "kling": {
    name: "Kling AI",
    apiModel: "kling-2.6/text-to-video",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5-turbo", label: "2.5 Turbo (быстро)" },
          { value: "2.6", label: "2.6 (со звуком)" },
          { value: "2.1-pro", label: "2.1 Pro (премиум)" }
        ],
        default: "2.5-turbo",
        description: "Выберите версию Kling",
        required: true,
        order: 1,
        apiKey: "model"
      },
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст → Видео" },
          { value: "image-to-video", label: "Фото → Видео" }
        ],
        default: "text-to-video",
        description: "Тип генерации видео",
        required: true,
        order: 2,
        apiKey: "modelType"
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "5", label: "5 сек" },
          { value: "10", label: "10 сек" }
        ],
        default: "5",
        description: "Длительность видео",
        required: true,
        order: 3
      },
      aspect_ratio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 4
      },
      sound: {
        label: "Звук",
        type: "checkbox",
        default: false,
        description: "Добавить звук (только Kling 2.6)",
        optional: true,
        order: 5
      },
      negative_prompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "blur, distort, low quality...",
        description: "Что НЕ должно быть в видео",
        optional: true,
        order: 6,
        apiKey: "negativePrompt"
      }
    }
  },

  // Sora 2
  // Поддерживает: text-to-video, image-to-video
  "sora-2": {
    name: "Sora 2",
    apiModel: "sora-2-text-to-video",
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст → Видео" },
          { value: "image-to-video", label: "Фото → Видео" }
        ],
        default: "text-to-video",
        description: "Тип генерации видео",
        required: true,
        order: 1,
        apiKey: "modelType"
      },
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
        order: 2,
        apiKey: "nFrames"
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "landscape", label: "Альбомная (16:9)" },
          { value: "portrait", label: "Портретная (9:16)" }
        ],
        default: "landscape",
        description: "Ориентация видео",
        required: true,
        order: 3
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
        order: 4
      },
      remove_watermark: {
        label: "Убрать водяной знак",
        type: "checkbox",
        default: true,
        description: "Удалить водяной знак OpenAI",
        optional: true,
        order: 5,
        apiKey: "removeWatermark"
      }
    }
  },

  // Sora 2 Pro
  // Поддерживает: text-to-video, image-to-video, characters
  "sora-2-pro": {
    name: "Sora 2 Pro",
    apiModel: "sora-2-pro-text-to-video",
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст → Видео" },
          { value: "image-to-video", label: "Фото → Видео" },
          { value: "characters", label: "Персонажи" }
        ],
        default: "text-to-video",
        description: "Тип генерации видео",
        required: true,
        order: 1,
        apiKey: "modelType"
      },
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
        order: 2,
        apiKey: "nFrames"
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "landscape", label: "Альбомная (16:9)" },
          { value: "portrait", label: "Портретная (9:16)" }
        ],
        default: "landscape",
        description: "Ориентация видео",
        required: true,
        order: 3
      },
      size: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "standard", label: "720p" },
          { value: "high", label: "1080p" }
        ],
        default: "high",
        description: "Разрешение видео",
        required: true,
        order: 4
      },
      remove_watermark: {
        label: "Убрать водяной знак",
        type: "checkbox",
        default: true,
        description: "Удалить водяной знак OpenAI",
        optional: true,
        order: 5,
        apiKey: "removeWatermark"
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
  // Поддерживает: text-to-video, image-to-video, video-to-video (только 2.6)
  "wan": {
    name: "WAN AI",
    apiModel: "wan/2-5-text-to-video",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5", label: "WAN 2.5" },
          { value: "2.6", label: "WAN 2.6 (до 15с)" }
        ],
        default: "2.5",
        description: "Выберите версию WAN",
        required: true,
        order: 1
      },
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст → Видео" },
          { value: "image-to-video", label: "Фото → Видео" },
          { value: "video-to-video", label: "Видео → Видео" }
        ],
        default: "text-to-video",
        description: "V2V только для WAN 2.6",
        required: true,
        order: 2,
        apiKey: "modelType"
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
        order: 3
      },
      aspect_ratio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 4
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
        order: 5
      },
      negative_prompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "blur, distort, low quality...",
        description: "Что НЕ должно быть в видео",
        optional: true,
        order: 6,
        apiKey: "negativePrompt"
      },
      enable_prompt_expansion: {
        label: "Расширение промпта (LLM)",
        type: "checkbox",
        default: false,
        description: "Улучшить промпт с помощью AI",
        optional: true,
        order: 7,
        apiKey: "enablePromptExpansion"
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "Оставьте пустым для случайного",
        description: "Для воспроизводимых результатов",
        optional: true,
        order: 8
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

// ===== ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ =====

/**
 * Рассчитать стоимость генерации в звёздах на основе настроек
 */
export function calculateDynamicPrice(
  modelId: string, 
  settings: Record<string, unknown>,
  type: 'image' | 'video' = 'video'
): number {
  const model = type === 'video' 
    ? KIE_VIDEO_MODELS[modelId] as KieModelSettingsWithPricing
    : KIE_IMAGE_MODELS[modelId] as KieModelSettingsWithPricing;
  
  if (!model) return 0;
  
  let price = model.baseCost || 0;
  
  // Применяем модификаторы цены
  if (model.priceModifiers) {
    for (const modifier of model.priceModifiers) {
      const settingValue = String(settings[modifier.settingKey] || '');
      const modifierValue = modifier.values[settingValue];
      
      if (modifierValue !== undefined) {
        switch (modifier.type) {
          case 'fixed':
            price = modifierValue;
            break;
          case 'multiplier':
            price *= modifierValue;
            break;
          case 'perSecond':
            const seconds = Number(settingValue) || 5;
            price = modifierValue * seconds;
            break;
        }
      }
    }
  }
  
  return Math.round(price);
}

/**
 * Получить информацию о модели с ценообразованием
 */
export function getVideoModelWithPricing(modelId: string): KieModelSettingsWithPricing | undefined {
  return KIE_VIDEO_MODELS[modelId] as KieModelSettingsWithPricing;
}

// ===== API MODEL HELPERS =====

/**
 * Получить apiModel для Kling в зависимости от версии и режима
 */
export function getKlingApiModel(version: string, generationType: string): string {
  const models: Record<string, Record<string, string>> = {
    '2.5-turbo': {
      'text-to-video': 'kling-2.5-turbo/text-to-video',
      'image-to-video': 'kling-2.5-turbo/image-to-video'
    },
    '2.6': {
      'text-to-video': 'kling-2.6/text-to-video',
      'image-to-video': 'kling-2.6/image-to-video'
    },
    '2.1-pro': {
      'text-to-video': 'kling/v2-1-pro-text-to-video',
      'image-to-video': 'kling/v2-1-pro-image-to-video',
      'master-text-to-video': 'kling/v2-1-master-text-to-video',
      'master-image-to-video': 'kling/v2-1-master-image-to-video'
    }
  };
  return models[version]?.[generationType] || models['2.5-turbo']['text-to-video'];
}

/**
 * Получить apiModel для WAN в зависимости от версии и режима
 */
export function getWanApiModel(version: string, generationType: string): string {
  const models: Record<string, Record<string, string>> = {
    '2.5': {
      'text-to-video': 'wan/2-5-text-to-video',
      'image-to-video': 'wan/2-5-image-to-video',
      'video-to-video': 'wan/2-5-text-to-video' // 2.5 не поддерживает v2v
    },
    '2.6': {
      'text-to-video': 'wan/2-6-text-to-video',
      'image-to-video': 'wan/2-6-image-to-video',
      'video-to-video': 'wan/2-6-video-to-video'
    }
  };
  return models[version]?.[generationType] || models['2.5']['text-to-video'];
}

/**
 * Получить apiModel для Sora в зависимости от типа и режима
 */
export function getSoraApiModel(isPro: boolean, generationType: string): string {
  if (isPro) {
    const models: Record<string, string> = {
      'text-to-video': 'sora-2-pro-text-to-video',
      'image-to-video': 'sora-2-pro-image-to-video',
      'characters': 'sora-2-characters'
    };
    return models[generationType] || models['text-to-video'];
  } else {
    const models: Record<string, string> = {
      'text-to-video': 'sora-2-text-to-video',
      'image-to-video': 'sora-2-image-to-video'
    };
    return models[generationType] || models['text-to-video'];
  }
}

/**
 * Получить apiModel для Veo в зависимости от режима
 */
export function getVeoApiModel(generationType: string, quality: string): string {
  // veo3 использует параметр generationType для определения режима
  // и model для качества (fast/quality)
  return 'veo3';
}

/**
 * Проверить, требует ли режим загрузку изображения
 */
export function requiresImageUpload(generationType: string): boolean {
  return ['image-to-video', 'reference-to-video', 'start-end', 'start-only'].includes(generationType);
}

/**
 * Проверить, требует ли режим загрузку видео
 */
export function requiresVideoUpload(generationType: string): boolean {
  return generationType === 'video-to-video';
}
