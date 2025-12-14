'use client';

import { useState, useRef } from 'react';
import { Upload, Wand2, Package, Image as ImageIcon, Check, X, Download, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchProcessor, ExamplesGallery, BackgroundRemover } from '@/components/products';
import { 
  PRODUCT_CATEGORIES, 
  PRODUCT_SCENES, 
  getTemplatesByCategory,
  type ProductScene 
} from '@/lib/products-config';
import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_FORMATS, createImagePreview, isHeicFile, convertHeicToJpeg } from '@/lib/image-utils';
import { toast } from 'sonner';
import { Star, Zap, Sparkles } from 'lucide-react';

// Модели для продуктов
const PRODUCT_MODELS = [
  {
    id: 'flux-2',
    name: 'FLUX.2',
    credits: 8,
    description: 'Лучшие текстуры и материалы',
    recommended: true,
    bestFor: ['Одежда', 'Обувь', 'Аксессуары'],
  },
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    credits: 5,
    description: 'Рекламный фотореал, чистые фоны',
    recommended: false,
    bestFor: ['Косметика', 'Электроника', 'WB/Ozon'],
  },
  {
    id: 'imagen-4-ultra',
    name: 'Imagen 4 Ultra',
    credits: 12,
    description: 'Премиум качество для бренда',
    recommended: false,
    bestFor: ['Ювелирка', 'Premium', 'Брендинг'],
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    credits: 3,
    description: 'Быстро и недорого',
    recommended: false,
    bestFor: ['Тесты', 'Массовая генерация'],
  },
];

