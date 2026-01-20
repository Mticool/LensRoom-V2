'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Download } from "lucide-react";

import { ImageGalleryMasonry } from "@/components/generator-v2/ImageGalleryMasonry";
import { ControlBarBottom } from "@/components/generator-v2/ControlBarBottom";
import { ThreadSidebar, type StudioThread } from "@/components/generator-v2/ThreadSidebar";
import { useAuth } from "@/components/generator-v2/hooks/useAuth";
import { useHistory } from "@/components/generator-v2/hooks/useHistory";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { GenerationResult, GenerationSettings } from "@/components/generator-v2/GeneratorV2";
import { getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { openExternal } from "@/lib/telegram/webview";

function buildSearchParams(
  base: ReadonlyURLSearchParams,
  patch: Record<string, string | null | undefined>
): string {
  const next = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

function qualityLabelFromApi(modelId: string, apiQuality?: string | null): string {
  const q = String(apiQuality || "").toLowerCase();
  if (modelId === "nano-banana-pro") {
    if (q === "4k") return "4K";
    // 1k_2k is the real pricing tier; we show user-friendly split (1K/2K)
    return "1K";
  }
  if (modelId === "grok-imagine") {
    if (q === "normal") return "Normal";
    if (q === "fun") return "Fun";
    if (q === "spicy") return "Spicy";
    return "Normal";
  }
  if (q === "turbo") return "Turbo";
  if (q === "balanced") return "Balanced";
  if (q === "quality") return "Quality";
  if (q === "fast") return "Fast";
  if (q === "ultra") return "Ultra";
  if (q === "medium") return "Standard";
  if (q === "high") return "Premium";
  if (q === "1k") return "1K";
  if (q === "2k") return "2K";
  if (q === "4k") return "4K";
  if (q === "8k") return "8K";
  return apiQuality || "";
}

function apiQualityFromLabel(modelId: string, label: string): string | undefined {
  const l = String(label || "").trim();
  if (!l) return undefined;

  if (modelId === "nano-banana-pro") {
    if (l === "4K") return "4k";
    // 1K and 2K are the same tier in pricing (1k_2k)
    if (l === "1K" || l === "2K") return "1k_2k";
  }
  if (modelId === "grok-imagine") {
    if (l === "Normal") return "normal";
    if (l === "Fun") return "fun";
    if (l === "Spicy") return "spicy";
    // allow raw values too
    const raw = l.toLowerCase();
    if (raw === "normal" || raw === "fun" || raw === "spicy") return raw;
    return "normal";
  }

  if (l === "Turbo") return "turbo";
  if (l === "Balanced") return "balanced";
  if (l === "Quality") return "quality";
  if (l === "Fast") return "fast";
  if (l === "Ultra") return "ultra";
  if (l === "Standard") return "medium";
  if (l === "Premium") return "high";
  if (l === "1K") return "1k";
  if (l === "2K") return "2k";
  if (l === "4K") return "4k";
  if (l === "8K") return "8k";

  // Fallback: allow raw api values if someone passes them
  return l.toLowerCase();
}

function getQualityOptionsForModel(modelId: string): string[] {
  const model = getModelById(modelId);
  if (!model || model.type !== "photo") return [];

  // Tool models
  if (modelId === "topaz-image-upscale") {
    return ["2K", "4K"];
  }
  if (modelId === "recraft-remove-background") {
    return ["Auto"];
  }

  if (modelId === "nano-banana-pro") {
    return ["1K", "2K", "4K"];
  }
  if (modelId === "grok-imagine") {
    return ["Normal", "Fun", "Spicy"];
  }

  const opts = (model.qualityOptions || []).map((q) => qualityLabelFromApi(modelId, q));
  // De-dup + keep order
  const uniq: string[] = [];
  for (const o of opts) if (o && !uniq.includes(o)) uniq.push(o);
  return uniq;
}

function settingsStorageKey(modelId: string) {
  return `lensroom_studio_settings_${modelId}`;
}

function normalizeAspect(value: string): string {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d+)\s*[:/]\s*(\d+)$/);
  if (!m) return raw;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return raw;
  return `${w}:${h}`;
}

