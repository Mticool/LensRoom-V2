"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Film, Loader2 } from "lucide-react";

import { getEffectById } from "@/config/effectsGallery";
import { getModelById, type ModelConfig, type VideoModelConfig } from "@/config/models";
// Removed: import { approxRubFromStars } from "@/config/pricing";
import { computePrice } from "@/lib/pricing/compute-price";
import { invalidateCached } from "@/lib/client/generations-cache";
import { usePreferencesStore } from "@/stores/preferences-store";

import type { Aspect, Duration, Mode, Quality } from "@/config/studioModels";
import { getStudioModelByKey, STUDIO_PHOTO_MODELS, STUDIO_VIDEO_MODELS } from "@/config/studioModels";
import { PHOTO_VARIANT_MODELS, type ParamKey } from "@/config/photoVariantRegistry";

import { StudioShell } from "@/components/studio/StudioShell";
import { ModelSidebar, MobileModelSelector } from "@/components/studio/ModelSidebar";
import { PhotoModelSidebar, MobilePhotoModelSelector } from "@/components/studio/PhotoModelSidebar";
import { GeneratorPreview } from "@/components/studio/GeneratorPreview";
import { SettingsPanel } from "@/components/studio/SettingsPanel";
import { PhotoSettingsPanel } from "@/components/studio/PhotoSettingsPanel";
import { PromptBox } from "@/components/studio/PromptBox";
import { BottomActionBar } from "@/components/studio/BottomActionBar";
import { StartEndUpload } from "@/components/studio/StartEndUpload";
import { GenerationQueue } from "@/components/studio/GenerationQueue";

type RuntimeStatus = "idle" | "queued" | "generating" | "success" | "failed";

type ActiveJob = {
  jobId: string;
  kind: "image" | "video";
  provider?: string;
  modelName: string;
  createdAt: number;
  status: RuntimeStatus;
  progress: number;
  resultUrls: string[];
  error?: string | null;
  opened?: boolean;
};

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
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

