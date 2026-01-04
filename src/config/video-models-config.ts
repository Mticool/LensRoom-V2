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
  "veo-3.1": {
    name: "Veo 3.1",
    settings: {
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
        order: 1
      },
      generationType: {
        label: "Тип генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text to Video" },
          { value: "image-to-video", label: "Image to Video" },
          { value: "reference-to-video", label: "Reference to Video" }
        ],
        default: "text-to-video",
        description: "Выберите источник для создания видео",
        required: true,
        order: 2
      },
      ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "auto", label: "Auto" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "auto",
        description: "Auto автоматически выбирает оптимальное соотношение",
        optional: true,
        order: 3
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "10000-99999",
        min: 10000,
        max: 99999,
        optional: true,
        description: "Для воспроизводимости результатов",
        order: 4
      }
    }
  },

  // Объединённая модель Kling - заменяет kling-2.6, kling-2.5-turbo, kling-2.1-pro, kling-o1
  "kling": {
    name: "Kling AI",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5-turbo", label: "2.5 Turbo (105⭐) - Быстро" },
          { value: "2.6", label: "2.6 (230⭐) - С аудио" },
          { value: "2.1-pro", label: "2.1 Pro (402⭐) - Премиум" },
          { value: "o1", label: "O1 (28⭐) - Video-to-Video" }
        ],
        default: "2.5-turbo",
        description: "Выберите версию Kling для генерации",
        required: true,
        order: 1
      },
      modelType: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст в видео" },
          { value: "image-to-video", label: "Изображение в видео" },
          { value: "video-to-video", label: "Видео в видео" },
          { value: "standard", label: "Standard" },
          { value: "pro", label: "Pro" },
          { value: "master-text-to-video", label: "Master T2V" },
          { value: "master-image-to-video", label: "Master I2V" }
        ],
        default: "text-to-video",
        description: "Создание видео из текста, изображения или видео",
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
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        optional: true,
        order: 4
      },
      sound: {
        label: "Включить звук",
        type: "checkbox",
        default: false,
        description: "Автоматическая генерация звука (только для версии 2.6)",
        optional: true,
        order: 5
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "blur, distort, and low quality",
        description: "Что НЕ должно быть в видео",
        optional: true,
        order: 6
      },
      cfgScale: {
        label: "CFG Scale",
        type: "slider",
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.5,
        description: "Насколько точно следовать промпту (0 = свобода, 1 = точность)",
        optional: true,
        order: 7
      }
    }
  },


  "sora-2": {
    name: "Sora 2",
    settings: {
      modelType: {
        label: "Вариант модели",
        type: "select",
        options: [
          { value: "pro-text-to-video", label: "Sora 2 Pro Text To Video" },
          { value: "pro-image-to-video", label: "Sora 2 Pro Image To Video" },
          { value: "text-to-video", label: "Sora 2 Text To Video" },
          { value: "image-to-video", label: "Sora 2 Image To Video" },
          { value: "characters", label: "Sora 2 Characters" },
          { value: "watermark-remover", label: "Sora Watermark Remover" },
          { value: "pro-storyboard", label: "Sora 2 Pro Storyboard" }
        ],
        default: "pro-text-to-video",
        description: "Выберите режим работы Sora 2",
        required: true,
        order: 1
      },
      nFrames: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        description: "Длительность видео в секундах",
        required: true,
        order: 2
      },
      aspectRatio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "portrait", label: "Portrait" },
          { value: "landscape", label: "Landscape" }
        ],
        default: "landscape",
        description: "Вертикальная или горизонтальная ориентация",
        required: true,
        order: 3
      },
      size: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "standard", label: "Standard (720p)" },
          { value: "high", label: "High (1080p)" }
        ],
        default: "standard",
        description: "Разрешение выходного видео",
        required: true,
        order: 4
      },
      removeWatermark: {
        label: "Удалить водяной знак",
        type: "checkbox",
        default: true,
        description: "Удалить водяной знак OpenAI с видео",
        optional: true,
        order: 5
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

  // Объединённая модель WAN - заменяет wan-2.5 и wan-2.6
  "wan": {
    name: "WAN AI",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5", label: "WAN 2.5 (от 100⭐) - Кинематографика" },
          { value: "2.6", label: "WAN 2.6 (от 118⭐) - V2V, 15s" }
        ],
        default: "2.5",
        description: "Выберите версию WAN для генерации",
        required: true,
        order: 1
      },
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Текст в видео" },
          { value: "image-to-video", label: "Изображение в видео" },
          { value: "video-to-video", label: "Видео в видео" }
        ],
        default: "text-to-video",
        description: "V2V доступен только для WAN 2.6",
        required: true,
        order: 2
      },
      duration: {
        label: "Длительность (с)",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        description: "15с доступно только для WAN 2.6",
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
        default: "1080p",
        description: "Качество выходного видео",
        optional: true,
        order: 4
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
        optional: true,
        order: 5
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "Что не должно быть в видео...",
        description: "Нежелательные элементы в видео",
        optional: true,
        order: 6
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "Для воспроизводимых результатов",
        min: 1,
        max: 999999999,
        description: "Число для получения одинаковых результатов",
        optional: true,
        order: 7
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

