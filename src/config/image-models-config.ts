// Конфигурация моделей изображений с динамическими настройками

export type SettingType = 'select' | 'buttons' | 'textarea' | 'number' | 'slider';

export interface SettingOption {
  value: string | number;
  label: string;
}

export interface ModelSetting {
  label: string;
  type: SettingType;
  options?: SettingOption[];
  default?: string | number;
  placeholder?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ModelConfig {
  name: string;
  subModels?: string[];
  settings: Record<string, ModelSetting>;
}

export const IMAGE_MODELS_CONFIG: Record<string, ModelConfig> = {
  "nano-banana-pro": {
    name: "Nano Banana Pro",
    settings: {
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" },
          { value: "4K", label: "4K" }
        ],
        default: "2K"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "select",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "2:3", label: "2:3" },
          { value: "3:2", label: "3:2" },
          { value: "3:4", label: "3:4" },
          { value: "4:3", label: "4:3" },
          { value: "4:5", label: "4:5" },
          { value: "5:4", label: "5:4" },
          { value: "9:16", label: "9:16" },
          { value: "16:9", label: "16:9" },
          { value: "21:9", label: "21:9" },
          { value: "auto", label: "Auto" }
        ],
        default: "9:16"
      },
      outputFormat: {
        label: "Формат вывода",
        type: "select",
        options: [
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" }
        ],
        default: "png"
      },
      style: {
        label: "Стиль",
        type: "select",
        options: [
          { value: "photorealistic", label: "Фотореалистичный" },
          { value: "cinematic", label: "Кинематографический" },
          { value: "artistic", label: "Художественный" }
        ],
        default: "photorealistic"
      }
    }
  },

  "flux-2-pro": {
    name: "FLUX.2 Pro",
    settings: {
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" }
        ],
        default: "2K"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "3:2", label: "3:2" },
          { value: "2:3", label: "2:3" },
          { value: "auto", label: "Auto" }
        ],
        default: "9:16"
      }
    }
  },

  "flux-2-flex": {
    name: "FLUX.2 Flex",
    settings: {
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "1K", label: "1K" },
          { value: "2K", label: "2K" }
        ],
        default: "2K"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "9:16"
      }
    }
  },

  "seedream-4.5": {
    name: "Seedream 4.5",
    settings: {
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "basic", label: "Basic (2K)" },
          { value: "high", label: "High (4K)" }
        ],
        default: "basic"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "select",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "2:3", label: "2:3" },
          { value: "3:2", label: "3:2" },
          { value: "21:9", label: "21:9" }
        ],
        default: "9:16"
      }
    }
  },

  "imagen-4": {
    name: "Imagen 4",
    settings: {
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "3:4", label: "3:4" },
          { value: "4:3", label: "4:3" }
        ],
        default: "9:16"
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "Что не должно быть на изображении...",
        optional: true
      },
      numImages: {
        label: "Количество изображений",
        type: "select",
        options: [
          { value: 1, label: "1" },
          { value: 2, label: "2" },
          { value: 3, label: "3" },
          { value: 4, label: "4" }
        ],
        default: 1
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "Оставьте пустым для случайного",
        optional: true
      }
    }
  },

  "gpt-image": {
    name: "GPT Image",
    settings: {
      quality: {
        label: "Качество",
        type: "select",
        options: [
          { value: "medium", label: "Medium (1536×1536)" },
          { value: "high", label: "High (2048×2048)" }
        ],
        default: "medium"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "1:1"
      }
    }
  },

  "midjourney": {
    name: "Midjourney",
    settings: {
      version: {
        label: "Версия",
        type: "select",
        options: [
          { value: "6", label: "V6" },
          { value: "7", label: "V7" }
        ],
        default: "7"
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" },
          { value: "4:3", label: "4:3" },
          { value: "3:4", label: "3:4" }
        ],
        default: "1:1"
      },
      stylization: {
        label: "Стилизация",
        type: "slider",
        min: 0,
        max: 1000,
        step: 50,
        default: 100
      },
      chaos: {
        label: "Хаос",
        type: "slider",
        min: 0,
        max: 100,
        step: 10,
        default: 0,
        optional: true
      }
    }
  }
};

// Helper функция для получения конфигурации модели
export function getModelConfig(modelId: string): ModelConfig | null {
  return IMAGE_MODELS_CONFIG[modelId] || null;
}

// Helper функция для получения дефолтных значений настроек
export function getDefaultSettings(modelId: string): Record<string, any> {
  const config = getModelConfig(modelId);
  if (!config) return {};

  const defaults: Record<string, any> = {};
  Object.entries(config.settings).forEach(([key, setting]) => {
    if (setting.default !== undefined) {
      defaults[key] = setting.default;
    }
  });

  return defaults;
}

