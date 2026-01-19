'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ModelSelector } from "@/components/generator-v2/ModelSelector";
import { ImageGalleryMasonry } from "@/components/generator-v2/ImageGalleryMasonry";
import { ControlBarBottom } from "@/components/generator-v2/ControlBarBottom";
import { ThreadSidebar, type StudioThread } from "@/components/generator-v2/ThreadSidebar";
import { useAuth } from "@/components/generator-v2/hooks/useAuth";
import { useHistory } from "@/components/generator-v2/hooks/useHistory";
import { useGeneration } from "@/components/generator-v2/hooks/useGeneration";
import type { GenerationResult, GenerationSettings } from "@/components/generator-v2/GeneratorV2";
import { getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";

type OutputFormat = "png" | "jpg" | "webp";

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

  if (modelId === "nano-banana-pro") {
    return ["1K", "2K", "4K"];
  }

  const opts = (model.qualityOptions || []).map((q) => qualityLabelFromApi(modelId, q));
  // De-dup + keep order
  const uniq: string[] = [];
  for (const o of opts) if (o && !uniq.includes(o)) uniq.push(o);
  return uniq;
}

function getOutputFormatOptions(modelId: string): ReadonlyArray<OutputFormat> {
  if (modelId === "recraft-remove-background") return ["png"];
  return ["png", "jpg"];
}

function settingsStorageKey(modelId: string) {
  return `lensroom_studio_settings_${modelId}`;
}

