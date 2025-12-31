// Конфигурация видео моделей с динамическими настройками

export type VideoSettingType = 'select' | 'buttons' | 'textarea' | 'number' | 'slider' | 'checkbox';

export interface VideoSettingOption {
  value: string | number | boolean;
  label: string;
}

export interface VideoModelSetting {
  label: string;
  type: VideoSettingType;
  options?: VideoSettingOption[];
  default?: string | number | boolean;
  placeholder?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  required?: boolean;
  order?: number;
}

export interface VideoModelConfig {
  name: string;
  settings: Record<string, VideoModelSetting>;
}

export const VIDEO_MODELS_CONFIG: Record<string, VideoModelConfig> = {
  "veo3": {
    name: "Veo 3.1",
    settings: {
      generationType: {
        label: "Тип генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст в видео" },
          { value: "image-to-video", label: "Изображение в видео" },
          { value: "reference-to-video", label: "Референс в видео" }
        ],
        default: "text-to-video",
        description: "Выберите источник для создания видео",
        required: true,
        order: 1
      },
      model: {
        label: "Модель",
        type: "buttons",
        options: [
          { value: "fast", label: "Veo 3.1 Fast" },
          { value: "quality", label: "Veo 3.1 Quality" }
        ],
        default: "fast",
        description: "Fast - быстрая генерация, Quality - высокое качество (дольше)",
        required: true,
        order: 2
      },
      duration: {
        label: "Длительность (с)",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 10,
        description: "Длительность видео в секундах",
        required: true,
        order: 3
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "auto", label: "Auto" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "9:16",
        description: "Пропорции видео. Auto - автоматический выбор на основе промпта.",
        required: true,
        order: 4
      },
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
        description: "Разрешение выходного видео",
        required: true,
        order: 5
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "10000-99999 (опционально)",
        min: 10000,
        max: 99999,
        optional: true,
        description: "Число для воспроизводимой генерации",
        order: 6
      }
    }
  },

  "kling-2.6": {
    name: "Kling 2.6",
    settings: {
      modelType: {
        label: "Тип модели",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text To Video" },
          { value: "image-to-video", label: "Image To Video" }
        ],
        default: "text-to-video",
        description: "Создание видео из текста или изображения",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 10,
        description: "Длительность видео в секундах",
        required: true,
        order: 2
      },
      sound: {
        label: "Звук",
        type: "checkbox",
        default: true,
        description: "Автоматическая генерация звука для видео",
        optional: true,
        order: 3
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "9:16",
        description: "Пропорции видео",
        required: true,
        order: 4
      }
    }
  },

  "kling-2.5-turbo": {
    name: "Kling 2.5 Turbo",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        description: "Быстрая генерация коротких видео",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "9:16",
        description: "Пропорции видео",
        required: true,
        order: 2
      }
    }
  },

  "kling-2.1-pro": {
    name: "Kling 2.1 Pro",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 10,
        description: "Максимальное качество видео",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "16:9",
        description: "Пропорции видео. Pro версия для лучшего качества.",
        required: true,
        order: 2
      }
    }
  },

  "kling-o1": {
    name: "Kling O1",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "video-to-video", label: "Video to Video" }
        ],
        default: "video-to-video",
        description: "Редактирование и трансформация существующих видео",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность",
        type: "select",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        description: "Длительность выходного видео",
        required: true,
        order: 2
      }
    }
  },

  "sora-2": {
    name: "Sora 2",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        description: "Длительность видео. Sora поддерживает до 15 секунд.",
        required: true,
        order: 1
      },
      aspectRatio: {
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
        order: 2
      },
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
        description: "Разрешение видео",
        required: true,
        order: 3
      }
    }
  },

  "sora-2-pro": {
    name: "Sora 2 Pro",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" },
          { value: 15, label: "15с" },
          { value: 20, label: "20с" }
        ],
        default: 15,
        description: "Длительность видео. Pro версия до 20 секунд.",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
          { value: "21:9", label: "21:9" }
        ],
        default: "16:9",
        description: "Пропорции видео. Pro поддерживает cinematic 21:9.",
        required: true,
        order: 2
      },
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "1080p", label: "1080p" },
          { value: "2K", label: "2K" },
          { value: "4K", label: "4K" }
        ],
        default: "1080p",
        description: "Разрешение видео. 4K для максимального качества.",
        required: true,
        order: 3
      }
    }
  },

  "wan-2.5": {
    name: "WAN 2.5",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 10,
        description: "Длительность видео",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Кинематографическая генерация T2V/I2V",
        required: true,
        order: 2
      }
    }
  },

  "wan-2.6": {
    name: "WAN 2.6",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "T2V" },
          { value: "image-to-video", label: "I2V" },
          { value: "video-to-video", label: "V2V" }
        ],
        default: "text-to-video",
        description: "Новая версия с поддержкой V2V и Multi-shot",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        description: "До 15 секунд видео",
        required: true,
        order: 2
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        required: true,
        order: 3
      }
    }
  },

  "hailuo-2.3": {
    name: "Hailuo 2.3",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        description: "Быстрая генерация видео",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "9:16",
        description: "Пропорции видео",
        required: true,
        order: 2
      }
    }
  },

  "seedance-pro": {
    name: "Seedance 1.5 Pro",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        description: "Универсальная генерация видео",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "9:16",
        description: "Пропорции видео",
        required: true,
        order: 2
      }
    }
  },

  "grok-imagine": {
    name: "Grok Imagine",
    settings: {
      duration: {
        label: "Длительность",
        type: "select",
        options: [
          { value: 5, label: "5с" },
          { value: 8, label: "8с" },
          { value: 10, label: "10с" }
        ],
        default: 8,
        description: "Мультимодальная генерация от xAI",
        required: true,
        order: 1
      },
      aspectRatio: {
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
        order: 2
      }
    }
  },

  "sora-storyboard": {
    name: "Sora Storyboard",
    settings: {
      numShots: {
        label: "Количество сцен",
        type: "select",
        options: [
          { value: 2, label: "2 сцены" },
          { value: 3, label: "3 сцены" },
          { value: 4, label: "4 сцены" },
          { value: 5, label: "5 сцен" }
        ],
        default: 3,
        description: "Сколько сцен будет в вашей истории",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность каждой сцены",
        type: "buttons",
        options: [
          { value: 3, label: "3с" },
          { value: 5, label: "5с" }
        ],
        default: 5,
        description: "Длительность каждой отдельной сцены",
        required: true,
        order: 2
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции для всех сцен",
        required: true,
        order: 3
      }
    }
  }
};

// Helper функция для получения конфигурации видео модели
export function getVideoModelConfig(modelId: string): VideoModelConfig | null {
  return VIDEO_MODELS_CONFIG[modelId] || null;
}

// Helper функция для получения дефолтных значений настроек
export function getDefaultVideoSettings(modelId: string): Record<string, any> {
  const config = getVideoModelConfig(modelId);
  if (!config) return {};

  const defaults: Record<string, any> = {};
  Object.entries(config.settings).forEach(([key, setting]) => {
    if (setting.default !== undefined) {
      defaults[key] = setting.default;
    }
  });

  return defaults;
}

