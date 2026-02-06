/**
 * API Settings Configuration
 * 
 * Этот файл содержит точные настройки для каждой модели,
 * которые поддерживаются внешним API.
 * 
 * Документация: https://docs.example.ai
 * Модели: https://example.ai/market
 */

// ===== ТИПЫ =====

export type SettingType = 'select' | 'buttons' | 'textarea' | 'number' | 'slider' | 'checkbox' | 'info';

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

export interface PriceModifier {
  settingKey: string;
  values: Record<string, number>; // value -> множитель или фиксированная цена
  type: 'multiplier' | 'fixed' | 'perSecond';
}

export interface KieModelSettings {
  name: string;
  apiModel: string; // Точное название модели для API
  settings: Record<string, ModelSetting>;
  baseCost?: number; // Базовая стоимость в звёздах
  priceModifiers?: PriceModifier[]; // Модификаторы цены
  provider?: 'kie' | 'fal'; // Провайдер API
}

// ===== ФОТО МОДЕЛИ =====

export const KIE_IMAGE_MODELS: Record<string, KieModelSettings> = {
  // Z-image Turbo (Text-to-Image)
  "z-image": {
    name: "Z-Image Turbo",
    apiModel: "z-image-turbo",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "auto", label: "Auto (по референсу)" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 1
      }
    }
  },

  // Nano Banana
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

  // Nano Banana Pro - поддерживает Text-to-Image и Image-to-Image
  "nano-banana-pro": {
    name: "Nano Banana Pro",
    apiModel: "nano-banana-pro",
    baseCost: 30, // Базовая цена 30⭐ (1K/2K)
    priceModifiers: [
      {
        settingKey: "quality",
        type: "fixed",
        values: {
          "1K": 30,   // 1K = 30⭐
          "2K": 30,   // 2K = 30⭐
          "4K": 40    // 4K = 40⭐
        }
      }
    ],
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "t2i", label: "📝 Текст → Фото" },
          { value: "i2i", label: "🖼️ Фото → Фото" }
        ],
        default: "t2i",
        description: "t2i = создать с нуля, i2i = изменить загруженное фото",
        required: true,
        order: 1
      },
      variants: {
        label: "Количество фото",
        type: "buttons",
        options: [
          { value: 1, label: "1" },
          { value: 2, label: "2" },
          { value: 4, label: "4" }
        ],
        default: 1,
        description: "Создать несколько вариантов одновременно",
        required: false,
        order: 2
      },
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "1K", label: "1K (30⭐)" },
          { value: "2K", label: "2K (30⭐)" },
          { value: "4K", label: "4K (40⭐)" }
        ],
        default: "2K",
        description: "1K/2K = 30⭐, 4K = 40⭐",
        required: true,
        order: 3
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
        order: 4
      }
    }
  },

  // FLUX.2 Pro - поддерживает t2i и i2i
  "flux-2-pro": {
    name: "FLUX.2 Pro",
    apiModel: "flux-2/pro-text-to-image",
    baseCost: 9, // Базовая цена 9⭐ (1K)
    priceModifiers: [
      {
        settingKey: "resolution",
        type: "fixed",
        values: {
          "1K": 9,   // 1K = 9⭐
          "2K": 12,  // 2K = 12⭐
          "4K": 12   // 4K = 12⭐ (temporarily same as 2K)
        }
      }
    ],
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "t2i", label: "📝 Текст → Фото" },
          { value: "i2i", label: "🖼️ Фото → Фото" }
        ],
        default: "t2i",
        description: "t2i = создать с нуля, i2i = редактировать фото",
        required: true,
        order: 1
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "1K", label: "1K (9⭐)" },
          { value: "2K", label: "2K (12⭐)" },
          { value: "4K", label: "4K (12⭐)" }
        ],
        default: "2K",
        description: "1K = 9⭐, 2K = 12⭐",
        required: true,
        order: 2
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "3:4", label: "3:4" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" },
          { value: "4:5", label: "4:5" },
          { value: "auto", label: "Auto (по референсу)" }
        ],
        default: "16:9",
        description: "Пропорции изображения",
        required: true,
        order: 3
      }
    }
  },

  // Seedream 4.5 - поддерживает t2i и i2i
  "seedream-4.5": {
    name: "Seedream 4.5",
    apiModel: "seedream/4.5-text-to-image",
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "t2i", label: "📝 Текст → Фото" }
        ],
        default: "t2i",
        description: "t2i = создать с нуля",
        required: true,
        order: 1
      },
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
        order: 2
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
        order: 3
      }
    }
  },

  // GPT Image - поддерживает генерацию и редактирование
  // GPT Image 1.5
  // Документация: https://docs.example.ai/gpt-image-1.5
  "gpt-image": {
    name: "GPT Image 1.5",
    apiModel: "gpt-image/1.5-text-to-image",
    baseCost: 17, // Базовая цена 17⭐ (medium)
    priceModifiers: [
      {
        settingKey: "quality",
        type: "fixed",
        values: {
          "medium": 17,  // Medium = 17⭐
          "high": 67     // High = 67⭐
        }
      }
    ],
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "t2i", label: "📝 Текст → Фото" },
          { value: "i2i", label: "✏️ Редактировать (до 16 фото)" }
        ],
        default: "t2i",
        description: "I2I поддерживает до 16 изображений для редактирования",
        required: true,
        order: 1
      },
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "medium", label: "Medium (17⭐)" },
          { value: "high", label: "High (67⭐)" }
        ],
        default: "medium",
        description: "Medium = 17⭐, High = 67⭐",
        required: true,
        order: 2
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "3:2", label: "3:2 (альбом)" },
          { value: "2:3", label: "2:3 (портрет)" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 3
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

  // Grok Imagine (Text-to-Image + Upscale)
  "grok-imagine": {
    name: "Grok Imagine",
    apiModel: "grok-imagine/text-to-image",
    settings: {
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "3:2", label: "3:2 (альбом)" },
          { value: "2:3", label: "2:3 (портрет)" },
          { value: "9:16", label: "9:16 (сторис)" },
          { value: "16:9", label: "16:9 (широкий)" }
        ],
        default: "1:1",
        description: "Пропорции изображения",
        required: true,
        order: 1
      },
      mode: {
        label: "Режим 🌶️",
        type: "buttons",
        options: [
          { value: "normal", label: "Normal" },
          { value: "fun", label: "Fun" },
          { value: "spicy", label: "🌶️ Spicy" }
        ],
        default: "normal",
        description: "Spicy = более креативный и выразительный результат",
        required: true,
        order: 2
      }
    }
  }
};

