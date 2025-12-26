"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Star,
  Wallet,
  Upload,
  Wand2,
  ImagePlus,
  Eraser,
  Sparkles,
  Layers,
  Palette,
  ArrowRight,
  Check,
  X,
  Download,
  RefreshCw,
  Zap,
  Camera,
  Box,
  ShoppingBag,
  Maximize2,
  SunMedium,
  Contrast,
  Loader2,
  ChevronDown,
  Info,
  Copy,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { computePrice } from "@/lib/pricing/compute-price";
import { getModelById, PHOTO_MODELS } from "@/config/models";

// ===== TYPES =====

type ToolId = 
  | "remove-bg" 
  | "replace-bg" 
  | "enhance" 
  | "mockup" 
  | "upscale-2k"
  | "upscale-4k"
  | "upscale-8k"
  | "product-card"
  | "batch";

interface Tool {
  id: ToolId;
  name: string;
  description: string;
  icon: React.ReactNode;
  modelId: string;
  quality?: string;
  badge?: string;
  color: string;
  available: boolean;
}

interface ProcessedImage {
  original: string;
  result: string;
  tool: ToolId;
}

// ===== TOOLS CONFIG (Using real models from config) =====

const TOOLS: Tool[] = [
  {
    id: "remove-bg",
    name: "Удалить фон",
    description: "AI удаление фона за секунды",
    icon: <Eraser className="w-6 h-6" />,
    modelId: "recraft-remove-background",
    quality: "turbo",
    badge: "2⭐",
    color: "from-rose-500/20 to-rose-600/10",
    available: true,
  },
  {
    id: "replace-bg",
    name: "Заменить фон",
    description: "Новый фон с Seedream 4.5",
    icon: <ImagePlus className="w-6 h-6" />,
    modelId: "seedream-4.5",
    quality: "turbo",
    badge: "Популярно",
    color: "from-violet-500/20 to-violet-600/10",
    available: true,
  },
  {
    id: "enhance",
    name: "Smart Retouch",
    description: "Улучшение с FLUX.2",
    icon: <Wand2 className="w-6 h-6" />,
    modelId: "flux-2",
    quality: "1k",
    color: "from-amber-500/20 to-amber-600/10",
    available: true,
  },
  {
    id: "mockup",
    name: "Mockup Generator",
    description: "Товар в сцене с Seedream",
    icon: <Box className="w-6 h-6" />,
    modelId: "seedream-4.5",
    quality: "turbo",
    badge: "Новинка",
    color: "from-cyan-500/20 to-cyan-600/10",
    available: true,
  },
  {
    id: "upscale-2k",
    name: "Upscale 2K",
    description: "Увеличение до 2K",
    icon: <Maximize2 className="w-6 h-6" />,
    modelId: "topaz-image-upscale",
    quality: "2k",
    color: "from-emerald-500/20 to-emerald-600/10",
    available: true,
  },
  {
    id: "upscale-4k",
    name: "Upscale 4K",
    description: "Увеличение до 4K",
    icon: <Maximize2 className="w-6 h-6" />,
    modelId: "topaz-image-upscale",
    quality: "4k",
    badge: "HD",
    color: "from-emerald-500/20 to-emerald-600/10",
    available: true,
  },
  {
    id: "upscale-8k",
    name: "Upscale 8K",
    description: "Увеличение до 8K (печать)",
    icon: <Maximize2 className="w-6 h-6" />,
    modelId: "topaz-image-upscale",
    quality: "8k",
    badge: "Pro",
    color: "from-emerald-500/20 to-emerald-600/10",
    available: true,
  },
  {
    id: "product-card",
    name: "Карточка товара",
    description: "6 слайдов для WB/Ozon",
    icon: <Package className="w-6 h-6" />,
    modelId: "flux-2",
    quality: "1k",
    badge: "Комплект",
    color: "from-orange-500/20 to-orange-600/10",
    available: true,
  },
  {
    id: "batch",
    name: "Пакетная обработка",
    description: "До 50 фото за раз",
    icon: <Layers className="w-6 h-6" />,
    modelId: "flux-2",
    badge: "Скоро",
    color: "from-indigo-500/20 to-indigo-600/10",
    available: false,
  },
];

// Helper to get tool price from unified pricing
function getToolPrice(tool: Tool): number {
  if (tool.id === "product-card") {
    // Product card = 6 images with flux-2
    return computePrice("flux-2", { quality: "1k", variants: 6 }).stars;
  }
  return computePrice(tool.modelId, { quality: tool.quality }).stars;
}

// ===== BACKGROUND PRESETS =====