function parseAspect(value: string | undefined | null): { w: number; h: number } {
  const normalized = normalizeAspect(String(value || ""));
  const m = normalized.match(/^(\d+)\s*:\s*(\d+)$/);
  if (!m) return { w: 1, h: 1 };
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return { w: 1, h: 1 };
  return { w, h };
}

function getViewerBox(size?: string | null): { width: number; height: number } {
  // Target sizing similar to reference:
  // - Portrait 9:16 ~500x900
  // - Other formats scale logically but never exceed 900 on any dimension
  const { w, h } = parseAspect(size);
  const maxW = 900;
  const maxH = 900;

  // Fit inside bounding box while preserving aspect ratio
  let width = Math.min(maxW, maxH * (w / h));
  let height = width * (h / w);
  if (height > maxH) {
    height = maxH;
    width = height * (w / h);
  }
  return { width: Math.round(width), height: Math.round(height) };
}

function isToolModelId(modelId: string): boolean {
  return modelId === "topaz-image-upscale" || modelId === "recraft-remove-background";
}

function defaultPromptForModel(modelId: string): string {
  if (modelId === "recraft-remove-background") return "Remove background, transparent PNG";
  if (modelId === "topaz-image-upscale") return "Upscale image, preserve details";
  return "";
}

export function StudioWorkspaces() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedModelId = (searchParams.get("model") || "nano-banana-pro").trim();
  const selectedThreadId = (searchParams.get("thread") || "").trim() || null;

  const model = getModelById(selectedModelId);
  const photoModel = model && model.type === "photo" ? model : null;
  const supportsI2i = !!photoModel?.supportsI2i;
  const isToolModel = isToolModelId(selectedModelId);

  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const loginPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [threads, setThreads] = useState<StudioThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadsLoaded, setThreadsLoaded] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState<number>(25);
  const [quantity, setQuantity] = useState<number>(1);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>(photoModel?.aspectRatios?.[0] || "1:1");
  const [qualityLabel, setQualityLabel] = useState<string>(() => {
    const opts = getQualityOptionsForModel(selectedModelId);
    return opts[0] || "Balanced";
  });

  // Local items for instant UX (pending + immediate replacement).
  const [localItems, setLocalItems] = useState<GenerationResult[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [isThreadsOpen, setIsThreadsOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<GenerationResult | null>(null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const { history, isLoading: historyLoading, refresh: refreshHistory, invalidateCache } = useHistory(
    "image",
    selectedModelId,
    selectedThreadId || undefined
  );

  const effectiveImages = useMemo(() => {
    // De-dup by id (local first)
    const map = new Map<string, GenerationResult>();
    for (const i of localItems) map.set(i.id, i);
    for (const h of history) if (!map.has(h.id)) map.set(h.id, h);
    return Array.from(map.values());
  }, [localItems, history]);

  const viewerList = useMemo(() => {
    return effectiveImages.filter(
      (i) => String(i?.status || "").toLowerCase() !== "pending" && String(i?.url || "").trim().length > 0
    );
  }, [effectiveImages]);

  const viewerIndex = useMemo(() => {
    if (!viewerImage) return -1;
    return viewerList.findIndex((i) => i.id === viewerImage.id);
  }, [viewerImage, viewerList]);

  const openViewerAt = useCallback(
    (idx: number) => {
      const next = viewerList[idx];
      if (next) setViewerImage(next);
    },
    [viewerList]
  );

  const goPrev = useCallback(() => {
    if (!viewerList.length) return;
    const idx = viewerIndex >= 0 ? viewerIndex : 0;
    const next = (idx - 1 + viewerList.length) % viewerList.length;
    openViewerAt(next);
  }, [viewerIndex, viewerList.length, openViewerAt]);

  const goNext = useCallback(() => {
    if (!viewerList.length) return;
    const idx = viewerIndex >= 0 ? viewerIndex : 0;
    const next = (idx + 1) % viewerList.length;
    openViewerAt(next);
  }, [viewerIndex, viewerList.length, openViewerAt]);

  useEffect(() => {
    if (!viewerImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewerImage(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerImage, goPrev, goNext]);

  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onViewerTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onViewerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      if (!start) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = Date.now() - start.t;
      // Horizontal swipe only
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      // Too slow = ignore
      if (dt > 1000) return;
      if (dx > 0) goPrev();
      else goNext();
    },
    [goPrev, goNext]
  );

  const handleViewerDownload = useCallback(async () => {
    const image = viewerImage;
    if (!image?.url) return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const mime = String(blob.type || "").toLowerCase();
      const preferred = String((image as any)?.settings?.outputFormat || "").toLowerCase();
      const ext =
        mime.includes("png") ? "png" :
        mime.includes("webp") ? "webp" :
        mime.includes("jpeg") || mime.includes("jpg") ? "jpg" :
        preferred === "webp" ? "webp" :
        preferred === "jpg" ? "jpg" :
        "png";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lensroom-${image.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Изображение скачано");
    } catch {
      toast.error("Ошибка при скачивании");
    }
  }, [viewerImage]);

  const handleViewerCopyLink = useCallback(async () => {
    const url = String(viewerImage?.url || "").trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }, [viewerImage]);

  const qualityOptions = useMemo(() => getQualityOptionsForModel(selectedModelId), [selectedModelId]);

  // Cost estimate (UI only; backend may differ for quotas/promos)
  const estimatedCost = useMemo(() => {
    if (!photoModel) return 0;
    if (isToolModel) {
      // Tool models: use qualityLabel as a UI option (e.g. Topaz 2x/4x) for pricing only
      const q = apiQualityFromLabel(selectedModelId, qualityLabel);
      const price = computePrice(selectedModelId, { variants: 1, quality: q as any });
      return price.stars;
    }
    const q = apiQualityFromLabel(selectedModelId, qualityLabel);
    const price = computePrice(selectedModelId, { variants: quantity, quality: q as any });
    return price.stars;
  }, [photoModel, selectedModelId, qualityLabel, quantity, isToolModel]);

  const updateLocalItem = useCallback((id: string, next: Partial<GenerationResult> | null) => {
    setLocalItems((prev) => {
      if (next === null) return prev.filter((p) => p.id !== id);
      return prev.map((p) => (p.id === id ? { ...p, ...next } : p));
    });
  }, []);

  const pollJob = useCallback(async (jobId: string, provider?: string) => {
    const encodedProvider = provider ? encodeURIComponent(provider) : "";
    for (let attempts = 0; attempts < 180; attempts++) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}?kind=image${encodedProvider ? `&provider=${encodedProvider}` : ""}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Не удалось проверить статус");
      const status = String(data?.status || "").toLowerCase();
      if (status === "completed" || status === "success") return data;
      if (status === "failed") throw new Error(data?.error || "Генерация не удалась");
    }
    throw new Error("Таймаут генерации");
  }, []);

  const generateOne = useCallback(
    async (
      pendingId: string,
      generationPrompt: string,
      settings: GenerationSettings,
      refImage: string | null,
      extraParams?: Record<string, unknown> | null
    ) => {
      const endpoint = "/api/generate/photo";
      const isTool = isToolModelId(String(settings.model || ""));
      // Determine mode based on inputs (tools require i2i)
      const generationMode = isTool ? "i2i" : refImage ? "i2i" : "t2i";

      const body: Record<string, unknown> = {
        prompt: generationPrompt || defaultPromptForModel(String(settings.model || "")),
        model: settings.model,
        aspectRatio: settings.size,
        negativePrompt: settings.negativePrompt,
        mode: generationMode,
        variants: 1, // one request = one image (quantity handled by loop)
        threadId: selectedThreadId,
      };

      if (settings.quality) body.quality = settings.quality;
      if (settings.outputFormat) body.outputFormat = settings.outputFormat;
      if (typeof settings.seed === "number") body.seed = settings.seed;
      if (typeof settings.steps === "number") body.steps = settings.steps;
      if (refImage) body.referenceImage = refImage;
      if (extraParams && Object.keys(extraParams).length > 0) body.params = extraParams;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || data?.message || "Ошибка генерации");

      const provider = String(data?.provider || "kie_market");
      const generationId = String(data?.generationId || data?.jobId || data?.id || "");
      const directUrl =
        (Array.isArray(data?.results) && data.results[0]?.url) ||
        data?.url ||
        data?.result?.url ||
        (Array.isArray(data?.result_urls) && data.result_urls[0]);

      if (data?.status === "completed" && directUrl) {
        updateLocalItem(pendingId, {
          id: generationId || pendingId,
          url: String(directUrl),
          status: "success",
          pendingId,
          timestamp: Date.now(),
        });
        return;
      }

      const jobId = String(data?.jobId || data?.id || "");
      if (!jobId) throw new Error("Нет jobId для отслеживания");

      const jobData = await pollJob(jobId, provider);
      const finalUrl = jobData?.results?.[0]?.url || jobData?.url;
      if (!finalUrl) throw new Error("Не удалось получить результат");

      updateLocalItem(pendingId, {
        id: generationId || jobId,
        url: String(finalUrl),
        status: "success",
        pendingId,
        timestamp: Date.now(),
      });
    },
    [pollJob, selectedThreadId, updateLocalItem]
  );

  // Load per-model saved settings on model change
  useEffect(() => {
    // Reset per-model state
    setPrompt("");
    setNegativePrompt("");
    setSeed(null);
    setSteps(25);
    setQuantity(1);
    setReferenceImage(null);
    setLocalItems([]);
    setThreadsLoaded(false);

    // Default options from config
    const m = getModelById(selectedModelId);
    if (m && m.type === "photo") {
      setAspectRatio(normalizeAspect(m.aspectRatios?.[0] || "1:1") || "1:1");
      const qOpts = getQualityOptionsForModel(selectedModelId);
      setQualityLabel(qOpts[0] || "Balanced");
    }

    // Restore from storage (best-effort)
    try {
      const raw = localStorage.getItem(settingsStorageKey(selectedModelId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.aspectRatio === "string") {
          const normalized = normalizeAspect(parsed.aspectRatio);
          setAspectRatio(normalized || "1:1");
        }
        if (typeof parsed?.qualityLabel === "string") setQualityLabel(parsed.qualityLabel);
        if (typeof parsed?.quantity === "number") setQuantity(parsed.quantity);
        if (typeof parsed?.negativePrompt === "string") setNegativePrompt(parsed.negativePrompt);
        if (typeof parsed?.seed === "number") setSeed(parsed.seed);
        if (typeof parsed?.steps === "number") setSteps(parsed.steps);
      }
    } catch {
      // ignore
    }

    // Enforce tool-model constraints (always i2i, 1/1, fixed aspect)
    if (isToolModelId(selectedModelId)) {
      setAspectRatio("1:1");
      setQuantity(1);
    }
  }, [selectedModelId]);

  // Persist per-model settings (no prompt/history)
  useEffect(() => {
    try {
      localStorage.setItem(
        settingsStorageKey(selectedModelId),
        JSON.stringify({
          aspectRatio,
          qualityLabel,
          quantity,
          negativePrompt,
          seed,
          steps,
        })
      );
    } catch {
      // ignore
    }
  }, [selectedModelId, aspectRatio, qualityLabel, quantity, negativePrompt, seed, steps]);

  const fetchThreads = useCallback(async (modelId: string) => {
    setThreadsLoading(true);
    try {
      const res = await fetch(`/api/studio/threads?model_id=${encodeURIComponent(modelId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load threads");
      setThreads(Array.isArray(data?.threads) ? data.threads : []);
      setThreadsError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      toast.error(msg);
      setThreads([]);
      setThreadsError(msg);
    } finally {
      setThreadsLoading(false);
      setThreadsLoaded(true);
    }
  }, []);

  const createThread = useCallback(async (modelId: string): Promise<StudioThread | null> => {
    try {
      const res = await fetch("/api/studio/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ modelId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create thread");
      return data.thread as StudioThread;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      toast.error(msg);
      return null;
    }
  }, []);

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      try {
        const res = await fetch("/api/studio/threads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ threadId, title }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Не удалось переименовать чат");
        const updated = data.thread as StudioThread;
        setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, title: updated.title } : t)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка";
        toast.error(msg);
        throw e;
      }
    },
    [setThreads]
  );

  const startTelegramLogin = useCallback(async () => {
    if (authLoading) return;
    if (isAuthenticated) return;

    try {
      const initResponse = await fetch("/api/auth/telegram/init", {
        method: "POST",
        credentials: "include",
      });
      const initData = await initResponse.json().catch(() => ({}));
      if (!initResponse.ok) {
        throw new Error(initData?.error || "Не удалось начать вход");
      }
      const code = String(initData?.code || "");
      const botLink = String(initData?.botLink || "");
      if (!code || !botLink) throw new Error("Некорректный ответ авторизации");

      // Try to open Telegram app (mobile) / Telegram desktop / web fallback
      openExternal(botLink);
      toast("Откройте Telegram и нажмите Start в боте", { duration: 5000 });

      if (loginPollRef.current) clearInterval(loginPollRef.current);
      let attempts = 0;
      const maxAttempts = 150; // ~5 min
      loginPollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          if (loginPollRef.current) clearInterval(loginPollRef.current);
          loginPollRef.current = null;
          toast.error("Время ожидания истекло. Попробуйте снова.");
          return;
        }
        try {
          const statusRes = await fetch(`/api/auth/telegram/status?code=${encodeURIComponent(code)}`, {
            credentials: "include",
          });
          if (!statusRes.ok) return;
          const data = await statusRes.json().catch(() => ({}));
          if (data?.status === "authenticated") {
            if (loginPollRef.current) clearInterval(loginPollRef.current);
            loginPollRef.current = null;
            toast.success("Вы успешно вошли!");
            setTimeout(() => window.location.reload(), 200);
          } else if (data?.status === "expired") {
            if (loginPollRef.current) clearInterval(loginPollRef.current);
            loginPollRef.current = null;
            toast.error("Код авторизации истёк. Попробуйте снова.");
          }
        } catch {
          // keep polling on transient errors
        }
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось открыть Telegram";
      toast.error(msg);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    return () => {
      if (loginPollRef.current) clearInterval(loginPollRef.current);
      loginPollRef.current = null;
    };
  }, []);

  // Ensure threads exist for model; ensure active thread is valid
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setThreads([]);
        setThreadsError(null);
        setThreadsLoaded(false);
        return;
      }
      await fetchThreads(selectedModelId);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, fetchThreads, isAuthenticated, authLoading]);

  useEffect(() => {
    // When threads list updates, ensure active thread exists or create one.
    (async () => {
      if (authLoading || !isAuthenticated) return;
      if (!threadsLoaded) return;
      if (threadsLoading) return;
      if (threadsError) return;
      if (!selectedThreadId || !threads.some((t) => t.id === selectedThreadId)) {
        if (threads.length > 0) {
          const nextThread = threads[0]!;
          router.replace(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, thread: nextThread.id })}`, {
            scroll: false,
          });
          return;
        }
        const created = await createThread(selectedModelId);
        if (created) {
          setThreads((prev) => [created, ...prev]);
          router.replace(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, thread: created.id })}`, {
            scroll: false,
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadsLoaded, threadsLoading, threadsError, threads, selectedThreadId, selectedModelId, isAuthenticated, authLoading]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      router.push(`/create/studio${buildSearchParams(searchParams, { model: modelId, thread: null })}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const handleSelectThread = useCallback(
    (threadId: string) => {
      router.push(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, thread: threadId })}`, {
        scroll: false,
      });
      setLocalItems([]); // isolate per thread (pending is thread-specific)
    },
    [router, searchParams, selectedModelId]
  );

  const handleCreateThread = useCallback(async () => {
    if (!isAuthenticated) {
      await startTelegramLogin();
      return;
    }
    const created = await createThread(selectedModelId);
    if (!created) return;
    setThreads((prev) => [created, ...prev]);
    router.push(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, thread: created.id })}`, {
      scroll: false,
    });
    setLocalItems([]);
  }, [createThread, selectedModelId, router, searchParams, isAuthenticated, startTelegramLogin]);

  const handleGenerate = useCallback(async () => {
    if (!photoModel) {
      toast.error("Модель недоступна");
      return;
    }
    if (!selectedThreadId) {
      toast.error("Чат не выбран");
      return;
    }
    if (!isAuthenticated) {
      await startTelegramLogin();
      return;
    }
    const tool = isToolModelId(selectedModelId);
    const normalizedPrompt = prompt.trim();
    if (!tool && !normalizedPrompt) {
      toast.error("Введите промпт");
      return;
    }
    if (tool && !supportsI2i) {
      toast.error("Эта модель требует загрузки изображения");
      return;
    }
    if (tool && !referenceImage) {
      toast.error("Загрузите изображение");
      return;
    }

    const apiQuality = apiQualityFromLabel(selectedModelId, qualityLabel);
    const settings: GenerationSettings = {
      model: selectedModelId,
      size: tool ? "1:1" : normalizeAspect(aspectRatio) || aspectRatio,
      // Tool models pass their settings via `params`, not `quality`.
      quality: tool ? undefined : apiQuality,
      variants: 1,
      negativePrompt: negativePrompt || undefined,
      seed: seed ?? undefined,
      steps: steps ?? undefined,
    };

    // Ensure i2i is only used when supported
    const ref = supportsI2i ? referenceImage : null;

    const generationPrompt = tool ? (normalizedPrompt || defaultPromptForModel(selectedModelId)) : normalizedPrompt;
    const n = tool ? 1 : Math.max(1, Math.min(4, Number(quantity) || 1));
    const extraParams: Record<string, unknown> | null =
      selectedModelId === "topaz-image-upscale"
        ? { scale: apiQualityFromLabel(selectedModelId, qualityLabel) }
        : null;

    // Create N pending placeholders in order (left-to-right for grid)
    const batchId = Date.now();
    const pendingBatch: GenerationResult[] = Array.from({ length: n }).map((_, i) => ({
      id: `pending_${batchId}_${i}`,
      url: "",
      prompt: generationPrompt,
      mode: "image",
      settings,
      timestamp: batchId + i,
      status: "pending",
    }));
    setLocalItems((prev) => [...pendingBatch, ...prev]);

    setIsGeneratingBatch(true);
    try {
      // Run in parallel (up to 4) while preserving placeholder order in UI
      await Promise.allSettled(
        pendingBatch.map(async (p) => {
          try {
            await generateOne(p.id, generationPrompt, settings, ref, extraParams);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Ошибка генерации";
            updateLocalItem(p.id, null);
            toast.error(msg);
          }
        })
      );

      invalidateCache();
      refreshHistory();
      await refreshCredits();
    } finally {
      setIsGeneratingBatch(false);
    }
  }, [
    photoModel,
    selectedThreadId,
    isAuthenticated,
    prompt,
    selectedModelId,
    qualityLabel,
    aspectRatio,
    quantity,
    negativePrompt,
    seed,
    steps,
    supportsI2i,
    referenceImage,
    generateOne,
    startTelegramLogin,
    invalidateCache,
    refreshHistory,
    refreshCredits,
    updateLocalItem,
  ]);

  const handleImageClick = useCallback((image: GenerationResult) => {
    if (!image) return;
    if (String(image.status || "").toLowerCase() === "pending") return;
    const url = String(image.url || "").trim();
    if (!url) return;
    setViewerImage(image);
  }, []);

  if (!photoModel) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-white flex items-center justify-center">
        <div className="text-[#A1A1AA]">Выберите фото‑модель</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white flex">
      <ThreadSidebar
        open={isThreadsOpen}
        onOpenChange={setIsThreadsOpen}
        selectedModelId={selectedModelId}
        onModelChange={handleModelChange}
        modelName={photoModel.name}
        threads={threads}
        activeThreadId={selectedThreadId}
        isLoading={threadsLoading}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
        onRenameThread={renameThread}
      />

      <div className="flex-1 flex flex-col pb-44 sm:pb-40">
        {/* Gallery */}
        <ImageGalleryMasonry
          images={effectiveImages}
          isGenerating={false}
          layout="grid"
          onImageClick={handleImageClick}
          emptyTitle={isToolModel ? "Загрузите фото" : undefined}
          emptyDescription={
            isToolModel ? 'Нажмите «+» внизу и загрузите изображение для обработки' : undefined
          }
        />

        {/* Bottom control bar */}
        <ControlBarBottom
          prompt={prompt}
          onPromptChange={setPrompt}
          aspectRatio={aspectRatio}
          onAspectRatioChange={(v) => setAspectRatio(normalizeAspect(v) || "1:1")}
          quality={qualityLabel}
          onQualityChange={setQualityLabel}
          quantity={isToolModel ? 1 : quantity}
          onQuantityChange={isToolModel ? () => setQuantity(1) : setQuantity}
          onGenerate={handleGenerate}
          isGenerating={isGeneratingBatch}
          disabled={false}
          isAuthenticated={isAuthenticated}
          onRequireAuth={startTelegramLogin}
          credits={authCredits}
          estimatedCost={estimatedCost}
          modelId={selectedModelId}
          qualityOptions={isToolModel ? qualityOptions : qualityOptions}
          aspectRatioOptions={isToolModel ? ["1:1"] : photoModel.aspectRatios}
          referenceImage={supportsI2i ? referenceImage : null}
          onReferenceImageChange={supportsI2i ? setReferenceImage : undefined}
          negativePrompt={negativePrompt}
          onNegativePromptChange={setNegativePrompt}
          seed={seed}
          onSeedChange={setSeed}
          steps={steps}
          onStepsChange={setSteps}
          supportsI2i={supportsI2i}
        />

        {/* Lightbox viewer */}
        <Dialog
          open={!!viewerImage}
          onOpenChange={(open) => {
            if (!open) setViewerImage(null);
          }}
        >
          <DialogContent className="max-w-none w-auto p-0 gap-0 border-0 bg-transparent shadow-none">
            <div
              className="relative flex items-center justify-center"
              onTouchStart={onViewerTouchStart}
              onTouchEnd={onViewerTouchEnd}
              style={{
                width: `min(calc(100vw - 1rem), ${getViewerBox(viewerImage?.settings?.size).width}px)`,
                height: `min(calc(100vh - 5rem), ${getViewerBox(viewerImage?.settings?.size).height}px)`,
              }}
            >
              {/* Image */}
              {viewerImage?.url ? (
                <img
                  src={viewerImage.url}
                  alt={viewerImage.prompt || "Generated image"}
                  className="max-w-full max-h-full object-contain rounded-xl select-none"
                  draggable={false}
                />
              ) : null}

              {/* Quick actions (avoid DialogContent built-in close button at top-right) */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleViewerCopyLink}
                  className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 text-white hover:bg-black/75 border border-white/10"
                  title="Копировать ссылку"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleViewerDownload}
                  className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 text-white hover:bg-black/75 border border-white/10"
                  title="Скачать"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Prev/Next */}
              {viewerList.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10"
                    title="Предыдущее"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10"
                    title="Следующее"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

