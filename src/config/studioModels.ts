import { PHOTO_MODELS, VIDEO_MODELS, type ModelConfig, type PhotoModelConfig, type VideoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";

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
  if (model.id === "qwen-image") return ["i2i"]; // edit-only
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
  const baseStars = computePrice(model.id, defaultPriceOptions(model)).stars;

  if (model.type === "photo") {
    return {
      key: model.id,
      name: model.name,
      kind: "photo",
      apiId: model.apiId,
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
  return STUDIO_MODELS.find((m) => m.key === key);
}
