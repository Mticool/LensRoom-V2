import type { ModelSpec, ModeSpec, AspectRatioOption, DurationOption } from "./generator-types";

// ===== MODE DEFINITIONS =====

const PHOTO_MODES: Record<string, ModeSpec> = {
  t2i: {
    id: "t2i",
    label: "Текст → Фото",
    description: "Создайте изображение из текстового описания",
    refSlots: 0,
    refLabels: {},
    requiredRefs: { a: false, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true },
    advancedControls: { seed: true, guidance: true, steps: true, negativePrompt: true },
  },
  i2i: {
    id: "i2i",
    label: "Фото → Фото",
    description: "Преобразуйте существующее изображение",
    refSlots: 1,
    refLabels: { a: "Референс" },
    requiredRefs: { a: true, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true },
    advancedControls: { seed: true, guidance: true, steps: true, negativePrompt: true, stylize: true },
  },
  inpaint: {
    id: "inpaint",
    label: "Редактирование",
    description: "Измените часть изображения",
    refSlots: 1,
    refLabels: { a: "Изображение" },
    requiredRefs: { a: true, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: false, variants: true },
    advancedControls: { seed: true, guidance: true },
    comingSoon: true,
  },
  two_refs: {
    id: "two_refs",
    label: "Стиль + Персонаж",
    description: "Объедините стиль и персонажа",
    refSlots: 2,
    refLabels: { a: "Персонаж", b: "Стиль" },
    requiredRefs: { a: true, b: true },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true },
    advancedControls: { seed: true, guidance: true, stylize: true },
    comingSoon: true,
  },
};

const VIDEO_MODES: Record<string, ModeSpec> = {
  t2v: {
    id: "t2v",
    label: "Текст → Видео",
    description: "Создайте видео из текстового описания",
    refSlots: 0,
    refLabels: {},
    requiredRefs: { a: false, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true, duration: true, fps: true },
    advancedControls: { seed: true, guidance: true, motionStrength: true },
  },
  i2v: {
    id: "i2v",
    label: "Фото → Видео",
    description: "Анимируйте статичное изображение",
    refSlots: 1,
    refLabels: { a: "Стартовый кадр" },
    requiredRefs: { a: true, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: false, variants: true, duration: true, fps: true },
    advancedControls: { seed: true, motionStrength: true },
  },
  start_end: {
    id: "start_end",
    label: "Старт + Финиш",
    description: "Интерполяция между двумя кадрами",
    refSlots: 2,
    refLabels: { a: "Стартовый кадр", b: "Финальный кадр" },
    requiredRefs: { a: true, b: true },
    showPrompt: true,
    outputControls: { aspectRatio: false, variants: true, duration: true },
    advancedControls: { seed: true, motionStrength: true },
  },
  storyboard: {
    id: "storyboard",
    label: "Раскадровка",
    description: "Создайте видео из нескольких сцен",
    refSlots: 0,
    refLabels: {},
    requiredRefs: { a: false, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, duration: true },
    advancedControls: { seed: true },
    comingSoon: true,
  },
};

const PRODUCT_MODES: Record<string, ModeSpec> = {
  t2i: {
    id: "t2i",
    label: "Текст → Товар",
    description: "Создайте карточку товара из описания",
    refSlots: 0,
    refLabels: {},
    requiredRefs: { a: false, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true },
    advancedControls: { seed: true, guidance: true },
  },
  i2i: {
    id: "i2i",
    label: "Фото товара",
    description: "Улучшите фото товара",
    refSlots: 1,
    refLabels: { a: "Фото товара" },
    requiredRefs: { a: true, b: false },
    showPrompt: true,
    outputControls: { aspectRatio: true, variants: true },
    advancedControls: { guidance: true },
  },
};

// ===== MODEL REGISTRY =====