const BG_PRESETS = [
  { id: "white", name: "Белый", color: "#FFFFFF" },
  { id: "gray", name: "Серый", color: "#F5F5F5" },
  { id: "gradient-soft", name: "Градиент", color: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" },
  { id: "studio", name: "Студия", prompt: "professional studio lighting, soft shadows, gradient background" },
  { id: "marble", name: "Мрамор", prompt: "white marble surface, elegant, luxury product photography" },
  { id: "wood", name: "Дерево", prompt: "natural wood texture background, warm tones, rustic" },
  { id: "nature", name: "Природа", prompt: "soft green leaves background, natural daylight, fresh" },
  { id: "custom", name: "Свой", prompt: "" },
];

// ===== MOCKUP SCENES =====

const MOCKUP_SCENES = [
  { id: "packaging", name: "Упаковка", icon: "📦", prompt: "product in premium packaging box" },
  { id: "hands", name: "В руках", icon: "🤲", prompt: "product held in hands, lifestyle shot" },
  { id: "table", name: "На столе", icon: "🪑", prompt: "product on clean table, minimalist setting" },
  { id: "shelf", name: "На полке", icon: "📚", prompt: "product on store shelf, retail display" },
  { id: "kitchen", name: "Кухня", icon: "🍳", prompt: "product in modern kitchen setting" },
  { id: "bathroom", name: "Ванная", icon: "🛁", prompt: "product in bathroom setting, spa vibes" },
  { id: "outdoor", name: "На улице", icon: "🌳", prompt: "product outdoor, natural lighting" },
  { id: "office", name: "Офис", icon: "💼", prompt: "product on office desk, professional" },
];

// ===== PAGE COMPONENT =====

export default function EComToolsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [starsBalance, setStarsBalance] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Tool-specific state
  const [selectedBg, setSelectedBg] = useState<string>("white");
  const [customBgPrompt, setCustomBgPrompt] = useState("");
  const [selectedMockup, setSelectedMockup] = useState<string>("packaging");
  const [enhanceLevel, setEnhanceLevel] = useState<"light" | "medium" | "strong">("medium");

  // Load balance
  useEffect(() => {
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

  // File handlers
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Загрузите изображение");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  // Build prompt based on selected tool and options
  const buildPrompt = (tool: Tool): string => {
    let basePrompt = "";
    
    switch (tool.id) {
      case "remove-bg":
        return "Remove background, keep subject, transparent background";
      
      case "replace-bg":
        const bgPreset = BG_PRESETS.find(b => b.id === selectedBg);
        if (selectedBg === "custom" && customBgPrompt) {
          basePrompt = `Product photography, ${customBgPrompt}`;
        } else if (bgPreset?.prompt) {
          basePrompt = `Product photography, ${bgPreset.prompt}`;
        } else {
          basePrompt = `Product photography, clean ${bgPreset?.name || 'white'} background`;
        }
        return basePrompt;
      
      case "enhance":
        const enhancePrompts = {
          light: "Enhance product photo, subtle improvements, natural colors, soft shadows",
          medium: "Professional product photography, enhanced lighting, clean shadows, vibrant colors",
          strong: "Premium product photography, studio lighting, dramatic shadows, high contrast, glossy finish"
        };
        return enhancePrompts[enhanceLevel];
      
      case "mockup":
        const mockupScene = MOCKUP_SCENES.find(s => s.id === selectedMockup);
        return `${mockupScene?.prompt || 'product mockup'}, professional photography, high quality`;
      
      case "upscale-2k":
      case "upscale-4k":
      case "upscale-8k":
        return "Upscale image, enhance details, maintain quality";
      
      case "product-card":
        return "Professional product photography for e-commerce, clean white background, studio lighting, multiple angles";
      
      default:
        return "Professional product photography";
    }
  };

  // Process image with real API
  const handleProcess = async () => {
    if (!uploadedImage || !selectedTool) {
      toast.error("Загрузите изображение и выберите инструмент");
      return;
    }

    const tool = TOOLS.find(t => t.id === selectedTool);
    if (!tool) return;

    const toolPrice = getToolPrice(tool);
    if (starsBalance < toolPrice) {
      toast.error(`Недостаточно звёзд. Нужно: ${toolPrice}⭐, у вас: ${starsBalance}⭐`);
      return;
    }

    setIsProcessing(true);

    try {
      const prompt = buildPrompt(tool);
      
      // Determine mode: i2i for tools that transform existing image
      const mode = ["remove-bg", "replace-bg", "enhance", "upscale-2k", "upscale-4k", "upscale-8k"].includes(tool.id) 
        ? "i2i" 
        : "t2i";

      // Call the real photo generation API
      const response = await fetch("/api/generate/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: tool.modelId,
          prompt,
          quality: tool.quality,
          aspectRatio: "1:1",
          mode,
          referenceImage: mode === "i2i" ? uploadedImage : undefined,
          variants: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Ошибка генерации");
      }

      // Poll for result if we got a jobId/taskId
      if (data.jobId || data.taskId) {
        const jobId = data.jobId || data.taskId;
        const result = await pollForResult(jobId);
        setProcessedImage(result);
      } else if (data.imageUrl || data.url || data.result) {
        // Direct result
        setProcessedImage(data.imageUrl || data.url || data.result);
      } else {
        throw new Error("Не удалось получить результат");
      }

      toast.success("Обработка завершена!");
      
      // Refresh balance
      const balanceRes = await fetch("/api/credits/balance");
      const balanceData = await balanceRes.json();
      if (balanceRes.ok) setStarsBalance(balanceData.balance || 0);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка обработки";
      toast.error(message);
      console.error("[E-Com] Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for generation result
  const pollForResult = async (jobId: string, maxAttempts = 120): Promise<string> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка проверки статуса");
      }

      if (data.status === "completed") {
        const url = data.results?.[0]?.url || data.url || data.imageUrl;
        if (url) return url;
        throw new Error("Результат не найден");
      }

      if (data.status === "failed") {
        throw new Error(data.error || "Генерация не удалась");
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error("Таймаут ожидания результата");
  };

  const handleDownload = () => {
    if (!processedImage) return;
    
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = `lensroom-${selectedTool}-${Date.now()}.png`;
    link.click();
    toast.success("Скачивание начато");
  };

  const handleReset = () => {
    setUploadedImage(null);
    setProcessedImage(null);
    setSelectedTool(null);
  };

  const activeTool = TOOLS.find(t => t.id === selectedTool);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl sticky top-16 z-30">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">E-Com Studio</h1>
                <p className="text-xs text-white/50">AI инструменты для e-commerce</p>
              </div>
            </div>
            
            {/* Balance */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-white">{starsBalance}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push("/pricing")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Пополнить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-7xl py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="bg-gradient-to-r from-orange-500/20 to-rose-500/20 text-orange-400 border-orange-500/30 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Профессиональные фото
            <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent"> за секунды</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Удаляйте фон, добавляйте эффекты, создавайте mockup'ы — всё в одном месте. 
            Как у Freepik, только проще.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Tools Grid */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4">
              Инструменты
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {TOOLS.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => tool.available && setSelectedTool(tool.id)}
                  disabled={!tool.available}
                  className={cn(
                    "relative p-4 rounded-2xl border text-left transition-all overflow-hidden group",
                    selectedTool === tool.id
                      ? "border-orange-500/50 bg-orange-500/10"
                      : tool.available
                        ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        : "border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Background gradient */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
                    tool.color
                  )} />
                  
                  <div className="relative">
                    {/* Badge */}
                    {tool.badge && (
                      <Badge 
                        className={cn(
                          "absolute -top-1 -right-1 text-[10px] px-1.5",
                          tool.badge === "Бесплатно" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          tool.badge === "Популярно" ? "bg-violet-500/20 text-violet-400 border-violet-500/30" :
                          tool.badge === "Новинка" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                          tool.badge === "Pro" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                          "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        )}
                      >
                        {tool.badge}
                      </Badge>
                    )}
                    
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                      selectedTool === tool.id 
                        ? "bg-orange-500/20 text-orange-400" 
                        : "bg-white/10 text-white/70 group-hover:text-white"
                    )}>
                      {tool.icon}
                    </div>
                    
                    {/* Text */}
                    <div className="text-sm font-medium text-white mb-1">{tool.name}</div>
                    <div className="text-xs text-white/50 line-clamp-1">{tool.description}</div>
                    
                    {/* Price */}
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-medium text-white/70">
                        {getToolPrice(tool)}⭐
                      </span>
                    </div>
                  </div>
                  
                  {/* Selected indicator */}
                  {selectedTool === tool.id && (
                    <motion.div
                      layoutId="tool-indicator"
                      className="absolute inset-0 border-2 border-orange-500 rounded-2xl"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Right: Workspace */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 min-h-[600px]">
              {!uploadedImage ? (
                /* Upload Zone */
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "h-full min-h-[500px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center",
                    dragActive
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-white/20 hover:border-white/40"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-6">
                      <Upload className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Загрузите фото товара
                    </h3>
                    <p className="text-white/50 mb-6 max-w-sm">
                      Перетащите изображение сюда или нажмите для выбора
                    </p>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white px-8"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Выбрать файл
                    </Button>
                    <p className="text-xs text-white/30 mt-4">
                      PNG, JPG, WEBP до 10MB
                    </p>
                  </motion.div>
                </div>
              ) : (
                /* Editor */
                <div className="space-y-6">
                  {/* Image Preview */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/50 uppercase">Оригинал</span>
                        <button
                          onClick={handleReset}
                          className="text-xs text-white/50 hover:text-white flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Сброс
                        </button>
                      </div>
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1f] border border-white/10">
                        <img
                          src={uploadedImage}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    
                    {/* Result */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/50 uppercase">Результат</span>
                        {processedImage && (
                          <button
                            onClick={handleDownload}
                            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Скачать
                          </button>
                        )}
                      </div>
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#1a1a1f] border border-white/10 flex items-center justify-center">
                        {isProcessing ? (
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-white/50">Обрабатываем...</p>
                          </div>
                        ) : processedImage ? (
                          <img
                            src={processedImage}
                            alt="Result"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <Wand2 className="w-8 h-8 text-white/20 mx-auto mb-3" />
                            <p className="text-sm text-white/30">
                              Выберите инструмент и нажмите "Применить"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tool Settings */}
                  {selectedTool && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 rounded-2xl p-4 border border-white/10"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                          {activeTool?.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-white">{activeTool?.name}</h4>
                          <p className="text-xs text-white/50">{activeTool?.description}</p>
                        </div>
                      </div>

                      {/* Tool-specific options */}
                      {selectedTool === "replace-bg" && (
                        <div className="space-y-3">
                          <label className="text-xs text-white/50">Выберите фон</label>
                          <div className="grid grid-cols-4 gap-2">
                            {BG_PRESETS.map((bg) => (
                              <button
                                key={bg.id}
                                onClick={() => setSelectedBg(bg.id)}
                                className={cn(
                                  "p-2 rounded-lg border text-center transition-all",
                                  selectedBg === bg.id
                                    ? "border-orange-500 bg-orange-500/10"
                                    : "border-white/10 hover:border-white/20"
                                )}
                              >
                                <div 
                                  className="w-8 h-8 rounded-md mx-auto mb-1"
                                  style={{ background: bg.color || "#333" }}
                                />
                                <span className="text-xs text-white/70">{bg.name}</span>
                              </button>
                            ))}
                          </div>
                          {selectedBg === "custom" && (
                            <input
                              type="text"
                              value={customBgPrompt}
                              onChange={(e) => setCustomBgPrompt(e.target.value)}
                              placeholder="Опишите желаемый фон..."
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 text-sm"
                            />
                          )}
                        </div>
                      )}

                      {selectedTool === "mockup" && (
                        <div className="space-y-3">
                          <label className="text-xs text-white/50">Выберите сцену</label>
                          <div className="grid grid-cols-4 gap-2">
                            {MOCKUP_SCENES.map((scene) => (
                              <button
                                key={scene.id}
                                onClick={() => setSelectedMockup(scene.id)}
                                className={cn(
                                  "p-3 rounded-lg border text-center transition-all",
                                  selectedMockup === scene.id
                                    ? "border-orange-500 bg-orange-500/10"
                                    : "border-white/10 hover:border-white/20"
                                )}
                              >
                                <div className="text-2xl mb-1">{scene.icon}</div>
                                <span className="text-xs text-white/70">{scene.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedTool === "enhance" && (
                        <div className="space-y-3">
                          <label className="text-xs text-white/50">Уровень обработки</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["light", "medium", "strong"] as const).map((level) => (
                              <button
                                key={level}
                                onClick={() => setEnhanceLevel(level)}
                                className={cn(
                                  "p-3 rounded-lg border text-center transition-all",
                                  enhanceLevel === level
                                    ? "border-orange-500 bg-orange-500/10"
                                    : "border-white/10 hover:border-white/20"
                                )}
                              >
                                <span className="text-sm text-white/70">
                                  {level === "light" ? "Лёгкий" : level === "medium" ? "Средний" : "Сильный"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Info className="w-4 h-4" />
                      {selectedTool && activeTool ? (
                        <span>Стоимость: <strong className="text-orange-400">{getToolPrice(activeTool)}⭐</strong></span>
                      ) : (
                        <span>Выберите инструмент слева</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                      <Button
                        onClick={handleProcess}
                        disabled={!selectedTool || isProcessing}
                        className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white min-w-[140px]"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Применить
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Camera className="w-5 h-5 text-cyan-400 mb-2" />
                <h4 className="text-sm font-medium text-white mb-1">Качество фото</h4>
                <p className="text-xs text-white/50">Загружайте фото от 1000px для лучшего результата</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <SunMedium className="w-5 h-5 text-amber-400 mb-2" />
                <h4 className="text-sm font-medium text-white mb-1">Освещение</h4>
                <p className="text-xs text-white/50">Равномерный свет без резких теней</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Contrast className="w-5 h-5 text-violet-400 mb-2" />
                <h4 className="text-sm font-medium text-white mb-1">Контраст</h4>
                <p className="text-xs text-white/50">Товар должен выделяться на фоне</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/70">Нужен полный комплект для карточки?</span>
          </div>
          <br />
          <Button
            size="lg"
            onClick={() => setSelectedTool("product-card")}
            className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white px-8"
          >
            <Package className="w-5 h-5 mr-2" />
            Создать карточку товара
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