export function StudioWorkspaces() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedModelId = (searchParams.get("model") || "nano-banana-pro").trim();
  const selectedThreadId = (searchParams.get("thread") || "").trim() || null;

  const model = getModelById(selectedModelId);
  const photoModel = model && model.type === "photo" ? model : null;
  const supportsI2i = !!photoModel?.supportsI2i;

  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();

  const [threads, setThreads] = useState<StudioThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);

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
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");

  // Local items for instant UX (pending + immediate replacement).
  const [localItems, setLocalItems] = useState<GenerationResult[]>([]);

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

  const qualityOptions = useMemo(() => getQualityOptionsForModel(selectedModelId), [selectedModelId]);
  const outputFormatOptions = useMemo(
    () => getOutputFormatOptions(selectedModelId),
    [selectedModelId]
  );

  // Cost estimate (UI only; backend may differ for quotas/promos)
  const estimatedCost = useMemo(() => {
    if (!photoModel) return 0;
    const q = apiQualityFromLabel(selectedModelId, qualityLabel);
    const price = computePrice(selectedModelId, { variants: quantity, quality: q as any });
    return price.stars;
  }, [photoModel, selectedModelId, qualityLabel, quantity]);

  const { generate, isGenerating } = useGeneration({
    onPending: (pending) => {
      // Only show pending in current thread context
      setLocalItems((prev) => [pending, ...prev]);
    },
    onSuccess: async (result) => {
      setLocalItems((prev) =>
        result.pendingId ? prev.map((p) => (p.id === result.pendingId ? result : p)) : [result, ...prev]
      );
      invalidateCache();
      await refreshCredits();
      refreshHistory();
    },
    onError: (err, pendingId) => {
      if (pendingId) setLocalItems((prev) => prev.filter((p) => p.id !== pendingId));
      toast.error(err);
    },
  });

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

    // Default options from config
    const m = getModelById(selectedModelId);
    if (m && m.type === "photo") {
      setAspectRatio(m.aspectRatios?.[0] || "1:1");
      const qOpts = getQualityOptionsForModel(selectedModelId);
      setQualityLabel(qOpts[0] || "Balanced");
      setOutputFormat("png");
    }

    // Restore from storage (best-effort)
    try {
      const raw = localStorage.getItem(settingsStorageKey(selectedModelId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.aspectRatio === "string") setAspectRatio(parsed.aspectRatio);
        if (typeof parsed?.qualityLabel === "string") setQualityLabel(parsed.qualityLabel);
        if (typeof parsed?.outputFormat === "string") setOutputFormat(parsed.outputFormat);
        if (typeof parsed?.quantity === "number") setQuantity(parsed.quantity);
        if (typeof parsed?.negativePrompt === "string") setNegativePrompt(parsed.negativePrompt);
        if (typeof parsed?.seed === "number") setSeed(parsed.seed);
        if (typeof parsed?.steps === "number") setSteps(parsed.steps);
      }
    } catch {
      // ignore
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
          outputFormat,
          quantity,
          negativePrompt,
          seed,
          steps,
        })
      );
    } catch {
      // ignore
    }
  }, [selectedModelId, aspectRatio, qualityLabel, outputFormat, quantity, negativePrompt, seed, steps]);

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

  // Ensure threads exist for model; ensure active thread is valid
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setThreads([]);
        setThreadsError(null);
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
  }, [threadsLoading, threadsError, threads, selectedThreadId, selectedModelId, isAuthenticated, authLoading]);

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
    const created = await createThread(selectedModelId);
    if (!created) return;
    setThreads((prev) => [created, ...prev]);
    router.push(`/create/studio${buildSearchParams(searchParams, { model: selectedModelId, thread: created.id })}`, {
      scroll: false,
    });
    setLocalItems([]);
  }, [createThread, selectedModelId, router, searchParams]);

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
      toast.error("Войдите, чтобы генерировать");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Введите промпт");
      return;
    }

    const apiQuality = apiQualityFromLabel(selectedModelId, qualityLabel);
    const settings: GenerationSettings = {
      model: selectedModelId,
      size: aspectRatio,
      quality: apiQuality,
      outputFormat,
      variants: quantity,
      negativePrompt: negativePrompt || undefined,
      seed: seed ?? undefined,
      steps: steps ?? undefined,
    };

    // Ensure i2i is only used when supported
    const ref = supportsI2i ? referenceImage : null;

    await generate(prompt, "image", settings, ref, null, null, undefined, selectedThreadId);
  }, [
    photoModel,
    selectedThreadId,
    isAuthenticated,
    prompt,
    selectedModelId,
    qualityLabel,
    aspectRatio,
    outputFormat,
    quantity,
    negativePrompt,
    seed,
    steps,
    supportsI2i,
    referenceImage,
    generate,
  ]);

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
        modelName={photoModel.name}
        threads={threads}
        activeThreadId={selectedThreadId}
        isLoading={threadsLoading}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
      />

      <div className="flex-1 flex flex-col pb-40">
        {/* Top: model selector + thread (mobile) */}
        <div className="sticky top-16 z-40 border-b border-[#27272A] bg-[#0F0F10]/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <ModelSelector value={selectedModelId} onChange={handleModelChange} disabled={threadsLoading} />
              <div className="hidden md:block text-xs text-[#71717A]">
                {activeThread ? activeThread.title : "—"}
              </div>
            </div>

            <div className="lg:hidden flex items-center gap-2">
              <select
                value={selectedThreadId || ""}
                onChange={(e) => handleSelectThread(e.target.value)}
                className="h-10 rounded-lg bg-[#18181B] border border-[#27272A] px-3 text-sm text-white"
                disabled={threadsLoading || threads.length === 0}
              >
                {threads.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateThread}
                className="h-10 px-3 rounded-lg bg-[#CDFF00] text-black font-semibold text-sm"
              >
                + Чат
              </button>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <ImageGalleryMasonry images={effectiveImages} isGenerating={isGenerating} />

        {/* Bottom control bar */}
        <ControlBarBottom
          prompt={prompt}
          onPromptChange={setPrompt}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          quality={qualityLabel}
          onQualityChange={setQualityLabel}
          outputFormat={outputFormat}
          onOutputFormatChange={setOutputFormat}
          outputFormatOptions={outputFormatOptions}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          disabled={authLoading || !isAuthenticated || authCredits < estimatedCost}
          credits={authCredits}
          estimatedCost={estimatedCost}
          modelId={selectedModelId}
          qualityOptions={qualityOptions}
          aspectRatioOptions={photoModel.aspectRatios}
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
      </div>
    </div>
  );
}