// ===== ВИДЕО МОДЕЛИ =====

export const KIE_VIDEO_MODELS: Record<string, KieModelSettings> = {
  // Kling O1 (First Frame Last Frame)
  // Документация: https://docs.example.ai/kling-video/o1
  "kling-o1": {
    name: "Kling O1",
    apiModel: "fal-ai/kling-video/o1/standard/image-to-video",
    provider: "fal",
    baseCost: 120, // UPDATED 2025-01-04: 120⭐ за 5 сек
    priceModifiers: [
      {
        settingKey: "duration",
        type: "fixed",
        values: {
          "5": 120,   // 5s = 120⭐
          "10": 240   // 10s = 240⭐ (2x)
        }
      }
    ],
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: "5", label: "5 сек • 120⭐" },
          { value: "10", label: "10 сек • 240⭐" }
        ],
        default: "5",
        description: "First Frame → Last Frame анимация",
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

  // Veo 3.1
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
          { value: "fast", label: "Fast • 99⭐" },
          { value: "quality", label: "Quality • 490⭐" }
        ],
        default: "fast",
        description: "Fast ~1 мин (99⭐), Quality ~3 мин (490⭐)",
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
          { value: "2.5-turbo", label: "2.5 Turbo • от 105⭐" },
          { value: "2.6", label: "2.6 (звук) • от 105⭐" },
          { value: "2.1-pro", label: "2.1 Pro • от 200⭐" }
        ],
        default: "2.5-turbo",
        description: "2.5 Turbo - быстро, 2.6 - со звуком, 2.1 Pro - премиум качество",
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
          { value: "5", label: "5 сек • 1x" },
          { value: "10", label: "10 сек • 2x" }
        ],
        default: "5",
        description: "Цена удваивается за 10 секунд",
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
        label: "Звук (+30⭐)",
        type: "checkbox",
        default: false,
        description: "Добавить звук (только версия 2.6, +30⭐ к цене)",
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
        description: "Удалить водяной знак",
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
        description: "Удалить водяной знак",
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
  },

  // Grok Video (Text-to-Video + Image-to-Video + Audio)
  // Документация: https://docs.example.ai/grok-video
  "grok-video": {
    name: "Grok Video",
    apiModel: "grok-imagine/text-to-video",
    settings: {
      generation_type: {
        label: "Режим генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "📝 Текст → Видео" },
          { value: "image-to-video", label: "🖼️ Фото → Видео" }
        ],
        default: "text-to-video",
        description: "I2V анимирует загруженное изображение",
        required: true,
        order: 1,
        apiKey: "generationType"
      },
      aspect_ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "3:2", label: "3:2 (альбом)" },
          { value: "2:3", label: "2:3 (портрет)" }
        ],
        default: "3:2",
        description: "Пропорции видео",
        required: true,
        order: 2
      },
      mode: {
        label: "Режим 🌶️",
        type: "buttons",
        options: [
          { value: "normal", label: "Normal" },
          { value: "fun", label: "Fun" },
          { value: "spicy", label: "🌶️ Spicy" }
        ],
        default: "normal",
        description: "Spicy = более креативный результат (не для I2V с внешних URL)",
        required: true,
        order: 3
      }
    }
  },

  // Kling 2.6 Motion Control - Перенос движений с референсного видео
  // Документация: https://docs.example.ai/kling-2.6-motion-control
  // 
  // ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ (per-second):
  // - 720p: 16⭐/сек
  // - 1080p: 25⭐/сек
  // - Округление: ceil((duration * rate) / 5) * 5
  // - Лимиты: 3-30 сек
  "kling-motion-control": {
    name: "Kling Motion Control",
    apiModel: "kling-2.6/motion-control",
    // Цена рассчитывается динамически в src/lib/pricing/pricing.ts
    // baseCost не используется - цена зависит от длительности видео
    settings: {
      resolution: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "720p", label: "720p • 16⭐/сек" },
          { value: "1080p", label: "1080p • 25⭐/сек" }
        ],
        default: "720p",
        description: "Цена зависит от длительности видео (3-30 сек)",
        required: true,
        order: 1,
        apiKey: "mode"
      },
      instructions: {
        label: "📋 Инструкция",
        type: "info",
        description: "1. Через 📎 в промпт-баре загрузите:\n   • Фото персонажа (голова + плечи)\n   • Видео с движениями (3-30 сек)\n\n2. Кадрирование фото и видео должно совпадать\n\n3. Движения плавные, один человек",
        order: 2
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
    ? KIE_VIDEO_MODELS[modelId] as KieModelSettings
    : KIE_IMAGE_MODELS[modelId] as KieModelSettings;
  
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
export function getVideoModelWithPricing(modelId: string): KieModelSettings | undefined {
  return KIE_VIDEO_MODELS[modelId] as KieModelSettings;
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
  return [
    // Видео режимы
    'image-to-video', 'reference-to-video', 'start-end', 'start-only',
    // Фото режимы
    'i2i'
  ].includes(generationType);
}

/**
 * Проверить, требует ли режим загрузку видео
 */
export function requiresVideoUpload(generationType: string): boolean {
  return generationType === 'video-to-video';
}

// ===== АУДИО МОДЕЛИ (SUNO) =====

export const KIE_AUDIO_MODELS: Record<string, KieModelSettings> = {
  // Music - Generate
  "suno": {
    name: "Suno AI",
    apiModel: "ai-music-api/generate",
    settings: {
      generation_type: {
        label: "Тип генерации",
        type: "buttons",
        options: [
          { value: "generate", label: "🎵 Создать" },
          { value: "extend", label: "⏩ Продлить" },
          { value: "cover", label: "🎤 Кавер" },
          { value: "add-vocals", label: "🎙️ Вокал" },
          { value: "separate", label: "🎚️ Разделить" }
        ],
        default: "generate",
        description: "Выберите тип генерации музыки",
        required: true,
        order: 1
      },
      model: {
        label: "Версия модели",
        type: "buttons",
        options: [
          { value: "V5", label: "V5 (новая)" },
          { value: "V4_5PLUS", label: "V4.5+" },
          { value: "V4", label: "V4" },
          { value: "V3_5", label: "V3.5" }
        ],
        default: "V4_5PLUS",
        description: "V5 - лучшее качество, V4.5+ - оптимальный баланс",
        required: true,
        order: 2
      },
      custom_mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: false, label: "Простой" },
          { value: true, label: "Кастомный" }
        ],
        default: false,
        description: "Простой - только промпт, Кастомный - стиль + текст песни",
        required: false,
        order: 3,
        apiKey: "customMode"
      },
      title: {
        label: "Название трека",
        type: "textarea",
        placeholder: "Введите название песни...",
        optional: true,
        description: "Название вашего трека",
        order: 4
      },
      style: {
        label: "Стиль музыки",
        type: "textarea",
        placeholder: "pop, energetic, female vocals, acoustic guitar...",
        optional: true,
        description: "Жанр, инструменты, настроение (до 1000 символов)",
        order: 5
      },
      instrumental: {
        label: "Инструментал",
        type: "checkbox",
        default: false,
        description: "Без вокала - только инструменты",
        optional: true,
        order: 6
      },
      lyrics: {
        label: "Текст песни",
        type: "textarea",
        placeholder: "[Verse 1]\nНапишите текст песни...\n\n[Chorus]\nПрипев...",
        optional: true,
        description: "Текст песни с разметкой [Verse], [Chorus], [Bridge] (до 5000 символов)",
        order: 7,
        apiKey: "prompt"
      },
      vocal_gender: {
        label: "Пол вокала",
        type: "buttons",
        options: [
          { value: "not_specified", label: "Авто" },
          { value: "male", label: "Мужской" },
          { value: "female", label: "Женский" }
        ],
        default: "not_specified",
        description: "Выберите голос для вокала",
        optional: true,
        order: 8,
        apiKey: "vocalGender"
      },
      negative_tags: {
        label: "Исключить",
        type: "textarea",
        placeholder: "autotune, screaming, heavy metal...",
        optional: true,
        description: "Теги которые НЕ должны быть в музыке",
        order: 9,
        apiKey: "negativeTags"
      },
      style_weight: {
        label: "Сила стиля",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 50,
        optional: true,
        description: "Насколько сильно применять указанный стиль",
        order: 10,
        apiKey: "styleWeight"
      },
      weirdness: {
        label: "Уникальность",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 30,
        optional: true,
        description: "Больше = более экспериментальный результат",
        order: 11,
        apiKey: "weirdnessConstraint"
      }
    }
  },

  // Extend - для продления
  "suno-extend": {
    name: "Suno Extend",
    apiModel: "ai-music-api/extend",
    settings: {
      audio_id: {
        label: "ID аудио",
        type: "textarea",
        placeholder: "Вставьте ID предыдущей генерации...",
        required: true,
        description: "ID трека который нужно продлить",
        order: 1,
        apiKey: "audioId"
      },
      continue_prompt: {
        label: "Продолжение",
        type: "textarea",
        placeholder: "[Verse 2]\nТекст продолжения...",
        optional: true,
        description: "Текст для продолжения песни",
        order: 2,
        apiKey: "prompt"
      },
      default_param_flag: {
        label: "Использовать параметры оригинала",
        type: "checkbox",
        default: true,
        optional: true,
        order: 3,
        apiKey: "defaultParamFlag"
      }
    }
  },

  // Cover - для каверов
  "suno-cover": {
    name: "Suno Cover",
    apiModel: "ai-music-api/upload-and-cover-audio",
    settings: {
      model: {
        label: "Версия модели",
        type: "buttons",
        options: [
          { value: "V5", label: "V5" },
          { value: "V4_5PLUS", label: "V4.5+" },
          { value: "V4", label: "V4" }
        ],
        default: "V4_5PLUS",
        required: true,
        order: 1
      },
      custom_mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: false, label: "Авто" },
          { value: true, label: "Кастомный" }
        ],
        default: false,
        order: 2,
        apiKey: "customMode"
      },
      cover_prompt: {
        label: "Описание кавера",
        type: "textarea",
        placeholder: "Сделай в стиле джаз с женским вокалом...",
        optional: true,
        description: "Как должен звучать кавер",
        order: 3,
        apiKey: "prompt"
      },
      instrumental: {
        label: "Только инструментал",
        type: "checkbox",
        default: false,
        optional: true,
        order: 4
      },
      vocal_gender: {
        label: "Пол вокала",
        type: "buttons",
        options: [
          { value: "not_specified", label: "Авто" },
          { value: "male", label: "Муж" },
          { value: "female", label: "Жен" }
        ],
        default: "not_specified",
        optional: true,
        order: 5,
        apiKey: "vocalGender"
      },
      style_weight: {
        label: "Сила стиля",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 50,
        optional: true,
        order: 6,
        apiKey: "styleWeight"
      },
      audio_weight: {
        label: "Сохранение оригинала",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 70,
        optional: true,
        description: "Больше = ближе к оригиналу",
        order: 7,
        apiKey: "audioWeight"
      }
    }
  },

  // Add Vocals - добавление вокала
  "suno-vocals": {
    name: "Suno Add Vocals",
    apiModel: "ai-music-api/add-vocals",
    settings: {
      title: {
        label: "Название",
        type: "textarea",
        placeholder: "Название трека...",
        required: true,
        order: 1
      },
      style: {
        label: "Стиль",
        type: "textarea",
        placeholder: "pop, emotional, powerful...",
        required: true,
        order: 2
      },
      lyrics: {
        label: "Текст для вокала",
        type: "textarea",
        placeholder: "[Verse]\nТекст песни...",
        required: true,
        order: 3,
        apiKey: "prompt"
      },
      vocal_gender: {
        label: "Пол вокала",
        type: "buttons",
        options: [
          { value: "male", label: "Мужской" },
          { value: "female", label: "Женский" }
        ],
        default: "female",
        required: true,
        order: 4,
        apiKey: "vocalGender"
      },
      negative_tags: {
        label: "Исключить",
        type: "textarea",
        placeholder: "autotune, screaming...",
        optional: true,
        order: 5,
        apiKey: "negativeTags"
      }
    }
  },

  // Separate - разделение вокала и инструментов
  "suno-separate": {
    name: "Suno Separate",
    apiModel: "ai-music-api/separate-vocals",
    settings: {
      separation_type: {
        label: "Тип разделения",
        type: "buttons",
        options: [
          { value: "vocals", label: "🎤 Вокал" },
          { value: "instrumental", label: "🎸 Инструментал" },
          { value: "both", label: "🎵 Оба" }
        ],
        default: "both",
        required: true,
        description: "Что извлечь из трека",
        order: 1,
        apiKey: "separationType"
      }
    }
  },

  // ===== DIALOGUE V3 - Text to Dialogue =====
  // Документация: https://docs.example.ai/text-to-dialogue-v3
  // Expressive multilingual Text to Dialogue with audio tags, multi-speaker support
  "elevenlabs-v3": {
    name: "Dialogue V3",
    apiModel: "elevenlabs/text-to-dialogue-v3",
    settings: {
      dialogue: {
        label: "Текст для озвучки",
        type: "textarea",
        placeholder: "Введите текст для озвучки...\n\nПоддерживает теги: [whispers], [laughs], [sighs], [excited], [sarcastic]",
        required: true,
        description: "Текст диалога. Используйте эллипсы (...) для пауз, тире (—) для прерываний",
        order: 1
      },
      stability: {
        label: "Стабильность голоса",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 50,
        optional: true,
        description: "Меньше = более вариативно и эмоционально, больше = стабильнее",
        order: 2
      },
      language_code: {
        label: "Язык",
        type: "buttons",
        options: [
          { value: "auto", label: "🌐 Авто" },
          { value: "ru", label: "🇷🇺 Русский" },
          { value: "en", label: "🇬🇧 English" },
          { value: "de", label: "🇩🇪 Deutsch" },
          { value: "fr", label: "🇫🇷 Français" },
          { value: "es", label: "🇪🇸 Español" },
          { value: "ja", label: "🇯🇵 日本語" },
          { value: "zh", label: "🇨🇳 中文" }
        ],
        default: "auto",
        optional: true,
        description: "70+ языков поддерживается",
        order: 3,
        apiKey: "language_code"
      }
    }
  }
};

