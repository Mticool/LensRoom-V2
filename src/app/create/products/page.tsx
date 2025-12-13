"use client";

import { useState } from "react";
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
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadImage } from "@/lib/download";

// Background styles
const BACKGROUND_STYLES = [
  {
    id: "white",
    name: "Белый фон",
    preview: "#FFFFFF",
    description: "Классический белый студийный фон",
  },
  {
    id: "kitchen",
    name: "Кухня",
    preview:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200&h=200&fit=crop",
    description: "Современная кухня с мраморной столешницей",
  },
  {
    id: "living",
    name: "Гостиная",
    preview:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&h=200&fit=crop",
    description: "Уютная гостиная с естественным светом",
  },
  {
    id: "outdoor",
    name: "Улица",
    preview:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop",
    description: "Природа и открытое пространство",
  },
  {
    id: "wooden",
    name: "Дерево",
    preview:
      "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?w=200&h=200&fit=crop",
    description: "Деревянная текстура",
  },
  {
    id: "studio",
    name: "Студия",
    preview:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop",
    description: "Профессиональная студия",
  },
  {
    id: "dark",
    name: "Тёмный",
    preview: "#1a1a1a",
    description: "Тёмный элегантный фон",
  },
  {
    id: "colorful",
    name: "Цветной",
    preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    description: "Градиентный цветной фон",
  },
  {
    id: "marble",
    name: "Мрамор",
    preview:
      "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=200&h=200&fit=crop",
    description: "Мраморная поверхность",
  },
  {
    id: "luxury",
    name: "Люкс",
    preview:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop",
    description: "Роскошный интерьер",
  },
];

interface ProcessedResult {
  id: number;
  original: string;
  processed: string;
}