export function StudioRuntime({ defaultKind }: { defaultKind: "photo" | "video" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showSuccessNotifications } = usePreferencesStore();

  const requestedKind = (searchParams.get("kind") as "photo" | "video" | null) || null;
  const kind: "photo" | "video" = requestedKind || defaultKind;

  const models = kind === "photo" ? STUDIO_PHOTO_MODELS : STUDIO_VIDEO_MODELS;
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

  // Common UI state
  const [mode, setMode] = useState<Mode>(kind === "photo" ? "t2i" : "t2v");
  const [quality, setQuality] = useState<Quality>("" as Quality);
  const [outputFormat, setOutputFormat] = useState<"png" | "jpg">("png");
  const [aspect, setAspect] = useState<Aspect>("1:1" as Aspect);
  const [duration, setDuration] = useState<Duration>(5 as Duration);
  const [audio, setAudio] = useState<boolean>(true);
  const [modelVariant, setModelVariant] = useState<string>(""); // For unified models like Kling/WAN
  const [resolution, setResolution] = useState<string>(""); // For models with resolution selection (e.g., WAN)

  const [prompt, setPrompt] = useState<string>("");
  const [scenes, setScenes] = useState<string[]>(["", "", ""]);

  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);

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

  useEffect(() => {
    focusedJobIdRef.current = focusedJobId;
  }, [focusedJobId]);

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

    // Reset runtime output
    setStatus("idle");
    setProgress(0);
    setLastError(null);
    setResultUrls([]);
  }, [studioModel?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsReference = !!studioModel?.supportsImageInput && (mode === "i2i" || mode === "i2v");
  const needsStartEnd = mode === "start_end";
  const isStoryboard = mode === "storyboard";

  const canGenerate = useMemo(() => {
    if (!modelInfo) return false;
    if (kind === "photo" && !selectedVariant) return false;
    if (needsReference && !referenceImage) return false;
    if (needsStartEnd && (!firstFrame || !lastFrame)) return false;
    if (isStoryboard) return scenes.some((s) => s.trim().length > 0);
    return prompt.trim().length > 0;
  }, [modelInfo, kind, selectedVariant, needsReference, referenceImage, needsStartEnd, firstFrame, lastFrame, isStoryboard, scenes, prompt]);

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

    return computePrice(v.id, {
      mode: mode as any,
      duration: duration as any,
      // bytedance uses resolutionOptions; computePrice expects videoQuality to key into pricing
      videoQuality: String(quality || "") as any,
      resolution: effectiveResolution as any, // For WAN per-second pricing
      audio: !!v.supportsAudio,
      modelVariant: modelVariant || undefined,
      variants: 1,
    });
  }, [modelInfo, kind, selectedVariant, quality, mode, duration, modelVariant, resolution]);

  const pollJob = useCallback(async (jobId: string, kind: "image" | "video", provider?: string) => {
    const maxAttempts = 180;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const qs = new URLSearchParams();
      qs.set("kind", kind);
      if (provider) qs.set("provider", provider);

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
            if (job.provider) qs.set("provider", job.provider);

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
          aspectRatio: String(aspect),
          variants: 1,
          mode: mode === "i2i" ? "i2i" : "t2i",
          outputFormat: "png", // Always PNG for photos
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
        
        // Check if generation already completed (e.g., OpenAI sync response)
        if (data.status === 'completed' && Array.isArray(data.results) && data.results[0]?.url) {
          const urls = data.results.map((r: any) => r.url).filter(Boolean);
          const job: ActiveJob = {
            jobId,
            kind: "image",
            provider: data?.provider,
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
        
        // Start polling for async providers (KIE etc.)
        const job: ActiveJob = {
          jobId,
          kind: "image",
          provider: data?.provider,
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
        duration,
        aspectRatio: String(aspect),
        quality: isResolution ? undefined : String(quality || ""),
        resolution: effectiveResolution || undefined, // For WAN per-second pricing
        audio: v.supportsAudio ? audio : undefined,
      };

      if (mode === "i2v") {
        if (!referenceImage) throw new Error("referenceImage is required for i2v");
        payload.referenceImage = await fileToDataUrl(referenceImage);
      }

      if (mode === "start_end") {
        if (!firstFrame || !lastFrame) throw new Error("start/end frames are required");
        payload.startImage = await fileToDataUrl(firstFrame);
        payload.endImage = await fileToDataUrl(lastFrame);
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
      const job: ActiveJob = {
        jobId,
        kind: "video",
        provider: data?.provider,
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
  }, [modelInfo, canGenerate, quality, prompt, aspect, duration, mode, referenceImage, firstFrame, lastFrame, scenes, audio, isStoryboard, startPollingJob]);

  const newResultsCount = useMemo(() => {
    return activeJobs.filter((j) => j.status === "success" && !j.opened).length;
  }, [activeJobs]);

  const handleReset = useCallback(() => {
    setPrompt("");
    setScenes(["", "", ""]);
    setReferenceImage(null);
    setFirstFrame(null);
    setLastFrame(null);
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
      <div className="space-y-6">
        <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <GeneratorPreview
              model={studioModel}
              mode={mode}
              aspect={aspect}
              referencePreviewUrl={referencePreviewUrl}
              resultUrl={resultUrls[0] || null}
              isGenerating={status === "generating" || status === "queued" || isStarting}
            />

            {mode === "start_end" && (
              <StartEndUpload
                firstFrame={firstFrame}
                lastFrame={lastFrame}
                onFirstFrameChange={setFirstFrame}
                onLastFrameChange={setLastFrame}
              />
            )}

            {(status === "queued" || status === "generating") && (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-sm text-[var(--text)]">
                  Статус: {status} • {Math.round(progress)}%
                </div>
              </div>
            )}

            {status === "failed" && lastError && (
              <div className="rounded-[20px] border border-white/15 bg-[var(--surface)] p-5">
                <div className="text-sm text-white/90">Статус: failed</div>
                <div className="text-xs text-[var(--muted)] mt-1">{lastError}</div>
              </div>
            )}

            {/* Generation Queue */}
            {activeJobs.length > 0 && (
              <GenerationQueue
                jobs={activeJobs}
                onJobClick={(job) => {
                  if (job.status === 'success' && job.resultUrls.length > 0) {
                    setResultUrls(job.resultUrls);
                    setStatus('success');
                    setFocusedJobId(job.jobId);
                  }
                }}
                onClearCompleted={() => {
                  setActiveJobs((prev) => prev.filter((j) => j.status === 'generating' || j.status === 'queued'));
                }}
              />
            )}

            {/* If some providers return multiple image URLs, show extra variants below preview */}
            {status === "success" && studioModel.kind === "photo" && resultUrls.length > 1 && (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="text-sm font-semibold mb-3">Варианты</div>
                <div className="grid grid-cols-2 gap-3">
                  {resultUrls.slice(0, 4).map((u) => (
                    <div key={u} className="aspect-square rounded-xl overflow-hidden border border-[var(--border)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {kind === "photo" && activePhotoBase ? (
              <PhotoSettingsPanel
                model={activePhotoBase}
                selection={selectedParams}
                onSelectionChange={setSelectedParams}
                mode={mode as any}
                onModeChange={(m) => setMode(m as any)}
                aspect={aspect as any}
                onAspectChange={(a) => setAspect(a as any)}
                aspectOptions={studioModel?.aspectRatios || ["1:1"]}
                referenceImage={referenceImage}
                onReferenceImageChange={setReferenceImage}
                currentPlan={currentPlan}
              />
            ) : (
              <SettingsPanel
                model={studioModel}
                mode={mode}
                onModeChange={setMode}
                quality={quality}
                onQualityChange={setQuality}
                aspect={aspect}
                onAspectChange={setAspect}
                duration={studioModel.kind === "video" ? (duration as any) : undefined}
                onDurationChange={studioModel.kind === "video" ? (setDuration as any) : undefined}
                audio={studioModel.kind === "video" && studioModel.supportsAudio ? audio : undefined}
                onAudioChange={studioModel.kind === "video" && studioModel.supportsAudio ? setAudio : undefined}
                modelVariant={modelVariant}
                onModelVariantChange={setModelVariant}
                resolution={resolution}
                onResolutionChange={setResolution}
                referenceImage={referenceImage}
                onReferenceImageChange={setReferenceImage}
              />
            )}

            <PromptBox mode={mode} prompt={prompt} onPromptChange={setPrompt} scenes={scenes} onScenesChange={setScenes} />
          </div>
        </div>

        <BottomActionBar
          stars={price.stars}
          approxRub={0}
          hint={
            studioModel.kind === "video"
              ? "Влияет на цену: режим • качество • длительность"
              : "Влияет на цену: режим • качество"
          }
          canGenerate={canGenerate && !isStarting}
          onGenerate={handleGenerate}
          onReset={handleReset}
          onOpenLibrary={() => {
            // Mark all completed as opened once user visits history
            setActiveJobs((prev) => prev.map((j) => (j.status === "success" ? { ...j, opened: true } : j)));
            router.push("/library");
          }}
          newResultsCount={newResultsCount}
        />
      </div>
    </StudioShell>
  );
}




