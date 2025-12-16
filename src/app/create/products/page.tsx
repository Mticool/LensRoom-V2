"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Package, Star, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ProductWizard,
  ProductPreview,
  ProductActionBar,
  createEmptySlides,
  createPendingSlides,
  type ProductWizardState,
  type Slide,
} from "@/components/products";
import { MarketplaceHub } from "@/components/marketplaces";
import {
  PACK_SLIDES_DEFAULT,
  getModeById,
  getSingleCost,
  getPackCost,
  getApiModelId,
  PRODUCT_IMAGE_MODES,
} from "@/config/productImageModes";
import { getMarketplaceProfile } from "@/config/marketplaceProfiles";
import { getPromptAddon } from "@/config/lifestyleScenes";
import { getNicheById } from "@/config/productNiches";

// ===== INITIAL STATE =====

const initialWizardState: ProductWizardState = {
  marketplace: "wb",
  modeId: "standard",
  generationType: "pack",
  templateStyle: "minimal",
  productPhotos: [],
  removeBackground: true,
  productTitle: "",
  productBenefits: [""],
  nicheId: null,
  sceneId: null,
  brandTemplateId: null,
  customPrompt: "",
};

// ===== PAGE COMPONENT =====

export default function ProductCardsPage() {
  const router = useRouter();
  
  // Wizard state
  const [wizardState, setWizardState] = useState<ProductWizardState>(initialWizardState);
  
  // Preview state
  const [slides, setSlides] = useState<Slide[]>(() => 
    createEmptySlides(PACK_SLIDES_DEFAULT)
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [starsBalance, setStarsBalance] = useState(0);

  // Load balance on mount
  useEffect(() => {
    // Real balance from DB
    (async () => {
      try {
        const res = await fetch("/api/credits/balance");
        const data = await res.json();
        if (res.ok) setStarsBalance(data.balance || 0);
      } catch {
        setStarsBalance(0);
      }
    })();
  }, []);

  // Update slides count when generation type changes
  useEffect(() => {
    const count = wizardState.generationType === "single" ? 1 : PACK_SLIDES_DEFAULT;
    setSlides(createEmptySlides(count));
    setActiveSlideIndex(0);
  }, [wizardState.generationType]);

  // Computed values
  const marketplaceProfile = useMemo(
    () => getMarketplaceProfile(wizardState.marketplace),
    [wizardState.marketplace]
  );
  
  const selectedMode = getModeById(wizardState.modeId) ?? PRODUCT_IMAGE_MODES[0];
  const selectedNiche = wizardState.nicheId ? getNicheById(wizardState.nicheId) : null;
  
  const slidesCount = wizardState.generationType === "single" ? 1 : PACK_SLIDES_DEFAULT;
  const totalCost = wizardState.generationType === "single"
    ? getSingleCost(wizardState.modeId)
    : getPackCost(wizardState.modeId);
  const canGenerate = wizardState.productPhotos.length > 0 && !isGenerating;

  // Handlers
  const handleWizardChange = useCallback((changes: Partial<ProductWizardState>) => {
    setWizardState(prev => ({ ...prev, ...changes }));
  }, []);

  const handleGenerate = async () => {
    // Validation
    if (wizardState.productPhotos.length === 0) {
      toast.error("Загрузите хотя бы одно фото товара");
      return;
    }

    // Check balance
    if (starsBalance < totalCost) {
      toast.error(`Недостаточно звёзд. Нужно: ⭐${totalCost}`);
      return;
    }

    // Build prompt with scene addon if lifestyle mode
    let promptAddon = "";
    if (wizardState.modeId === "lifestyle" && wizardState.sceneId) {
      promptAddon = getPromptAddon(wizardState.sceneId);
    }

    // Build payload
    const payload = {
      modeId: wizardState.modeId,
      modelKey: selectedMode.modelKey,
      apiModelId: getApiModelId(selectedMode.modelKey),
      generationType: wizardState.generationType,
      slidesCount,
      requiredStars: totalCost,
      marketplace: wizardState.marketplace,
      marketplaceCanvas: marketplaceProfile?.canvasPresets.find(
        c => c.id === marketplaceProfile.defaultCanvasId
      ),
      templateStyle: wizardState.templateStyle,
      productPhotos: wizardState.productPhotos,
      removeBackground: wizardState.removeBackground,
      productTitle: wizardState.productTitle,
      productBenefits: wizardState.productBenefits.filter(b => b.trim()),
      nicheId: wizardState.nicheId,
      nicheTone: selectedNiche?.defaultTone,
      sceneId: wizardState.sceneId,
      scenePromptAddon: promptAddon,
      brandTemplateId: wizardState.brandTemplateId,
      customPrompt: wizardState.customPrompt,
    };

    console.log("[ProductCards] Generation payload:", payload);
    // Start real generation
    try {
      setIsGenerating(true);
      setSlides(createPendingSlides(slidesCount));

      // Build slide prompts (simple version)
      const base = [
        wizardState.productTitle ? `Товар: ${wizardState.productTitle}.` : "",
        wizardState.productBenefits.filter(b => b.trim()).length
          ? `Преимущества: ${wizardState.productBenefits.filter(b => b.trim()).join("; ")}.`
          : "",
        wizardState.customPrompt ? `Дополнительно: ${wizardState.customPrompt}.` : "",
        wizardState.removeBackground ? "Сохрани товар, убери фон, сделай чистый маркетплейс-кадр." : "Сохрани товар, сделай маркетплейс-кадр.",
      ].filter(Boolean).join(" ");

      const slidePrompts = Array.from({ length: slidesCount }, (_, i) => {
        const benefit = wizardState.productBenefits[i]?.trim();
        return benefit ? `${base} Акцент: ${benefit}.` : base;
      });

      const res = await fetch("/api/generate/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeId: wizardState.modeId,
          generationType: wizardState.generationType,
          slidesCount,
          modelKey: selectedMode.modelKey,
          productPhotos: wizardState.productPhotos,
          slidePrompts,
          aspectRatio: "1:1",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Ошибка запуска генерации");
      }

      const generationId: string | null = data.generationId || null;
      const jobs: Array<{ slideIndex: number; jobId: string }> = data.jobs || [];
      if (!jobs.length) throw new Error("Сервер не вернул задачи");

      const safePatch = async (update: Partial<{ status: string; resultUrls: string[]; thumbnailUrl: string }>) => {
        if (!generationId) return;
        try {
          await fetch("/api/generations", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: generationId, ...update }),
          });
        } catch {
          // ignore
        }
      };

      const poll = async (jobId: string) => {
        const maxAttempts = 180;
        for (let a = 0; a < maxAttempts; a++) {
          const r = await fetch(`/api/jobs/${jobId}`);
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.error || "Ошибка статуса");
          if (j.status === "completed" && j.results?.[0]?.url) return j.results[0].url as string;
          if (j.status === "failed") throw new Error(j.error || "Генерация не удалась");
          await new Promise((x) => setTimeout(x, 2500));
        }
        throw new Error("Таймаут генерации");
      };

      await safePatch({ status: "processing" });

      const allUrls: string[] = [];
      for (const job of jobs) {
        setSlides(prev => prev.map((s, idx) => idx === job.slideIndex ? { ...s, status: "generating" } : s));
        const url = await poll(job.jobId);
        allUrls[job.slideIndex] = url;
        const completed: Slide = {
          id: `slide_${job.jobId}`,
          status: "completed",
          imageUrl: url,
          text: wizardState.productBenefits[job.slideIndex] || undefined,
        };
        setSlides(prev => prev.map((s, idx) => idx === job.slideIndex ? completed : s));
      }

      // Persist result URLs into generations (best-effort; schema varies)
      await safePatch({
        status: "completed",
        resultUrls: allUrls.filter(Boolean),
        thumbnailUrl: allUrls.find(Boolean),
      });

      // Refresh balance
      try {
        const b = await fetch("/api/credits/balance");
        const bj = await b.json().catch(() => ({}));
        if (b.ok) setStarsBalance(bj.balance || 0);
      } catch {}

      toast.success(`Готово! ${slidesCount} изображений создано 🎉`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка генерации";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (index: number) => {
    toast.info(`Перегенерация слайда ${index + 1}...`);
  };

  const handleBuyStars = () => {
    router.push("/pricing");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-24">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary">
                <Package className="w-3 h-3 mr-1" />
                Маркетплейсы
              </Badge>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-[var(--text)]">
                  Инструменты для WB и Ozon
                </h1>
              </div>
            </div>
            
            {/* Balance */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface2)]">
              <Wallet className="w-4 h-4 text-[var(--muted)]" />
              <Star className="w-4 h-4 text-white fill-[var(--gold)]" />
              <span className="font-semibold text-[var(--text)]">{starsBalance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl py-6">
        {/* Marketplace Hub */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <MarketplaceHub />
        </motion.div>

        {/* Product Card Wizard Section */}
        <div id="product-card-wizard" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">Карточка товара</h2>
              <p className="text-sm text-[var(--muted)]">Создайте профессиональные фото для маркетплейсов</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Settings (40%) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-5 xl:col-span-4"
            >
              <div className="lg:sticky lg:top-36">
                <ProductWizard
                  state={wizardState}
                  onChange={handleWizardChange}
                  marketplaceProfile={marketplaceProfile}
                />
              </div>
            </motion.div>

            {/* Right Column: Preview (60%) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-7 xl:col-span-8"
            >
              <div className="lg:sticky lg:top-36 lg:h-[calc(100vh-200px)]">
                <ProductPreview
                  slides={slides}
                  activeIndex={activeSlideIndex}
                  onActiveChange={setActiveSlideIndex}
                  onRegenerate={handleRegenerate}
                  isGenerating={isGenerating}
                  modeName={selectedMode.name}
                  marketplace={wizardState.marketplace}
                  marketplaceProfile={marketplaceProfile}
                  // Export data props
                  productTitle={wizardState.productTitle}
                  productBenefits={wizardState.productBenefits}
                  modeId={wizardState.modeId}
                  templateStyle={wizardState.templateStyle}
                  nicheId={wizardState.nicheId}
                  sceneId={wizardState.sceneId}
                  brandTemplateId={wizardState.brandTemplateId}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <ProductActionBar
        totalCost={totalCost}
        starsBalance={starsBalance}
        isGenerating={isGenerating}
        canGenerate={canGenerate}
        onGenerate={handleGenerate}
        onBuyStars={handleBuyStars}
        slidesCount={slidesCount}
        generationType={wizardState.generationType}
        modeId={wizardState.modeId}
      />
    </div>
  );
}
