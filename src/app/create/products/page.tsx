"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Upload,
  Sparkles,
  Download,
  Check,
  X,
  Star,
  Image as ImageIcon,
  Layers,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadImage } from "@/lib/download";
import {
  PRODUCT_IMAGE_MODES,
  PACK_SLIDES_DEFAULT,
  getModeById,
  getSingleCost,
  getPackCost,
  getPackSavings,
  type ProductImageMode,
} from "@/config/productImageModes";

// ===== TYPES =====

type GenerationType = "single" | "pack";

interface ProcessedResult {
  id: number;
  original: string;
  processed: string;
}

// ===== BACKGROUND STYLES =====

const BACKGROUND_STYLES = [
  { id: "white", name: "Белый фон", preview: "#FFFFFF" },
  { id: "studio", name: "Студийный", preview: "#F5F5F5" },
  { id: "dark", name: "Тёмный", preview: "#1a1a1a" },
  { id: "gradient", name: "Градиент", preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
];

// ===== PAGE COMPONENT =====

export default function ProductCardsPage() {
  // State
  const [selectedModeId, setSelectedModeId] = useState<string>("standard");
  const [generationType, setGenerationType] = useState<GenerationType>("pack");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedBackground, setSelectedBackground] = useState("white");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [step, setStep] = useState(1);

  // Computed
  const selectedMode = getModeById(selectedModeId) ?? PRODUCT_IMAGE_MODES[0];
  const totalCost = generationType === "single" 
    ? getSingleCost(selectedModeId)
    : getPackCost(selectedModeId);
  const packSavings = getPackSavings(selectedModeId);

  // Handlers
  const handleImageUpload = useCallback((files: FileList) => {
    const maxImages = generationType === "pack" ? PACK_SLIDES_DEFAULT : 1;
    const newImages = Array.from(files)
      .slice(0, maxImages - uploadedImages.length)
      .map((file) => URL.createObjectURL(file));
    
    setUploadedImages((prev) => [...prev, ...newImages].slice(0, maxImages));
    toast.success(`${newImages.length} изображений загружено`);
  }, [generationType, uploadedImages.length]);

  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Загрузите хотя бы одно изображение");
      return;
    }

    setIsProcessing(true);
    toast.loading("Генерация изображений...", { id: "processing" });

    // TODO: Real generation via KIE API
    setTimeout(() => {
      setResults(
        uploadedImages.map((img, i) => ({
          id: i,
          original: img,
          processed: img,
        }))
      );
      setIsProcessing(false);
      setStep(3);
      toast.success("Готово! 🎉", { id: "processing" });
    }, 3000);
  };

  const handleDownload = async (url: string, id: number) => {
    try {
      await downloadImage(url, `product-${selectedMode.id}-${id}.png`);
      toast.success("Изображение скачано!");
    } catch {
      toast.error("Ошибка скачивания");
    }
  };

  const resetToStart = () => {
    setStep(1);
    setUploadedImages([]);
    setResults([]);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--bg)]">
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <Badge variant="primary" className="mb-4">
            <Package className="w-3 h-3 mr-1" />
            Продуктовые карточки
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[var(--text)]">
            Фото для <span className="text-[var(--gold)]">маркетплейсов</span>
          </h1>
          <p className="text-[var(--text2)] max-w-xl mx-auto">
            WB, Ozon, Яндекс.Маркет — профессиональные карточки товаров
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Configuration */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Mode Selector */}
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Режим фото
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRODUCT_IMAGE_MODES.map((mode) => (
                    <ModeCard
                      key={mode.id}
                      mode={mode}
                      selected={selectedModeId === mode.id}
                      onClick={() => setSelectedModeId(mode.id)}
                    />
                  ))}
                </div>
              </section>

              {/* Generation Type Toggle */}
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Тип генерации
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <GenerationTypeCard
                    type="single"
                    label="Одна картинка"
                    description="Одно изображение товара"
                    icon={<ImageIcon className="w-5 h-5" />}
                    cost={getSingleCost(selectedModeId)}
                    selected={generationType === "single"}
                    onClick={() => {
                      setGenerationType("single");
                      setUploadedImages((prev) => prev.slice(0, 1));
                    }}
                  />
                  <GenerationTypeCard
                    type="pack"
                    label={`Набор для карточки (${PACK_SLIDES_DEFAULT} слайдов)`}
                    description="Полный набор для маркетплейса"
                    icon={<Layers className="w-5 h-5" />}
                    cost={getPackCost(selectedModeId)}
                    savings={packSavings}
                    selected={generationType === "pack"}
                    onClick={() => setGenerationType("pack")}
                  />
                </div>
              </section>

              {/* Cost Summary */}
              <Card className="p-6 bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[var(--muted)] mb-1">
                      {generationType === "single" ? "Стоимость" : `Стоимость набора (${PACK_SLIDES_DEFAULT})`}
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-[var(--gold)] fill-[var(--gold)]" />
                      <span className="text-2xl font-bold text-[var(--text)]">{totalCost}</span>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => setStep(2)}
                    className="px-8"
                  >
                    Далее
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Upload & Generate */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Selected Mode Summary */}
              <Card className="p-4 bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text)]">{selectedMode.name}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {generationType === "single" ? "1 изображение" : `${PACK_SLIDES_DEFAULT} слайдов`}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Изменить
                  </Button>
                </div>
              </Card>

              {/* Background Selection */}
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Фон
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {BACKGROUND_STYLES.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all",
                        selectedBackground === bg.id
                          ? "border-[var(--gold)] bg-[var(--gold)]/10"
                          : "border-[var(--border)] hover:border-[var(--gold)]/50"
                      )}
                    >
                      <div
                        className="w-full aspect-square rounded-lg mb-2"
                        style={{ background: bg.preview }}
                      />
                      <div className="text-xs font-medium text-[var(--text)]">{bg.name}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Upload Zone */}
              <section>
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Загрузите фото товара
                </h2>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
                    uploadedImages.length > 0
                      ? "border-[var(--gold)]/50 bg-[var(--gold)]/5"
                      : "border-[var(--border)] hover:border-[var(--gold)]/50"
                  )}
                >
                  <input
                    type="file"
                    multiple={generationType === "pack"}
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    className="hidden"
                    id="product-upload"
                  />
                  <label htmlFor="product-upload" className="cursor-pointer block">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-[var(--muted)]" />
                    </div>
                    <div className="font-medium text-[var(--text)] mb-1">
                      {uploadedImages.length > 0
                        ? `Загружено: ${uploadedImages.length} / ${generationType === "pack" ? PACK_SLIDES_DEFAULT : 1}`
                        : "Нажмите для выбора"}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      PNG, JPG до 10MB
                    </div>
                  </label>
                </div>

                {/* Preview Grid */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-6 gap-2">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`Product ${i + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setUploadedImages(uploadedImages.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Generate Button */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Назад
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={uploadedImages.length === 0 || isProcessing}
                  className="flex-1"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Сгенерировать • 
                      <Star className="w-4 h-4 ml-1 mr-0.5 fill-current" />
                      {totalCost}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text)]">
                    Готово! 🎉
                  </h2>
                  <p className="text-[var(--muted)]">
                    {results.length} изображений обработано
                  </p>
                </div>
                <Button onClick={resetToStart}>
                  Создать ещё
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {results.map((result) => (
                  <Card key={result.id} className="overflow-hidden bg-[var(--surface)] border-[var(--border)]">
                    <img
                      src={result.processed}
                      alt={`Result ${result.id + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDownload(result.processed, result.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Скачать
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== SUB-COMPONENTS =====

interface ModeCardProps {
  mode: ProductImageMode;
  selected: boolean;
  onClick: () => void;
}

function ModeCard({ mode, selected, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 text-left transition-all relative",
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/10"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold)]/50"
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center">
          <Check className="w-4 h-4 text-[#0a0a0f]" />
        </div>
      )}

      {/* Badge */}
      {mode.badge && (
        <Badge variant="primary" className="mb-3 text-xs">
          {mode.badge}
        </Badge>
      )}

      {/* Title */}
      <h3 className="font-semibold text-[var(--text)] mb-1 pr-8">
        {mode.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">
        {mode.description}
      </p>

      {/* Price */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-[var(--muted)]">от</span>
        <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
        <span className="font-semibold text-[var(--text)]">{mode.costPerImageStars}</span>
        <span className="text-[var(--muted)]">за изображение</span>
      </div>
    </button>
  );
}

interface GenerationTypeCardProps {
  type: GenerationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  cost: number;
  savings?: number;
  selected: boolean;
  onClick: () => void;
}

function GenerationTypeCard({
  label,
  description,
  icon,
  cost,
  savings,
  selected,
  onClick,
}: GenerationTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 text-left transition-all relative",
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/10"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold)]/50"
      )}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--gold)] flex items-center justify-center">
          <Check className="w-4 h-4 text-[#0a0a0f]" />
        </div>
      )}

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-[var(--surface2)] flex items-center justify-center mb-3 text-[var(--muted)]">
        {icon}
      </div>

      {/* Label */}
      <h3 className="font-semibold text-[var(--text)] mb-1">
        {label}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--muted)] mb-3">
        {description}
      </p>

      {/* Cost */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
          <span className="font-semibold text-[var(--text)]">{cost}</span>
        </div>
        {savings && savings > 0 && (
          <Badge variant="success" className="text-xs">
            Экономия {savings}⭐
          </Badge>
        )}
      </div>
    </button>
  );
}
