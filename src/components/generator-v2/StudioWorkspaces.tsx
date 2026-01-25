'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, Download, Heart, RotateCcw, Share2, ImagePlus } from "lucide-react";

import { ImageGalleryMasonry } from "@/components/generator-v2/ImageGalleryMasonry";
import { ControlBarBottom } from "@/components/generator-v2/ControlBarBottom";
import { GeneratorBottomSheet } from "@/components/generator-v2/GeneratorBottomSheet";
import { ThreadSidebar, type StudioThread } from "@/components/generator-v2/ThreadSidebar";
import { useAuth } from "@/components/generator-v2/hooks/useAuth";
import { useHistory } from "@/components/generator-v2/hooks/useHistory";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { GenerationResult, GenerationSettings } from "@/components/generator-v2/GeneratorV2";
import { getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { openExternal } from "@/lib/telegram/webview";
import { useFavoritesStore } from "@/stores/favorites-store";

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

function extractGenerationUuid(rawId: string | undefined | null): string | null {
  const id = String(rawId || "").trim();
  if (!id) return null;
  // Accept `uuid` or `uuid-0` (we suffix multi-output results for uniqueness).
  const m = id.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[-_]\d+)?$/i
  );
  return m ? m[1] : null;
}

function qualityLabelFromApi(modelId: string, apiQuality?: string | null): string {
  const q = String(apiQuality || "").toLowerCase();
  if (modelId === "nano-banana-pro") {
    if (q === "4k") return "4K";
    // 1k_2k is the real pricing tier; we show user-friendly split (1K/2K)
    return "1K";
  }
  if (modelId === "seedream-4.5") {
    if (q === "basic") return "Basic";
    if (q === "high") return "High";
    // Backward compatibility (older stored values)
    if (q === "turbo" || q === "balanced") return "Basic";
    if (q === "quality" || q === "ultra") return "High";
    return "Basic";
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
  if (modelId === "seedream-4.5") {
    if (l === "High") return "high";
    if (l === "Basic") return "basic";
    const raw = l.toLowerCase();
    if (raw === "high" || raw === "basic") return raw;
    // Legacy labels
    if (l === "Turbo" || l === "Balanced") return "basic";
    if (l === "Quality" || l === "Ultra") return "high";
    return "basic";
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
  // Accept common shorthands: "9:16", "9/16", "9.16", "9x16", "9×16"
  const m = raw.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
  if (!m) return raw;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return raw;
  return `${w}:${h}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
  // New: `project` is the canonical query param.
  // Backward-compat: accept legacy `thread`.
  const selectedThreadId =
    (searchParams.get("project") || searchParams.get("thread") || "").trim() || null;

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
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
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
  const [activeRunKey, setActiveRunKey] = useState<string | null>(null);
  const [activeRunIndex, setActiveRunIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const { toggleFavorite, isFavorite: isFavoriteId, fetchFavorites, _hasHydrated } = useFavoritesStore();

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const { 
    history, 
    isLoading: historyLoading, 
    isLoadingMore,
    hasMore,
    loadMore,
    refresh: refreshHistory, 
    invalidateCache 
  } = useHistory(
    "image",
    selectedModelId,
    selectedThreadId || undefined
  );

  const effectiveImages = useMemo(() => {
    // De-dup by id (keep history order first, then append new local items).
    // This ensures:
    // - history stays at top
    // - newly generated/pending items appear at the bottom
    const map = new Map<string, GenerationResult>();
    for (const h of history) map.set(h.id, h);
    for (const i of localItems) map.set(i.id, i); // override if same id, append if new
    return Array.from(map.values());
  }, [localItems, history]);

  const viewerList = useMemo(() => {
    return effectiveImages.filter(
      (i) => String(i?.status || "").toLowerCase() !== "pending" && String(i?.url || "").trim().length > 0
    );
  }, [effectiveImages]);

  const getRunKey = useCallback((img: GenerationResult | null | undefined): string | null => {
    if (!img) return null;
    if (typeof (img as any).runId === "string" && String((img as any).runId).trim()) return String((img as any).runId).trim();
    // Fallback: treat single-image generations as their own “run”
    return extractGenerationUuid(img.id) || img.id;
  }, []);

  const activeRunImages = useMemo(() => {
    const key = activeRunKey;
    if (!key) return [];
    return viewerList.filter((img) => getRunKey(img) === key);
  }, [viewerList, activeRunKey, getRunKey]);

  const activeMobileImage = useMemo(() => {
    if (activeRunImages.length) {
      const idx = clamp(activeRunIndex, 0, activeRunImages.length - 1);
      return activeRunImages[idx] || null;
    }
    // fallback: last available
    return viewerList.length ? viewerList[viewerList.length - 1]! : null;
  }, [activeRunImages, activeRunIndex, viewerList]);

  // Keep active run key in sync when new results arrive.
  useEffect(() => {
    if (!viewerList.length) return;
    // If current key exists and still has images, keep it.
    if (activeRunKey && viewerList.some((img) => getRunKey(img) === activeRunKey)) return;
    const last = viewerList[viewerList.length - 1]!;
    const nextKey = getRunKey(last);
    if (nextKey) {
      setActiveRunKey(nextKey);
      setActiveRunIndex(0);
    }
  }, [viewerList, activeRunKey, getRunKey]);

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
      const isDemo = String(image.id || "").startsWith("demo-");
      const genId = extractGenerationUuid(image.id);
      const downloadUrl = !isDemo && genId
        ? `/api/generations/${encodeURIComponent(genId)}/download?kind=original`
        : image.url;
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) throw new Error("download_failed");
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
      try {
        window.open(image.url, "_blank");
      } catch {}
      toast.error("Ошибка при скачивании");
    }
  }, [viewerImage]);

  const downloadImage = useCallback(async (image: GenerationResult | null) => {
    if (!image?.url) return;
    try {
      const isDemo = String(image.id || "").startsWith("demo-");
      const genId = extractGenerationUuid(image.id);
      const downloadUrl = !isDemo && genId
        ? `/api/generations/${encodeURIComponent(genId)}/download?kind=original`
        : image.url;
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) throw new Error("download_failed");
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
      try {
        window.open(image.url, "_blank");
      } catch {}
      toast.error("Ошибка при скачивании");
    }
  }, []);

  const toggleFavoriteForImage = useCallback(async (image: GenerationResult | null) => {
    if (!image?.id) return;
    if (String(image.id).startsWith("demo-") || String(image.id).startsWith("pending_")) return;
    try {
      await toggleFavorite(image.id);
    } catch {
      toast.error("Не удалось сохранить");
    }
  }, [toggleFavorite]);

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

  // Load favorites once (best-effort, when hydrated)
  useEffect(() => {
    if (!_hasHydrated) return;
    fetchFavorites().catch(() => {});
  }, [_hasHydrated, fetchFavorites]);

  const handleViewerShare = useCallback(async () => {
    const image = viewerImage;
    if (!image?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "LensRoom",
          text: image.prompt || "",
          url: image.url,
        });
        return;
      } catch {
        // ignore
      }
    }
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }, [viewerImage]);

  const handleViewerToggleFavorite = useCallback(async () => {
    const image = viewerImage;
    if (!image?.id) return;
    const currently = isFavoriteId(image.id);
    try {
      await toggleFavorite(image.id);
      toast.success(currently ? "Удалено из избранного" : "Добавлено в избранное");
    } catch {
      toast.error("Не удалось сохранить");
    }
  }, [viewerImage, toggleFavorite, isFavoriteId]);

  const readBlobAsDataUrl = useCallback(async (blob: Blob): Promise<string> => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
  }, []);

  const fetchGenerationAsDataUrl = useCallback(
    async (image: GenerationResult): Promise<string> => {
      const isDemo = String(image.id || "").startsWith("demo-");
      const genId = extractGenerationUuid(image.id);
      const url = !isDemo && genId
        ? `/api/generations/${encodeURIComponent(genId)}/download?kind=original&proxy=1`
        : image.url;
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) throw new Error("download_failed");
      const blob = await resp.blob();
      return await readBlobAsDataUrl(blob);
    },
    [readBlobAsDataUrl]
  );

  const handleUseAsReferenceFromGallery = useCallback(
    async (image: GenerationResult) => {
      if (!image?.url) return;
      if (!supportsI2i) {
        toast.error("Эта модель не поддерживает референс");
        return;
      }
      try {
        const dataUrl = await fetchGenerationAsDataUrl(image);
        setReferenceImages([dataUrl]);
        setPrompt(String(image.prompt || ""));
        if (typeof image.settings?.size === "string") setAspectRatio(normalizeAspect(image.settings.size) || "1:1");
        toast.success("Фото добавлено как референс");
      } catch {
        toast.error("Не удалось загрузить референс");
      }
    },
    [supportsI2i, fetchGenerationAsDataUrl]
  );

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
    // Grok Imagine returns 6 images per single run; price is per run, not per image.
    const priceVariants = selectedModelId === "grok-imagine" ? 1 : quantity;
    const price = computePrice(selectedModelId, { variants: priceVariants, quality: q as any });
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
      refImages: string[],
      extraParams?: Record<string, unknown> | null
    ) => {
      const endpoint = "/api/generate/photo";
      const isTool = isToolModelId(String(settings.model || ""));
      // Determine mode based on inputs (tools require i2i)
      const generationMode = isTool ? "i2i" : (refImages && refImages.length > 0) ? "i2i" : "t2i";

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
      if (refImages && refImages.length > 0) body.referenceImages = refImages;
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
    setQuantity(selectedModelId === "grok-imagine" ? 6 : 1);
    setReferenceImages([]);
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

  const fetchThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch(`/api/studio/threads`, {
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

  const createThread = useCallback(async (): Promise<StudioThread | null> => {
    try {
      const res = await fetch("/api/studio/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
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

  const startSingleGeneration = useCallback(
    async (generationPrompt: string, settings: GenerationSettings, refDataUrl: string | null) => {
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

      const batchId = Date.now();
      const runKey = `run_${batchId}`;
      const pending: GenerationResult = {
        id: `pending_${batchId}_0`,
        url: "",
        prompt: generationPrompt,
        mode: "image",
        settings,
        timestamp: batchId,
        status: "pending",
        runId: runKey,
      };
      setLocalItems((prev) => [...prev, pending]);
      setActiveRunKey(runKey);
      setActiveRunIndex(0);

      try {
        await generateOne(pending.id, generationPrompt, settings, refDataUrl ? [refDataUrl] : [], null);
        invalidateCache();
        refreshHistory();
        await refreshCredits();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка генерации";
        updateLocalItem(pending.id, null);
        toast.error(msg);
      }
    },
    [
      photoModel,
      selectedThreadId,
      isAuthenticated,
      startTelegramLogin,
      generateOne,
      invalidateCache,
      refreshHistory,
      refreshCredits,
      updateLocalItem,
    ]
  );

  const handleViewerRecreate = useCallback(async () => {
    const image = viewerImage;
    if (!image) return;
    const modelId = String(image.settings?.model || selectedModelId);
    const tool = isToolModelId(modelId);
    if (tool) {
      toast.error("Для этой модели нужен референс (i2i)");
      return;
    }
    const generationPrompt = String(image.prompt || "").trim();
    if (!generationPrompt) {
      toast.error("Промпт пустой");
      return;
    }

    // Prefill bottom bar for user clarity
    setPrompt(generationPrompt);
    if (typeof image.settings?.negativePrompt === "string") setNegativePrompt(image.settings.negativePrompt);
    if (typeof image.settings?.size === "string") setAspectRatio(normalizeAspect(image.settings.size) || "1:1");
    if (typeof image.settings?.quality === "string") {
      setQualityLabel(qualityLabelFromApi(modelId, image.settings.quality));
    }

    const settings: GenerationSettings = {
      ...image.settings,
      model: modelId,
      size: normalizeAspect(String(image.settings?.size || aspectRatio)) || String(image.settings?.size || aspectRatio),
      variants: 1,
    };

    await startSingleGeneration(generationPrompt, settings, null);
  }, [viewerImage, selectedModelId, aspectRatio, startSingleGeneration]);

  const handleViewerUseAsReference = useCallback(async () => {
    const image = viewerImage;
    if (!image?.url) return;
    if (!supportsI2i) {
      toast.error("Эта модель не поддерживает референс");
      return;
    }
    try {
      const dataUrl = await fetchGenerationAsDataUrl(image);
      setReferenceImages([dataUrl]);
      setPrompt(String(image.prompt || ""));
      if (typeof image.settings?.size === "string") setAspectRatio(normalizeAspect(image.settings.size) || "1:1");
      toast.success("Фото добавлено как референс");
    } catch {
      toast.error("Не удалось загрузить референс");
    }
  }, [viewerImage, supportsI2i, fetchGenerationAsDataUrl]);

  // Ensure threads exist for user; ensure active project is valid
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
      await fetchThreads();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchThreads, isAuthenticated, authLoading]);

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
          router.replace(
            `/create/studio${buildSearchParams(searchParams, { model: selectedModelId, project: nextThread.id, thread: null })}`,
            {
            scroll: false,
            }
          );
          return;
        }
        const created = await createThread();
        if (created) {
          setThreads((prev) => [created, ...prev]);
          router.replace(
            `/create/studio${buildSearchParams(searchParams, { model: selectedModelId, project: created.id, thread: null })}`,
            {
            scroll: false,
            }
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadsLoaded, threadsLoading, threadsError, threads, selectedThreadId, selectedModelId, isAuthenticated, authLoading]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      // Model change must NOT create a new project. Keep `project` if present.
      router.push(`/create/studio${buildSearchParams(searchParams, { model: modelId })}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  const handleSelectThread = useCallback(
    (threadId: string) => {
      router.push(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, project: threadId, thread: null })}`, {
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
    const created = await createThread();
    if (!created) return;
    setThreads((prev) => [created, ...prev]);
    router.push(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, project: created.id, thread: null })}`, {
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
    if (tool && referenceImages.length === 0) {
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
    const ref = supportsI2i ? referenceImages : [];

    const generationPrompt = tool ? (normalizedPrompt || defaultPromptForModel(selectedModelId)) : normalizedPrompt;
    const grokOutputs = selectedModelId === "grok-imagine" ? 6 : null;
    const n = tool ? 1 : grokOutputs ? grokOutputs : Math.max(1, Math.min(4, Number(quantity) || 1));
    const extraParams: Record<string, unknown> | null =
      selectedModelId === "topaz-image-upscale"
        ? { scale: apiQualityFromLabel(selectedModelId, qualityLabel) }
        : null;

    // Create N pending placeholders in order (left-to-right for grid)
    const batchId = Date.now();
    const runKey = `run_${batchId}`;
    const pendingBatch: GenerationResult[] = Array.from({ length: n }).map((_, i) => ({
      id: `pending_${batchId}_${i}`,
      url: "",
      prompt: generationPrompt,
      mode: "image",
      settings,
      timestamp: batchId + i,
      status: "pending",
      runId: runKey,
    }));
    // Add pending items at the end (bottom of gallery)
    setLocalItems((prev) => [...prev, ...pendingBatch]);
    setActiveRunKey(runKey);
    setActiveRunIndex(0);

    setIsGeneratingBatch(true);
    try {
      // Grok Imagine: single run returns 6 images, so do ONE request and fan-out results.
      if (selectedModelId === "grok-imagine" && !tool) {
        const pendingIds = pendingBatch.map((p) => p.id);
        const endpoint = "/api/generate/photo";
        const body: Record<string, unknown> = {
          prompt: generationPrompt,
          model: settings.model,
          aspectRatio: settings.size,
          negativePrompt: settings.negativePrompt,
          mode: "t2i",
          variants: 1, // price is per run; Grok returns multiple outputs by default
          threadId: selectedThreadId,
        };
        if (settings.quality) body.quality = settings.quality;
        if (settings.outputFormat) body.outputFormat = settings.outputFormat;
        if (typeof settings.seed === "number") body.seed = settings.seed;
        if (typeof settings.steps === "number") body.steps = settings.steps;
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
        const generationId = String(data?.generationId || "");
        const jobId = String(data?.jobId || data?.id || "");
        if (!jobId) throw new Error("Нет jobId для отслеживания");

        const jobData = await pollJob(jobId, provider);
        const urls: string[] = Array.isArray(jobData?.results)
          ? jobData.results.map((r: any) => String(r?.url || "")).filter((u: string) => !!u)
          : [];
        if (!urls.length) throw new Error("Не удалось получить результат");

        const limited = urls.slice(0, n);
        for (let i = 0; i < pendingIds.length; i++) {
          const url = limited[i];
          if (!url) {
            updateLocalItem(pendingIds[i]!, null);
            continue;
          }
          updateLocalItem(pendingIds[i]!, {
            id: `${generationId || jobId}-${i}`,
            url,
            status: "success",
            pendingId: pendingIds[i],
            timestamp: Date.now(),
          });
        }

        invalidateCache();
        refreshHistory();
        await refreshCredits();
        return;
      }

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
    referenceImages,
    generateOne,
    startTelegramLogin,
    invalidateCache,
    refreshHistory,
    refreshCredits,
    updateLocalItem,
  ]);

  const mobilePrev = useCallback(() => {
    const list = activeRunImages;
    if (!list.length) return;
    setActiveRunIndex((i) => (i - 1 + list.length) % list.length);
  }, [activeRunImages]);

  const mobileNext = useCallback(() => {
    const list = activeRunImages;
    if (!list.length) return;
    setActiveRunIndex((i) => (i + 1) % list.length);
  }, [activeRunImages]);

  const mobileCopyLink = useCallback(async () => {
    const url = String(activeMobileImage?.url || "").trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }, [activeMobileImage]);

  const mobileShare = useCallback(async () => {
    const image = activeMobileImage;
    if (!image?.url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "LensRoom",
          text: image.prompt || "",
          url: image.url,
        });
      } else {
        await navigator.clipboard.writeText(image.url);
        toast.success("Ссылка скопирована");
      }
    } catch {
      // ignore cancel
    }
  }, [activeMobileImage]);

  const mobileRegenerate = useCallback(() => {
    const image = activeMobileImage;
    if (!image) return;
    const p = String(image.prompt || "").trim();
    if (p) setPrompt(p);
    if (typeof image.settings?.negativePrompt === "string") setNegativePrompt(image.settings.negativePrompt);
    if (typeof image.settings?.size === "string") setAspectRatio(normalizeAspect(image.settings.size) || "1:1");
    if (typeof image.settings?.quality === "string") {
      setQualityLabel(qualityLabelFromApi(String(image.settings?.model || selectedModelId), image.settings.quality));
    }
    toast("Промпт подставлен. Нажмите «Сгенерировать».", { duration: 3000 });
  }, [activeMobileImage, selectedModelId]);

  const mobileUseAsReference = useCallback(async () => {
    const image = activeMobileImage;
    if (!image?.url) return;
    if (!supportsI2i) {
      toast.error("Эта модель не поддерживает референс");
      return;
    }
    try {
      const dataUrl = await fetchGenerationAsDataUrl(image);
      setReferenceImages([dataUrl]);
      setPrompt(String(image.prompt || ""));
      if (typeof image.settings?.size === "string") setAspectRatio(normalizeAspect(image.settings.size) || "1:1");
      toast.success("Добавлено как референс");
    } catch {
      toast.error("Не удалось загрузить референс");
    }
  }, [activeMobileImage, supportsI2i, fetchGenerationAsDataUrl]);

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
        threads={threads}
        activeThreadId={selectedThreadId}
        isLoading={threadsLoading}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
        onRenameThread={renameThread}
      />

      <div className="flex-1 flex flex-col">
        {/* Mobile: Instagram-like feed + bottom sheet; tap image → viewer */}
        <div className="md:hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <ImageGalleryMasonry
              images={effectiveImages}
              isGenerating={false}
              layout="feed"
              autoScrollToBottom
              onImageClick={(img) => {
                const key = getRunKey(img);
                if (key) {
                  setActiveRunKey(key);
                  setActiveRunIndex(0);
                }
                setViewerImage(img);
              }}
              onUseAsReference={supportsI2i ? handleUseAsReferenceFromGallery : undefined}
              emptyTitle={isToolModel ? "Загрузите фото" : undefined}
              emptyDescription={
                isToolModel ? 'Нажмите «+» внизу и загрузите изображение для обработки' : undefined
              }
              hasMore={hasMore}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
            />
          </div>

          <GeneratorBottomSheet
            modelId={selectedModelId}
            modelName={photoModel.name}
            estimatedCost={estimatedCost}
            prompt={prompt}
            onPromptChange={setPrompt}
            aspectRatio={aspectRatio}
            onAspectRatioChange={(v) => setAspectRatio(normalizeAspect(v) || "1:1")}
            aspectRatioOptions={isToolModel ? ["1:1"] : photoModel.aspectRatios}
            quality={qualityLabel}
            onQualityChange={setQualityLabel}
            qualityOptions={qualityOptions}
            quantity={isToolModel ? 1 : quantity}
            onQuantityChange={isToolModel ? undefined : setQuantity}
            quantityMax={isToolModel ? 1 : 4}
            supportsI2i={supportsI2i}
            referenceImages={supportsI2i ? referenceImages : []}
            onReferenceImagesChange={supportsI2i ? setReferenceImages : () => {}}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
            seed={seed}
            onSeedChange={setSeed}
            steps={steps}
            onStepsChange={setSteps}
            isGenerating={isGeneratingBatch}
            canGenerate={!!(isAuthenticated && (!isToolModel ? prompt.trim().length > 0 : referenceImages.length > 0) && authCredits >= estimatedCost * (isToolModel ? 1 : quantity) && !isGeneratingBatch)}
            onGenerate={handleGenerate}
            onOpenMenu={() => {}}
            onModelChange={(id) => {
              router.push(`/create/studio${buildSearchParams(searchParams, { model: id, section: "photo" })}`, { scroll: false });
            }}
          />
        </div>

        {/* Desktop: Instagram-like feed */}
        <div className="hidden md:flex flex-col pb-44 sm:pb-40">
          {/* Gallery */}
          <ImageGalleryMasonry
            images={effectiveImages}
            isGenerating={false}
            layout="feed"
            autoScrollToBottom
            onImageClick={handleImageClick}
            onUseAsReference={supportsI2i ? handleUseAsReferenceFromGallery : undefined}
            emptyTitle={isToolModel ? "Загрузите фото" : undefined}
            emptyDescription={
              isToolModel ? 'Нажмите «+» внизу и загрузите изображение для обработки' : undefined
            }
            hasMore={hasMore}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
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
            qualityOptions={qualityOptions}
            aspectRatioOptions={isToolModel ? ["1:1"] : photoModel.aspectRatios}
            referenceImages={supportsI2i ? referenceImages : []}
            onReferenceImagesChange={supportsI2i ? setReferenceImages : undefined}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
            seed={seed}
            onSeedChange={setSeed}
            steps={steps}
            onStepsChange={setSteps}
            supportsI2i={supportsI2i}
          />
        </div>

        {/* Shared lightbox viewer (mobile feed tap + desktop gallery click) */}
        <Dialog
          open={!!viewerImage}
          onOpenChange={(open) => {
            if (!open) setViewerImage(null);
          }}
        >
          <DialogContent className="max-w-none w-[min(96vw,1200px)] max-h-[calc(100vh-2rem)] p-0 gap-0 border border-white/10 bg-[#0B0B0C] shadow-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row items-stretch">
              <div
                className="relative flex items-center justify-center md:flex-1 bg-black"
                onTouchStart={onViewerTouchStart}
                onTouchEnd={onViewerTouchEnd}
                style={{
                  width: "100%",
                  height: `min(calc(100vh - 2rem), ${getViewerBox(viewerImage?.settings?.size).height}px)`,
                }}
              >
                {viewerImage?.url ? (
                  <img
                    src={viewerImage.url}
                    alt={viewerImage.prompt || "Generated image"}
                    className="max-w-full max-h-full object-contain select-none"
                    draggable={false}
                  />
                ) : null}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <button type="button" onClick={handleViewerCopyLink} className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 text-white hover:bg-black/75 border border-white/10" title="Копировать ссылку">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={handleViewerDownload} className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 text-white hover:bg-black/75 border border-white/10" title="Скачать">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                {viewerList.length > 1 ? (
                  <>
                    <button type="button" onClick={goPrev} className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10" title="Предыдущее">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={goNext} className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10" title="Следующее">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                ) : null}
              </div>
              <aside className="md:w-[420px] border-t md:border-t-0 md:border-l border-white/10 bg-[#0F0F10] p-4 md:p-5 overflow-y-auto">
                <div className="text-xs text-white/50">Характеристики</div>
                <div className="mt-1 text-sm font-semibold text-white break-words">{viewerImage?.prompt || "—"}</div>
                <div className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
                  <div className="text-white/50">Модель</div>
                  <div className="text-white/90 text-right break-words whitespace-normal">
                    {getModelById(String(viewerImage?.settings?.model || selectedModelId))?.name || String(viewerImage?.settings?.model || selectedModelId)}
                  </div>
                  <div className="text-white/50">Формат</div>
                  <div className="text-white/90 text-right break-words whitespace-normal">{String(viewerImage?.settings?.size || "—")}</div>
                  <div className="text-white/50">Качество</div>
                  <div className="text-white/90 text-right break-words whitespace-normal">
                    {viewerImage?.settings?.quality ? qualityLabelFromApi(String(viewerImage?.settings?.model || selectedModelId), String(viewerImage.settings.quality)) : "—"}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleViewerShare} className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">
                    <Share2 className="w-4 h-4" /> Поделиться
                  </button>
                  <button type="button" onClick={handleViewerToggleFavorite} className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">
                    <Heart className={`w-4 h-4 ${viewerImage?.id && isFavoriteId(viewerImage.id) ? "text-rose-400" : "text-white"}`} /> В избранное
                  </button>
                  <button type="button" onClick={handleViewerRecreate} className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#CDFF00] text-black font-semibold text-sm hover:bg-[#B8E600] col-span-2">
                    <RotateCcw className="w-4 h-4" /> Пересоздать заново
                  </button>
                  <button type="button" onClick={handleViewerUseAsReference} disabled={!supportsI2i} className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm col-span-2 disabled:opacity-50">
                    <ImagePlus className="w-4 h-4" /> Использовать как референс
                  </button>
                </div>
              </aside>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