/**
 * Получить настройки для аудио модели
 */
export function getAudioModelSettings(modelId: string): KieModelSettings | null {
  return KIE_AUDIO_MODELS[modelId] || null;
}

/**
 * Получить дефолтные настройки для аудио модели
 */
export function getDefaultAudioSettings(modelId: string): Record<string, any> {
  const modelConfig = KIE_AUDIO_MODELS[modelId];
  if (!modelConfig) return {};
  
  const defaults: Record<string, any> = {};
  for (const [key, setting] of Object.entries(modelConfig.settings)) {
    if (setting.default !== undefined) {
      defaults[key] = setting.default;
    }
  }
  return defaults;
}

/**
 * Рассчитать стоимость аудио генерации
 */
export function calculateAudioPrice(modelId: string, settings: Record<string, any>): number {
  // Базовые цены в кредитах KIE
  const basePrices: Record<string, number> = {
    'suno': 12,           // Generate
    'suno-extend': 12,    // Extend
    'suno-cover': 12,     // Cover
    'suno-vocals': 12,    // Add Vocals
    'suno-separate': 1,   // Separate (дёшево)
    'elevenlabs-v3': 8,   // Dialogue V3 Text-to-Dialogue
  };
  
  const kieCredits = basePrices[modelId] || 12;
  
  // Конвертация: 1 KIE credit ≈ 2 звезды (примерно)
  return Math.ceil(kieCredits * 2);
}
