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
  // === GROK VIDEO - xAI с стилями и длительностями ===
  "grok-video": {
    name: "Grok Video",
    settings: {
      style: {
        label: "Стиль",
        type: "select",
        options: [
          { value: "realistic", label: "Реалистичный" },
          { value: "fantasy", label: "Фэнтези" },
          { value: "sci-fi", label: "Sci-Fi" },
          { value: "cinematic", label: "Кинематографичный" },
          { value: "anime", label: "Аниме" },
          { value: "cartoon", label: "Мультфильм" }
        ],
        default: "realistic",
        description: "Визуальный стиль видео",
        required: true,
        order: 1
      },
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text → Video" },
          { value: "image-to-video", label: "Image → Video" },
          { value: "style-transfer", label: "Style Transfer" }
        ],
        default: "text-to-video",
        description: "Источник для создания видео",
        required: true,
        order: 2
      },
      duration: {
        label: "Длительность (с)",
        type: "buttons",
        options: [
          { value: 6, label: "6с" },
          { value: 12, label: "12с" },
          { value: 18, label: "18с" }
        ],
        default: 6,
        description: "Длительность видео",
        required: true,
        order: 3
      },
      aspectRatio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
          { value: "3:2", label: "3:2" }
        ],
        default: "9:16",
        description: "Пропорции видео",
        optional: true,
        order: 4
      },
      spicyMode: {
        label: "Spicy Mode 🌶️",
        type: "checkbox",
        default: false,
        description: "Более выразительные и креативные результаты",
        optional: true,
        order: 5
      }
    }
  },

  // === VEO 3.1 - Google с референсами ===
  "veo-3.1": {
    name: "Veo 3.1",
    settings: {
      model: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "fast", label: "Fast (99⭐)" },
          { value: "quality", label: "Quality (490⭐)" }
        ],
        default: "fast",
        description: "Fast - быстрая генерация, Quality - максимальное качество",
        required: true,
        order: 1
      },
      generationType: {
        label: "Тип генерации",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text → Video" },
          { value: "image-to-video", label: "Image → Video" },
          { value: "reference-to-video", label: "3 Refs → Video" },
          { value: "first-last-frame", label: "First/Last Frame" }
        ],
        default: "text-to-video",
        description: "Reference - до 3 изображений для контроля стиля/персонажа",
        required: true,
        order: 2
      },
      duration: {
        label: "Длительность (с)",
        type: "buttons",
        options: [
          { value: 4, label: "4с" },
          { value: 6, label: "6с" },
          { value: 8, label: "8с" }
        ],
        default: 8,
        description: "Длительность видео",
        required: true,
        order: 3
      },
      ratio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        description: "Пропорции видео",
        optional: true,
        order: 4
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
        order: 5
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "10000-99999",
        min: 10000,
        max: 99999,
        optional: true,
        description: "Для воспроизводимости результатов",
        order: 6
      }
    }
  },

  // Объединённая модель Kling с quality tiers: Standard, Pro, Master
  "kling": {
    name: "Kling AI",
    settings: {
      qualityTier: {
        label: "Уровень качества",
        type: "buttons",
        options: [
          { value: "standard", label: "Standard" },
          { value: "pro", label: "Pro" },
          { value: "master", label: "Master" }
        ],
        default: "standard",
        description: "Standard - быстро, Pro - баланс, Master - максимум качества",
        required: true,
        order: 1
      },
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5-turbo", label: "2.5 Turbo — Быстрая генерация" },
          { value: "2.6-standard", label: "2.6 Standard — С аудио" },
          { value: "2.6-pro", label: "2.6 Pro — Высокое качество" },
          { value: "2.1-pro", label: "2.1 Pro — Премиум" },
          { value: "2.6-master", label: "2.6 Master — Максимум" }
        ],
        default: "2.5-turbo",
        description: "Выберите версию Kling для генерации",
        required: true,
        order: 2
      },
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text → Video" },
          { value: "image-to-video", label: "Image → Video" }
        ],
        default: "text-to-video",
        description: "Источник для создания видео",
        required: true,
        order: 3
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
        order: 4
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
        order: 5
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
        order: 6
      },
      sound: {
        label: "Включить звук",
        type: "checkbox",
        default: false,
        description: "Генерация звука (только 2.6)",
        optional: true,
        order: 7
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "blur, distort, low quality",
        description: "Что НЕ должно быть в видео",
        optional: true,
        order: 8
      },
      cfgScale: {
        label: "CFG Scale",
        type: "slider",
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.5,
        description: "Точность следования промпту (0 = свобода, 1 = точность)",
        optional: true,
        order: 9
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

  // Объединённая модель WAN с advanced controls (2.6)
  "wan": {
    name: "WAN AI",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "2.5", label: "WAN 2.5 — Кинематографика" },
          { value: "2.6", label: "WAN 2.6 — V2V, Camera Control, 15с" }
        ],
        default: "2.6",
        description: "2.6 поддерживает управление камерой и стилем",
        required: true,
        order: 1
      },
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text-to-video", label: "Text → Video" },
          { value: "image-to-video", label: "Image → Video" },
          { value: "video-to-video", label: "Video → Video" }
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
          { value: "1080p", label: "1080p" },
          { value: "1080p_multi", label: "1080p Multi" }
        ],
        default: "1080p",
        description: "Multi-shot для сложных сцен (только 2.6)",
        optional: true,
        order: 4
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
        order: 5
      },
      cameraMotion: {
        label: "Движение камеры",
        type: "select",
        options: [
          { value: "static", label: "Статично" },
          { value: "pan_left", label: "Панорама влево" },
          { value: "pan_right", label: "Панорама вправо" },
          { value: "tilt_up", label: "Наклон вверх" },
          { value: "tilt_down", label: "Наклон вниз" },
          { value: "zoom_in", label: "Приближение" },
          { value: "zoom_out", label: "Отдаление" },
          { value: "orbit", label: "Орбита" },
          { value: "follow", label: "Следование" }
        ],
        default: "static",
        description: "Управление движением камеры (только WAN 2.6)",
        optional: true,
        order: 6
      },
      stylePreset: {
        label: "Стиль",
        type: "select",
        options: [
          { value: "realistic", label: "Реалистичный" },
          { value: "cinematic", label: "Кинематографичный" },
          { value: "anime", label: "Аниме" },
          { value: "artistic", label: "Художественный" },
          { value: "vintage", label: "Винтаж" },
          { value: "neon", label: "Неон" }
        ],
        default: "cinematic",
        description: "Визуальный стиль (только WAN 2.6)",
        optional: true,
        order: 7
      },
      motionStrength: {
        label: "Сила движения",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 50,
        description: "Интенсивность движения в кадре (0 = минимум, 100 = максимум)",
        optional: true,
        order: 8
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "Что не должно быть в видео...",
        description: "Нежелательные элементы",
        optional: true,
        order: 9
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "Для воспроизводимых результатов",
        min: 1,
        max: 999999999,
        description: "Число для одинаковых результатов",
        optional: true,
        order: 10
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
  },

  // === BYTEDANCE PRO (Seedance 1.0 Pro) ===
  "bytedance-pro": {
    name: "Bytedance Pro",
    settings: {
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        description: "Длительность видео",
        required: true,
        order: 1
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p (27⭐)" },
          { value: "1080p", label: "1080p (61⭐)" }
        ],
        default: "720p",
        description: "Качество выходного видео",
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
        optional: true,
        order: 3
      }
    }
  },

  // === KLING AI AVATAR ===
  "kling-ai-avatar": {
    name: "Kling AI Avatar",
    settings: {
      quality: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "standard", label: "Standard (720p)" },
          { value: "pro", label: "Pro (1080p)" }
        ],
        default: "standard",
        description: "Standard - 14⭐/сек, Pro - 27⭐/сек",
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
        default: 5,
        description: "Длительность говорящего аватара",
        required: true,
        order: 2
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
        order: 3
      }
    }
  },

  // === KLING O1 - First/Last Frame ===
  "kling-o1": {
    name: "Kling O1",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "i2v", label: "Один кадр" },
          { value: "start_end", label: "First → Last Frame" }
        ],
        default: "i2v",
        description: "Один кадр или анимация между двумя кадрами",
        required: true,
        order: 1
      },
      duration: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с (120⭐)" },
          { value: 10, label: "10с (240⭐)" }
        ],
        default: 5,
        description: "Длительность выходного видео",
        required: true,
        order: 2
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "auto", label: "Авто" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" }
        ],
        default: "auto",
        description: "Авто подберёт пропорции по изображению",
        optional: true,
        order: 3
      }
    }
  },

  // === KLING O1 EDIT - Video-to-Video ===
  "kling-o1-edit": {
    name: "Kling O1 Edit",
    settings: {
      keepAudio: {
        label: "Сохранить аудио",
        type: "checkbox",
        default: true,
        description: "Сохранить оригинальную звуковую дорожку",
        optional: true,
        order: 1
      }
    }
  },

  // === KLING 2.6 MOTION CONTROL ===
  "kling-motion-control": {
    name: "Kling Motion Control",
    settings: {
      characterOrientation: {
        label: "Ориентация персонажа",
        type: "buttons",
        options: [
          { value: "image", label: "Image (макс 10с)" },
          { value: "video", label: "Video (макс 30с)" }
        ],
        default: "image",
        description: "Image - поза с фото, Video - подстройка под движение",
        required: true,
        order: 1
      },
      resolution: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "720p", label: "720p (16⭐/сек)" },
          { value: "1080p", label: "1080p (25⭐/сек)" }
        ],
        default: "720p",
        description: "Разрешение выходного видео",
        required: true,
        order: 2
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

