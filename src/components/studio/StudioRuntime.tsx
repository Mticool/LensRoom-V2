"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Film, Loader2 } from "lucide-react";

import { MobileVideoViewer } from "@/components/generator-v2/MobileVideoViewer";
import { VideoGeneratorBottomSheet } from "@/components/generator-v2/VideoGeneratorBottomSheet";

import { getEffectById } from "@/config/effectsGallery";
import { getModelById, type ModelConfig, type VideoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { calcMotionControlStars, validateMotionControlDuration, type MotionControlResolution } from "@/lib/pricing/motionControl";
import { invalidateCached } from "@/lib/client/generations-cache";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useHistory } from "@/components/generator-v2/hooks/useHistory";

import type { Aspect, Duration, Mode, Quality } from "@/config/studioModels";
import { getStudioModelByKey, STUDIO_PHOTO_MODELS, STUDIO_VIDEO_MODELS } from "@/config/studioModels";
import { PHOTO_VARIANT_MODELS, type ParamKey } from "@/config/photoVariantRegistry";

import { StudioShell } from "@/components/studio/StudioShell";
import { ModelSidebar, MobileModelSelector } from "@/components/studio/ModelSidebar";
import { PhotoModelSidebar, MobilePhotoModelSelector } from "@/components/studio/PhotoModelSidebar";

type RuntimeStatus = "idle" | "queued" | "generating" | "success" | "failed";

type ActiveJob = {
  jobId: string;
  kind: "image" | "video";
  modelName: string;
  createdAt: number;
  status: RuntimeStatus;
  progress: number;
  resultUrls: string[];
  error?: string | null;
  opened?: boolean;
};

async function getVideoDurationSeconds(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const d = Number(video.duration || 0);
        if (!Number.isFinite(d) || d <= 0) reject(new Error("Invalid video duration"));
        else resolve(d);
      };
      video.onerror = () => reject(new Error("Failed to read video metadata"));
      video.src = url;
    });
    return duration;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const normalized = await normalizeImageForUpload(file);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(normalized);
  });
}

