import { PHOTO_MODELS, VIDEO_MODELS, type ModelConfig, type PhotoModelConfig, type VideoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import type { PriceOptions } from "@/lib/pricing/compute-price";

export type ModelKind = "photo" | "video";
export type Mode = "t2i" | "i2i" | "t2v" | "i2v" | "start_end" | "storyboard";
export type Quality = string;
export type Aspect = string;
export type Duration = number | string;

export interface StudioModel {
  // key == production model id (single source of truth)
  key: string;
  name: string;
  kind: ModelKind;
  apiId: string;

  subtitle: string;
  baseStars: number;
  qualityTiers: Quality[];
  aspectRatios: Aspect[];
  durationOptions?: Duration[];
  modes: Mode[];

  supportsAudio?: boolean;
  supportsStartEnd?: boolean;
  supportsImageInput?: boolean;
}

function photoModes(model: PhotoModelConfig): Mode[] {
  // edit-only / tools that require an input image
  if (
    model.id === "qwen-image" ||
    model.id === "recraft-crisp-upscale" ||
    model.id === "recraft-remove-background" ||
    model.id === "topaz-image-upscale"
  ) {
    return ["i2i"];
  }
  return model.supportsI2i ? ["t2i", "i2i"] : ["t2i"];
}

function videoModes(model: VideoModelConfig): Mode[] {
  return (model.modes || []).slice() as Mode[];
}

function qualityTiersForPhoto(model: PhotoModelConfig): string[] {
  if (model.qualityOptions?.length) return model.qualityOptions;
  if (typeof model.pricing === "object") return Object.keys(model.pricing);
  return [];
}

function qualityTiersForVideo(model: VideoModelConfig): string[] {
  if (model.qualityOptions?.length) return model.qualityOptions;
  if (model.resolutionOptions?.length) return model.resolutionOptions;
  return [];
}

function defaultPriceOptions(model: ModelConfig): any {
  if (model.type === "photo") {
    const q = model.qualityOptions?.[0];
    const r = typeof model.pricing === "object" ? Object.keys(model.pricing)[0] : undefined;
    return { quality: q || r, variants: 1 };
  }

  const v = model as VideoModelConfig;
  const mode = v.modes?.[0];
  const duration = v.fixedDuration || v.durationOptions?.[0] || 5;
  const vq = v.qualityOptions?.[0] || v.resolutionOptions?.[0];
  return {
    mode,
    duration,
    videoQuality: vq,
    audio: !!v.supportsAudio,
    variants: 1,
  };
}

function toStudioModel(model: ModelConfig): StudioModel {
  // For models with variants (like Kling/WAN), calculate minimum price across all variants
  let computed = computePrice(model.id, defaultPriceOptions(model)).stars;
  if (model.type === "video" && (model as VideoModelConfig).modelVariants?.length) {
    const variants = (model as VideoModelConfig).modelVariants!;
    const durations = (model as VideoModelConfig).durationOptions || [5, 10];
    const resolutions = (model as VideoModelConfig).resolutionOptions || [];
    
    // Calculate minimum price across all combinations
    const minPrices: number[] = [];
    for (const v of variants) {
      for (const d of durations) {
        if (resolutions.length > 0) {
          // For models with resolution (like WAN), check all resolutions
          for (const r of resolutions) {
            const price = computePrice(model.id, { modelVariant: v.id, duration: d, resolution: r, variants: 1 }).stars;
            if (price > 0) minPrices.push(price);
          }
        } else {
          // For models without resolution (like Kling)
          const price = computePrice(model.id, { modelVariant: v.id, duration: d, variants: 1 }).stars;
          if (price > 0) minPrices.push(price);
        }
      }
    }
    computed = minPrices.length > 0 ? Math.min(...minPrices) : computed;
  }
  
  const baseStarsOverride: Record<string, number> = {
    // Ensure we never show "—" for Sora 2 in sidebar, even if pricing config changes.
    "sora-2": 40,
    "kling": 65, // Minimum price (2.5 Turbo 5s)
    "wan": 60, // Minimum price (WAN 2.2 Turbo 480p 5s)
  };
  const baseStars = computed > 0 ? computed : (baseStarsOverride[model.id] || 0);

  const subtitleOverride: Record<string, string> = {
    "nano-banana": "Быстро и дёшево для тестов/черновиков",
    "veo-3.1": "Кинореал • fast по умолчанию",
    "kling": "Сильный универсал: динамика, эффектность",
    "wan": "Универсальная модель с выбором версии и разрешения",
    "sora-2": "Стабильное i2v-видео для большинства задач",
    "sora-2-pro": "Премиум качество (i2v / start_end)",
    "topaz-image-upscale": "Апскейл (≤2K/4K/8K) • нужен референс",
    "recraft-remove-background": "Удаление фона (нужен референс)",
    "recraft-crisp-upscale": "Апскейл (нужен референс)",
  };
  const subtitle =
    subtitleOverride[model.id] ||
    String((model as any).shortLabel || "").trim() ||
    String((model as any).description || "").trim() ||
    model.apiId;

  if (model.type === "photo") {
    return {
      key: model.id,
      name: model.name,
      kind: "photo",
      apiId: model.apiId,
      subtitle,
      baseStars,
      qualityTiers: qualityTiersForPhoto(model),
      aspectRatios: model.aspectRatios || ["1:1"],
      modes: photoModes(model),
      supportsImageInput: model.supportsI2i,
    };
  }

  const v = model as VideoModelConfig;
  return {
    key: v.id,
    name: v.name,
    kind: "video",
    apiId: v.apiId,
    subtitle,
    baseStars,
    qualityTiers: qualityTiersForVideo(v),
    aspectRatios: v.aspectRatios || ["16:9"],
    durationOptions: v.durationOptions || (v.fixedDuration ? [v.fixedDuration] : undefined),
    modes: videoModes(v),
    supportsAudio: v.supportsAudio,
    supportsStartEnd: v.supportsStartEnd,
    supportsImageInput: v.supportsI2v,
  };
}

export const STUDIO_MODELS: StudioModel[] = [...PHOTO_MODELS, ...VIDEO_MODELS].map(toStudioModel);
export const STUDIO_PHOTO_MODELS: StudioModel[] = STUDIO_MODELS.filter((m) => m.kind === "photo");
export const STUDIO_VIDEO_MODELS: StudioModel[] = STUDIO_MODELS.filter((m) => m.kind === "video");

export function getStudioModelByKey(key: string): StudioModel | undefined {
  const direct = STUDIO_MODELS.find((m) => m.key === key);
  if (direct) return direct;

  // Backward-compatible aliases for consolidated models
  const aliasMap: Record<string, string> = {
    "flux-2-pro-2k": "flux-2-pro",
    "flux-2-flex-1k": "flux-2-flex",
    "flux-2-flex-2k": "flux-2-flex",
    "topaz-image-upscale-2k": "topaz-image-upscale",
    "topaz-image-upscale-4k": "topaz-image-upscale",
    "topaz-image-upscale-8k": "topaz-image-upscale",
    "ideogram-v3-a": "ideogram-v3",
    "ideogram-v3-b": "ideogram-v3",
    "ideogram-v3-c": "ideogram-v3",
    "ideogram-character-a": "ideogram-character",
    "ideogram-character-b": "ideogram-character",
    "ideogram-character-c": "ideogram-character",
  };

  const mapped = aliasMap[key];
  if (!mapped) return undefined;
  return STUDIO_MODELS.find((m) => m.key === mapped);
}
