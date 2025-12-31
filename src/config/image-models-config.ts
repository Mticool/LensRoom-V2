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
  description?: string; // Описание для тултипа
  required?: boolean; // Обязательное поле
  order?: number; // Порядок отображения
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
        default: "2K",
        description: "Разрешение выходного изображения. Более высокое качество = больше деталей.",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
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
        default: "9:16",
        description: "Пропорции итогового изображения",
        required: true,
        order: 2
      },
      outputFormat: {
        label: "Формат вывода",
        type: "select",
        options: [
          { value: "png", label: "PNG" },
          { value: "jpg", label: "JPG" }
        ],
        default: "png",
        description: "Формат файла. PNG - без потерь, JPG - меньший размер.",
        required: true,
        order: 3
      },
      style: {
        label: "Стиль",
        type: "select",
        options: [
          { value: "photorealistic", label: "Фотореалистичный" },
          { value: "cinematic", label: "Кинематографический" },
          { value: "artistic", label: "Художественный" }
        ],
        default: "photorealistic",
        description: "Общий стиль изображения",
        optional: true,
        order: 4
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
        default: "2K",
        description: "Разрешение выходного изображения",
        required: true,
        order: 1
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
        default: "9:16",
        description: "Пропорции итогового изображения",
        required: true,
        order: 2
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
        default: "2K",
        description: "Разрешение выходного изображения",
        required: true,
        order: 1
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
          { value: "2:3", label: "2:3" }
        ],
        default: "9:16",
        description: "Пропорции итогового изображения. Flex поддерживает больше гибкости в стилях.",
        required: true,
        order: 2
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
        default: "basic",
        description: "Basic для быстрой генерации, High для максимального качества",
        required: true,
        order: 1
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
          { value: "2:3", label: "2:3" },
          { value: "3:2", label: "3:2" },
          { value: "21:9", label: "21:9" }
        ],
        default: "9:16",
        description: "Пропорции итогового изображения. Поддерживает широкий спектр форматов.",
        required: true,
        order: 2
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
        default: "9:16",
        description: "Пропорции итогового изображения",
        required: true,
        order: 1
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
        default: 1,
        description: "Сколько вариантов изображений сгенерировать",
        required: true,
        order: 2
      },
      negativePrompt: {
        label: "Негативный промпт",
        type: "textarea",
        placeholder: "Что не должно быть на изображении...",
        optional: true,
        description: "Опишите элементы, которые не должны появиться на изображении",
        order: 3
      },
      seed: {
        label: "Seed",
        type: "number",
        placeholder: "Оставьте пустым для случайного",
        optional: true,
        description: "Число для воспроизводимой генерации. Одинаковый seed = одинаковый результат",
        order: 4
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
        default: "medium",
        description: "Качество и разрешение изображения от OpenAI GPT-4",
        required: true,
        order: 1
      },
      aspectRatio: {
        label: "Соотношение сторон",
        type: "buttons",
        options: [
          { value: "1:1", label: "1:1" },
          { value: "16:9", label: "16:9" },
          { value: "9:16", label: "9:16" }
        ],
        default: "1:1",
        description: "Пропорции изображения. GPT Image поддерживает ограниченный набор форматов.",
        required: true,
        order: 2
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
        default: "7",
        description: "Версия модели Midjourney. V7 - последняя с улучшенным качеством.",
        required: true,
        order: 1
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
        default: "1:1",
        description: "Пропорции итогового изображения",
        required: true,
        order: 2
      },
      stylization: {
        label: "Стилизация",
        type: "slider",
        min: 0,
        max: 1000,
        step: 50,
        default: 100,
        description: "Насколько сильно Midjourney применяет свой художественный стиль. 0 = минимум, 1000 = максимум.",
        optional: true,
        order: 3
      },
      chaos: {
        label: "Хаос",
        type: "slider",
        min: 0,
        max: 100,
        step: 10,
        default: 0,
        optional: true,
        description: "Разнообразие результатов. 0 = предсказуемо, 100 = очень разнообразно.",
        order: 4
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