function isHeicLike(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const t = (file.type || "").toLowerCase();
  return (
    t === "image/heic" ||
    t === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function normalizeImageForUpload(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  // NOTE: HEIC conversion removed due to Turbopack/HMR instability in dev.
  // Please upload JPEG/PNG/WebP for now.
  throw new Error("HEIC пока не поддерживается. Загрузите JPG, PNG или WebP.");
}

async function safeReadJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || text.trim() === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function StudioRuntime({
  defaultKind,
  variant = "video",
  forceKind,
}: {
  defaultKind: "photo" | "video";
  /** For video kind: constrain defaults/model list (e.g. Motion-only). */
  variant?: "video" | "motion";
  /** If provided, ignore `kind` query param and force this kind. */
  forceKind?: "photo" | "video";
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showSuccessNotifications } = usePreferencesStore();

  const requestedKind = (searchParams.get("kind") as "photo" | "video" | null) || null;
  const kind: "photo" | "video" = forceKind || requestedKind || defaultKind;

  // Project/thread (canonical: `project`, legacy: `thread`)
  const threadId = (searchParams.get("project") || searchParams.get("thread") || "").trim() || undefined;
  const historyMode = kind === "video" ? "video" : "image";
  const {
    history: projectHistory,
    refresh: refreshProjectHistory,
    invalidateCache: invalidateProjectHistoryCache,
  } = useHistory(historyMode, undefined, threadId);

  const videoModels = useMemo(() => {
    if (variant === "motion") {
      // Motion section: only Motion Control for now.
      return STUDIO_VIDEO_MODELS.filter((m) => m.key === "kling-motion-control");
    }
    return STUDIO_VIDEO_MODELS;
  }, [variant]);

  const models = kind === "photo" ? STUDIO_PHOTO_MODELS : videoModels;
  const photoBaseModels = PHOTO_VARIANT_MODELS;
  const currentPlan: "free" | "pro" | "agency" = "free";
  const initialPhotoBaseId = photoBaseModels[0]?.id || "";
  const initialPhotoLegacyId =
    photoBaseModels[0]?.variants?.[0]?.sourceModelId || STUDIO_PHOTO_MODELS[0]?.key || "";
  const initialPhotoParams = photoBaseModels[0]?.variants?.find((v) => v.enabled)?.params || photoBaseModels[0]?.variants?.[0]?.params || {};

  const [selectedPhotoBaseId, setSelectedPhotoBaseId] = useState<string>(initialPhotoBaseId);
  const [selectedParams, setSelectedParams] = useState<Partial<Record<ParamKey, string>>>(initialPhotoParams);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    kind === "photo" ? initialPhotoLegacyId : (models[0]?.key || "")
  );

  // Ensure selected video model exists when switching variant (e.g. Video -> Motion).
  useEffect(() => {
    if (kind !== "video") return;
    if (!models.length) return;
    if (!models.some((m) => m.key === selectedModelId)) {
      setSelectedModelId(models[0]!.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, kind, models.length]);

  // Common UI state
  const [mode, setMode] = useState<Mode>(kind === "photo" ? "t2i" : "t2v");
  const [quality, setQuality] = useState<Quality>("" as Quality);
  const [outputFormat, setOutputFormat] = useState<"png" | "jpg" | "webp">("png");
  const [aspect, setAspect] = useState<Aspect>("1:1" as Aspect);
  const [duration, setDuration] = useState<Duration>(5 as Duration);
  const [audio, setAudio] = useState<boolean>(true);
  const [modelVariant, setModelVariant] = useState<string>(""); // For unified models like Kling/WAN
  const [resolution, setResolution] = useState<string>(""); // For models with resolution selection (e.g., WAN)
  const [soundPreset, setSoundPreset] = useState<string>(""); // WAN sound presets
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>(""); // V2V reference video URL

  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [scenes, setScenes] = useState<string[]>(["", "", ""]);

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [motionReferenceVideo, setMotionReferenceVideo] = useState<File | null>(null);
  const [motionReferenceVideoDurationSec, setMotionReferenceVideoDurationSec] = useState<number | null>(null);

  // Runtime output state
  const [status, setStatus] = useState<RuntimeStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [resultUrls, setResultUrls] = useState<string[]>([]);

  // Allow multiple background jobs
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const focusedJobIdRef = useRef<string | null>(null);

  // Mobile-specific state
  const [activeRunIndex, setActiveRunIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    focusedJobIdRef.current = focusedJobId;
  }, [focusedJobId]);

  // Keep project history in sync when other parts of the app trigger refresh.
  useEffect(() => {
    const handler = () => {
      try {
        invalidateProjectHistoryCache();
        refreshProjectHistory();
      } catch {}
    };
    window.addEventListener("generations:refresh", handler as EventListener);
    return () => window.removeEventListener("generations:refresh", handler as EventListener);
  }, [invalidateProjectHistoryCache, refreshProjectHistory]);

  // Apply preset / query mapping (UI-only)
  useEffect(() => {
    const presetId = searchParams.get("preset");
    const modelParam = searchParams.get("model");
    const modeParam = searchParams.get("mode");
    const promptParam = searchParams.get("prompt");

    if (presetId) {
      const preset = getEffectById(presetId);
      if (preset) {
        if (preset.templatePrompt) setPrompt(preset.templatePrompt);
        if (preset.modelKey) {
          const m = getModelById(preset.modelKey);
          if (m) setSelectedModelId(m.id);
        }
        if (preset.mode === "i2i") setMode("i2i");
        if (preset.mode === "i2v") setMode("i2v");
      }
    }

    if (modelParam) {
      const m = getModelById(modelParam);
      if (m) setSelectedModelId(m.id);
    }

    if (modeParam === "i2i") setMode("i2i");
    if (modeParam === "i2v") setMode("i2v");

    // Direct prompt prefill (used by admin styles / DB-backed presets)
    if (!presetId && promptParam && promptParam.trim()) {
      setPrompt(promptParam);
    }
  }, [searchParams]);

  // When kind switches, reset base selection safely
  useEffect(() => {
    if (kind === "photo") {
      setSelectedPhotoBaseId((prev) => prev || initialPhotoBaseId);
      setSelectedModelId((prev) => prev || initialPhotoLegacyId);
      setMode("t2i");
    } else {
      setSelectedModelId(models[0]?.key || "");
      setMode("t2v");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const activePhotoBase = useMemo(() => {
    if (kind !== "photo") return null;
    return photoBaseModels.find((m) => m.id === selectedPhotoBaseId) || photoBaseModels[0] || null;
  }, [kind, photoBaseModels, selectedPhotoBaseId]);

  const selectedVariant = useMemo(() => {
    if (kind !== "photo" || !activePhotoBase) return null;
    const planRank = (p: any) => (p === "agency" ? 30 : p === "pro" ? 20 : 10);
    const isAllowedByPlan = (v: any) => planRank(currentPlan) >= planRank(v.planGate || "free");
    const enabled = activePhotoBase.variants.filter((v) => v.enabled && isAllowedByPlan(v));
    if (!enabled.length) return null;

    const entries = Object.entries(selectedParams).filter(([, val]) => !!val) as Array<[string, string]>;
    const isExact = (v: any) => {
      if (!entries.length) return true;
      for (const [k, val] of entries) {
        const key = k as ParamKey;
        if (!v.params[key]) return false;
        if (v.params[key] !== val) return false;
      }
      return true;
    };
    const score = (v: any) => {
      let s = 0;
      for (const [k, val] of entries) {
        const key = k as ParamKey;
        const pv = v.params[key];
        if (!pv) continue; // wildcard ok
        if (pv !== val) return -1; // conflict
        s += 1;
      }
      return s;
    };

    // 1) exact match
    const exact = enabled.filter(isExact);
    if (exact.length) return exact.slice().sort((a, b) => a.stars - b.stars)[0];

    // 2) closest enabled (max matches, no conflicts), tie-breaker: cheaper
    const scored = enabled
      .map((v) => ({ v, s: score(v) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => (b.s - a.s) || (a.v.stars - b.v.stars));
    if (!scored.length) return null;
    return scored[0]!.v;
  }, [kind, activePhotoBase, selectedParams, currentPlan]);

  // Keep photo base/params in sync when selectedModelId changes (deep links / presets)
  useEffect(() => {
    if (kind !== "photo") return;
    const foundBase = photoBaseModels.find((m) => m.variants.some((v) => v.sourceModelId === selectedModelId));
    if (!foundBase) return;
    const foundVariant = foundBase.variants.find((v) => v.sourceModelId === selectedModelId) || foundBase.variants[0];
    if (foundBase.id !== selectedPhotoBaseId) setSelectedPhotoBaseId(foundBase.id);
    if (foundVariant?.params) setSelectedParams(foundVariant.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selectedModelId]);

  // Apply resolved variant to legacy selection + quality/aspect
  useEffect(() => {
    if (kind !== "photo") return;
    if (!selectedVariant) return;
    setSelectedModelId(selectedVariant.sourceModelId);
    const rawQ = (selectedVariant.params.quality || selectedVariant.params.resolution || "") as any;
    const q = rawQ === "default" ? "" : rawQ;
    setQuality(q as Quality);
    if (selectedVariant.params.format && selectedVariant.params.format !== "default") {
      setAspect(selectedVariant.params.format as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selectedVariant?.sourceModelId, JSON.stringify(selectedVariant?.params || {})]);

  const effectiveModelId = kind === "photo" ? (selectedVariant?.sourceModelId || "") : selectedModelId;
  const modelInfo: ModelConfig | undefined = useMemo(() => (effectiveModelId ? getModelById(effectiveModelId) : undefined), [effectiveModelId]);
  const studioModelKey = effectiveModelId || selectedModelId;
  const studioModel = useMemo(() => getStudioModelByKey(studioModelKey) || models[0], [studioModelKey, models]);

  const photoOutputFormatOptions = useMemo(() => {
    if (!modelInfo || modelInfo.type !== "photo") return ["png", "jpg"] as const;
    // Some tools should remain PNG-only (alpha channel).
    if (modelInfo.id === "recraft-remove-background") return ["png"] as const;
    // Some models support WebP; keep to PNG/JPG for maximum compatibility when unsure.
    if (modelInfo.provider === "openai") return ["png", "jpg", "webp"] as const;
    return ["png", "jpg"] as const;
  }, [modelInfo]);

  // Keep selections valid when model changes
  useEffect(() => {
    if (!studioModel) return;

    setMode((prev) => (studioModel.modes.includes(prev) ? prev : studioModel.modes[0]));
    setAspect((prev) => (studioModel.aspectRatios.includes(prev) ? prev : studioModel.aspectRatios[0]));

    if (studioModel.kind === "video" && studioModel.durationOptions?.length) {
      setDuration((prev) => (studioModel.durationOptions!.includes(prev) ? prev : studioModel.durationOptions![0]));
    } else {
      setDuration(5 as Duration);
    }

    if (studioModel.qualityTiers?.length) {
      setQuality((prev) => (studioModel.qualityTiers.includes(prev) ? prev : studioModel.qualityTiers[0]));
    } else {
      setQuality("" as Quality);
    }

    // Reset format on model switch (photo only)
    if (studioModel.kind === "photo") {
      setOutputFormat("png");
    }

    setAudio(!!studioModel.supportsAudio);
    
    // Reset modelVariant and resolution when model changes (for unified models like Kling/WAN)
    const model = getModelById(studioModel.key);
    if (model?.type === "video" && (model as VideoModelConfig).modelVariants?.length) {
      setModelVariant((model as VideoModelConfig).modelVariants![0].id);
      // Set default resolution for WAN
      if ((model as VideoModelConfig).resolutionOptions?.length) {
        setResolution((model as VideoModelConfig).resolutionOptions![0]);
      }
    } else {
      setModelVariant("");
      setResolution("");
    }

    // Clear incompatible uploads
    setReferenceImage(null);
    setFirstFrame(null);
    setLastFrame(null);
    setMotionReferenceVideo(null);
    setMotionReferenceVideoDurationSec(null);

    // Reset runtime output
    setStatus("idle");
    setProgress(0);
    setLastError(null);
    setResultUrls([]);
    setSoundPreset("");
    setReferenceVideoUrl("");
  }, [studioModel?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive duration for Motion Control reference video
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!motionReferenceVideo) {
        setMotionReferenceVideoDurationSec(null);
        return;
      }
      try {
        const d = await getVideoDurationSeconds(motionReferenceVideo);
        if (!cancelled) setMotionReferenceVideoDurationSec(d);
      } catch (e) {
        console.warn("[Studio] Failed to read motion video duration:", e);
        if (!cancelled) setMotionReferenceVideoDurationSec(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [motionReferenceVideo]);

  // Auto-correct settings when WAN variant changes
  useEffect(() => {
    if (studioModel?.key !== 'wan' || !modelVariant) return;
    
    const model = getModelById('wan') as VideoModelConfig | undefined;
    const variant = model?.modelVariants?.find(v => v.id === modelVariant);
    if (!variant) return;
    
    // Auto-correct mode if not available in this variant
    const availableModes = (variant as any).modes || model?.modes || [];
    if (!availableModes.includes(mode)) {
      setMode(availableModes[0] || 't2v');
    }
    
    // Auto-correct duration if not available in this variant
    const availableDurations = (variant as any).durationOptions || model?.durationOptions || [];
    if (availableDurations.length && !availableDurations.includes(duration)) {
      setDuration(availableDurations[0]);
    }
    
    // Auto-correct resolution if not available in this variant
    const availableResolutions = (variant as any).resolutionOptions || model?.resolutionOptions || [];
    if (availableResolutions.length && !availableResolutions.includes(resolution)) {
      setResolution(availableResolutions[0]);
    }
    
    // Reset sound preset when variant changes (different presets per version)
    setSoundPreset("");
    
    // Reset v2v reference when switching away from v2v
    if (!availableModes.includes('v2v')) {
      setReferenceVideoUrl("");
    }
  }, [modelVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsReference = !!studioModel?.supportsImageInput && (mode === "i2i" || mode === "i2v");
  const needsStartEnd = mode === "start_end";
  const isStoryboard = mode === "storyboard";
  const needsV2vReference = mode === "v2v" && studioModel?.key === 'wan';
  const needsMotionControlVideo = mode === "i2v" && studioModel?.key === "kling-motion-control";

  const canGenerate = useMemo(() => {
    if (!modelInfo) return false;
    if (kind === "photo" && !selectedVariant) return false;
    if (needsReference && !referenceImage) return false;
    if (needsStartEnd && (!firstFrame || !lastFrame)) return false;
    if (needsV2vReference && !referenceVideoUrl?.trim()) return false;
    if (needsMotionControlVideo && (!motionReferenceVideo || !motionReferenceVideoDurationSec)) return false;
    if (needsMotionControlVideo && motionReferenceVideoDurationSec) {
      const v = validateMotionControlDuration(motionReferenceVideoDurationSec, true);
      if (!v.valid) return false;
    }
    if (isStoryboard) return scenes.some((s) => s.trim().length > 0);
    return prompt.trim().length > 0;
  }, [modelInfo, kind, selectedVariant, needsReference, referenceImage, needsStartEnd, firstFrame, lastFrame, needsV2vReference, referenceVideoUrl, needsMotionControlVideo, motionReferenceVideo, motionReferenceVideoDurationSec, isStoryboard, scenes, prompt]);

  const price = useMemo(() => {
    if (!modelInfo) return { stars: 0, credits: 0 };

    if (modelInfo.type === "photo") {
      // ⭐ price for photo ALWAYS comes from resolved selectedVariant
      if (kind === "photo") {
        if (!selectedVariant) return { stars: 0, credits: 0 };
        const stars = selectedVariant.stars;
        return {
          credits: stars, // UI only (raw credits may differ); backend computes final credits.
          stars,
        };
      }
      const isResolution = typeof quality === "string" && String(quality).includes("x");
      return computePrice(modelInfo.id, {
        quality: isResolution ? undefined : (quality as any),
        resolution: isResolution ? String(quality) : undefined,
        variants: 1,
      });
    }

    const v = modelInfo as VideoModelConfig;
    const isResolution = typeof quality === "string" && String(quality).endsWith("p");
    
    // For WAN model, use resolution from state if available, otherwise from quality
    const effectiveResolution = resolution || (isResolution ? String(quality) : undefined);

    // Kling Motion Control: pricing depends on reference video duration (3–30s)
    if (v.id === "kling-motion-control") {
      const mcResolution = (effectiveResolution || "720p") as MotionControlResolution;
      const d = motionReferenceVideoDurationSec || 0;
      const stars = calcMotionControlStars(d, mcResolution, true) || 0;
      return { stars, credits: stars };
    }

    return computePrice(v.id, {
      mode: mode as any,
      duration: duration as any,
      // bytedance uses resolutionOptions; computePrice expects videoQuality to key into pricing
      videoQuality: String(quality || "") as any,
      resolution: effectiveResolution as any, // For WAN per-second pricing
      audio: v.supportsAudio ? (v.id === "wan" ? !!soundPreset : audio) : false,
      modelVariant: modelVariant || undefined,
      variants: 1,
    });
  }, [
    modelInfo,
    kind,
    selectedVariant,
    quality,
    mode,
    duration,
    modelVariant,
    resolution,
    soundPreset,
    audio,
    motionReferenceVideoDurationSec,
  ]);

  const pollJob = useCallback(async (jobId: string, kind: "image" | "video") => {
    const maxAttempts = 180;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const qs = new URLSearchParams();
      qs.set("kind", kind);

      const res = await fetch(`/api/jobs/${jobId}?${qs.toString()}`);
      const data = await safeReadJson(res);
      if (!res.ok) {
        if (res.status === 500 && (data?.error === "Integration is not configured" || data?.hint)) {
          const base = "Интеграция не настроена. Обратитесь в поддержку.";
          const tech = process.env.NODE_ENV !== "production" ? ` (${data?.hint || data?.error || "missing env"})` : "";
          throw new Error(base + tech);
        }
        throw new Error(data?.error || `Job status error (${res.status})`);
      }

      if (typeof data?.progress === "number") setProgress(Math.max(0, Math.min(100, data.progress)));

      if (data.status === "completed" && Array.isArray(data.results) && data.results[0]?.url) {
        const urls = data.results.map((r: any) => r.url).filter(Boolean);
        setResultUrls(urls);
        setStatus("success");
        setProgress(100);
        return;
      }

      if (data.status === "failed") {
        throw new Error(data.error || "Generation failed");
      }

      // Map job status to UI
      if (data.status === "queued") setStatus("queued");
      else setStatus("generating");

      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Timeout");
  }, []);

  const startPollingJob = useCallback(
    (job: ActiveJob) => {
      // Run polling in background per job; no global blocking.
      (async () => {
        try {
          const maxAttempts = 180;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const qs = new URLSearchParams();
            qs.set("kind", job.kind);
            const res = await fetch(`/api/jobs/${job.jobId}?${qs.toString()}`);
            const data = await safeReadJson(res);
            if (!res.ok) throw new Error(data?.error || `Job status error (${res.status})`);

            const p = typeof data?.progress === "number" ? Math.max(0, Math.min(100, data.progress)) : 0;
            const st: RuntimeStatus =
              data.status === "completed" ? "success" : data.status === "failed" ? "failed" : data.status === "queued" ? "queued" : "generating";

            setActiveJobs((prev) =>
              prev.map((j) => (j.jobId === job.jobId ? { ...j, status: st, progress: p } : j))
            );

            if (focusedJobIdRef.current === job.jobId) {
              setStatus(st);
              if (p) setProgress(p);
            }

            if (st === "success" && Array.isArray(data.results) && data.results[0]?.url) {
              const urls = data.results.map((r: any) => r.url).filter(Boolean);
              setActiveJobs((prev) =>
                prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "success", progress: 100, resultUrls: urls } : j))
              );

              // Refresh library cache and trigger Library to reload (without constant polling).
              invalidateCached("generations:");
              try {
                // Library will do a single refresh to get the new item
                window.dispatchEvent(new CustomEvent("generations:refresh"));
              } catch {}

              if (focusedJobIdRef.current === job.jobId) {
                setResultUrls(urls);
                setStatus("success");
                setProgress(100);
              }

              // Show success notification if enabled
              if (showSuccessNotifications) {
                if (job.kind === "video") {
                  toast.custom(
                    (t) => (
                      <div className="w-[min(92vw,520px)] rounded-2xl border border-white/10 bg-[var(--surface)] shadow-[var(--shadow-lg)] p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15">
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-bold text-[var(--text)]">Видео готово ✅</div>
                            <div className="mt-1 text-sm text-[var(--text2)]">
                              Мы добавили результат в «Мои результаты». Откройте библиотеку, чтобы посмотреть и скачать.
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  toast.dismiss(t);
                                  router.push("/library");
                                }}
                                className="inline-flex items-center justify-center rounded-xl bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--gold-hover)]"
                              >
                                Открыть в библиотеке
                              </button>
                              <button
                                onClick={() => toast.dismiss(t)}
                                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-white/30"
                              >
                                Закрыть
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                    { duration: 12000 }
                  );
                } else {
                  toast.success("Фото готово! ✅", {
                    description: "Сохранено в библиотеку",
                    duration: 4000,
                    action: {
                      label: "Открыть",
                      onClick: () => router.push("/library"),
                    },
                  });
                }
              }
              return;
            }

            if (st === "failed") {
              const msg = data.error || "Generation failed";
              setActiveJobs((prev) =>
                prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "failed", error: msg } : j))
              );
              if (focusedJobIdRef.current === job.jobId) {
                setLastError(msg);
                setStatus("failed");
                setProgress(0);
              }
              return;
            }

            await new Promise((r) => setTimeout(r, 2000));
          }
          throw new Error("Timeout");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Ошибка";
          setActiveJobs((prev) =>
            prev.map((j) => (j.jobId === job.jobId ? { ...j, status: "failed", error: msg } : j))
          );
          if (focusedJobId === job.jobId) {
            setLastError(msg);
            setStatus("failed");
            setProgress(0);
          }
          
          // Show error notification
          toast.error(`❌ ${job.kind === "video" ? "Видео" : "Фото"}: ${msg}`);
        }
      })();
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!modelInfo || !canGenerate) return;

    setIsStarting(true);
    setStatus("generating");
    setProgress(0);
    setLastError(null);
    setResultUrls([]);

    // Show start notification - auto-dismiss after 3 seconds
    if (modelInfo.type === "video") {
      toast("🎬 Видео создаётся...", {
        description: "~1-3 мин. Можно продолжать работу.",
        duration: 3000,
      });
    } else {
      toast("🎨 Фото создаётся...", {
        description: "~10-30 сек. Можно продолжать работу.",
        duration: 3000,
      });
    }

    try {
      if (modelInfo.type === "photo") {
        if (!activePhotoBase || !selectedVariant) {
          throw new Error("Недоступно: выберите доступную комбинацию");
        }
        const payload: any = {
          modelId: activePhotoBase.id,
          variantId: selectedVariant.id,
          params: selectedParams,
          prompt,
          negativePrompt: negativePrompt?.trim() || undefined,
          aspectRatio: String(aspect),
          variants: 1,
          mode: mode === "i2i" ? "i2i" : "t2i",
          outputFormat,
          threadId,
        };

        if (mode === "i2i") {
          if (!referenceImage) throw new Error("referenceImage is required for i2i");
          payload.referenceImage = await fileToDataUrl(referenceImage);
        }

        const res = await fetch("/api/generate/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await safeReadJson(res);
        if (!res.ok) {
          if (res.status === 500 && (data?.error === "Integration is not configured" || data?.hint)) {
            const base = "Интеграция не настроена. Обратитесь в поддержку.";
            const tech = process.env.NODE_ENV !== "production" ? ` (${data?.hint || data?.error || "missing env"})` : "";
            throw new Error(base + tech);
          }
          throw new Error(data?.error || "Photo generation failed");
        }

        const jobId = String(data.jobId);
        
        // Let Library refresh immediately to show queued/generating item
        invalidateCached("generations:");
        try { window.dispatchEvent(new CustomEvent("generations:refresh")); } catch {}
        
        // Check if generation already completed (e.g., sync response)
        if (data.status === 'completed' && Array.isArray(data.results) && data.results[0]?.url) {
          const urls = data.results.map((r: any) => r.url).filter(Boolean);
          const job: ActiveJob = {
            jobId,
            kind: "image",
            modelName: activePhotoBase.title || modelInfo.name,
            createdAt: Date.now(),
            status: "success",
            progress: 100,
            resultUrls: urls,
            opened: false,
          };
          setActiveJobs((prev) => [job, ...prev]);
          setFocusedJobId(jobId);
          setResultUrls(urls);
          setStatus("success");
          setProgress(100);
          setIsStarting(false);
          
          // Refresh library
          invalidateCached("generations:");
          try { window.dispatchEvent(new CustomEvent("generations:refresh")); } catch {}
          
          // Show success notification
          toast.success("Фото готово! ✅", {
            description: "Сохранено в библиотеку",
            duration: 4000,
            action: {
              label: "Открыть",
              onClick: () => router.push("/library"),
            },
          });
          return;
        }
        
        // Start polling for async providers
        const job: ActiveJob = {
          jobId,
          kind: "image",
          modelName: activePhotoBase.title || modelInfo.name,
          createdAt: Date.now(),
          status: "generating",
          progress: 0,
          resultUrls: [],
          opened: false,
        };
        setActiveJobs((prev) => [job, ...prev]);
        setFocusedJobId(jobId);
        setIsStarting(false);
        startPollingJob(job);
        return;
      }

      const v = modelInfo as VideoModelConfig;
      const isResolution = typeof quality === "string" && String(quality).endsWith("p");
      const effectiveResolution = resolution || (isResolution ? String(quality) : undefined);
      const payload: any = {
        model: v.id,
        modelVariant: modelVariant || undefined, // For unified models like Kling/WAN
        mode,
        prompt: isStoryboard ? undefined : prompt,
        shots: isStoryboard ? scenes.filter((s) => s.trim()).map((s) => ({ prompt: s.trim() })) : undefined,
        negativePrompt: isStoryboard ? undefined : (negativePrompt?.trim() || undefined),
        duration,
        aspectRatio: String(aspect),
        quality: isResolution ? undefined : String(quality || ""),
        resolution: effectiveResolution || undefined, // For WAN per-second pricing
        audio: v.supportsAudio ? audio : undefined,
        soundPreset: soundPreset || undefined, // WAN sound presets
        threadId,
      };

      if (mode === "i2v") {
        if (!referenceImage) throw new Error("referenceImage is required for i2v");
        payload.referenceImage = await fileToDataUrl(referenceImage);

        // Kling Motion Control requires an additional reference video with motions
        if (v.id === "kling-motion-control") {
          if (!motionReferenceVideo) throw new Error("referenceVideo is required for Motion Control");
          payload.referenceVideo = await fileToDataUrl(motionReferenceVideo);
          payload.videoDuration = motionReferenceVideoDurationSec || undefined;
          payload.autoTrim = true;
          payload.characterOrientation = 'image';
          payload.cameraControl = {};
        }
      }

      if (mode === "start_end") {
        if (!firstFrame || !lastFrame) throw new Error("start/end frames are required");
        payload.startImage = await fileToDataUrl(firstFrame);
        payload.endImage = await fileToDataUrl(lastFrame);
      }

      if (mode === "v2v") {
        if (!referenceVideoUrl?.trim()) throw new Error("referenceVideoUrl is required for v2v");
        payload.videoUrl = referenceVideoUrl.trim();
      }

      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await safeReadJson(res);
      if (!res.ok) {
        if (res.status === 500 && (data?.error === "Integration is not configured" || data?.hint)) {
          const base = "Интеграция не настроена. Обратитесь в поддержку.";
          const tech = process.env.NODE_ENV !== "production" ? ` (${data?.hint || data?.error || "missing env"})` : "";
          throw new Error(base + tech);
        }
        throw new Error(data?.error || "Video generation failed");
      }

      const jobId = String(data.jobId);
      
      // Let Library refresh immediately to show queued/generating item
      invalidateCached("generations:");
      try { window.dispatchEvent(new CustomEvent("generations:refresh")); } catch {}

      // Check if video generation already completed (e.g., sync response)
      if (data.status === 'completed' && (data.resultUrl || data.videoUrl || data.results?.[0]?.url)) {
        const url = data.resultUrl || data.videoUrl || data.results?.[0]?.url;
        const job: ActiveJob = {
          jobId,
          kind: "video",
          modelName: modelInfo.name,
          createdAt: Date.now(),
          status: "success",
          progress: 100,
          resultUrls: [url],
          opened: false,
        };
        setActiveJobs((prev) => [job, ...prev]);
        setFocusedJobId(jobId);
        setResultUrls([url]);
        setStatus("success");
        setProgress(100);
        setIsStarting(false);
        
        // Refresh library
        invalidateCached("generations:");
        try { window.dispatchEvent(new CustomEvent("generations:refresh")); } catch {}
        
        // Show success notification
        toast.success("Видео готово! ✅", {
          description: "Сохранено в библиотеку",
          duration: 4000,
          action: {
            label: "Открыть",
            onClick: () => router.push("/library"),
          },
        });
        return;
      }

      const job: ActiveJob = {
        jobId,
        kind: "video",
        modelName: modelInfo.name,
        createdAt: Date.now(),
        status: "generating",
        progress: 0,
        resultUrls: [],
        opened: false,
      };
      setActiveJobs((prev) => [job, ...prev]);
      setFocusedJobId(jobId);
      setIsStarting(false);
      startPollingJob(job);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      setLastError(msg);
      setStatus("failed");
      setProgress(0);
      toast.error(msg);
      setIsStarting(false);
    }
  }, [
    modelInfo,
    canGenerate,
    quality,
    prompt,
    negativePrompt,
    aspect,
    duration,
    mode,
    modelVariant,
    resolution,
    soundPreset,
    referenceVideoUrl,
    outputFormat,
    referenceImage,
    firstFrame,
    lastFrame,
    motionReferenceVideo,
    motionReferenceVideoDurationSec,
    scenes,
    audio,
    isStoryboard,
    startPollingJob,
  ]);

  const newResultsCount = useMemo(() => {
    return activeJobs.filter((j) => j.status === "success" && !j.opened).length;
  }, [activeJobs]);

  const recentProjectHistory = useMemo(() => {
    if (kind !== "video") return [];
    // `useHistory` returns oldest-first; show newest first and cap for UI.
    return (projectHistory || []).slice(-12).reverse();
  }, [kind, projectHistory]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setNegativePrompt("");
    setScenes(["", "", ""]);
    setReferenceImage(null);
    setFirstFrame(null);
    setLastFrame(null);
    setMotionReferenceVideo(null);
    setMotionReferenceVideoDurationSec(null);
    setStatus("idle");
    setProgress(0);
    setLastError(null);
    setResultUrls([]);
    
    // Clear persisted results from localStorage
    try {
      localStorage.removeItem("lensroom_last_photo_result");
      localStorage.removeItem("lensroom_last_video_result");
    } catch {
      // Ignore storage errors
    }
    
    // Dispatch event so GeneratorPreview clears its state
    window.dispatchEvent(new CustomEvent("lensroom:clear-preview"));
  }, []);

  const referencePreviewUrl = useMemo(() => {
    if (!referenceImage) return null;
    const url = URL.createObjectURL(referenceImage);
    return url;
  }, [referenceImage]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  // Mobile helpers
  const activeMobileVideo = useMemo(() => {
    if (resultUrls.length > 0) {
      const idx = Math.min(activeRunIndex, resultUrls.length - 1);
      return {
        id: `result_${idx}`,
        url: resultUrls[idx] || '',
        prompt,
        mode: kind,
        settings: {},
        timestamp: Date.now(),
      } as any;
    }
    return null;
  }, [resultUrls, activeRunIndex, prompt, kind]);

  const mobilePrev = useCallback(() => {
    if (resultUrls.length > 1) {
      setActiveRunIndex((i) => (i - 1 + resultUrls.length) % resultUrls.length);
    }
  }, [resultUrls.length]);

  const mobileNext = useCallback(() => {
    if (resultUrls.length > 1) {
      setActiveRunIndex((i) => (i + 1) % resultUrls.length);
    }
  }, [resultUrls.length]);

  const handleDownload = useCallback(async () => {
    const video = activeMobileVideo;
    if (!video?.url) return;
    try {
      const response = await fetch(video.url);
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lensroom-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Видео скачано");
    } catch {
      try {
        window.open(video.url, "_blank");
      } catch {}
      toast.error("Ошибка при скачивании");
    }
  }, [activeMobileVideo]);

  const toggleFavorite = useCallback(() => {
    const video = activeMobileVideo;
    if (!video?.id) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
        toast.success("Удалено из избранного");
      } else {
        next.add(video.id);
        toast.success("Добавлено в избранное");
      }
      return next;
    });
  }, [activeMobileVideo]);

  const isFavorite = useMemo(() => {
    return activeMobileVideo ? favorites.has(activeMobileVideo.id) : false;
  }, [activeMobileVideo, favorites]);

  return (
    <StudioShell
      sidebar={
        kind === "photo" ? (
          <PhotoModelSidebar
            models={photoBaseModels}
            selectedId={selectedPhotoBaseId}
            onSelect={(id) => {
              setSelectedPhotoBaseId(id);
              const base = photoBaseModels.find((m) => m.id === id);
              const v = base?.variants?.find((vv) => vv.enabled) || base?.variants?.[0] || null;
              setSelectedParams(v?.params || {});
            }}
          />
        ) : (
          <ModelSidebar models={models} selectedKey={selectedModelId} onSelect={(key) => setSelectedModelId(key)} />
        )
      }
      mobileModelSelector={
        kind === "photo" ? (
          <MobilePhotoModelSelector
            models={photoBaseModels}
            selectedId={selectedPhotoBaseId}
            onSelect={(id) => {
              setSelectedPhotoBaseId(id);
              const base = photoBaseModels.find((m) => m.id === id);
              const v = base?.variants?.find((vv) => vv.enabled) || base?.variants?.[0] || null;
              setSelectedParams(v?.params || {});
            }}
          />
        ) : (
          <MobileModelSelector models={models} selectedKey={selectedModelId} onSelect={(key) => setSelectedModelId(key)} />
        )
      }
    >
      {/* Unified fullscreen UI for all screen sizes */}
      <div className="flex flex-col min-h-screen">
        {/* Main video viewer - fullscreen on all devices */}
        <MobileVideoViewer
          video={activeMobileVideo}
          index={activeRunIndex}
          total={resultUrls.length}
          onPrev={mobilePrev}
          onNext={mobileNext}
          onDownload={handleDownload}
          onToggleFavorite={toggleFavorite}
          isFavorite={isFavorite}
        />

        {/* Bottom sheet - works on both mobile and desktop */}
        <VideoGeneratorBottomSheet
          modelId={selectedModelId}
          modelName={modelInfo?.name || studioModel?.key || ''}
          estimatedCost={price.stars}
          prompt={prompt}
          onPromptChange={setPrompt}
          mode={mode as string}
          onModeChange={(m) => setMode(m as any)}
          availableModes={studioModel?.modes || ['t2v']}
          duration={duration as number}
          onDurationChange={(d) => setDuration(d as any)}
          durationOptions={studioModel?.kind === "video" && studioModel.durationOptions ? (studioModel.durationOptions as number[]) : [5, 10]}
          quality={quality as string}
          onQualityChange={(q) => setQuality(q as any)}
          qualityOptions={studioModel?.qualityTiers || []}
          aspectRatio={String(aspect || "")}
          onAspectRatioChange={(v) => setAspect(v as any)}
          aspectRatioOptions={studioModel?.aspectRatios || []}
          referenceImage={referenceImage}
          onReferenceImageChange={setReferenceImage}
          negativePrompt={negativePrompt}
          onNegativePromptChange={setNegativePrompt}
          isGenerating={isStarting || status === 'generating' || status === 'queued'}
          canGenerate={canGenerate && !isStarting}
          onGenerate={handleGenerate}
        />
      </div>
    </StudioShell>
  );
}


