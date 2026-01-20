'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Film, HelpCircle, ImagePlus, Info, LayoutGrid, List, Loader2, Maximize2, MoreHorizontal, Pencil, Play, RefreshCw, Settings, Star, Upload, Video, X } from "lucide-react";

import { computePrice } from "@/lib/pricing/compute-price";
import { cn } from "@/lib/utils";
import { getModelById, getModelsByType, type VideoModelConfig, type VideoMode, type VideoQuality } from "@/config/models";
import { IconCheck, IconClose, IconImageAdd, IconPlus, IconVideoCam } from "@/components/video/ui/TileIcons";

type StudioMode = Extract<VideoMode, "t2v" | "i2v" | "start_end" | "v2v">;
type StudioAspect = string;

type JobStatus = "queued" | "processing" | "success" | "failed" | "cancelled";

type VideoJobParams = {
  model: string; // id from VIDEO_MODELS
  modelVariant?: string;
  mode: StudioMode;
  prompt: string;
  negativePrompt?: string;
  duration?: number | string;
  quality?: VideoQuality | string;
  resolution?: string;
  aspectRatio?: StudioAspect;
  audio?: boolean;
  soundPreset?: string; // WAN sound presets
  // Motion Control (Kling 2.6)
  referenceVideo?: string;
  referenceImage?: string;
  videoDuration?: number;
  autoTrim?: boolean;
  // Edit Video (Kling O1 Edit)
  videoUrl?: string;
  keepAudio?: boolean;
  startImage?: string;
  endImage?: string;
};

type VideoJobCard = {
  localId: string;
  createdAt: number;
  status: JobStatus;
  progress: number;
  error?: string | null;
  // Remote tracking
  jobId?: string | null;
  provider?: string | null;
  // Result
  resultUrl?: string | null;
  // For display/retry
  params: VideoJobParams;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isHeicLike(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const t = (file.type || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function normalizeImageForUpload(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  throw new Error("HEIC пока не поддерживается. Загрузите JPG или PNG.");
}

async function fileToDataUrl(file: File): Promise<string> {
  const normalized = await normalizeImageForUpload(file);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(normalized);
  });
}

async function safeReadJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trim() === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function statusLabel(st: JobStatus): string {
  if (st === "queued") return "В очереди";
  if (st === "processing") return "Генерация";
  if (st === "success") return "Готово";
  if (st === "cancelled") return "Отменено";
  return "Ошибка";
}

function statusBadgeClass(st: JobStatus): string {
  if (st === "success") return "bg-green-500/15 text-green-400 border-green-500/20";
  if (st === "failed") return "bg-red-500/15 text-red-400 border-red-500/20";
  if (st === "cancelled") return "bg-white/8 text-white/60 border-white/10";
  if (st === "queued") return "bg-white/10 text-white/80 border-white/15";
  return "bg-amber-500/15 text-amber-300 border-amber-500/20";
}

function progressBarClass(st: JobStatus): string {
  if (st === "failed") return "bg-red-500/60";
  if (st === "cancelled") return "bg-white/20";
  if (st === "success") return "bg-green-500/60";
  return "bg-[var(--gold)]/70";
}

function qualityLabel(quality: string | undefined): string {
  const q = String(quality || "").toLowerCase();
  if (!q) return "";
  if (q === "fast") return "Быстро";
  if (q === "quality") return "Качество";
  if (q === "standard") return "Стандарт";
  if (q === "high") return "Высокое";
  return String(quality);
}

function aspectLabel(ar: StudioAspect): string {
  if (!ar) return "";
  if (ar === "auto") return "Авто";
  if (ar === "portrait") return "Портрет";
  if (ar === "landscape") return "Ландшафт";
  return String(ar);
}

function parseAspectRatio(ar: string | undefined): { w: number; h: number } | null {
  if (!ar) return null;
  if (ar === "portrait") return { w: 9, h: 16 };
  if (ar === "landscape") return { w: 16, h: 9 };
  if (ar.includes(":")) {
    const [wRaw, hRaw] = ar.split(":");
    const w = Number(wRaw);
    const h = Number(hRaw);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { w, h };
  }
  return null;
}

function aspectToCss(ar: string | undefined): string {
  const p = parseAspectRatio(ar);
  if (!p) return "16 / 9";
  return `${p.w} / ${p.h}`;
}

function isPortraitAspect(ar: string | undefined): boolean {
  const p = parseAspectRatio(ar);
  if (!p) return false;
  return p.h > p.w;
}

function normalizeProviderStatusToUi(raw: string): JobStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "completed" || s === "success") return "success";
  if (s === "failed") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "queued") return "queued";
  return "processing";
}