// Автоподбор модели под сцену
function getBestModelForScene(scene: string): string {
  const sceneModelMap: Record<string, string> = {
    'studio-white': 'seedream-4.5',
    'studio-gradient': 'flux-2',
    'lifestyle-home': 'seedream-4.5',
    'lifestyle-outdoor': 'seedream-4.5',
    'lifestyle-office': 'seedream-4.5',
    'lifestyle-cafe': 'seedream-4.5',
    'hands-holding': 'flux-2',
    'flat-lay': 'seedream-4.5',
    'luxury': 'imagen-4-ultra',
    'nature': 'seedream-4.5',
  };
  return sceneModelMap[scene] || 'flux-2';
}

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Одежда');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string>('studio-white');
  const [productName, setProductName] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [isUploading, setIsUploading] = useState(false);

  // Model state
  const [selectedModel, setSelectedModel] = useState('flux-2');
  const [autoSelectModel, setAutoSelectModel] = useState(true);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cleanedImage, setCleanedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get current model config
  const currentModel = PRODUCT_MODELS.find(m => m.id === selectedModel) || PRODUCT_MODELS[0];

  const categoryTemplates = getTemplatesByCategory(selectedCategory);
  const selectedSceneData = PRODUCT_SCENES.find((s: ProductScene) => s.id === selectedScene);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCleanedImage(null);
    setResult(null);
    
    try {
      let processedFile = file;
      if (isHeicFile(file)) {
        processedFile = await convertHeicToJpeg(file);
      }
      const preview = await createImagePreview(processedFile);
      setUploadedImage(preview);
      setUploadedFile(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !productName) {
      toast.error('Загрузите фото и введите название товара');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      // Convert base64 to File
      const imageToUse = cleanedImage || uploadedImage;
      const blob = await fetch(imageToUse).then(r => r.blob());
      const file = new File([blob], 'product.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('productImage', file);
      formData.append('productName', productName);
      formData.append('scene', selectedScene);
      formData.append('model', selectedModel);
      if (selectedTemplate) {
        formData.append('templateId', selectedTemplate);
      }

      const response = await fetch('/api/generate/product', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Недостаточно кредитов. Нужно: ${data.required}, есть: ${data.current}`);
          return;
        }
        if (response.status === 401) {
          toast.error('Необходимо авторизоваться');
          return;
        }
        throw new Error(data.error);
      }

      toast.success(`Генерация началась! Использовано: ${data.creditsUsed} кредитов`);
      
      // Poll for result
      pollGenerationStatus(data.taskId);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при генерации';
      toast.error(message);
      setGenerating(false);
    }
  };

  const pollGenerationStatus = (taskId: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    let pollCount = 0;
    const maxPolls = 60; // 2 minutes max (2s intervals)

    pollingRef.current = setInterval(async () => {
      pollCount++;
      setProgress(Math.min((pollCount / maxPolls) * 100, 95));

      try {
        const response = await fetch(`/api/generate/product/status?taskId=${taskId}`);
        const data = await response.json();

        if (data.status === 'completed' && data.imageUrl) {
          setResult(data.imageUrl);
          setProgress(100);
          toast.success('Фото готово!');
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setGenerating(false);
        } else if (data.status === 'failed') {
          toast.error(data.error || 'Ошибка при генерации');
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setGenerating(false);
          setProgress(0);
        }

        if (pollCount >= maxPolls) {
          toast.error('Превышено время ожидания');
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setGenerating(false);
          setProgress(0);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };

  const handleReset = () => {
    setResult(null);
    setProgress(0);
  };

  const handleDownload = () => {
    if (result) {
      window.open(result, '_blank');
    }
  };

  const handleCleanedImage = (imageUrl: string) => {
    setCleanedImage(imageUrl);
    toast.success('Фон успешно удалён');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-[#c8ff00]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Генератор для маркетплейсов
              </h1>
              <p className="text-sm text-white/50">
                Профессиональные фото товаров для WB, Ozon и других площадок
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 mb-8 max-w-md">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              mode === 'single'
                ? 'bg-[#c8ff00] text-black'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            <ImageIcon className="w-4 h-4" />
            Один товар
          </button>
          <button
            type="button"
            onClick={() => setMode('batch')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              mode === 'batch'
                ? 'bg-[#c8ff00] text-black'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            <Package className="w-4 h-4" />
            Пакетная
          </button>
        </div>

        {/* Result Display */}
        {result && mode === 'single' && (
          <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Результат
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-white/50 mb-2">До</p>
                <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <img 
                    src={uploadedImage!} 
                    alt="Before" 
                    className="w-full h-full object-contain p-4" 
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-white/50 mb-2">После</p>
                <div className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-[#c8ff00]/30">
                  <img 
                    src={result} 
                    alt="After" 
                    className="w-full h-full object-contain p-4" 
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleDownload}
                className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Создать ещё
              </Button>
            </div>
          </div>
        )}

        {/* Single Mode */}
        {mode === 'single' && !result && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Upload & Settings */}
            <div className="space-y-5">
              {/* Upload Product */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">
                  Фото товара
                </label>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  {uploadedImage ? (
                    <div className="relative aspect-square">
                      <img 
                        src={cleanedImage || uploadedImage} 
                        alt="Product" 
                        className="w-full h-full object-contain bg-white/5 p-4" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedImage(null);
                          setUploadedFile(null);
                          setCleanedImage(null);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-sm 
                                 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {cleanedImage && (
                        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                          Фон удалён
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className={cn(
                      "flex flex-col items-center justify-center aspect-square cursor-pointer",
                      "hover:bg-white/[0.04] transition-colors p-8",
                      isUploading && "pointer-events-none opacity-50"
                    )}>
                      {isUploading ? (
                        <div className="w-10 h-10 border-2 border-[#c8ff00]/30 border-t-[#c8ff00] rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-white/30 mb-3" />
                          <span className="text-sm font-medium text-white/70 mb-1">
                            Загрузите фото товара
                          </span>
                          <span className="text-xs text-white/40 text-center">
                            PNG, JPG или HEIC на белом/прозрачном фоне
                          </span>
                        </>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept={ACCEPTED_IMAGE_FORMATS}
                        onChange={handleImageUpload} 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Background Remover */}
              {uploadedFile && !cleanedImage && (
                <BackgroundRemover
                  imageFile={uploadedFile}
                  imagePreview={uploadedImage}
                  onRemoved={handleCleanedImage}
                />
              )}

              {/* Product Name */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  Название товара
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Например: красные кроссовки Nike"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder:text-white/30
                           focus:outline-none focus:border-[#c8ff00]/50 transition-colors"
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">
                  Категория товара
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setSelectedTemplate(null);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
                        selectedCategory === cat
                          ? 'bg-[#c8ff00]/10 border border-[#c8ff00]/50 text-[#c8ff00]'
                          : 'bg-white/[0.02] border border-white/10 text-white/60 hover:border-white/20'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/70">
                    AI модель
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSelectModel(!autoSelectModel);
                      if (!autoSelectModel) {
                        setSelectedModel(getBestModelForScene(selectedScene));
                      }
                    }}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-lg transition-all",
                      autoSelectModel
                        ? "bg-[#c8ff00]/20 text-[#c8ff00]"
                        : "bg-white/5 text-white/40 hover:text-white/60"
                    )}
                  >
                    {autoSelectModel ? '✓ Авто' : 'Авто'}
                  </button>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {PRODUCT_MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(model.id);
                        setAutoSelectModel(false);
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all",
                        selectedModel === model.id
                          ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50'
                          : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium text-sm",
                            selectedModel === model.id ? 'text-[#c8ff00]' : 'text-white'
                          )}>
                            {model.name}
                          </h4>
                          {model.recommended && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-emerald-400" />ТОП
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[#c8ff00]">
                          {model.credits}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/40 mb-1.5">
                        {model.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {model.bestFor.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/40"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: Scene Selection */}
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">
                  Выберите сцену
                </label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {PRODUCT_SCENES.map((scene: ProductScene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        setSelectedScene(scene.id);
                        if (autoSelectModel) {
                          setSelectedModel(getBestModelForScene(scene.id));
                        }
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all",
                        selectedScene === scene.id
                          ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50'
                          : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xl">{scene.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "font-medium text-sm",
                              selectedScene === scene.id ? 'text-[#c8ff00]' : 'text-white'
                            )}>
                              {scene.name}
                            </h3>
                            {scene.popular && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#c8ff00]/20 text-[#c8ff00] rounded">
                                ХИТ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">
                            {scene.description}
                          </p>
                        </div>
                        {selectedScene === scene.id && (
                          <Check className="w-4 h-4 text-[#c8ff00] shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              {generating && (
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#c8ff00] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/40 text-center">
                    Генерация... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!uploadedImage || !productName || generating}
                className="w-full h-14 text-base font-semibold rounded-xl bg-[#c8ff00] text-black hover:bg-[#b8ef00] disabled:bg-[#c8ff00]/30 disabled:text-black/50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Создать фото
                    <span className="ml-2 opacity-70">• {currentModel.credits} кредитов</span>
                  </>
                )}
              </Button>
            </div>

            {/* Right: Templates & Preview */}
            <div className="space-y-5">
              {/* Templates */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">
                  Готовые шаблоны для {selectedCategory}
                </label>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {categoryTemplates.length > 0 ? (
                    categoryTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all",
                          selectedTemplate === template.id
                            ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50'
                            : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                        )}
                      >
                        <h4 className={cn(
                          "font-medium text-sm mb-1.5",
                          selectedTemplate === template.id ? 'text-[#c8ff00]' : 'text-white'
                        )}>
                          {template.name}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/30 text-sm">
                      Нет шаблонов для этой категории
                    </div>
                  )}
                </div>
              </div>

              {/* Examples Gallery */}
              <ExamplesGallery />
            </div>
          </div>
        )}

        {/* Batch Mode */}
        {mode === 'batch' && (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left: Scene & Category Settings */}
            <div className="lg:col-span-4 space-y-5">
              {/* Scene Selection */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-3 block">
                  Сцена для всех товаров
                </label>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {PRODUCT_SCENES.map((scene: ProductScene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        setSelectedScene(scene.id);
                        if (autoSelectModel) {
                          setSelectedModel(getBestModelForScene(scene.id));
                        }
                      }}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all",
                        selectedScene === scene.id
                          ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50'
                          : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-xl">{scene.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={cn(
                              "font-medium text-sm",
                              selectedScene === scene.id ? 'text-[#c8ff00]' : 'text-white'
                            )}>
                              {scene.name}
                            </h3>
                            {scene.popular && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-[#c8ff00]/20 text-[#c8ff00] rounded">
                                ХИТ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">
                            {scene.description}
                          </p>
                        </div>
                        {selectedScene === scene.id && (
                          <Check className="w-4 h-4 text-[#c8ff00] shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Batch Processor */}
            <div className="lg:col-span-8">
              <BatchProcessor />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