export default function ProductCardsPage() {
  const [step, setStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("white");
  const [options, setOptions] = useState({
    removeBackground: true,
    enhanceLighting: true,
    addShadows: true,
    addReflection: false,
  });
  const [variants, setVariants] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedResult[]>([]);

  const handleImageUpload = (files: FileList) => {
    const newImages = Array.from(files).map((file) =>
      URL.createObjectURL(file)
    );
    setUploadedImages([...uploadedImages, ...newImages]);
    toast.success(`${files.length} изображений загружено!`);
  };

  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Загрузите хотя бы одно изображение");
      return;
    }

    setIsProcessing(true);
    toast.loading("Обработка товаров...", { id: "processing" });

    // Mock processing
    setTimeout(() => {
      setResults(
        uploadedImages.map((img, i) => ({
          id: i,
          original: img,
          processed: img, // В реальности тут будет результат от API
        }))
      );
      setIsProcessing(false);
      setStep(4);
      toast.success("Готово! 🎉", { id: "processing" });
    }, 3000);
  };

  const handleDownload = async (url: string, id: number) => {
    try {
      await downloadImage(url, `product-card-${id}.png`);
      toast.success("Изображение скачано! 📥");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ошибка скачивания";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--color-bg)]">
      <motion.div
        className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Badge variant="gold" className="mb-4">
            <Package className="w-3 h-3 mr-1" />
            Продуктовые карточки
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Карточки для <span className="gradient-text">маркетплейсов</span>
          </h1>
          <p className="text-xl text-[rgba(255,255,255,0.70)]">
            WB, Ozon, Яндекс.Маркет — профессиональные фото за минуты
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex items-center justify-center mb-12 gap-4">
          {[
            { num: 1, label: "Загрузка" },
            { num: 2, label: "Фон" },
            { num: 3, label: "Настройки" },
            { num: 4, label: "Результат" },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                  step >= s.num
                    ? "bg-gradient-to-r from-[var(--color-gold)] to-[#F5C842] text-black"
                    : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.40)]"
                )}
              >
                {step > s.num ? <Check className="w-5 h-5" /> : s.num}
              </div>
              <div className="ml-2 hidden sm:block">
                <div
                  className={cn(
                    "text-sm font-medium",
                    step >= s.num
                      ? "text-white"
                      : "text-[rgba(255,255,255,0.40)]"
                  )}
                >
                  {s.label}
                </div>
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-4",
                    step > s.num
                      ? "bg-[var(--color-gold)]"
                      : "bg-[rgba(255,255,255,0.10)]"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <Card variant="glow" className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Загрузите фото товаров
              </h2>

              {/* Upload zone */}
              <div className="border-2 border-dashed border-[rgba(255,255,255,0.16)] rounded-2xl p-12 text-center mb-6 hover:border-[var(--color-gold)]/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files && handleImageUpload(e.target.files)
                  }
                  className="hidden"
                  id="product-upload"
                />
                <label htmlFor="product-upload" className="cursor-pointer">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-[var(--color-gold)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Перетащите изображения или нажмите для выбора
                  </h3>
                  <p className="text-[rgba(255,255,255,0.55)]">
                    Поддерживаются PNG, JPG. До 50 товаров одновременно.
                  </p>
                </label>
              </div>

              {/* Preview grid */}
              {uploadedImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Загружено: {uploadedImages.length}
                    </h3>
                    <Button
                      variant="ghost"
                      onClick={() => setUploadedImages([])}
                    >
                      Очистить все
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`Product ${i + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          onClick={() =>
                            setUploadedImages(
                              uploadedImages.filter((_, idx) => idx !== i)
                            )
                          }
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => setStep(2)}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Далее: Выбрать фон
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 2: Background */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto"
          >
            <Card variant="glow" className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Выберите стиль фона
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {BACKGROUND_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      selectedStyle === style.id
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                        : "border-[rgba(255,255,255,0.10)] hover:border-[var(--color-gold)]/50"
                    )}
                  >
                    <div
                      className="w-full aspect-square rounded-lg mb-3"
                      style={{
                        background: style.preview.startsWith("http")
                          ? `url(${style.preview})`
                          : style.preview,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div className="text-sm font-semibold text-white">
                      {style.name}
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.55)] mt-1">
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Назад
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  variant="primary"
                  className="flex-1"
                >
                  Далее: Настройки
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Options */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <Card variant="glow" className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                Настройки обработки
              </h2>

              {/* Options */}
              <div className="space-y-4 mb-8">
                {Object.entries({
                  removeBackground: "Удалить фон",
                  enhanceLighting: "Улучшить освещение",
                  addShadows: "Добавить тени",
                  addReflection: "Добавить отражение",
                }).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.04)] cursor-pointer hover:bg-[rgba(255,255,255,0.06)] transition-colors border border-[rgba(255,255,255,0.10)]"
                  >
                    <span className="text-white font-medium">{label}</span>
                    <div
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                        options[key as keyof typeof options]
                          ? "bg-[var(--color-gold)]"
                          : "bg-[rgba(255,255,255,0.16)]"
                      )}
                      onClick={() =>
                        setOptions({
                          ...options,
                          [key]: !options[key as keyof typeof options],
                        })
                      }
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                          options[key as keyof typeof options]
                            ? "translate-x-7"
                            : "translate-x-1"
                        )}
                      />
                    </div>
                  </label>
                ))}
              </div>

              {/* Variants */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Варианты на товар
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 4, 8, 16].map((v) => (
                    <button
                      key={v}
                      onClick={() => setVariants(v)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        variants === v
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10"
                          : "border-[rgba(255,255,255,0.10)] hover:border-[var(--color-gold)]/50"
                      )}
                    >
                      <div className="text-2xl font-bold text-white">{v}</div>
                      <div className="text-xs text-[rgba(255,255,255,0.55)] mt-1">
                        {v * uploadedImages.length * 3} ⭐
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Назад
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="primary"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Создать карточки • {variants * uploadedImages.length * 3}{" "}
                      ⭐
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Готово! {results.length} товаров обработано
              </h2>
              <Button variant="outline" onClick={() => setStep(1)}>
                Создать ещё
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((result) => (
                <Card key={result.id} variant="glass" className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-[rgba(255,255,255,0.55)] mb-2">
                        До
                      </div>
                      <img
                        src={result.original}
                        alt="Before"
                        className="w-full rounded-lg aspect-square object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-[rgba(255,255,255,0.55)] mb-2">
                        После
                      </div>
                      <img
                        src={result.processed}
                        alt="After"
                        className="w-full rounded-lg aspect-square object-cover"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDownload(result.processed, result.id)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Скачать
                  </Button>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

