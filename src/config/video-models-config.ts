// Конфигурация видео моделей с динамическими настройками
// Обновлено 2026-01-26: Новые 8 моделей для единого генератора

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
  // === 1. VEO 3.1 FAST ===
  "veo-3.1-fast": {
    name: "Veo 3.1 Fast",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность (с)",
        type: "buttons",
        options: [
          { value: 4, label: "4с" },
          { value: 6, label: "6с" },
          { value: 8, label: "8с" }
        ],
        default: 6,
        required: true,
        order: 2
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
        required: true,
        order: 3
      },
      aspect_ratio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "16:9",
        optional: true,
        order: 4
      }
    }
  },

  // === 2. KLING 2.1 ===
  "kling-2.1": {
    name: "Kling 2.1",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        required: true,
        order: 2
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
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
        optional: true,
        order: 4
      }
    }
  },

  // === 3. KLING 2.5 ===
  "kling-2.5": {
    name: "Kling 2.5 Turbo",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        required: true,
        order: 2
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
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
        optional: true,
        order: 4
      }
    }
  },

  // === 4. KLING 2.6 ===
  "kling-2.6": {
    name: "Kling 2.6",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" }
        ],
        default: 5,
        required: true,
        order: 2
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" }
        ],
        default: "1080p",
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
        optional: true,
        order: 4
      },
      generate_audio: {
        label: "Генерировать звук",
        type: "checkbox",
        default: false,
        description: "Добавить AI-сгенерированный звук к видео",
        optional: true,
        order: 5
      }
    }
  },

  // === 5. KLING MOTION CONTROL ===
  "kling-motion-control": {
    name: "Kling Motion Control",
    settings: {
      resolution: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "720p", label: "720p (6⭐/сек)" },
          { value: "1080p", label: "1080p (8⭐/сек)" }
        ],
        default: "720p",
        required: true,
        order: 1
      },
      motion_strength: {
        label: "Сила движения",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 70,
        description: "Интенсивность передачи движения (0 = минимум, 100 = максимум)",
        optional: true,
        order: 2
      }
    }
  },

  // === 6. GROK VIDEO ===
  "grok-video": {
    name: "Grok Video",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
          { value: "style_transfer", label: "Style Transfer" }
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 6, label: "6с" },
          { value: 10, label: "10с" }
        ],
        default: 6,
        required: true,
        order: 2
      },
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
        optional: true,
        order: 3
      },
      aspect_ratio: {
        label: "Соотношение",
        type: "buttons",
        options: [
          { value: "9:16", label: "9:16" },
          { value: "1:1", label: "1:1" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" }
        ],
        default: "9:16",
        optional: true,
        order: 4
      }
    }
  },

  // === 7. SORA 2 ===
  "sora-2": {
    name: "Sora 2",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        required: true,
        order: 2
      },
      aspect_ratio: {
        label: "Ориентация",
        type: "buttons",
        options: [
          { value: "portrait", label: "Portrait (9:16)" },
          { value: "landscape", label: "Landscape (16:9)" }
        ],
        default: "landscape",
        required: true,
        order: 3
      },
      resolution: {
        label: "Качество",
        type: "buttons",
        options: [
          { value: "standard", label: "Standard (720p)" },
          { value: "high", label: "High (1080p)" }
        ],
        default: "standard",
        required: true,
        order: 4
      }
    }
  },

  // === 8. WAN 2.6 ===
  "wan-2.6": {
    name: "WAN 2.6",
    settings: {
      mode: {
        label: "Режим",
        type: "buttons",
        options: [
          { value: "text_to_video", label: "Text → Video" },
          { value: "image_to_video", label: "Image → Video" },
          { value: "video_to_video", label: "Video → Video" }
        ],
        default: "text_to_video",
        required: true,
        order: 1
      },
      duration_seconds: {
        label: "Длительность",
        type: "buttons",
        options: [
          { value: 5, label: "5с" },
          { value: 10, label: "10с" },
          { value: 15, label: "15с" }
        ],
        default: 10,
        required: true,
        order: 2
      },
      resolution: {
        label: "Разрешение",
        type: "buttons",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
          { value: "1080p_multi", label: "1080p Multi-shot" }
        ],
        default: "1080p",
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
        optional: true,
        order: 4
      },
      camera_motion: {
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
        optional: true,
        order: 5
      },
      style: {
        label: "Стиль",
        type: "select",
        options: [
          { value: "realistic", label: "Реалистичный" },
          { value: "cinematic", label: "Кинематографичный" },
          { value: "anime", label: "Аниме" },
          { value: "cartoon", label: "Мультфильм" }
        ],
        default: "cinematic",
        optional: true,
        order: 6
      },
      motion_strength: {
        label: "Сила движения",
        type: "slider",
        min: 0,
        max: 100,
        step: 5,
        default: 50,
        description: "Интенсивность движения в кадре",
        optional: true,
        order: 7
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
