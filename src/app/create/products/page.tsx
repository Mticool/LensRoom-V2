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
import {
  PACK_SLIDES_DEFAULT,
  getModeById,
  getSingleCost,
  getPackCost,
  getApiModelId,
  PRODUCT_IMAGE_MODES,
} from "@/config/productImageModes";
import {
  getStarsBalance,
  deductStars,
  hasEnoughStars,
} from "@/lib/stars-balance";
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
    setStarsBalance(getStarsBalance());
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
    if (!hasEnoughStars(totalCost)) {
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
      nicheTone: selectedNiche?.tone,
      sceneId: wizardState.sceneId,
      scenePromptAddon: promptAddon,
      brandTemplateId: wizardState.brandTemplateId,
    };

    console.log("[ProductCards] Generation payload:", payload);

    // Deduct stars
    const deducted = deductStars(totalCost);
    if (!deducted) {
      toast.error("Ошибка списания звёзд");
      return;
    }

    setStarsBalance(getStarsBalance());
    toast.success(`Списано ⭐${totalCost}`);

    // Start generation
    setIsGenerating(true);
    setSlides(createPendingSlides(slidesCount));

    // Simulate generation progress
    const generatedSlides: Slide[] = [];
    
    for (let i = 0; i < slidesCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSlides(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "generating" } : s
      ));
      
      // Simulate completion
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const completedSlide: Slide = {
        id: `slide_${Date.now()}_${i}`,
        status: "completed",
        imageUrl: wizardState.productPhotos[i % wizardState.productPhotos.length] || wizardState.productPhotos[0],
        text: wizardState.productBenefits[i] || undefined,
      };
      
      generatedSlides.push(completedSlide);
      
      setSlides(prev => prev.map((s, idx) => 
        idx === i ? completedSlide : s
      ));
    }

    setIsGenerating(false);
    toast.success(`Готово! ${slidesCount} изображений создано 🎉`);
  };

  const handleRegenerate = async (index: number) => {
    toast.info(`Перегенерация слайда ${index + 1}...`);
  };

  const handleBuyStars = () => {
    router.push("/pricing");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-24">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary">
                <Package className="w-3 h-3 mr-1" />
                Продуктовые карточки
              </Badge>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-[var(--text)]">
                  Фото для маркетплейсов
                </h1>
              </div>
            </div>
            
            {/* Balance */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface2)]">
              <Wallet className="w-4 h-4 text-[var(--muted)]" />
              <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
              <span className="font-semibold text-[var(--text)]">{starsBalance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl py-6">
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
      />
    </div>
  );
}