export function VideoStudio({ initialPrompt = "" }: { initialPrompt?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const EXCLUDED_VIDEO_MODEL_IDS = useMemo(
    () => new Set<string>(["sora-storyboard", "kling-ai-avatar"]),
    []
  );
  const availableModels = useMemo(() => {
    const all = getModelsByType("video") as VideoModelConfig[];
    return all
      .filter((m) => !EXCLUDED_VIDEO_MODEL_IDS.has(m.id))
      .sort((a, b) => (a.rank || 0) - (b.rank || 0));
  }, [EXCLUDED_VIDEO_MODEL_IDS]);
  const modelIdFromUrl = useMemo(() => {
    const raw = String(searchParams.get("model") || "").trim();
    return raw || "veo-3.1";
  }, [searchParams]);
  const selectedModel = useMemo((): VideoModelConfig => {
    const m = getModelById(modelIdFromUrl);
    if (m && (m as any).type === "video" && !EXCLUDED_VIDEO_MODEL_IDS.has((m as any).id)) {
      return m as VideoModelConfig;
    }
    return availableModels.find((x) => x.id === "veo-3.1") || availableModels[0]!;
  }, [EXCLUDED_VIDEO_MODEL_IDS, availableModels, modelIdFromUrl]);
  const modelId = selectedModel.id;

  const tool = useMemo<"create" | "edit" | "motion">(() => {
    if (modelId === "kling-motion-control") return "motion";
    if (modelId === "kling-o1-edit") return "edit";
    return "create";
  }, [modelId]);

  const lastCreateModelIdRef = useRef<string>("veo-3.1");
  useEffect(() => {
    if (tool === "create") lastCreateModelIdRef.current = modelId;
  }, [modelId, tool]);

  const setTool = useCallback(
    (next: "create" | "edit" | "motion") => {
      const qs = new URLSearchParams(Array.from(searchParams.entries()));
      if (next === "motion") qs.set("model", "kling-motion-control");
      else if (next === "edit") qs.set("model", "kling-o1-edit");
      else qs.set("model", lastCreateModelIdRef.current || "veo-3.1");
      router.replace(`/create/studio?${qs.toString()}`);
    },
    [router, searchParams]
  );

  const [modelVariant, setModelVariant] = useState<string | null>(null);

  // UI state
  const [mode, setMode] = useState<StudioMode>("t2v");
  const [duration, setDuration] = useState<number | string>(8);
  const [quality, setQuality] = useState<string>("fast");
  const [resolution, setResolution] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<StudioAspect>("16:9");
  const [audio, setAudio] = useState(false);
  const [soundPreset, setSoundPreset] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [prompt, setPrompt] = useState<string>(initialPrompt || "");
  const [historyView, setHistoryView] = useState<"list" | "grid">("grid");
  const [showDetails, setShowDetails] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [uiErrors, setUiErrors] = useState<{ prompt?: string; startFrame?: string; motionVideo?: string; characterImage?: string }>({});

  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [motionVideo, setMotionVideo] = useState<string | null>(null);
  const [motionVideoDuration, setMotionVideoDuration] = useState<number | null>(null);
  const [motionAutoTrim, setMotionAutoTrim] = useState(true);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [editVideo, setEditVideo] = useState<string | null>(null);
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [editKeepAudio, setEditKeepAudio] = useState(true);
  const [v2vVideo, setV2vVideo] = useState<string | null>(null);
  const [leftCreateTab, setLeftCreateTab] = useState<"frames" | "ingredients">("frames");
  // "Higgsfield-like" create UX: split inputs into two tabs (frames vs ingredients).
  // Keep the name for readability where it's used in conditional UI sections.
  const isCreateHiggs = tool === "create";
  const showCreateFrames = isCreateHiggs && leftCreateTab === "frames";
  const showCreateIngredients = isCreateHiggs && leftCreateTab === "ingredients";
  const [enhanceOn, setEnhanceOn] = useState(true);
  const [multiShot, setMultiShot] = useState(false);
  const prevResolutionRef = useRef<string | null>(null);
  const createPreviewRef = useRef<HTMLDivElement | null>(null);

  const [jobs, setJobs] = useState<VideoJobCard[]>([]);
  const pollingAbortRef = useRef<Record<string, boolean>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [activeJobLocalId, setActiveJobLocalId] = useState<string | null>(null);

  // Hydrate feed from DB (Library) so history persists across reloads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("type", "video");
        qs.set("model_id", modelId);
        qs.set("limit", "20");
        qs.set("sync", "true");

        const res = await fetch(`/api/generations?${qs.toString()}`);
        if (!res.ok) return;
        const data = await safeReadJson(res);
        const list = Array.isArray(data?.generations) ? data.generations : [];
        if (cancelled) return;

        const fromDb: VideoJobCard[] = list
          .map((g: any): VideoJobCard | null => {
            const taskId = g?.task_id ? String(g.task_id) : "";
            const createdAt = g?.created_at ? Date.parse(String(g.created_at)) : Date.now();
            const st = String(g?.status || "").toLowerCase();

            let status: JobStatus = "processing";
            if (st === "success" || st === "completed") status = "success";
            else if (st === "failed") status = "failed";
            else if (st === "cancelled") status = "cancelled";
            else if (st === "queued" || st === "pending" || st === "waiting" || st === "queuing") status = "queued";

            const resultUrl =
              (Array.isArray(g?.result_urls) && g.result_urls[0]) ||
              g?.asset_url ||
              g?.preview_url ||
              null;

            const prompt = typeof g?.prompt === "string" ? g.prompt : "";
            const arRaw = String(g?.aspect_ratio || "").trim();
            const ar: StudioAspect = arRaw || "16:9";

            const p = (g?.params && typeof g.params === "object") ? (g.params as any) : null;
            const params: VideoJobParams = {
              model: modelId,
              modelVariant: p?.modelVariant ? String(p.modelVariant) : undefined,
              mode: (p?.mode === "i2v" || p?.mode === "start_end") ? p.mode : "t2v",
              prompt,
              negativePrompt: typeof g?.negative_prompt === "string" ? g.negative_prompt : undefined,
              duration: p?.duration ?? undefined,
              quality: p?.quality ?? undefined,
              resolution: p?.resolution ?? undefined,
              aspectRatio: ar,
              audio: typeof p?.audio === "boolean" ? p.audio : false,
              soundPreset: p?.soundPreset ? String(p.soundPreset) : undefined,
            };

            return {
              localId: taskId ? `job_${taskId}` : `db_${createdAt}`,
              createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
              status,
              progress: status === "success" ? 100 : status === "queued" ? 10 : 50,
              error: g?.error ? String(g.error) : null,
              jobId: taskId || null,
              provider: null,
              resultUrl: resultUrl ? String(resultUrl) : null,
              params,
            };
          })
          .filter(Boolean) as VideoJobCard[];

        setJobs((prev) => {
          const byJobId = new Map<string, VideoJobCard>();
          for (const j of prev) {
            if (j.jobId) byJobId.set(String(j.jobId), j);
          }

          const merged: VideoJobCard[] = [...prev];
          for (const j of fromDb) {
            const key = j.jobId ? String(j.jobId) : "";
            const existing = key ? byJobId.get(key) : null;
            if (existing) {
              // Only fill missing fields; keep local state (polling/progress) if we have it.
              merged.splice(
                merged.findIndex((x) => x.localId === existing.localId),
                1,
                {
                  ...existing,
                  resultUrl: existing.resultUrl || j.resultUrl,
                  status: existing.status === "success" ? "success" : j.status,
                  error: existing.error || j.error,
                  createdAt: existing.createdAt || j.createdAt,
                }
              );
            } else {
              merged.push(j);
            }
          }

          merged.sort((a, b) => b.createdAt - a.createdAt);
          return merged.slice(0, 50);
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modelId]);

  // URL compatibility: /create?section=video&prompt=... already handled by parent.
  // Also accept mode=t2v|i2v for deep-links (optional)
  useEffect(() => {
    const m = String(searchParams.get("mode") || "").toLowerCase();
    if (m === "i2v") setMode("i2v");
    if (m === "t2v") setMode("t2v");
    if (m === "v2v") setMode("v2v");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeVariant = useMemo(() => {
    if (!selectedModel.modelVariants?.length) return null;
    const id = modelVariant || selectedModel.modelVariants[0]?.id || null;
    if (!id) return null;
    return selectedModel.modelVariants.find((v) => v.id === id) || selectedModel.modelVariants[0] || null;
  }, [modelVariant, selectedModel.modelVariants]);

  const supportedModes = useMemo((): StudioMode[] => {
    const raw = (activeVariant?.modes || selectedModel.modes || []) as string[];
    const allowed = raw.filter((m) => m === "t2v" || m === "i2v" || m === "start_end" || m === "v2v") as StudioMode[];
    // De-dup while preserving order
    return Array.from(new Set(allowed));
  }, [activeVariant?.modes, selectedModel.modes]);

  const durationOptions = useMemo<(number | string)[]>(() => {
    if (typeof selectedModel.fixedDuration === "number") return [selectedModel.fixedDuration];
    const d = activeVariant?.durationOptions || selectedModel.durationOptions || [];
    return d;
  }, [activeVariant?.durationOptions, selectedModel.durationOptions, selectedModel.fixedDuration]);

  const qualityOptions = useMemo<string[]>(() => {
    const q = (selectedModel.qualityOptions || []) as string[];
    return q;
  }, [selectedModel.qualityOptions]);

  const resolutionOptions = useMemo<string[]>(() => {
    const r = activeVariant?.resolutionOptions || selectedModel.resolutionOptions || [];
    return r;
  }, [activeVariant?.resolutionOptions, selectedModel.resolutionOptions]);

  const aspectOptions = useMemo<string[]>(() => {
    const a = activeVariant?.aspectRatios || selectedModel.aspectRatios || [];
    return a;
  }, [activeVariant?.aspectRatios, selectedModel.aspectRatios]);

  const wanSoundOptions = useMemo<string[]>(() => {
    return activeVariant?.soundOptions || [];
  }, [activeVariant?.soundOptions]);

  useEffect(() => {
    if (selectedModel.id !== "wan") return;
    setMultiShot(String(resolution) === "1080p_multi");
  }, [resolution, selectedModel.id]);

  const variantSupportsAudio = useMemo(() => {
    if (!selectedModel.supportsAudio) return false;
    if (!activeVariant) return true;
    // Kling: only 2.6 exposes audio pricing (and should show toggle)
    if (selectedModel.id === "kling") return activeVariant.id === "kling-2.6";
    return true;
  }, [activeVariant, selectedModel.id, selectedModel.supportsAudio]);

  // Initialize defaults when switching model / variant
  useEffect(() => {
    // Default variant
    if (selectedModel.modelVariants?.length) {
      const first = selectedModel.modelVariants[0]?.id;
      if (first && !modelVariant) setModelVariant(first);
    } else if (modelVariant) {
      setModelVariant(null);
    }

    // Default mode
    const preferredMode: StudioMode =
      (supportedModes.includes("t2v") && "t2v") ||
      (supportedModes.includes("i2v") && "i2v") ||
      (supportedModes.includes("start_end") && "start_end") ||
      "t2v";
    setMode((prev) => (supportedModes.includes(prev) ? prev : preferredMode));

    // Default duration
    const d0 = durationOptions[0];
    if (d0 !== undefined) setDuration((prev) => (durationOptions.includes(prev) ? prev : d0));

    // Default quality
    const q0 = qualityOptions[0];
    if (q0) setQuality((prev) => (qualityOptions.includes(prev) ? prev : q0));
    else setQuality("");

    // Default resolution
    const r0 = resolutionOptions[0];
    if (r0) setResolution((prev) => (resolutionOptions.includes(prev) ? prev : r0));
    else setResolution("");

    // Default aspect
    const a0 = aspectOptions.includes("16:9") ? "16:9" : aspectOptions[0];
    if (a0) setAspectRatio((prev) => (aspectOptions.includes(prev) ? prev : a0));

    // Default sound
    if (selectedModel.id === "wan") {
      setSoundPreset((prev) => (wanSoundOptions.includes(prev) ? prev : ""));
    } else if (soundPreset) {
      setSoundPreset("");
    }

    // Default audio
    const defaultAudio = selectedModel.id === "veo-3.1";
    setAudio((prev) => (variantSupportsAudio ? prev : false));
    setAudio((prev) => (defaultAudio && variantSupportsAudio ? true : prev));

    // Clear frames/inputs when model changes
    setStartFrame(null);
    setEndFrame(null);
    setMotionVideo(null);
    setMotionVideoDuration(null);
    setCharacterImage(null);
    setEditVideo(null);
    setEditRefImage(null);
    setEditKeepAudio(true);
    setV2vVideo(null);
    setLeftCreateTab("frames");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  // Keep selections valid when variant/options change
  useEffect(() => {
    const preferredMode: StudioMode =
      (supportedModes.includes("t2v") && "t2v") ||
      (supportedModes.includes("i2v") && "i2v") ||
      (supportedModes.includes("start_end") && "start_end") ||
      "t2v";
    setMode((prev) => (supportedModes.includes(prev) ? prev : preferredMode));

    const d0 = durationOptions[0];
    if (d0 !== undefined) setDuration((prev) => (durationOptions.includes(prev) ? prev : d0));

    const q0 = qualityOptions[0];
    if (q0) setQuality((prev) => (qualityOptions.includes(prev) ? prev : q0));
    else setQuality("");

    const r0 = resolutionOptions[0];
    if (r0) setResolution((prev) => (resolutionOptions.includes(prev) ? prev : r0));
    else setResolution("");

    const a0 = aspectOptions.includes("16:9") ? "16:9" : aspectOptions[0];
    if (a0) setAspectRatio((prev) => (aspectOptions.includes(prev) ? prev : a0));

    if (selectedModel.id === "wan") {
      setSoundPreset((prev) => (prev && wanSoundOptions.includes(prev) ? prev : ""));
    } else if (soundPreset) {
      setSoundPreset("");
    }

    if (!variantSupportsAudio) setAudio(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedModel.id,
    variantSupportsAudio,
    JSON.stringify(supportedModes),
    JSON.stringify(durationOptions),
    JSON.stringify(qualityOptions),
    JSON.stringify(resolutionOptions),
    JSON.stringify(aspectOptions),
    JSON.stringify(wanSoundOptions),
  ]);

  // Clear mode-specific errors when switching modes
  useEffect(() => {
    setUiErrors((prev) => {
      const next = { ...prev };
      if (mode !== "i2v" && mode !== "start_end") delete next.startFrame;
      return next;
    });
  }, [mode]);

  // Auto-select create mode based on frames (Higgsfield-like flow).
  // - No frames → t2v
  // - Start frame only → i2v
  // - Start+End (when supported) → start_end
  useEffect(() => {
    if (!isCreateHiggs) return;
    if (mode === "v2v") return;

    const supportsStartEnd = supportedModes.includes("start_end");
    if (startFrame && endFrame && supportsStartEnd) {
      setMode("start_end");
      return;
    }
    if (startFrame) {
      setMode("i2v");
      return;
    }
    setMode("t2v");
  }, [endFrame, isCreateHiggs, mode, startFrame, supportedModes]);

  const visibleJobs = useMemo(() => jobs.filter((j) => j.params.model === modelId), [jobs, modelId]);
  const latestJob = useMemo(() => visibleJobs[0] || null, [visibleJobs]);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const focusedJob = useMemo(() => {
    if (!focusedJobId) return latestJob;
    return visibleJobs.find((j) => j.localId === focusedJobId) || latestJob;
  }, [focusedJobId, latestJob, visibleJobs]);
  const secondaryJob = useMemo(() => {
    const focusedId = focusedJob?.localId;
    if (!focusedId) return visibleJobs[0] || null;
    return visibleJobs.find((j) => j.localId !== focusedId) || null;
  }, [focusedJob?.localId, visibleJobs]);

  const canGenerate = useMemo(() => {
    const pOk = prompt.trim().length > 0;
    if (!pOk) return false;
    if (modelId === "kling-motion-control") {
      if (!motionVideo) return false;
      if (!characterImage) return false;
      return true;
    }
    if (modelId === "kling-o1-edit") {
      if (!editVideo) return false;
      return true;
    }
    if (mode === "v2v") {
      if (!v2vVideo) return false;
      return true;
    }
    if ((mode === "i2v" || mode === "start_end") && !startFrame) return false;
    return true;
  }, [characterImage, editVideo, mode, modelId, motionVideo, prompt, startFrame, v2vVideo]);

  const priceStars = useMemo(() => {
    const audioForPricing = modelId === "wan" ? !!soundPreset : audio;
    const durationForPricing =
      modelId === "kling-motion-control"
        ? (motionVideoDuration || 3)
        : modelId === "kling-o1-edit"
          ? 5
          : (duration || selectedModel.fixedDuration || 5);
    const price = computePrice(modelId, {
      mode: modelId === "kling-o1-edit" ? ("v2v" as any) : mode,
      duration: durationForPricing,
      videoQuality: quality || undefined,
      resolution: resolution || undefined,
      audio: audioForPricing,
      modelVariant: modelVariant || undefined,
      variants: 1,
    });
    return price.stars;
  }, [audio, duration, mode, modelId, modelVariant, motionVideoDuration, quality, resolution, selectedModel.fixedDuration, soundPreset]);

  const baseParams = useMemo((): Omit<VideoJobParams, "mode"> => {
    return {
      model: modelId,
      modelVariant: modelVariant || undefined,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      duration: modelId === "kling-o1-edit" ? undefined : duration,
      quality: quality || undefined,
      resolution: resolution || undefined,
      aspectRatio: aspectRatio || undefined,
      audio: modelId === "wan" ? undefined : audio,
      soundPreset: modelId === "wan" ? (soundPreset || undefined) : undefined,
      referenceVideo: modelId === "kling-motion-control" ? (motionVideo || undefined) : undefined,
      referenceImage: modelId === "kling-motion-control" ? (characterImage || undefined) : undefined,
      videoDuration: modelId === "kling-motion-control" ? (motionVideoDuration || undefined) : undefined,
      autoTrim: modelId === "kling-motion-control" ? motionAutoTrim : undefined,
      videoUrl:
        mode === "v2v"
          ? (v2vVideo || undefined)
          : modelId === "kling-o1-edit"
            ? (editVideo || undefined)
            : undefined,
      keepAudio: modelId === "kling-o1-edit" ? editKeepAudio : undefined,
      startImage: modelId === "kling-o1-edit" ? (editRefImage || undefined) : undefined,
    };
  }, [aspectRatio, audio, characterImage, duration, editKeepAudio, editRefImage, editVideo, modelId, modelVariant, mode, motionAutoTrim, motionVideo, motionVideoDuration, negativePrompt, prompt, quality, resolution, soundPreset, v2vVideo]);

  const addJob = useCallback((params: VideoJobParams): string => {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: VideoJobCard = {
      localId,
      createdAt: Date.now(),
      status: "queued",
      progress: 0,
      error: null,
      jobId: null,
      provider: null,
      resultUrl: null,
      params,
    };
    setJobs((prev) => [job, ...prev]);
    return localId;
  }, []);

  const updateJob = useCallback((localId: string, patch: Partial<VideoJobCard>) => {
    setJobs((prev) => prev.map((j) => (j.localId === localId ? { ...j, ...patch } : j)));
  }, []);

  const pollJob = useCallback(
    async (localId: string, jobId: string, provider?: string | null) => {
      const key = `${localId}:${jobId}`;
      pollingAbortRef.current[key] = false;

      const qsBase = new URLSearchParams();
      qsBase.set("kind", "video");
      if (provider) qsBase.set("provider", provider);

      for (let attempt = 0; attempt < 180; attempt++) {
        if (pollingAbortRef.current[key]) return;
        await sleep(2000);

        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?${qsBase.toString()}`);
        const data = await safeReadJson(res);
        if (!res.ok) {
          throw new Error(data?.error || `Ошибка статуса задания (${res.status})`);
        }

        const rawStatus = String(data?.status || "");
        const uiStatus = normalizeProviderStatusToUi(rawStatus);
        const p = typeof data?.progress === "number" ? Math.max(0, Math.min(100, data.progress)) : 0;

        if (uiStatus === "success" && Array.isArray(data?.results) && data.results[0]?.url) {
          const url = String(data.results[0].url || "");
          updateJob(localId, { status: "success", progress: 100, resultUrl: url, error: null });
          // Let Library update immediately (DB already has generation record)
          try {
            window.dispatchEvent(new CustomEvent("generations:refresh"));
          } catch {}
          toast.success("Видео готово ✅");
          return;
        }

        if (uiStatus === "cancelled") {
          updateJob(localId, { status: "cancelled", progress: 0, error: data?.error || "Отменено" });
          toast.info("Генерация отменена");
          return;
        }

        if (uiStatus === "failed") {
          throw new Error(data?.error || "Генерация не удалась");
        }

        if (uiStatus === "queued") updateJob(localId, { status: "queued", progress: p || 10 });
        else updateJob(localId, { status: "processing", progress: p || 50 });
      }

      throw new Error("Таймаут ожидания");
    },
    [updateJob]
  );

  const startGeneration = useCallback(
    async (params: VideoJobParams, existingLocalId?: string) => {
      const localId = existingLocalId || addJob(params);
      updateJob(localId, { status: "queued", progress: 0, error: null, resultUrl: null, jobId: null, provider: null });

      setIsStarting(true);
      setActiveJobLocalId(localId);
      try {
        const res = await fetch("/api/generate/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: params.model,
            modelVariant: params.modelVariant,
            mode: params.mode,
            prompt: params.prompt,
            negativePrompt: params.negativePrompt,
            duration: params.duration,
            quality: params.quality,
            resolution: params.resolution,
            aspectRatio: params.aspectRatio === "auto" ? undefined : params.aspectRatio,
            audio: params.audio,
            soundPreset: params.soundPreset,
            referenceImage: params.referenceImage,
            referenceVideo: params.referenceVideo,
            videoDuration: params.videoDuration,
            autoTrim: params.autoTrim,
            videoUrl: params.videoUrl,
            keepAudio: params.keepAudio,
            // MVP: variants=1 (UI), backend supports variants
            startImage: params.startImage,
            endImage: params.endImage,
          }),
        });
        const data = await safeReadJson(res);
        if (!res.ok) {
          throw new Error(data?.error || "Ошибка запуска генерации");
        }

        // Prompt Library refresh so queued item appears ASAP.
        try {
          window.dispatchEvent(new CustomEvent("generations:refresh"));
        } catch {}

        const provider = data?.provider ? String(data.provider) : null;
        const jobId = data?.jobId ? String(data.jobId) : "";

        const directUrl =
          (Array.isArray(data?.results) && data.results[0]?.url) ||
          data?.url ||
          data?.result?.url ||
          (Array.isArray(data?.result_urls) && data.result_urls[0]);

        if (String(data?.status || "").toLowerCase() === "completed" && directUrl) {
          updateJob(localId, {
            status: "success",
            progress: 100,
            resultUrl: String(directUrl),
            error: null,
            jobId: jobId || null,
            provider,
          });
          try {
            window.dispatchEvent(new CustomEvent("generations:refresh"));
          } catch {}
          toast.success("Видео готово ✅");
          return;
        }

        if (!jobId) throw new Error("Нет jobId для отслеживания");

        updateJob(localId, { jobId, provider, status: "processing", progress: 5 });
        await pollJob(localId, jobId, provider);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка";
        updateJob(localId, { status: "failed", progress: 0, error: msg });
        toast.error(msg);
      } finally {
        setIsStarting(false);
        setActiveJobLocalId(null);
      }
    },
    [addJob, pollJob, updateJob]
  );

  const cancelGeneration = useCallback(async (localId: string) => {
    const job = jobs.find((j) => j.localId === localId);
    if (!job) return;

    // Abort polling ASAP
    if (job.jobId) {
      pollingAbortRef.current[`${localId}:${job.jobId}`] = true;
    }

    // Best-effort server cancel (marks DB record as cancelled + refunds)
    if (job.jobId) {
      try {
        const qs = new URLSearchParams();
        qs.set("kind", "video");
        if (job.provider) qs.set("provider", job.provider);
        await fetch(`/api/jobs/${encodeURIComponent(job.jobId)}?${qs.toString()}`, { method: "POST" });
      } catch {}
    }

    updateJob(localId, { status: "cancelled", error: "Отменено пользователем", progress: 0 });

    if (activeJobLocalId === localId) {
      setIsStarting(false);
      setActiveJobLocalId(null);
    }

    toast.info("Генерация отменена");
  }, [jobs, updateJob, activeJobLocalId]);

  const handleGenerate = useCallback(async () => {
    const p = prompt.trim();
    if (!p) {
      setUiErrors((prev) => ({ ...prev, prompt: "Введите промпт" }));
      toast.error("Введите промпт");
      return;
    }

    if (modelId === "kling-motion-control") {
      if (!motionVideo) {
        toast.error("Загрузите видео с движениями");
        return;
      }
      if (!characterImage) {
        toast.error("Загрузите изображение персонажа");
        return;
      }

      const params: VideoJobParams = {
        ...baseParams,
        mode: "i2v",
        referenceVideo: motionVideo,
        referenceImage: characterImage,
        videoDuration: motionVideoDuration || undefined,
        autoTrim: motionAutoTrim,
        // These are not used for motion control
        startImage: undefined,
        endImage: undefined,
      };

      await startGeneration(params);
      return;
    }

    if (modelId === "kling-o1-edit") {
      if (!editVideo) {
        toast.error("Загрузите видео для редактирования");
        return;
      }

      const params: VideoJobParams = {
        ...baseParams,
        mode: "v2v" as any,
        videoUrl: editVideo,
        startImage: editRefImage || undefined,
        keepAudio: editKeepAudio,
      };
      await startGeneration(params);
      return;
    }

    if (mode === "v2v") {
      if (!v2vVideo) {
        toast.error("Загрузите референс‑видео");
        return;
      }
      const params: VideoJobParams = {
        ...baseParams,
        mode: "v2v",
        videoUrl: v2vVideo,
        startImage: undefined,
        endImage: undefined,
      };
      await startGeneration(params);
      return;
    }

    if ((mode === "i2v" || mode === "start_end") && !startFrame) {
      setUiErrors((prev) => ({ ...prev, startFrame: "Нужен старт‑кадр" }));
      toast.error("Загрузите стартовый кадр");
      return;
    }

    const supportsStartEnd = supportedModes.includes("start_end");
    const autoStartEnd = supportsStartEnd && mode === "i2v" && !!endFrame;
    const effectiveMode: StudioMode = autoStartEnd ? "start_end" : mode;

    const params: VideoJobParams = {
      ...baseParams,
      mode: effectiveMode,
      startImage: effectiveMode === "t2v" ? undefined : startFrame || undefined,
      endImage: effectiveMode === "start_end" ? endFrame || undefined : undefined,
    };

    await startGeneration(params);
  }, [baseParams, editKeepAudio, editRefImage, editVideo, characterImage, endFrame, mode, modelId, motionAutoTrim, motionVideo, motionVideoDuration, prompt, startGeneration, startFrame, supportedModes, v2vVideo]);

  const handleUpload = useCallback(
    async (file: File, kind: "start" | "end") => {
      try {
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("Некорректный файл");
        if (kind === "start") {
          setStartFrame(dataUrl);
          setUiErrors((prev) => {
            const next = { ...prev };
            delete next.startFrame;
            return next;
          });
        } else {
          setEndFrame(dataUrl);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка";
        toast.error(msg);
      }
    },
    []
  );

  const getVideoDurationSeconds = useCallback(async (file: File): Promise<number | null> => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      const dur = await new Promise<number>((resolve, reject) => {
        v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
        v.onerror = () => reject(new Error("Не удалось прочитать длительность видео"));
        v.src = url;
      });
      try {
        URL.revokeObjectURL(url);
      } catch {}
      if (!Number.isFinite(dur) || dur <= 0) return null;
      return dur;
    } catch {
      return null;
    }
  }, []);

  const handleMotionUpload = useCallback(
    async (file: File, kind: "motion" | "character") => {
      try {
        if (kind === "motion") {
          const dur = await getVideoDurationSeconds(file);
          setMotionVideoDuration(dur);
        }
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("Некорректный файл");
        if (kind === "motion") {
          setMotionVideo(dataUrl);
        } else {
          setCharacterImage(dataUrl);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка";
        toast.error(msg);
      }
    },
    [getVideoDurationSeconds]
  );

  const handleEditUpload = useCallback(
    async (file: File, kind: "editVideo" | "editImage") => {
      try {
        if (kind === "editVideo" && !(file.type || "").startsWith("video/")) {
          throw new Error("Нужен видеофайл (MP4/MOV/WebM)");
        }
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("Некорректный файл");
        if (kind === "editVideo") setEditVideo(dataUrl);
        else setEditRefImage(dataUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка";
        toast.error(msg);
      }
    },
    []
  );

  const handleV2vUpload = useCallback(async (file: File) => {
    try {
      if (!(file.type || "").startsWith("video/")) {
        throw new Error("Нужен видеофайл (MP4/MOV/WebM)");
      }
      const dataUrl = await fileToDataUrl(file);
      if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("Некорректный файл");
      setV2vVideo(dataUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      toast.error(msg);
    }
  }, []);

  const handleDownload = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Ошибка скачивания");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const contentType = response.headers.get("content-type") || "";
      let ext = "mp4";
      if (contentType.includes("webm")) ext = "webm";
      if (contentType.includes("quicktime")) ext = "mov";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `lensroom_${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Скачивание завершено");
    } catch (e) {
      toast.error("Ошибка скачивания");
      window.open(url, "_blank");
    }
  }, []);

  const handleResetInputs = useCallback(() => {
    setPrompt("");
    setStartFrame(null);
    setEndFrame(null);
    setMotionVideo(null);
    setMotionVideoDuration(null);
    setCharacterImage(null);
    setEditVideo(null);
    setEditRefImage(null);
    setEditKeepAudio(true);
    setV2vVideo(null);
    setLeftCreateTab("frames");
    setEnhanceOn(true);
    setMultiShot(false);
    setShowAdvanced(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white flex flex-col">
      {/* Header spacer (site header is fixed) */}
      <div className="h-16" />

      {/* Main content */}
      <div className="flex-1 pb-44 sm:pb-40 lg:pb-0 min-h-0">
        <div className="w-full max-w-none px-3 sm:px-6 py-6 lg:px-4 lg:py-4 lg:h-[calc(100vh-4rem)] lg:flex lg:flex-col lg:min-h-0">
          <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2" style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}>
              <Film className="w-5 h-5 text-[#CDFF00]" />
              <div className="text-lg font-semibold">{tool === "motion" ? "Motion Control" : "Video"}</div>
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/10 bg-white/5"
              style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}
            >
              <button
                type="button"
                onClick={() => setTool("create")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[12px] font-semibold transition-colors",
                  tool === "create"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Create Video
              </button>
              <button
                type="button"
                onClick={() => setTool("edit")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[12px] font-semibold transition-colors",
                  tool === "edit"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Edit Video
              </button>
              <button
                type="button"
                onClick={() => setTool("motion")}
                className={cn(
                  "px-2 py-1 rounded-lg text-[12px] font-semibold transition-colors",
                  tool === "motion"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Motion Control
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetInputs}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm"
              title="Очистить ввод"
            >
              <X className="w-4 h-4 text-white/70" />
              Очистить
            </button>
          </div>

          {/* Mobile tabs */}
          <div className="sm:hidden mb-4">
            <div className="flex items-center gap-1 p-1 rounded-2xl border border-white/10 bg-white/5">
              <button
                type="button"
                onClick={() => setTool("create")}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-semibold transition-colors",
                  tool === "create"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setTool("edit")}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-semibold transition-colors",
                  tool === "edit"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setTool("motion")}
                className={cn(
                  "flex-1 h-10 rounded-xl text-sm font-semibold transition-colors",
                  tool === "motion"
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Motion
              </button>
            </div>

            {/* History & How it works buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  const anchor = document.getElementById("history-anchor");
                  anchor?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Clock className="w-4 h-4" />
                History
              </button>
              <a
                href="https://higgsfield.ai/blog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                How it works
              </a>
            </div>
          </div>

          {/* Desktop layout: Controls (left) | Preview (center) | Details (right, collapsible) */}
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden lg:flex-1 lg:min-h-0 relative">
            <div className={cn(
              "grid grid-cols-1 gap-6 lg:gap-0 lg:divide-x lg:divide-white/10 lg:h-full min-h-0",
              showDetails ? "lg:grid-cols-[360px_1fr_320px]" : "lg:grid-cols-[360px_1fr]"
            )}>
              {/* Left: Controls */}
              <div className="hidden lg:flex lg:flex-col h-full overflow-y-auto">
                <div className="flex-1 flex flex-col p-4">
                  {/* Create Video: Higgsfield-like preview + tabs + model picker */}
                  {tool === "create" && modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" ? (
                    <div className="relative" ref={createPreviewRef}>
                      <div className="relative h-[120px] rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                        {focusedJob?.resultUrl ? (
                          <video
                            src={focusedJob.resultUrl}
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/0 to-[#CDFF00]/10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" />

                        <button
                          type="button"
                          onClick={() => setShowModelMenu((v) => !v)}
                          className="absolute top-2 right-2 inline-flex items-center gap-2 h-8 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white/85 transition-colors"
                          style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}
                          title="Сменить модель"
                        >
                          <Pencil className="w-4 h-4 text-white/70" />
                          Change
                        </button>

                        <div className="absolute left-3 bottom-3">
                          <div
                            className="text-[12px] font-extrabold tracking-wide text-[#CDFF00]"
                            style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}
                          >
                            GENERAL
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-white/90">
                            {modelId.startsWith("veo") && !selectedModel.name.toLowerCase().includes("google") ? `Google ${selectedModel.name}` : selectedModel.name}
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-3 flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/5"
                        style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}
                      >
                        <button
                          type="button"
                          onClick={() => setLeftCreateTab("frames")}
                          className={cn(
                            "flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors",
                            leftCreateTab === "frames"
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          Frames
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftCreateTab("ingredients")}
                          className={cn(
                            "flex-1 h-9 rounded-lg text-[12px] font-semibold transition-colors",
                            leftCreateTab === "ingredients"
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          Ingredients
                        </button>
                      </div>

                      {showModelMenu && (
                        <div className="absolute top-[calc(120px+0.75rem)] left-0 mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                          <div className="p-2">
                            {availableModels
                              .filter((m) => m.id !== "kling-motion-control" && m.id !== "kling-o1-edit")
                              .map((m) => {
                                const active = m.id === modelId;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                                      active
                                        ? "bg-[#CDFF00]/10 border-[#CDFF00]/30"
                                        : "bg-white/0 border-white/10 hover:bg-white/5"
                                    )}
                                    onClick={() => {
                                      const qs = new URLSearchParams(Array.from(searchParams.entries()));
                                      qs.set("model", m.id);
                                      router.replace(`/create/studio?${qs.toString()}`);
                                      setShowModelMenu(false);
                                    }}
                                  >
                                    <Film className={cn("w-4 h-4", active ? "text-[#CDFF00]" : "text-white/50")} />
                                    <div className="flex-1 text-left">
                                      <div className="text-sm font-medium text-white">{m.name}</div>
                                      <div className="text-xs text-white/50">{m.shortLabel || m.description}</div>
                                    </div>
                                    {active ? <div className="text-xs text-[#CDFF00] font-medium">Активна</div> : null}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    {/* Always-visible core flow */}
                    <div className="space-y-3">
                      {modelId === "kling-motion-control" ? (
                        <>
                          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                            <div className="p-3">
                              <div className="text-[11px] text-white/45">MOTION CONTROL</div>
                              <div className="mt-1 text-sm font-semibold text-white/90">Add motion to copy</div>
                            </div>
                            <div className="px-3 pb-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <UploadTile
                                  kind="motion"
                                  variant="motion-control"
                                  title="Add motion to copy"
                                  subtitle={motionVideoDuration ? `Video duration: ${Math.round(motionVideoDuration)} seconds` : "Video duration: 3–30 seconds"}
                                  value={motionVideo}
                                  required
                                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/mov"
                                  disabled={isStarting}
                                  onFile={(f) => handleMotionUpload(f, "motion")}
                                  onClear={() => {
                                    setMotionVideo(null);
                                    setMotionVideoDuration(null);
                                  }}
                                />
                                <UploadTile
                                  kind="character"
                                  variant="motion-control"
                                  title="Add your character"
                                  subtitle="Image with visible face and body"
                                  value={characterImage}
                                  required
                                  accept="image/png,image/jpeg,image/webp"
                                  disabled={isStarting}
                                  onFile={(f) => handleMotionUpload(f, "character")}
                                  onClear={() => setCharacterImage(null)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-white/60">Quality</div>
                            <div className="relative">
                              <select
                                value={resolution || resolutionOptions[0] || "720p"}
                                onChange={(e) => setResolution(e.target.value)}
                                disabled={isStarting}
                                className={cn(
                                  "w-full h-16 pl-5 pr-12 rounded-2xl bg-white/5 border border-white/10",
                                  "text-[22px] font-semibold text-white",
                                  "focus:outline-none focus:border-[#CDFF00]",
                                  "appearance-none",
                                  isStarting && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                {resolutionOptions.map((r) => (
                                  <option key={r} value={r} className="bg-[#1a1a1a]">
                                    {r}
                                  </option>
                                ))}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35 pointer-events-none" />
                            </div>
                          </div>

                          <a
                            href="/pricing"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#CDFF00] hover:text-[#D8FF33] transition-colors"
                          >
                            <Star className="w-4 h-4" />
                            Try unlimited Kling Motion Control
                            <ChevronRight className="w-4 h-4 text-[#CDFF00]/80" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            disabled={isStarting}
                            className={cn(
                              "w-full flex items-center justify-between h-12 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm",
                              isStarting && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <span className="text-white/80">Advanced settings</span>
                            <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", showAdvanced && "rotate-180")} />
                          </button>
                        </>
                      ) : null}

                      {modelId === "kling-o1-edit" ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <UploadTile
                              kind="editVideo"
                              title="Видео"
                              subtitle="MP4 / MOV / WebM"
                              value={editVideo}
                              required
                              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/mov"
                              disabled={isStarting}
                              onFile={(f) => handleEditUpload(f, "editVideo")}
                              onClear={() => setEditVideo(null)}
                            />
                            <UploadTile
                              kind="editImage"
                              title="Референс"
                              subtitle="Опционально"
                              value={editRefImage}
                              required={false}
                              accept="image/png,image/jpeg,image/webp"
                              disabled={isStarting}
                              onFile={(f) => handleEditUpload(f, "editImage")}
                              onClear={() => setEditRefImage(null)}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            disabled={isStarting}
                            className={cn(
                              "w-full flex items-center justify-between h-12 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm",
                              isStarting && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <span className="text-white/80">Расширенные настройки</span>
                            <ChevronDown className={cn("w-4 h-4 text-white/50 transition-transform", showAdvanced && "rotate-180")} />
                          </button>
                        </>
                      ) : null}

                      {selectedModel.modelVariants?.length ? (
                        <div className="space-y-1">
                          <div className="text-xs text-white/60">Версия</div>
                          <select
                            value={modelVariant || selectedModel.modelVariants[0]?.id || ""}
                            onChange={(e) => setModelVariant(e.target.value)}
                            disabled={isStarting}
                            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#CDFF00]"
                          >
                            {selectedModel.modelVariants.map((v) => (
                              <option key={v.id} value={v.id} className="bg-[#1a1a1a]">
                                {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" && (!isCreateHiggs || showCreateIngredients) ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <ChipGroup
                          label="Режим"
                          value={mode}
                          options={supportedModes.map((m) => ({
                            value: m,
                            label: m === "t2v" ? "T2V" : m === "i2v" ? "I2V" : m === "v2v" ? "V2V" : "Старт+Конец",
                          }))}
                          onChange={(v) => {
                            setMode(v as StudioMode);
                            if (v === "t2v") {
                              setStartFrame(null);
                              setEndFrame(null);
                            }
                            if (v !== "v2v") setV2vVideo(null);
                          }}
                          disabled={isStarting}
                        />
                        {durationOptions.length ? (
                          <ChipGroup
                            label="Длительность"
                            value={String(duration)}
                            options={durationOptions.map((d) => ({ value: String(d), label: `${d}с` }))}
                            onChange={(v) => setDuration(String(v))}
                            disabled={isStarting || !!selectedModel.fixedDuration}
                          />
                        ) : null}
                        {isCreateHiggs ? null : (
                          <>
                            {resolutionOptions.length ? (
                              <ChipGroup
                                label="Разрешение"
                                value={resolution || resolutionOptions[0]}
                                options={resolutionOptions.map((r) => ({ value: r, label: r }))}
                                onChange={(v) => setResolution(String(v))}
                                disabled={isStarting}
                              />
                            ) : null}
                            {qualityOptions.length ? (
                              <div className="space-y-1">
                                <div className="text-xs text-white/60">Качество</div>
                                <select
                                  value={quality || qualityOptions[0]}
                                  onChange={(e) => setQuality(e.target.value)}
                                  disabled={isStarting}
                                  className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#CDFF00]"
                                >
                                  {qualityOptions.map((q) => (
                                    <option key={q} value={q} className="bg-[#1a1a1a]">
                                      {qualityLabel(q)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                            <ChipGroup
                              label="Формат"
                              value={aspectRatio}
                              options={aspectOptions.map((a) => ({ value: a, label: aspectLabel(a) }))}
                              onChange={(v) => setAspectRatio(v as StudioAspect)}
                              disabled={isStarting}
                            />
                          </>
                        )}
                      </div>
                      ) : null}

                      {modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" && (
                        (!isCreateHiggs && (mode === "i2v" || mode === "start_end")) ||
                        (isCreateHiggs && showCreateFrames && mode !== "v2v")
                      ) ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <FrameTile
                              kind="start"
                              title={isCreateHiggs ? "Start frame" : "Старт‑кадр"}
                              subtitle={isCreateHiggs ? "Optional" : (mode === "t2v" ? "Опционально" : "Обязательно")}
                              required={isCreateHiggs ? false : mode !== "t2v"}
                              value={startFrame}
                              disabled={isStarting}
                              onFile={async (f, k) => {
                                await handleUpload(f, k);
                              }}
                              onClear={() => setStartFrame(null)}
                              error={isCreateHiggs ? undefined : uiErrors.startFrame}
                            />
                            {supportedModes.includes("start_end") ? (
                              <FrameTile
                                kind="end"
                                title={isCreateHiggs ? "End frame" : "Конец‑кадр"}
                                subtitle={isCreateHiggs ? "Optional" : "Опционально"}
                                required={false}
                                value={endFrame}
                                disabled={isStarting}
                                onFile={async (f, k) => {
                                  await handleUpload(f, k);
                                }}
                                onClear={() => setEndFrame(null)}
                              />
                            ) : (
                              <div className="hidden sm:block" />
                            )}
                          </div>
                          {!isCreateHiggs && uiErrors.startFrame ? (
                            <div className="text-xs text-red-300">{uiErrors.startFrame}</div>
                          ) : null}
                        </div>
                      ) : null}

                      {modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" && mode === "v2v" && (!isCreateHiggs || showCreateFrames) ? (
                        <div className="space-y-2">
                          <div className="text-xs text-white/45">Референс‑видео (обязательно)</div>
                          <UploadTile
                            kind="editVideo"
                            title="Референс видео"
                            subtitle="MP4 / MOV / WebM"
                            value={v2vVideo}
                            required
                            accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/mov"
                            disabled={isStarting}
                            onFile={(f) => handleV2vUpload(f)}
                            onClear={() => setV2vVideo(null)}
                          />
                        </div>
                      ) : null}

                      {isCreateHiggs && showCreateIngredients ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="text-xs text-white/60">Model</div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowModelMenu(true);
                                try {
                                  createPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                } catch {}
                              }}
                              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between"
                              style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}
                            >
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                <span>
                                  {modelId.startsWith("veo") && !selectedModel.name.toLowerCase().includes("google") ? `Google ${selectedModel.name}` : selectedModel.name}
                                </span>
                                {modelId.startsWith("veo") ? (
                                  <span className="w-2 h-2 rounded-full bg-[#4285F4]" aria-hidden="true" />
                                ) : null}
                              </span>
                              <ChevronRight className="w-5 h-5 text-white/35" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {resolutionOptions.length ? (
                              <div className="space-y-1">
                                <div className="text-xs text-white/60">Quality</div>
                                <div className="relative">
                                  <select
                                    value={resolution || resolutionOptions[0] || ""}
                                    onChange={(e) => setResolution(e.target.value)}
                                    disabled={isStarting}
                                    className={cn(
                                      "w-full h-14 pl-4 pr-10 rounded-2xl bg-white/5 border border-white/10",
                                      "text-[18px] font-semibold text-white",
                                      "focus:outline-none focus:border-[#CDFF00]",
                                      "appearance-none",
                                      isStarting && "opacity-60 cursor-not-allowed"
                                    )}
                                  >
                                    {resolutionOptions.map((r) => (
                                      <option key={r} value={r} className="bg-[#1a1a1a]">
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                                </div>
                              </div>
                            ) : null}

                            {aspectOptions.length ? (
                              <div className="space-y-1">
                                <div className="text-xs text-white/60">Ratio</div>
                                <div className="relative">
                                  <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value as StudioAspect)}
                                    disabled={isStarting}
                                    className={cn(
                                      "w-full h-14 pl-4 pr-10 rounded-2xl bg-white/5 border border-white/10",
                                      "text-[18px] font-semibold text-white",
                                      "focus:outline-none focus:border-[#CDFF00]",
                                      "appearance-none",
                                      isStarting && "opacity-60 cursor-not-allowed"
                                    )}
                                  >
                                    {aspectOptions.map((a) => (
                                      <option key={a} value={a} className="bg-[#1a1a1a]">
                                        {a}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" && selectedModel.id === "wan" && (!isCreateHiggs || showCreateIngredients) ? (
                        <div className="space-y-1">
                          <div className="text-xs text-white/60">Звук</div>
                          <select
                            value={soundPreset}
                            onChange={(e) => setSoundPreset(e.target.value)}
                            disabled={isStarting}
                            className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#CDFF00]"
                          >
                            <option value="" className="bg-[#1a1a1a]">
                              Выкл
                            </option>
                            {wanSoundOptions.map((p) => (
                              <option key={p} value={p} className="bg-[#1a1a1a]">
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" && variantSupportsAudio && (!isCreateHiggs || showCreateIngredients) ? (
                        <ChipGroup
                          label="Звук"
                          value={audio ? "on" : "off"}
                          options={[
                            { value: "off", label: "Выкл" },
                            { value: "on", label: "Вкл" },
                          ]}
                          onChange={(v) => setAudio(v === "on")}
                          disabled={isStarting}
                        />
                      ) : null}

                      {(!isCreateHiggs || showCreateIngredients || showCreateFrames) ? (
                        <div className="space-y-1">
                          <div className="text-xs text-white/60">{isCreateHiggs ? "Prompt" : "Промпт"}</div>
                          <PromptTextarea
                            value={prompt}
                            onChange={(v) => {
                              setPrompt(v);
                              setUiErrors((prev) => {
                                const next = { ...prev };
                                if (v.trim()) delete next.prompt;
                                return next;
                              });
                            }}
                            disabled={isStarting}
                            placeholder={
                              isCreateHiggs
                                ? "Describe the scene you imagine, with details."
                                : mode === "t2v"
                                  ? "Опишите сцену и детали, которые хотите увидеть."
                                  : "Опишите движение/анимацию и детали."
                            }
                            onSubmit={handleGenerate}
                            autoFocus
                          />
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <div className="inline-flex items-center gap-2 text-xs text-white/55">
                              <Star className={cn("w-4 h-4", enhanceOn ? "text-[#CDFF00]" : "text-white/35")} />
                              <span style={{ fontFamily: "var(--font-space-grotesk), var(--font-body)" }}>
                                {isCreateHiggs ? "Enhance on" : `Улучшение: ${enhanceOn ? "Вкл" : "Выкл"}`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEnhanceOn((v) => !v)}
                              disabled={isStarting}
                              className={cn(
                                "h-8 px-3 rounded-full border text-xs font-semibold transition-colors",
                                enhanceOn
                                  ? "bg-[#CDFF00]/15 text-[#CDFF00] border-[#CDFF00]/25 hover:bg-[#CDFF00]/20"
                                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                                isStarting && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              {enhanceOn ? "On" : "Off"}
                            </button>
                          </div>

                          {isCreateHiggs ? (
                            <div className="flex items-center justify-between gap-3 pt-2">
                              <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/85">
                                  Multi-shot mode
                                  <Info className="w-4 h-4 text-white/35" />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const supported = selectedModel.id === "wan" && resolutionOptions.includes("1080p_multi");
                                  if (!supported) return;
                                  if (!multiShot) {
                                    prevResolutionRef.current =
                                      resolution && resolution !== "1080p_multi"
                                        ? resolution
                                        : (resolutionOptions.find((r) => r !== "1080p_multi") || null);
                                    setResolution("1080p_multi");
                                    setMultiShot(true);
                                  } else {
                                    const back =
                                      prevResolutionRef.current ||
                                      (resolutionOptions.find((r) => r !== "1080p_multi") || resolutionOptions[0] || "");
                                    setResolution(back);
                                    setMultiShot(false);
                                  }
                                }}
                                disabled={isStarting || !(selectedModel.id === "wan" && resolutionOptions.includes("1080p_multi"))}
                                className={cn(
                                  "h-9 px-4 rounded-full border text-xs font-semibold transition-colors",
                                  multiShot
                                    ? "bg-[#CDFF00] text-black border-[#CDFF00]/30"
                                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                                  (isStarting || !(selectedModel.id === "wan" && resolutionOptions.includes("1080p_multi"))) &&
                                    "opacity-60 cursor-not-allowed"
                                )}
                              >
                                {multiShot ? "On" : "Off"}
                              </button>
                            </div>
                          ) : null}

                          {uiErrors.prompt ? (
                            <div className="text-xs text-red-300">{uiErrors.prompt}</div>
                          ) : null}
                        </div>
                      ) : null}

                      {modelId !== "kling-motion-control" && (!isCreateHiggs || showCreateIngredients) ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            disabled={isStarting}
                            className={cn(
                              "flex items-center justify-center h-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs",
                              showAdvanced ? "text-white" : "text-white/70",
                              isStarting && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            Дополнительно
                          </button>
                        </div>
                      ) : null}

                      {showAdvanced && (!isCreateHiggs || showCreateIngredients) ? (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                          {modelId === "kling-motion-control" ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-white/60">Auto-trim</div>
                                <div className="text-[11px] text-white/40">Если видео длиннее 30с — обрежем автоматически.</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMotionAutoTrim((v) => !v)}
                                disabled={isStarting}
                                className={cn(
                                  "h-9 px-3 rounded-xl border text-xs font-semibold transition-colors",
                                  motionAutoTrim
                                    ? "bg-[#CDFF00] text-black border-[#CDFF00]/30"
                                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                                  isStarting && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                {motionAutoTrim ? "Вкл" : "Выкл"}
                              </button>
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            <div className="text-xs text-white/60">Негативный промпт (опционально)</div>
                            <textarea
                              value={negativePrompt}
                              onChange={(e) => setNegativePrompt(e.target.value)}
                              disabled={isStarting}
                              placeholder="размытие, искажения, низкое качество..."
                              className="w-full min-h-[72px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#CDFF00] resize-none"
                            />
                          </div>
                          {modelId === "kling-o1-edit" ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-white/60">Сохранить звук</div>
                                <div className="text-[11px] text-white/40">Сохранять исходный звук из видео (если есть).</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditKeepAudio((v) => !v)}
                                disabled={isStarting}
                                className={cn(
                                  "h-9 px-3 rounded-xl border text-xs font-semibold transition-colors",
                                  editKeepAudio
                                    ? "bg-[#CDFF00] text-black border-[#CDFF00]/30"
                                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                                  isStarting && "opacity-60 cursor-not-allowed"
                                )}
                              >
                                {editKeepAudio ? "Вкл" : "Выкл"}
                              </button>
                            </div>
                          ) : null}
                          <div className="text-[11px] text-white/45">
                            {selectedModel.name}
                            {duration ? `: ${duration}с` : ""}
                            {resolution ? ` • ${resolution}` : ""}
                            {quality ? ` • ${qualityLabel(quality)}` : ""}
                            {modelId === "wan"
                              ? soundPreset
                                ? ` • 🔊 ${soundPreset}`
                                : " • 🔇"
                              : variantSupportsAudio
                                ? audio
                                  ? " • 🔊"
                                  : " • 🔇"
                                : ""}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                    {/* Generate / Cancel buttons (pushed to bottom) */}
                    <div className="mt-auto pt-6">
                      {isStarting && activeJobLocalId ? (
                        <div className="flex gap-2">
                          <div className="flex-1 h-[60px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm text-white/70">
                            <Loader2 className="w-4 h-4 animate-spin text-[#CDFF00]" />
                            Генерация...
                          </div>
                          <button
                            type="button"
                            onClick={() => cancelGeneration(activeJobLocalId)}
                            className="h-[60px] px-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-medium text-sm transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={!canGenerate}
                          className={cn(
                            "w-full h-[60px] rounded-2xl font-extrabold text-base transition-all whitespace-nowrap flex items-center justify-center gap-2",
                            canGenerate
                              ? "bg-[#CDFF00] hover:bg-[#B8E600] text-black shadow-lg shadow-[#CDFF00]/25 ring-1 ring-[#CDFF00]/30 shadow-[0_0_40px_rgba(205,255,0,0.12)]"
                              : "bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed"
                          )}
                        >
                          {modelId === "kling-motion-control" || isCreateHiggs ? "Generate" : "Сгенерировать"}
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            {priceStars}
                          </span>
                        </button>
                      )}
                      <div className="mt-2 text-[11px] text-white/45">
                        {audio ? "Со звуком" : "Без звука"} • Стоимость зависит от качества
                      </div>
                    </div>
                </div>
              </div>

              {/* Center: Feed (primary) */}
              <div className="p-4 h-full overflow-y-auto min-h-0">
                {isCreateHiggs && tool === "create" && modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" ? (
                  <div className="relative h-full">
                    {/* Top controls: History | How it works | Fullscreen + menu */}
                    <div className="flex items-center justify-between gap-3 pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            document.getElementById("video-center-history-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          } catch {}
                        }}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-white transition-colors"
                      >
                        <Clock className="w-4 h-4 text-white/60" />
                        History
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/blog/sozdanie-video-ii-prompty-veo-kling-sora")}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-white/55" />
                        How it works
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("video-higgsfield-primary-preview");
                            const anyEl = el as any;
                            if (anyEl?.requestFullscreen) anyEl.requestFullscreen().catch(() => {});
                          }}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          title="Fullscreen"
                        >
                          <Maximize2 className="w-4 h-4 text-white/70" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.message("Menu coming soon")}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                          title="Menu"
                        >
                          <MoreHorizontal className="w-4 h-4 text-white/70" />
                        </button>
                      </div>
                    </div>

                    {/* Two main previews */}
                    <div className="pt-4 pb-24">
                      <div id="video-higgsfield-primary-preview" className="max-w-[490px] mx-auto">
                        <HiggsfieldVideoPreview
                          job={focusedJob}
                          size="primary"
                          onFocus={() => {
                            if (focusedJob?.localId) setFocusedJobId(focusedJob.localId);
                            setShowDetails(true);
                          }}
                        />
                      </div>

                      <div className="h-24" />

                      <div className="max-w-[280px] mx-auto">
                        <HiggsfieldVideoPreview
                          job={secondaryJob}
                          size="secondary"
                          onFocus={() => {
                            if (secondaryJob?.localId) setFocusedJobId(secondaryJob.localId);
                            setShowDetails(true);
                          }}
                        />
                      </div>
                    </div>

                    {/* Bottom-right view controls */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHistoryView("list")}
                        className={cn(
                          "inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors",
                          historyView === "list" ? "border-[#CDFF00]/40 text-[#CDFF00] bg-white/5" : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <List className="w-4 h-4" />
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryView("grid")}
                        className={cn(
                          "inline-flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-semibold transition-colors",
                          historyView === "grid" ? "border-[#CDFF00]/40 text-[#CDFF00] bg-white/5" : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        Grid
                      </button>
                    </div>

                    {/* Hidden anchor for History button */}
                    <div id="video-center-history-anchor" className="sr-only" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-white/70" />
                        <div className="text-sm font-semibold">Лента</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryView("list")}
                          className={cn(
                            "h-7 px-2 rounded-lg text-[11px] border",
                            historyView === "list" ? "border-[#CDFF00]/40 text-[#CDFF00]" : "border-white/10 text-white/60"
                          )}
                        >
                          Список
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryView("grid")}
                          className={cn(
                            "h-7 px-2 rounded-lg text-[11px] border",
                            historyView === "grid" ? "border-[#CDFF00]/40 text-[#CDFF00]" : "border-white/10 text-white/60"
                          )}
                        >
                          Сетка
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push("/library")}
                          className="text-xs text-[#CDFF00] hover:underline ml-2"
                        >
                          Библиотека
                        </button>
                      </div>
                    </div>

                    {/* Selected / top preview */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-xs text-white/45">
                          {focusedJob 
                            ? `${focusedJob.params.mode.toUpperCase()} • ${qualityLabel(focusedJob.params.quality)} • ${focusedJob.params.aspectRatio}${focusedJob.params.audio ? " • 🔊" : ""}` 
                            : `${mode.toUpperCase()} • ${aspectLabel(aspectRatio)}${audio ? " • 🔊" : ""}`}
                        </div>
                        {focusedJob ? (
                          <div className="inline-flex items-center gap-2">
                            <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-semibold", statusBadgeClass(focusedJob.status))}>
                              {statusLabel(focusedJob.status)}
                            </span>
                            <span className="text-[11px] text-white/35">{formatTime(focusedJob.createdAt)}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className={cn(
                        "rounded-2xl overflow-hidden border border-white/10 bg-black relative transition-all duration-300",
                        isPortraitAspect(focusedJob?.params?.aspectRatio ?? aspectRatio) && "max-w-[280px] mx-auto"
                      )}>
                        <div
                          className="w-full max-h-[60vh]"
                          style={{ aspectRatio: aspectToCss(focusedJob?.params?.aspectRatio ?? aspectRatio) }}
                        >
                          {focusedJob?.resultUrl && focusedJob.status === "success" ? (
                            <video
                              src={focusedJob.resultUrl}
                              controls
                              playsInline
                              className="w-full h-full object-contain bg-black"
                            />
                          ) : focusedJob && (focusedJob.status === "queued" || focusedJob.status === "processing") ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-black via-black to-[#111]">
                              <div className="text-center px-6">
                                <Loader2 className="w-8 h-8 text-[#CDFF00] animate-spin mx-auto" />
                                <div className="mt-3 text-sm text-white/80">
                                  {focusedJob.status === "queued" ? "В очереди…" : "Генерация…"}
                                </div>
                                <div className="mt-2 h-2 w-64 max-w-[70vw] rounded-full bg-white/10 overflow-hidden mx-auto">
                                  <div
                                    className={cn("h-full rounded-full transition-[width] duration-500", progressBarClass(focusedJob.status))}
                                    style={{ width: `${Math.max(5, Math.min(100, focusedJob.progress || 0))}%` }}
                                  />
                                </div>
                                <div className="mt-2 text-xs text-white/45">{Math.round(focusedJob.progress || 0)}%</div>
                              </div>
                            </div>
                          ) : focusedJob && (focusedJob.status === "failed" || focusedJob.status === "cancelled") ? (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                              <div className="text-center px-6">
                                <div className={cn("text-sm", focusedJob.status === "cancelled" ? "text-white/70" : "text-red-300")}>
                                  {focusedJob.status === "cancelled" ? "Генерация отменена" : "Ошибка генерации"}
                                </div>
                                <div className="mt-2 text-xs text-white/45">
                                  {focusedJob.error || (focusedJob.status === "cancelled" ? "Отменено пользователем" : "Неизвестная ошибка")}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startGeneration(focusedJob.params, focusedJob.localId)}
                                  className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Повторить
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                              {/* Ghost preview overlay (before first generation) */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-3 left-3 inline-flex items-center h-7 px-2.5 rounded-full border border-white/10 bg-black/40 text-[11px] text-white/70">
                                  {aspectLabel(aspectRatio)}
                                </div>
                                <div className="absolute inset-6 rounded-xl border border-dashed border-white/10" />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.02]" />
                              </div>
                              <div className="text-center px-6">
                                <Film className="w-8 h-8 text-white/40 mx-auto" />
                                <div className="mt-3 text-sm text-white/80">Видео появится здесь</div>
                                <div className="mt-1 text-xs text-white/45">
                                  Запусти генерацию — результат сохранится и в библиотеку.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {focusedJob?.status === "success" && focusedJob.resultUrl ? (
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                            <div className="pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => handleDownload(focusedJob.resultUrl!)}
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-[#CDFF00] text-black font-semibold text-sm hover:bg-[#B8E600] transition-colors"
                              >
                                Скачать
                              </button>
                            </div>
                            <div className="pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => router.push("/library")}
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                              >
                                Открыть в библиотеке
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Feed below */}
                    <div className="mt-4">
                      {visibleJobs.length === 0 ? (
                        <div className="text-xs text-white/45">
                          Здесь появятся ваши видео. Полная история — в библиотеке.
                        </div>
                      ) : (
                        <div className={cn(historyView === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3")}>
                          {visibleJobs.map((job) => {
                            const active = focusedJob?.localId === job.localId;
                            return (
                              <button
                                key={job.localId}
                                type="button"
                                onClick={() => {
                                  setFocusedJobId(job.localId);
                                  setShowDetails(true);
                                }}
                                className={cn(
                                  "w-full text-left rounded-2xl border bg-black/20 hover:bg-black/30 transition-colors overflow-hidden",
                                  active ? "border-[#CDFF00]/40 ring-1 ring-[#CDFF00]/20" : "border-white/10"
                                )}
                              >
                                <div className={cn("p-3", historyView === "list" && "flex items-start gap-3")}>
                                  <div
                                    className={cn(
                                      "rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center shrink-0",
                                      historyView === "grid" ? "w-full aspect-video" : "w-32 aspect-video"
                                    )}
                                  >
                                    {job.status === "success" && job.resultUrl ? (
                                      <video
                                        src={job.resultUrl}
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover"
                                        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.pause();
                                          e.currentTarget.currentTime = 0;
                                        }}
                                      />
                                    ) : job.status === "failed" ? (
                                      <X className="w-5 h-5 text-red-400" />
                                    ) : (
                                      <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                                    )}
                                  </div>

                                  <div className={cn("min-w-0", historyView === "list" ? "flex-1" : "mt-3")}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex items-center h-5 px-2 rounded-full border text-[11px] font-semibold",
                                          statusBadgeClass(job.status)
                                        )}
                                      >
                                        {statusLabel(job.status)}
                                      </span>
                                      <span className="text-[11px] text-white/35">{formatTime(job.createdAt)}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-white/85 line-clamp-3">{job.params.prompt}</div>
                                    <div className="mt-2 text-[11px] text-white/45">
                                      {job.params.mode.toUpperCase()}
                                      {job.params.duration ? ` • ${job.params.duration}с` : ""}
                                      {job.params.resolution ? ` • ${job.params.resolution}` : ""}
                                      {job.params.quality ? ` • ${qualityLabel(String(job.params.quality))}` : ""}
                                      {job.params.aspectRatio ? ` • ${aspectLabel(String(job.params.aspectRatio))}` : ""}
                                      {job.params.model === "wan"
                                        ? job.params.soundPreset
                                          ? ` • 🔊 ${job.params.soundPreset}`
                                          : " • 🔇"
                                        : job.params.audio
                                          ? " • 🔊"
                                          : ""}
                                    </div>

                                    {job.status === "queued" || job.status === "processing" ? (
                                      <div className="mt-3 space-y-2">
                                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                          <div
                                            className={cn("h-full rounded-full", progressBarClass(job.status))}
                                            style={{ width: `${Math.max(5, Math.min(100, job.progress || 0))}%` }}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            cancelGeneration(job.localId);
                                          }}
                                          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[11px]"
                                        >
                                          <X className="w-3 h-3" />
                                          Отменить
                                        </button>
                                      </div>
                                    ) : null}

                                    {job.status === "failed" ? (
                                      <div className="mt-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startGeneration(job.params, job.localId);
                                          }}
                                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[12px]"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                          Повторить
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>

              {/* Right: Details (secondary, collapsible) */}
              {showDetails && (
              <div className="p-4 h-full overflow-y-auto min-h-0">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="text-sm font-semibold">Детали</div>
                  <button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Скрыть панель"
                  >
                    <ChevronRight className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {!focusedJob ? (
                  <div className="pt-4 text-xs text-white/45">Выберите видео в ленте.</div>
                ) : (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90">
                          {(getModelById(focusedJob.params.model) as any)?.name || focusedJob.params.model}
                        </div>
                        <div className="mt-1 text-xs text-white/45">
                          {focusedJob.params.mode.toUpperCase()}
                          {focusedJob.params.duration ? ` • ${focusedJob.params.duration}с` : ""}
                          {focusedJob.params.resolution ? ` • ${focusedJob.params.resolution}` : ""}
                          {focusedJob.params.quality ? ` • ${qualityLabel(String(focusedJob.params.quality))}` : ""}
                          {focusedJob.params.aspectRatio ? ` • ${aspectLabel(String(focusedJob.params.aspectRatio))}` : ""}
                          {focusedJob.params.model === "wan"
                            ? focusedJob.params.soundPreset
                              ? ` • 🔊 ${focusedJob.params.soundPreset}`
                              : " • 🔇"
                            : focusedJob.params.audio
                              ? " • 🔊"
                              : ""}
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-semibold shrink-0", statusBadgeClass(focusedJob.status))}>
                        {statusLabel(focusedJob.status)}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] text-white/45">Промпт</div>
                      <div className="mt-1 text-sm text-white/85 whitespace-pre-wrap break-words">
                        {focusedJob.params.prompt}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="text-[11px] text-white/45">ID</div>
                        <div className="mt-1 text-xs text-white/80 break-all">{focusedJob.jobId || focusedJob.localId}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="text-[11px] text-white/45">Дата</div>
                        <div className="mt-1 text-xs text-white/80">{formatTime(focusedJob.createdAt)}</div>
                      </div>
                    </div>

                    {focusedJob.status === "failed" ? (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
                        <div className="text-[11px] text-red-200/80">Ошибка</div>
                        <div className="mt-1 text-xs text-red-100/90">{focusedJob.error || "Неизвестная ошибка"}</div>
                        <button
                          type="button"
                          onClick={() => startGeneration(focusedJob.params, focusedJob.localId)}
                          className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Повторить
                        </button>
                      </div>
                    ) : focusedJob.status === "cancelled" ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="text-[11px] text-white/60">Отменено</div>
                        <div className="mt-1 text-xs text-white/70">{focusedJob.error || "Отменено пользователем"}</div>
                        <button
                          type="button"
                          onClick={() => startGeneration(focusedJob.params, focusedJob.localId)}
                          className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Повторить
                        </button>
                      </div>
                    ) : null}

                    {focusedJob.status === "success" && focusedJob.resultUrl ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(focusedJob.resultUrl!)}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-[#CDFF00] text-black font-semibold text-sm hover:bg-[#B8E600] transition-colors"
                        >
                          Скачать видео
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push("/library")}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                        >
                          Открыть в библиотеке
                        </button>
                      </div>
                    ) : null}

                    {(focusedJob.status === "queued" || focusedJob.status === "processing") ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="text-[11px] text-white/45">Прогресс</div>
                        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", progressBarClass(focusedJob.status))}
                            style={{ width: `${Math.max(5, Math.min(100, focusedJob.progress || 0))}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-white/60">{Math.round(focusedJob.progress || 0)}%</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              )}

              {/* Toggle button to show Details when hidden */}
              {!showDetails && (
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 items-center justify-center w-8 h-16 rounded-l-xl bg-white/5 hover:bg-white/10 border border-white/10 border-r-0 transition-colors"
                  title="Показать детали"
                >
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar (mobile-first) - Higgsfield style */}
      <div
        className="fixed lg:hidden bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#18181B]/95 backdrop-blur-lg border border-[#27272A] rounded-2xl shadow-xl"
        style={{ width: "min(calc(100% - 1rem), 56rem)" }}
      >
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          {/* Mobile: simplified bar - Prompt + Settings + Generate */}
          <div className="sm:hidden flex items-end gap-3">
            {/* Prompt input */}
            <div className="flex-1 min-w-0">
              <PromptTextarea
                value={prompt}
                onChange={setPrompt}
                disabled={isStarting}
                placeholder={mode === "t2v" ? "Describe the scene..." : "Describe the motion..."}
                onSubmit={handleGenerate}
              />
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(true)}
              disabled={isStarting}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shrink-0",
                isStarting && "opacity-60 cursor-not-allowed"
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5 text-white/70" />
            </button>

            {/* Big circular Generate button */}
            {isStarting && activeJobLocalId ? (
              <button
                type="button"
                onClick={() => cancelGeneration(activeJobLocalId)}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500/40 transition-all shrink-0"
                title="Cancel"
              >
                <X className="w-6 h-6 text-red-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                title={!canGenerate ? "Fill required fields" : `Generate for ${priceStars} stars`}
                className={cn(
                  "flex items-center justify-center w-14 h-14 rounded-full font-bold transition-all shrink-0",
                  canGenerate
                    ? "bg-[#CDFF00] text-black shadow-lg shadow-[#CDFF00]/30 hover:bg-[#B8E600]"
                    : "bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed"
                )}
              >
                <Star className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Tablet/Desktop: full controls */}
          <div className="hidden sm:flex flex-col gap-3">
            {/* Prompt row */}
            <div className="flex items-end gap-3">
              <PromptTextarea
                value={prompt}
                onChange={setPrompt}
                disabled={isStarting}
                placeholder={mode === "t2v" ? "Опишите сцену и детали..." : "Опишите движение/анимацию..."}
                onSubmit={handleGenerate}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* Model badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                <Film className="w-4 h-4 text-[#CDFF00]" />
                <select
                  value={modelId}
                  onChange={(e) => {
                    const qs = new URLSearchParams(Array.from(searchParams.entries()));
                    qs.set("model", e.target.value);
                    router.replace(`/create/studio?${qs.toString()}`);
                  }}
                  disabled={isStarting}
                  className="bg-transparent text-sm font-medium text-white outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode toggle */}
              <ChipGroup
                label="Режим"
                value={mode}
                options={supportedModes.map((m) => ({
                  value: m,
                  label: m === "t2v" ? "T2V" : m === "i2v" ? "I2V" : m === "v2v" ? "V2V" : "Старт+Конец",
                }))}
                onChange={(v) => {
                  setMode(v as StudioMode);
                  if (v === "t2v") {
                    setStartFrame(null);
                    setEndFrame(null);
                  }
                  if (v !== "v2v") setV2vVideo(null);
                }}
                disabled={isStarting}
              />

              {/* Aspect */}
              <ChipGroup
                label="Формат"
                value={aspectRatio}
                options={aspectOptions.map((a) => ({ value: a, label: aspectLabel(a) }))}
                onChange={(v) => setAspectRatio(v as StudioAspect)}
                disabled={isStarting}
              />

              {/* Advanced */}
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                disabled={isStarting}
                className={cn(
                  "flex items-center justify-center h-9 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs text-white/70",
                  isStarting && "opacity-60 cursor-not-allowed"
                )}
              >
                Дополнительно
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Generate / Cancel */}
              {isStarting && activeJobLocalId ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70">
                    <Loader2 className="w-4 h-4 animate-spin text-[#CDFF00]" />
                    Генерация...
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelGeneration(activeJobLocalId)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-medium text-sm transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap min-w-[160px]",
                    canGenerate
                      ? "bg-[#CDFF00] hover:bg-[#B8E600] text-black shadow-lg shadow-[#CDFF00]/20"
                      : "bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed"
                  )}
                >
                  <Film className="w-4 h-4" />
                  <span>Сгенерировать</span>
                </button>
              )}
            </div>

            {/* Advanced panel */}
            {showAdvanced ? (
              <div className="pt-3 border-t border-[#27272A]">
                <div className="flex items-center gap-2 flex-wrap">
                  {durationOptions.length ? (
                    <ChipGroup
                      label="Длительность"
                      value={String(duration)}
                      options={durationOptions.map((d) => ({ value: String(d), label: `${d}с` }))}
                      onChange={(v) => setDuration(String(v))}
                      disabled={isStarting || !!selectedModel.fixedDuration}
                    />
                  ) : null}

                  {resolutionOptions.length ? (
                    <ChipGroup
                      label="Разрешение"
                      value={resolution || resolutionOptions[0]}
                      options={resolutionOptions.map((r) => ({ value: r, label: r }))}
                      onChange={(v) => setResolution(String(v))}
                      disabled={isStarting}
                    />
                  ) : null}

                  {qualityOptions.length ? (
                    <div className="space-y-1">
                      <div className="text-xs text-white/60">Качество</div>
                      <select
                        value={quality || qualityOptions[0]}
                        onChange={(e) => setQuality(e.target.value)}
                        disabled={isStarting}
                        className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#CDFF00]"
                      >
                        {qualityOptions.map((q) => (
                          <option key={q} value={q} className="bg-[#1a1a1a]">
                            {qualityLabel(q)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {selectedModel.id === "wan" ? (
                    <div className="space-y-1">
                      <div className="text-xs text-white/60">Звук</div>
                      <select
                        value={soundPreset}
                        onChange={(e) => setSoundPreset(e.target.value)}
                        disabled={isStarting}
                        className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#CDFF00]"
                      >
                        <option value="" className="bg-[#1a1a1a]">
                          Выкл
                        </option>
                        {wanSoundOptions.map((p) => (
                          <option key={p} value={p} className="bg-[#1a1a1a]">
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : variantSupportsAudio ? (
                    <ChipGroup
                      label="Звук"
                      value={audio ? "on" : "off"}
                      options={[
                        { value: "off", label: "Выкл" },
                        { value: "on", label: "Вкл" },
                      ]}
                      onChange={(v) => setAudio(v === "on")}
                      disabled={isStarting}
                    />
                  ) : null}
                </div>

                <div className="mt-3 space-y-1">
                  <div className="text-xs text-white/60">Негативный промпт (опционально)</div>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    disabled={isStarting}
                    placeholder="размытие, искажения, низкое качество..."
                    className="w-full min-h-[56px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#CDFF00] resize-none"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Settings Sheet */}
      {mobileSettingsOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSettingsOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] border-t border-[#27272A] rounded-t-3xl max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-[#27272A]">
              <h3 className="text-lg font-semibold text-white">Settings</h3>
              <button
                type="button"
                onClick={() => setMobileSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-5">
              {/* Model */}
              <div className="space-y-2">
                <div className="text-xs text-white/60 uppercase tracking-wider">Model</div>
                <select
                  value={modelId}
                  onChange={(e) => {
                    const qs = new URLSearchParams(Array.from(searchParams.entries()));
                    qs.set("model", e.target.value);
                    router.replace(`/create/studio?${qs.toString()}`);
                  }}
                  disabled={isStarting}
                  className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/10 text-base text-white focus:outline-none focus:border-[#CDFF00]"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode */}
              <div className="space-y-2">
                <div className="text-xs text-white/60 uppercase tracking-wider">Mode</div>
                <div className="flex gap-2">
                  {supportedModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m as StudioMode);
                        if (m === "t2v") {
                          setStartFrame(null);
                          setEndFrame(null);
                        }
                        if (m !== "v2v") setV2vVideo(null);
                      }}
                      disabled={isStarting}
                      className={cn(
                        "flex-1 h-11 rounded-xl border text-sm font-semibold transition-colors",
                        mode === m
                          ? "bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {m === "t2v" ? "T2V" : m === "i2v" ? "I2V" : m === "v2v" ? "V2V" : "Start+End"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <div className="text-xs text-white/60 uppercase tracking-wider">Ratio</div>
                <div className="flex gap-2 flex-wrap">
                  {aspectOptions.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAspectRatio(a as StudioAspect)}
                      disabled={isStarting}
                      className={cn(
                        "h-10 px-4 rounded-xl border text-sm font-semibold transition-colors",
                        aspectRatio === a
                          ? "bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {aspectLabel(a)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality / Resolution */}
              {resolutionOptions.length ? (
                <div className="space-y-2">
                  <div className="text-xs text-white/60 uppercase tracking-wider">Quality</div>
                  <div className="flex gap-2 flex-wrap">
                    {resolutionOptions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResolution(r)}
                        disabled={isStarting}
                        className={cn(
                          "h-10 px-4 rounded-xl border text-sm font-semibold transition-colors",
                          resolution === r
                            ? "bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]"
                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Duration */}
              {durationOptions.length ? (
                <div className="space-y-2">
                  <div className="text-xs text-white/60 uppercase tracking-wider">Duration</div>
                  <div className="flex gap-2 flex-wrap">
                    {durationOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        disabled={isStarting || !!selectedModel.fixedDuration}
                        className={cn(
                          "h-10 px-4 rounded-xl border text-sm font-semibold transition-colors",
                          String(duration) === String(d)
                            ? "bg-[#CDFF00]/15 border-[#CDFF00]/30 text-[#CDFF00]"
                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                        )}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Frame uploads - only when mode requires it */}
              {(mode === "i2v" || mode === "start_end") && modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" ? (
                <div className="space-y-3">
                  <div className="text-xs text-white/60 uppercase tracking-wider">Frames</div>
                  <div className="grid grid-cols-2 gap-3">
                    <FrameTile
                      kind="start"
                      title="Start frame"
                      subtitle="Optional"
                      required={false}
                      value={startFrame}
                      disabled={isStarting}
                      onFile={handleUpload}
                      onClear={() => setStartFrame(null)}
                    />
                    {supportedModes.includes("start_end") ? (
                      <FrameTile
                        kind="end"
                        title="End frame"
                        subtitle="Optional"
                        required={false}
                        value={endFrame}
                        disabled={isStarting}
                        onFile={handleUpload}
                        onClear={() => setEndFrame(null)}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* V2V reference video */}
              {mode === "v2v" && modelId !== "kling-motion-control" && modelId !== "kling-o1-edit" ? (
                <div className="space-y-3">
                  <div className="text-xs text-white/60 uppercase tracking-wider">Reference Video</div>
                  <RefVideoTile
                    title="Reference video"
                    subtitle="Required"
                    value={v2vVideo}
                    required
                    disabled={isStarting}
                    onFile={handleV2vUpload}
                    onClear={() => setV2vVideo(null)}
                  />
                </div>
              ) : null}

              {/* Audio toggle */}
              {variantSupportsAudio || selectedModel.id === "wan" ? (
                <div className="flex items-center justify-between py-3 border-t border-[#27272A]">
                  <div>
                    <div className="text-sm font-medium text-white">Audio</div>
                    <div className="text-xs text-white/50">Generate with sound</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudio((v) => !v)}
                    disabled={isStarting}
                    className={cn(
                      "h-9 px-4 rounded-full border text-xs font-semibold transition-colors",
                      audio
                        ? "bg-[#CDFF00] text-black border-[#CDFF00]"
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                    )}
                  >
                    {audio ? "On" : "Off"}
                  </button>
                </div>
              ) : null}

              {/* Cost summary */}
              <div className="pt-4 border-t border-[#27272A]">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/70">Cost</div>
                  <div className="flex items-center gap-2 text-lg font-bold text-[#CDFF00]">
                    <Star className="w-5 h-5" />
                    {priceStars}
                  </div>
                </div>
              </div>

              {/* Done button */}
              <button
                type="button"
                onClick={() => setMobileSettingsOpen(false)}
                className="w-full h-14 rounded-2xl bg-[#CDFF00] text-black font-bold text-base hover:bg-[#B8E600] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipGroup({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1 py-1 bg-white/5 border border-white/10 rounded-xl">
      <span className="hidden sm:inline text-[10px] text-white/40 px-1.5">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200",
            opt.value === value
              ? "bg-[#CDFF00] text-black shadow-sm shadow-[#CDFF00]/20 ring-1 ring-[#CDFF00]/30"
              : "bg-transparent text-white/60 hover:bg-white/10 hover:text-white",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FrameTile({
  kind,
  title,
  subtitle,
  value,
  required,
  disabled,
  onFile,
  onClear,
  error,
}: {
  kind: "start" | "end";
  title: string;
  subtitle: string;
  value: string | null;
  required: boolean;
  disabled?: boolean;
  onFile: (file: File, kind: "start" | "end") => Promise<void> | void;
  onClear: () => void;
  error?: string;
}) {
  const id = `video-frame-tile-${kind}`;
  const isSelected = !!value;

  return (
    <div className="relative min-w-[210px] flex-1">
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, kind);
          e.currentTarget.value = "";
        }}
      />

      <label
        htmlFor={id}
        className={cn(
          "group relative block rounded-3xl border border-dashed transition-colors cursor-pointer overflow-hidden",
          "min-h-[170px]",
          error && !isSelected
            ? "border-red-500/35 bg-white/5 hover:bg-white/7"
            : isSelected
              ? "border-[#CDFF00]/30 bg-white/6 hover:bg-white/7"
              : "border-white/10 bg-white/5 hover:bg-white/7",
          disabled && "opacity-60 cursor-not-allowed",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        )}
        title={value ? `${title}: загружено` : `${title}: загрузить`}
      >
        {/* subtle preview tint when selected */}
        {isSelected ? (
          <div className="absolute inset-0 opacity-[0.18]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value!} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : null}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
        ) : null}

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "inline-flex items-center justify-center w-11 h-11 rounded-full border",
                isSelected ? "bg-[#CDFF00]/10 border-[#CDFF00]/22" : "bg-white/5 border-white/10"
              )}
            >
              {isSelected ? (
                <IconCheck className="w-[18px] h-[18px] text-[#CDFF00]" />
              ) : (
                <IconPlus className="w-[18px] h-[18px] text-white/55" />
              )}
            </div>

            {isSelected && !disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/25 hover:bg-black/35 border border-white/10 transition-colors"
                title="Убрать"
              >
                <IconClose className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/20 border border-white/10">
                <IconImageAdd className="w-[16px] h-[16px] text-white/35" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-[15px] font-semibold text-white/90 leading-snug line-clamp-2">{title}</div>
            <div className="mt-2 text-sm text-white/45 leading-snug line-clamp-2">{subtitle}</div>
          </div>
        </div>
      </label>
    </div>
  );
}

function RefVideoTile({
  title,
  subtitle,
  value,
  required: _required,
  disabled,
  onFile,
  onClear,
}: {
  title: string;
  subtitle: string;
  value: string | null;
  required: boolean;
  disabled?: boolean;
  onFile: (file: File) => Promise<void> | void;
  onClear: () => void;
}) {
  const id = "video-v2v-ref-tile";
  const isSelected = !!value;

  return (
    <div className="relative min-w-[210px] flex-1">
      <input
        id={id}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/mov"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />

      <label
        htmlFor={id}
        className={cn(
          "group relative block rounded-3xl border border-dashed transition-colors cursor-pointer overflow-hidden",
          "min-h-[170px]",
          isSelected
            ? "border-[#CDFF00]/30 bg-white/6 hover:bg-white/7"
            : "border-white/10 bg-white/5 hover:bg-white/7",
          disabled && "opacity-60 cursor-not-allowed",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        )}
        title={value ? `${title}: загружено` : `${title}: загрузить`}
      >
        {isSelected ? (
          <div className="absolute inset-0 opacity-[0.14]">
            <video src={value!} muted playsInline className="w-full h-full object-cover" />
          </div>
        ) : null}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
        ) : null}

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "inline-flex items-center justify-center w-11 h-11 rounded-full border",
                isSelected ? "bg-[#CDFF00]/10 border-[#CDFF00]/22" : "bg-white/5 border-white/10"
              )}
            >
              {isSelected ? (
                <IconCheck className="w-[18px] h-[18px] text-[#CDFF00]" />
              ) : (
                <IconVideoCam className="w-[18px] h-[18px] text-white/55" />
              )}
            </div>

            {isSelected && !disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/25 hover:bg-black/35 border border-white/10 transition-colors"
                title="Убрать"
              >
                <IconClose className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/20 border border-white/10">
                <IconVideoCam className="w-[16px] h-[16px] text-white/35" />
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-[15px] font-semibold text-white/90 leading-snug line-clamp-2">{title}</div>
            <div className="mt-2 text-sm text-white/45 leading-snug line-clamp-2">{subtitle}</div>
          </div>
        </div>
      </label>
    </div>
  );
}

type UploadTileKind = "motion" | "character" | "editVideo" | "editImage";

function HiggsfieldVideoPreview({
  job,
  size,
  onFocus,
}: {
  job: VideoJobCard | null;
  size: "primary" | "secondary";
  onFocus: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const canPlay = !!job?.resultUrl && job.status === "success";
  const aspect = size === "primary" ? "490 / 280" : "280 / 310";

  return (
    <button
      type="button"
      onClick={() => {
        onFocus();
        if (!canPlay) return;
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) {
          v.pause();
          return;
        }
        v.play().catch(() => {});
      }}
      className={cn(
        "group relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black transition-colors",
        "hover:border-white/20 hover:bg-black/80",
        "cursor-pointer text-left"
      )}
      style={{ aspectRatio: aspect }}
      aria-label={canPlay ? "Play video" : "Video preview"}
    >
      {canPlay ? (
        <video
          ref={videoRef}
          src={job!.resultUrl!}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-black to-[#111]" />
      )}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/35 via-black/10 to-black/20" />

      {!isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/40 border border-white/15 flex items-center justify-center group-hover:bg-black/55 group-hover:border-white/25 transition-colors">
            <Play className="w-8 h-8 text-white fill-white translate-x-[1px]" />
          </div>
        </div>
      ) : null}
    </button>
  );
}

function UploadTile({
  kind,
  variant = "default",
  title,
  subtitle,
  value,
  required,
  accept,
  disabled,
  onFile,
  onClear,
}: {
  kind: UploadTileKind;
  variant?: "default" | "motion-control";
  title: string;
  subtitle: string;
  value: string | null;
  required: boolean;
  accept: string;
  disabled?: boolean;
  onFile: (file: File, kind: UploadTileKind) => Promise<void> | void;
  onClear: () => void;
}) {
  const id = `video-upload-tile-${kind}`;
  const isVideo = kind === "motion" || kind === "editVideo";
  const isSelected = !!value;
  const isMotionControlSquare = variant === "motion-control" && (kind === "motion" || kind === "character");

  return (
    <div className="relative">
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, kind);
          e.currentTarget.value = "";
        }}
      />

      <label
        htmlFor={id}
        className={cn(
          "group relative block transition-colors cursor-pointer overflow-hidden",
          isMotionControlSquare ? "rounded-2xl border aspect-square" : "rounded-3xl border border-dashed min-h-[170px]",
          isSelected ? "border-[#CDFF00]/35 bg-white/6 hover:bg-white/7" : "border-white/10 bg-white/5 hover:bg-white/7",
          disabled && "opacity-60 cursor-not-allowed",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        )}
      >
        {/* subtle preview tint when selected */}
        {isSelected ? (
          <div className="absolute inset-0 opacity-[0.14]">
            {isVideo ? (
              <video src={value!} muted playsInline className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value!} alt={title} className="w-full h-full object-cover" />
            )}
          </div>
        ) : null}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/45" />
        ) : null}

        <div className={cn("relative", isMotionControlSquare ? "p-4" : "p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "inline-flex items-center justify-center w-11 h-11 rounded-full border",
                isSelected ? "bg-[#CDFF00]/10 border-[#CDFF00]/22" : "bg-white/5 border-white/10"
              )}
            >
              {isSelected ? (
                <IconCheck className="w-[18px] h-[18px] text-[#CDFF00]" />
              ) : isVideo ? (
                <IconVideoCam className="w-[18px] h-[18px] text-white/55" />
              ) : (
                <IconImageAdd className="w-[18px] h-[18px] text-white/55" />
              )}
            </div>

            {isSelected && !disabled ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/25 hover:bg-black/35 border border-white/10 transition-colors"
                title="Убрать"
              >
                <IconClose className="w-4 h-4 text-white/70" />
              </button>
            ) : (
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/20 border border-white/10">
                {isVideo ? (
                  <IconVideoCam className="w-[16px] h-[16px] text-white/35" />
                ) : (
                  <IconImageAdd className="w-[16px] h-[16px] text-white/35" />
                )}
              </div>
            )}
          </div>

          <div className={cn(isMotionControlSquare ? "mt-5" : "mt-6")}>
            <div className={cn(isMotionControlSquare ? "text-[13px]" : "text-[15px]", "font-semibold text-white/90 leading-snug line-clamp-2")}>
              {title}
            </div>
            <div className={cn(isMotionControlSquare ? "mt-1 text-[12px]" : "mt-2 text-sm", "text-white/45 leading-snug line-clamp-2")}>
              {subtitle}
            </div>
          </div>
        </div>
      </label>
    </div>
  );
}

function PromptTextarea({
  value,
  onChange,
  disabled,
  placeholder,
  onSubmit,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;
    if (disabled) return;
    const t = window.setTimeout(() => {
      try {
        ref.current?.focus();
        const el = ref.current;
        if (el) {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } catch {}
    }, 50);
    return () => window.clearTimeout(t);
  }, [autoFocus, disabled]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder || "Опишите то, что хотите получить..."}
        disabled={disabled}
        rows={3}
        className={cn(
          "w-full px-4 py-3 pr-10 pb-8 rounded-xl resize-none overflow-hidden",
          "bg-white/5 text-white placeholder:text-white/40",
          "border border-white/10 focus:border-[#CDFF00] focus:outline-none",
          "transition-all duration-200",
          "min-h-[80px] max-h-[200px]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Промпт для генерации видео"
      />
      <Film className="absolute right-3 top-3 w-5 h-5 text-white/25 pointer-events-none" />
      {onSubmit ? (
        <div className="absolute bottom-2.5 right-3 text-[10px] text-white/35 pointer-events-none">
          Ctrl+Enter
        </div>
      ) : null}
    </div>
  );
}