export const MODEL_REGISTRY: ModelSpec[] = [
  // ===== PHOTO MODELS =====
  {
    id: "seedream-4.5",
    name: "Seedream 4.5",
    contentType: "photo",
    rank: 1,
    credits: 5,
    speed: "medium",
    quality: "ultra",
    description: "Самый «рекламный» фотореал, хорошо держит композицию.",
    featured: true,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.i2i],
  },
  {
    id: "flux-2",
    name: "FLUX.2",
    contentType: "photo",
    rank: 2,
    credits: 8,
    speed: "medium",
    quality: "ultra",
    description: "Топ по фактурам/материалам (предметка, упаковка, ткань, металл).",
    featured: true,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.i2i, PHOTO_MODES.inpaint],
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    contentType: "photo",
    rank: 3,
    credits: 3,
    speed: "fast",
    quality: "high",
    description: "Лучший баланс цена/скорость/качество + стабильные персонажи.",
    featured: true,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.i2i],
  },
  {
    id: "midjourney",
    name: "Midjourney (MJ) — Artistic",
    contentType: "photo",
    rank: 4,
    credits: null,
    speed: "medium",
    quality: "ultra",
    description: "Когда нужен стиль/арт/«дорогая картинка» с характером.",
    featured: true,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.two_refs],
  },
  {
    id: "z-image",
    name: "Z-Image",
    contentType: "photo",
    rank: 5,
    credits: 6,
    speed: "medium",
    quality: "ultra",
    description: "Ровный универсал «на всякий случай», когда другие капризничают.",
    featured: false,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.i2i],
  },
  {
    id: "ideogram",
    name: "Ideogram",
    contentType: "photo",
    rank: 6,
    credits: null,
    speed: "medium",
    quality: "high",
    description: "Постеры/баннеры, текст в картинке и дизайн-композиции.",
    featured: false,
    modes: [PHOTO_MODES.t2i],
  },
  {
    id: "qwen-image",
    name: "Qwen Image",
    contentType: "photo",
    rank: 7,
    credits: null,
    speed: "fast",
    quality: "high",
    description: "Быстрые итерации и правки, нормально переваривает RU/EN промпты.",
    featured: false,
    modes: [PHOTO_MODES.t2i, PHOTO_MODES.i2i],
  },
  {
    id: "imagen-4-ultra",
    name: "Imagen 4 Ultra",
    contentType: "photo",
    rank: 8,
    credits: null,
    speed: "medium",
    quality: "ultra",
    description: "Чистота, точность, печатный «глянец» (особенно для бренда/маркетинга).",
    featured: false,
    modes: [PHOTO_MODES.t2i],
  },

  // ===== VIDEO MODELS =====
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    contentType: "video",
    rank: 1,
    credits: 70,
    speed: "slow",
    quality: "ultra",
    description: "Премиальный «кинореал» + синхро-аудио, топ под рекламу/вау-ролики.",
    featured: true,
    modes: [VIDEO_MODES.t2v, VIDEO_MODES.i2v],
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    contentType: "video",
    rank: 2,
    credits: 60,
    speed: "slow",
    quality: "ultra",
    description: "Максимум качества/стабильности сцены, когда важна «киношность».",
    featured: true,
    modes: [VIDEO_MODES.t2v, VIDEO_MODES.i2v, VIDEO_MODES.start_end],
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    contentType: "video",
    rank: 3,
    credits: 55,
    speed: "medium",
    quality: "ultra",
    description: "Сильный универсал: динамика, эффектность, часто лучший «первый результат».",
    featured: true,
    modes: [VIDEO_MODES.t2v, VIDEO_MODES.i2v],
  },
  {
    id: "sora-2",
    name: "Sora 2",
    contentType: "video",
    rank: 4,
    credits: 40,
    speed: "medium",
    quality: "high",
    description: "Универсальная генерация видео: сцены, движение, стабильность.",
    featured: true,
    modes: [VIDEO_MODES.t2v, VIDEO_MODES.i2v],
  },
  {
    id: "sora-2-pro-storyboard",
    name: "Sora 2 Storyboard",
    contentType: "video",
    rank: 5,
    credits: 50,
    speed: "medium",
    quality: "high",
    description: "Мультисцены/раскадровка — удобно для сторителлинга и рекламных роликов.",
    featured: false,
    modes: [VIDEO_MODES.t2v, VIDEO_MODES.storyboard],
  },
  {
    id: "seedance-1.0",
    name: "Seedance (Fast)",
    contentType: "video",
    rank: 6,
    credits: 35,
    speed: "fast",
    quality: "standard",
    description: "Быстрые ролики «пачкой» для тестов креативов и контент-завода.",
    featured: false,
    modes: [VIDEO_MODES.t2v],
  },

  // ===== PRODUCT MODELS =====
  {
    id: "product-nano-banana",
    name: "Product Quick",
    contentType: "product",
    rank: 1,
    credits: 3,
    speed: "fast",
    quality: "high",
    description: "Быстрая чистая предметка: читаемо, минимум артефактов.",
    featured: true,
    modes: [PRODUCT_MODES.t2i, PRODUCT_MODES.i2i],
  },
  {
    id: "product-flux",
    name: "Product Pro",
    contentType: "product",
    rank: 2,
    credits: 5,
    speed: "medium",
    quality: "ultra",
    description: "Премиум-рендер: материалы, текстуры, «рекламный» вид.",
    featured: true,
    modes: [PRODUCT_MODES.t2i, PRODUCT_MODES.i2i],
  },
];

// ===== OPTIONS =====

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: "1:1", label: "1:1", icon: "□", ratio: 1 },
  { id: "16:9", label: "16:9", icon: "▭", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", icon: "▯", ratio: 9 / 16 },
  { id: "4:3", label: "4:3", icon: "⬜", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", icon: "▯", ratio: 3 / 4 },
  { id: "21:9", label: "21:9", icon: "═", ratio: 21 / 9 },
];

export const DURATION_OPTIONS: DurationOption[] = [
  { seconds: 3, label: "3с" },
  { seconds: 5, label: "5с" },
  { seconds: 10, label: "10с" },
  { seconds: 15, label: "15с" },
];

export const VARIANT_OPTIONS = [1, 2, 3, 4];

export const FPS_OPTIONS = [24, 30, 60];

// ===== HELPER FUNCTIONS =====

export function getModelsByContentType(contentType: string): ModelSpec[] {
  return MODEL_REGISTRY
    .filter((m) => m.contentType === contentType && !m.hidden)
    .sort((a, b) => a.rank - b.rank);
}

export function getFeaturedModels(contentType: string): ModelSpec[] {
  return getModelsByContentType(contentType).filter((m) => m.featured);
}

export function getModelById(id: string): ModelSpec | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function getDefaultModel(contentType: string): ModelSpec {
  const models = getModelsByContentType(contentType);
  return models[0];
}

export function getDefaultMode(model: ModelSpec): ModeSpec {
  return model.modes[0];
}

export function getModeById(model: ModelSpec, modeId: string): ModeSpec | undefined {
  return model.modes.find((m) => m.id === modeId);
}

export function formatCredits(credits: number | null): string {
  return credits === null ? "—" : String(credits);
}

export function calculateTotalCredits(
  model: ModelSpec,
  variants: number,
  duration?: number
): number | null {
  if (model.credits === null) return null;
  
  let total = model.credits * variants;
  
  // For video, multiply by duration factor
  if (model.contentType === "video" && duration) {
    total *= Math.ceil(duration / 5);
  }
  
  return total;
}


