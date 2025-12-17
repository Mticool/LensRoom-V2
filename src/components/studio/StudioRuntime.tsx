"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getEffectById } from "@/config/effectsGallery";
import { getModelById, type ModelConfig, type VideoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { invalidateCached } from "@/lib/client/generations-cache";
import { usePreferencesStore } from "@/stores/preferences-store";

import type { Aspect, Duration, Mode, Quality } from "@/config/studioModels";
import { getStudioModelByKey, STUDIO_PHOTO_MODELS, STUDIO_VIDEO_MODELS } from "@/config/studioModels";

import { StudioShell } from "@/components/studio/StudioShell";
import { ModelSidebar } from "@/components/studio/ModelSidebar";
import { GeneratorPreview } from "@/components/studio/GeneratorPreview";
import { SettingsPanel } from "@/components/studio/SettingsPanel";
import { PromptBox } from "@/components/studio/PromptBox";
import { BottomActionBar } from "@/components/studio/BottomActionBar";
import { StartEndUpload } from "@/components/studio/StartEndUpload";

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
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.key || "");

  // Common UI state
  const [mode, setMode] = useState<Mode>(kind === "photo" ? "t2i" : "t2v");
  const [quality, setQuality] = useState<Quality>("" as Quality);
  const [aspect, setAspect] = useState<Aspect>("1:1" as Aspect);
  const [duration, setDuration] = useState<Duration>(5 as Duration);
  const [audio, setAudio] = useState<boolean>(true);

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
  }, [searchParams]);

  const modelInfo: ModelConfig | undefined = useMemo(() => getModelById(selectedModelId), [selectedModelId]);
  const studioModel = useMemo(() => getStudioModelByKey(selectedModelId) || models[0], [selectedModelId, models]);

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

    setAudio(!!studioModel.supportsAudio);

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
    if (needsReference && !referenceImage) return false;
    if (needsStartEnd && (!firstFrame || !lastFrame)) return false;
    if (isStoryboard) return scenes.some((s) => s.trim().length > 0);
    return prompt.trim().length > 0;
  }, [modelInfo, needsReference, referenceImage, needsStartEnd, firstFrame, lastFrame, isStoryboard, scenes, prompt]);

  const price = useMemo(() => {
    if (!modelInfo) return { stars: 0, approxRub: 0, credits: 0 };

    if (modelInfo.type === "photo") {
      const isResolution = typeof quality === "string" && String(quality).includes("x");
      return computePrice(modelInfo.id, {
        quality: isResolution ? undefined : (quality as any),
        resolution: isResolution ? String(quality) : undefined,
        variants: 1,
      });
    }

    const v = modelInfo as VideoModelConfig;
    const isResolution = typeof quality === "string" && String(quality).endsWith("p");

    return computePrice(v.id, {
      mode: mode as any,
      duration: duration as any,
      // bytedance uses resolutionOptions; computePrice expects videoQuality to key into pricing
      videoQuality: String(quality || "") as any,
      audio: !!v.supportsAudio,
      variants: 1,
    });
  }, [modelInfo, quality, mode, duration]);

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

              // Refresh library cache so /library shows new item quickly.
              invalidateCached("generations:");
              try {
                window.dispatchEvent(new CustomEvent("generations:refresh"));
              } catch {}

              if (focusedJobIdRef.current === job.jobId) {
                setResultUrls(urls);
                setStatus("success");
                setProgress(100);
              }

              // Show success notification if enabled
              if (showSuccessNotifications) {
                const notificationText = job.kind === "video" ? "Video ready ✅" : "Photo ready ✅";
                toast(notificationText, {
                  action: {
                    label: "Open in Library",
                    onClick: () => {
                      router.push("/library");
                    },
                  },
                });
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

    try {
      if (modelInfo.type === "photo") {
        const isResolution = typeof quality === "string" && String(quality).includes("x");
        const payload: any = {
          model: modelInfo.id,
          prompt,
          aspectRatio: String(aspect),
          variants: 1,
          mode: mode === "i2i" ? "i2i" : "t2i",
          quality: isResolution ? undefined : String(quality || ""),
          resolution: isResolution ? String(quality) : undefined,
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
        const job: ActiveJob = {
          jobId,
          kind: "image",
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
        return;
      }

      const v = modelInfo as VideoModelConfig;
      const isResolution = typeof quality === "string" && String(quality).endsWith("p");
      const payload: any = {
        model: v.id,
        mode,
        prompt: isStoryboard ? undefined : prompt,
        shots: isStoryboard ? scenes.filter((s) => s.trim()).map((s) => ({ prompt: s.trim() })) : undefined,
        duration,
        aspectRatio: String(aspect),
        quality: isResolution ? undefined : String(quality || ""),
        resolution: isResolution ? String(quality) : undefined,
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
      sidebar={<ModelSidebar models={models} selectedKey={selectedModelId} onSelect={(key) => setSelectedModelId(key)} />}
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
              referenceImage={referenceImage}
              onReferenceImageChange={setReferenceImage}
            />

            <PromptBox mode={mode} prompt={prompt} onPromptChange={setPrompt} scenes={scenes} onScenesChange={setScenes} />
          </div>
        </div>

        <BottomActionBar
          stars={price.stars}
          approxRub={price.approxRub}
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


