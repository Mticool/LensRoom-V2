"use client";

import { useState, useEffect, useCallback } from "react";
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
import { addManyToLibrary } from "@/lib/library-storage";

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
  const selectedMode = getModeById(wizardState.modeId) ?? PRODUCT_IMAGE_MODES[0];
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

    // Build payload
    const payload = {
      modeId: wizardState.modeId,
      modelKey: selectedMode.modelKey,
      apiModelId: getApiModelId(selectedMode.modelKey),
      generationType: wizardState.generationType,
      slidesCount,
      requiredStars: totalCost,
      marketplace: wizardState.marketplace,
      templateStyle: wizardState.templateStyle,
      productPhotos: wizardState.productPhotos,
      removeBackground: wizardState.removeBackground,
      productTitle: wizardState.productTitle,
      productBenefits: wizardState.productBenefits.filter(b => b.trim()),
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
    for (let i = 0; i < slidesCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setSlides(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "generating" } : s
      ));
      
      // Simulate completion
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSlides(prev => prev.map((s, idx) => 
        idx === i ? { 
          ...s, 
          status: "completed",
          imageUrl: wizardState.productPhotos[idx % wizardState.productPhotos.length] || wizardState.productPhotos[0],
          text: wizardState.productBenefits[idx] || undefined,
        } : s
      ));
    }

    setIsGenerating(false);

    // Save to library
    const libraryItems = slides.map(s => ({
      type: "product" as const,
      modeId: wizardState.modeId,
      modelKey: selectedMode.modelKey,
      imageUrl: s.imageUrl,
      metadata: {
        generationType: wizardState.generationType,
        marketplace: wizardState.marketplace,
        templateStyle: wizardState.templateStyle,
        productTitle: wizardState.productTitle,
      },
    }));
    addManyToLibrary(libraryItems);

    toast.success(`Готово! ${slidesCount} изображений сохранено 🎉`);
  };

  const handleRegenerate = async (index: number) => {
    // For now, just show toast
    toast.info(`Перегенерация слайда ${index + 1}...`);
  };

  const handleDownloadAll = () => {
    // For now, just show toast
    toast.info("Подготовка ZIP архива...");
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
                onDownloadAll={handleDownloadAll}
                isGenerating={isGenerating}
                modeName={selectedMode.name}
                marketplace={wizardState.marketplace}
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
