/**
 * Lifestyle Scenes Configuration
 * Scene presets for product photography in context
 */

// ===== TYPES =====

export type ColorMood = "warm" | "cool" | "neutral" | "vibrant" | "muted";

export interface LifestyleScene {
  id: string;
  labelRu: string;
  labelEn: string;
  /** Emoji for UI */
  emoji: string;
  /** Short description in Russian for UI */
  descriptionRu: string;
  /** Short phrase to append to generation prompt */
  promptAddon: string;
  /** Full prompt template (use {product} as placeholder) */
  promptTemplate: string;
  /** Color mood hint for post-processing */
  colorMood: ColorMood;
  /** Suggested lighting keywords */
  lightingHints: string[];
  /** Best for these product types */
  bestFor: string[];
  /** Preview thumbnail (can be placeholder) */
  thumbnailUrl?: string;
}

// ===== SCENES =====

export const LIFESTYLE_SCENES: LifestyleScene[] = [
  {
    id: "kitchen",
    labelRu: "Кухня",
    labelEn: "Kitchen",
    emoji: "🍳",
    descriptionRu: "На кухонной столешнице, дневной свет из окна",
    promptAddon: "on a modern kitchen countertop, natural daylight from window",
    promptTemplate: "{product} placed on a clean marble kitchen countertop, morning sunlight streaming through window, fresh herbs and ingredients in soft focus background, lifestyle photography, warm tones",
    colorMood: "warm",
    lightingHints: ["natural daylight", "morning sun", "warm ambient"],
    bestFor: ["home", "cosmetics", "electronics"],
  },
  {
    id: "bathroom",
    labelRu: "Ванная",
    labelEn: "Bathroom",
    emoji: "🛁",
    descriptionRu: "В спа-атмосфере ванной, мягкий рассеянный свет",
    promptAddon: "in a spa-like bathroom setting, soft diffused light",
    promptTemplate: "{product} in a luxurious spa bathroom, white marble surfaces, soft towels, eucalyptus plants, diffused natural light, clean aesthetic, premium lifestyle photography",
    colorMood: "cool",
    lightingHints: ["soft diffused", "spa lighting", "clean white"],
    bestFor: ["cosmetics", "home"],
  },
  {
    id: "desk",
    labelRu: "Рабочий стол",
    labelEn: "Desk",
    emoji: "💼",
    descriptionRu: "На минималистичном рабочем столе, деловая обстановка",
    promptAddon: "on a minimal workspace desk, professional setting",
    promptTemplate: "{product} on a clean minimal workspace, wooden desk, laptop and notebook in background, professional atmosphere, warm desk lamp lighting, productivity aesthetic",
    colorMood: "neutral",
    lightingHints: ["desk lamp", "natural office light", "focused"],
    bestFor: ["electronics", "home"],
  },
  {
    id: "in_hand",
    labelRu: "В руке",
    labelEn: "In Hand",
    emoji: "🤲",
    descriptionRu: "В руке, демонстрация размера и использования",
    promptAddon: "held in a person's hand, showing scale and usage",
    promptTemplate: "close-up of {product} held in a well-manicured hand, blurred lifestyle background, demonstrating size and ergonomics, natural skin tones, professional product photography",
    colorMood: "neutral",
    lightingHints: ["natural skin light", "soft fill", "no harsh shadows"],
    bestFor: ["cosmetics", "electronics", "kids"],
  },
  {
    id: "gym",
    labelRu: "Спортзал",
    labelEn: "Gym",
    emoji: "🏋️",
    descriptionRu: "В современном спортзале, динамичная энергия",
    promptAddon: "in a modern gym environment, dynamic energy",
    promptTemplate: "{product} in a modern fitness studio, gym equipment softly blurred in background, energetic atmosphere, dramatic side lighting, athletic lifestyle photography",
    colorMood: "vibrant",
    lightingHints: ["dramatic side light", "high contrast", "energetic"],
    bestFor: ["clothing", "electronics", "cosmetics"],
  },
  {
    id: "interior",
    labelRu: "Интерьер",
    labelEn: "Interior",
    emoji: "🛋️",
    descriptionRu: "В стильном современном интерьере, дизайнерская эстетика",
    promptAddon: "in a stylish modern interior, designer aesthetic",
    promptTemplate: "{product} in a beautifully designed modern interior, Scandinavian style, plants and designer furniture in background, natural window light, cozy atmosphere, interior magazine photography",
    colorMood: "muted",
    lightingHints: ["window light", "ambient", "soft shadows"],
    bestFor: ["home", "kids", "clothing"],
  },
  {
    id: "outdoor",
    labelRu: "На природе",
    labelEn: "Outdoor",
    emoji: "🌿",
    descriptionRu: "На природе, свежая и натуральная атмосфера",
    promptAddon: "outdoors in nature, fresh and organic feel",
    promptTemplate: "{product} in an outdoor natural setting, green foliage, golden hour sunlight, fresh organic atmosphere, lifestyle photography with nature backdrop",
    colorMood: "warm",
    lightingHints: ["golden hour", "dappled sunlight", "natural"],
    bestFor: ["cosmetics", "clothing", "kids"],
  },
  {
    id: "flat_lay",
    labelRu: "Раскладка",
    labelEn: "Flat Lay",
    emoji: "📐",
    descriptionRu: "Вид сверху, стильная композиция с аксессуарами",
    promptAddon: "flat lay composition from above, styled arrangement",
    promptTemplate: "flat lay photography of {product} from above, carefully styled arrangement with complementary objects, clean background, perfect symmetry, Instagram aesthetic, professional product photography",
    colorMood: "neutral",
    lightingHints: ["even overhead", "no shadows", "soft diffused"],
    bestFor: ["cosmetics", "clothing", "electronics", "kids"],
  },
];

// ===== HELPERS =====

export function getSceneById(id: string): LifestyleScene | undefined {
  return LIFESTYLE_SCENES.find(s => s.id === id);
}

export function getAllScenes(): LifestyleScene[] {
  return LIFESTYLE_SCENES;
}

export function getScenesForProductType(productType: string): LifestyleScene[] {
  return LIFESTYLE_SCENES.filter(s => s.bestFor.includes(productType));
}

export function buildPromptWithScene(sceneId: string, productDescription: string): string {
  const scene = getSceneById(sceneId);
  if (!scene) return productDescription;
  
  return scene.promptTemplate.replace("{product}", productDescription);
}

export function getPromptAddon(sceneId: string): string {
  const scene = getSceneById(sceneId);
  return scene?.promptAddon ?? "";
}

export function getSceneDescriptionRu(sceneId: string): string {
  const scene = getSceneById(sceneId);
  return scene?.descriptionRu ?? "";
}

export function getColorMoodLabel(mood: ColorMood): string {
  const labels: Record<ColorMood, string> = {
    warm: "Тёплые тона",
    cool: "Холодные тона",
    neutral: "Нейтральные",
    vibrant: "Яркие",
    muted: "Приглушённые",
  };
  return labels[mood] || mood;
}

export function getColorMoodHex(mood: ColorMood): string {
  const colors: Record<ColorMood, string> = {
    warm: "#F4A460",
    cool: "#87CEEB",
    neutral: "#C0C0C0",
    vibrant: "#FF6B6B",
    muted: "#A0A0A0",
  };
  return colors[mood] || "#808080";
}



