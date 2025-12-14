'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, 
  Image as ImageIcon,
  ChevronDown,
  Wand2,
  BookOpen,
  Settings2,
  Zap,
  Star,
  Check,
  Download,
  Share2,
  RotateCcw,
  Upload,
  X,
  Layers,
  Type,
  History,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHOTO_MODELS } from '@/lib/models';
import { useGeneratorStore } from '@/stores/generator-store';
import { useGenerateFromStore } from '@/hooks/use-generate-photo';
import { toast } from 'sonner';
import { getEffectById } from '@/config/effectsGallery';

const QUICK_TAGS = [
  'высокое качество',
  '4K',
  'детализированный',
  'реалистичный',
  'кинематографичный',
  'профессиональный',
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', icon: '□' },
  { id: '16:9', label: '16:9', icon: '▭' },
  { id: '9:16', label: '9:16', icon: '▯' },
  { id: '4:3', label: '4:3', icon: '⬜' },
];

const MODES = [
  { id: 't2i', label: 'Текст → Фото', icon: Type, description: 'Создать из текстового описания' },
  { id: 'i2i', label: 'Фото → Фото', icon: Layers, description: 'Преобразовать существующее изображение' },
];

export default function CreatePage() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [presetApplied, setPresetApplied] = useState(false);

  const {
    prompt,
    selectedModel,
    aspectRatio,
    variants,
    cfgScale,
    steps,
    negativePrompt,
    isGenerating,
    progress,
    results,
    selectedResult,
    history,
    setPrompt,
    setSelectedModel,
    setAspectRatio,
    setVariants,
    setCfgScale,
    setSteps,
    setNegativePrompt,
  } = useGeneratorStore();

  // Local state for mode and reference (since store might not have types yet)
  const [mode, setMode] = useState<'t2i' | 'i2i'>('t2i');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(0.75);

  // Handle preset from URL params
  useEffect(() => {
    if (presetApplied) return;
    
    const presetId = searchParams.get('preset');
    const modelParam = searchParams.get('model');
    const modeParam = searchParams.get('mode');
    
    if (presetId) {
      const preset = getEffectById(presetId);
      if (preset) {
        // Apply preset settings
        if (preset.templatePrompt) {
          setPrompt(preset.templatePrompt);
        }
        if (preset.modelKey) {
          setSelectedModel(preset.modelKey);
        }
        if (preset.mode === 'i2i') {
          setMode('i2i');
        }
        toast.success(`Пресет "${preset.title}" загружен`);
        setPresetApplied(true);
        return;
      }
    }
    
    // Handle individual params
    if (modelParam) {
      const model = PHOTO_MODELS.find(m => m.id === modelParam);
      if (model) {
        setSelectedModel(modelParam);
      }
    }
    
    if (modeParam === 'i2i') {
      setMode('i2i');
    }
    
    setPresetApplied(true);
  }, [searchParams, presetApplied, setPrompt, setSelectedModel]);

  const { generate, canGenerate } = useGenerateFromStore();
  const selectedModelData = PHOTO_MODELS.find(m => m.id === selectedModel);
  
  // Check if selected model supports i2i
  const modelSupportsI2i = selectedModelData?.supportsI2i ?? false;
  
  // Auto-switch to t2i if model doesn't support i2i
  const handleModeChange = useCallback((newMode: 't2i' | 'i2i') => {
    if (newMode === 'i2i' && !modelSupportsI2i) {
      toast.error(`${selectedModelData?.name} не поддерживает режим Фото → Фото`);
      return;
    }
    setMode(newMode);
  }, [modelSupportsI2i, selectedModelData?.name]);
  
  // When model changes, check if current mode is supported
  const handleModelChange = useCallback((modelId: string) => {
    const model = PHOTO_MODELS.find(m => m.id === modelId);
    setSelectedModel(modelId);
    
    // If current mode is i2i but new model doesn't support it, switch to t2i
    if (mode === 'i2i' && !model?.supportsI2i) {
      setMode('t2i');
      toast.info(`${model?.name} работает только в режиме Текст → Фото`);
    }
  }, [mode, setSelectedModel]);

  const addTag = (tag: string) => {
    const newPrompt = prompt ? `${prompt}, ${tag}` : tag;
    setPrompt(newPrompt);
  };

  const totalCredits = selectedModelData?.creditCost 
    ? selectedModelData.creditCost * variants 
    : null;

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setReferenceImage(e.target?.result as string);
      toast.success('Референс загружен');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const clearReference = () => {
    setReferenceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Check if can generate in i2i mode
  const canGenerateNow = mode === 't2i' ? canGenerate : (canGenerate && referenceImage);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="flex">
        {/* Left Sidebar - Models & History */}
        <aside className="w-64 min-h-screen border-r border-[var(--border)] bg-[var(--surface)] flex-shrink-0 sticky top-0 overflow-y-auto">
          <div className="p-4">
            {/* Models Section */}
            <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 px-2">
              Фото модели
            </h2>
            <div className="space-y-1">
              {PHOTO_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all group",
                    selectedModel === model.id
                      ? "bg-[var(--gold)]/20 border border-[var(--gold)]/50"
                      : "hover:bg-[var(--surface2)] border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          selectedModel === model.id ? "text-[var(--text)]" : "text-[var(--text2)]"
                        )}>
                          {model.name}
                        </span>
                        {selectedModel === model.id && (
                          <Check className="w-3.5 h-3.5 text-[var(--gold)] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--muted)] line-clamp-1 mt-0.5">
                        {model.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {model.quality === 'ultra' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                        ULTRA
                      </span>
                    )}
                    {model.speed === 'fast' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />
                        FAST
                      </span>
                    )}
                    {model.supportsI2i && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--gold)]/20 text-[var(--gold)] font-bold flex items-center gap-0.5">
                        <Layers className="w-2.5 h-2.5" />
                        i2i
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5 ml-auto">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {model.creditCost ?? '—'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    История
                  </h2>
                  <button 
                    onClick={() => useGeneratorStore.setState({ history: [] })}
                    className="text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {history.slice(0, 9).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => useGeneratorStore.setState({ selectedResult: item })}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all"
                    >
                      <img src={item.thumbnail || item.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImagePlus 
                          className="w-4 h-4 text-white cursor-pointer hover:text-[var(--gold)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceImage(item.url);
                            setMode('i2i');
                            toast.success('Установлено как референс');
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
                {history.length > 9 && (
                  <p className="text-[10px] text-[var(--muted)] text-center mt-2">
                    +{history.length - 9} ещё
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Generator Controls */}
              <div className="space-y-4">
                {/* Mode Selector */}
                <div className="flex gap-2 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  {MODES.map((m) => {
                    const isDisabled = m.id === 'i2i' && !modelSupportsI2i;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleModeChange(m.id as 't2i' | 'i2i')}
                        disabled={isDisabled}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
                          mode === m.id
                            ? "bg-[var(--gold)] text-[#0a0a0f] shadow-lg shadow-[var(--gold-glow)]"
                            : isDisabled
                              ? "text-[var(--muted)]/50 cursor-not-allowed"
                              : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                        )}
                      >
                        <m.icon className="w-4 h-4" />
                        {m.label}
                        {isDisabled && (
                          <span className="text-[9px] text-[var(--muted)]">(недоступно)</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Model Info */}
                {selectedModelData && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text)]">{selectedModelData.name}</span>
                        {selectedModelData.quality === 'ultra' && (
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0">ULTRA</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)]">{selectedModelData.description}</p>
                    </div>
                    <Badge variant="primary" className="font-bold">
                      ⭐ {selectedModelData.creditCost ?? '—'}
                    </Badge>
                  </div>
                )}

                {/* Reference Image Upload (for i2i mode) */}
                {mode === 'i2i' && (
                  <Card variant="hover" padding="sm">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">
                        Референс <span className="text-red-400">*</span>
                      </label>
                      {referenceImage && (
                        <button
                          onClick={clearReference}
                          className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      {/* Upload Area */}
                      <div className="w-24 flex-shrink-0">
                        {referenceImage ? (
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--surface2)] border border-[var(--border)]">
                            <img 
                              src={referenceImage} 
                              alt="Reference" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={cn(
                              "aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-all",
                              "flex flex-col items-center justify-center",
                              isDragging
                                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                                : "border-[var(--border)] hover:border-[var(--gold)]/50 bg-[var(--surface2)]"
                            )}
                          >
                            <Upload className={cn(
                              "w-5 h-5 transition-colors",
                              isDragging ? "text-[var(--gold)]" : "text-[var(--muted)]"
                            )} />
                          </div>
                        )}
                      </div>
                      
                      {/* Strength Slider */}
                      <div className="flex-1 flex flex-col justify-center">
                        {referenceImage ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-[var(--muted)]">Влияние</label>
                              <span className="text-[10px] font-semibold text-[var(--gold)]">{Math.round(referenceStrength * 100)}%</span>
                            </div>
                            <Slider 
                              value={[referenceStrength]} 
                              onValueChange={([v]) => setReferenceStrength(v)} 
                              min={0.1} 
                              max={1} 
                              step={0.05} 
                            />
                            <p className="text-[9px] text-[var(--muted)] mt-1.5">
                              Больше = ближе к оригиналу
                            </p>
                          </>
                        ) : (
                          <div className="text-center">
                            <p className="text-[11px] text-[var(--text2)]">
                              Перетащите или <span className="text-[var(--gold)] cursor-pointer" onClick={() => fileInputRef.current?.click()}>выберите</span>
                            </p>
                            <p className="text-[9px] text-[var(--muted)] mt-0.5">PNG, JPG до 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </Card>
                )}

                {/* Prompt */}
                <Card variant="hover" padding="md">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wider">
                      {mode === 'i2i' ? 'Что изменить' : 'Промпт'}
                    </label>
                    <span className="text-[10px] text-[var(--muted)]">
                      {prompt.length} / 2000
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={mode === 'i2i' 
                      ? "Опишите, что хотите изменить в изображении..." 
                      : "Опишите, что хотите создать..."
                    }
                    className="w-full h-28 px-3 py-2.5 rounded-lg text-sm
                               bg-[var(--surface2)] border border-[var(--border)]
                               text-[var(--text)] placeholder:text-[var(--muted)]
                               focus:outline-none focus:border-[var(--gold)]
                               resize-none transition-all"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="secondary" size="sm" className="text-xs h-7">
                      <Wand2 className="w-3 h-3 mr-1" />
                      Улучшить
                    </Button>
                    <Button variant="secondary" size="sm" className="text-xs h-7">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Шаблоны
                    </Button>
                  </div>
                </Card>

                {/* Quick Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium
                                 bg-[var(--surface)] border border-[var(--border)]
                                 text-[var(--text2)] hover:text-[var(--text)]
                                 hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                {/* Settings Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Aspect Ratio */}
                  <Card variant="hover" padding="sm">
                    <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                      Соотношение
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {ASPECT_RATIOS.map((ratio) => (
                        <button
                          key={ratio.id}
                          onClick={() => setAspectRatio(ratio.id as '1:1' | '16:9' | '9:16' | '4:3')}
                          className={cn(
                            "flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-all",
                            aspectRatio === ratio.id
                              ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                              : "border-[var(--border)] hover:border-[var(--gold)]/50 text-[var(--text2)]"
                          )}
                        >
                          <span className="text-sm">{ratio.icon}</span>
                          <span className="text-[9px] font-medium">{ratio.label}</span>
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Variants */}
                  <Card variant="hover" padding="sm">
                    <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                      Варианты
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() => setVariants(num)}
                          className={cn(
                            "p-1.5 rounded-md border text-center text-sm font-medium transition-all",
                            variants === num
                              ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                              : "border-[var(--border)] hover:border-[var(--gold)]/50 text-[var(--text2)]"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Advanced Settings */}
                <Card variant="hover" padding="none">
                  <details className="group">
                    <summary className="flex items-center justify-between p-3 cursor-pointer list-none">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span className="font-medium text-[var(--text2)] text-xs">Расширенные настройки</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="px-3 pb-3 space-y-3 border-t border-[var(--border)] pt-3">
                      {/* CFG Scale */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-[var(--text2)]">CFG Scale</label>
                          <span className="text-[10px] font-semibold text-[var(--gold)]">{cfgScale}</span>
                        </div>
                        <Slider 
                          value={[cfgScale]} 
                          onValueChange={([v]) => setCfgScale(v)} 
                          min={1} 
                          max={20} 
                          step={0.5} 
                        />
                      </div>

                      {/* Steps */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-[var(--text2)]">Steps</label>
                          <span className="text-[10px] font-semibold text-[var(--gold)]">{steps}</span>
                        </div>
                        <Slider 
                          value={[steps]} 
                          onValueChange={([v]) => setSteps(v)} 
                          min={10} 
                          max={50} 
                          step={5} 
                        />
                      </div>

                      {/* Negative Prompt */}
                      <div>
                        <label className="text-[10px] text-[var(--text2)] mb-1.5 block">Негативный промпт</label>
                        <textarea
                          value={negativePrompt}
                          onChange={(e) => setNegativePrompt(e.target.value)}
                          placeholder="Что исключить из генерации..."
                          className="w-full h-16 px-2.5 py-2 rounded-lg text-xs
                                     bg-[var(--surface2)] border border-[var(--border)]
                                     text-[var(--text)] placeholder:text-[var(--muted)]
                                     focus:outline-none focus:border-[var(--gold)]
                                     resize-none transition-all"
                        />
                      </div>
                    </div>
                  </details>
                </Card>

                {/* Generate Button */}
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  disabled={!canGenerateNow}
                  onClick={generate}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                      Генерация {progress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {mode === 'i2i' ? 'Преобразовать' : 'Создать'} {totalCredits ? `• ${totalCredits} ⭐` : ''}
                    </>
                  )}
                </Button>

                {mode === 'i2i' && !referenceImage && (
                  <p className="text-xs text-center text-amber-400/80">
                    Загрузите референс изображение для генерации
                  </p>
                )}
              </div>

              {/* Preview Panel */}
              <div className="xl:sticky xl:top-6 xl:self-start">
                <Card variant="hover" className="overflow-hidden" padding="none">
                  <div className="aspect-square flex items-center justify-center bg-[var(--surface2)]">
                    {isGenerating ? (
                      <div className="text-center p-8">
                        <div className="w-14 h-14 border-4 border-[var(--gold)]/30 border-t-[var(--gold)] 
                                        rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[var(--text)] font-medium text-sm">Генерация {progress}%</p>
                        <p className="text-[var(--muted)] text-xs mt-1">Это займёт несколько секунд</p>
                      </div>
                    ) : selectedResult ? (
                      <img 
                        src={selectedResult.url} 
                        alt="" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] 
                                        flex items-center justify-center mx-auto mb-4 bg-[var(--surface)]">
                          <ImageIcon className="w-8 h-8 text-[var(--muted)]" />
                        </div>
                        <h3 className="text-base font-semibold text-[var(--text)] mb-1">
                          Превью
                        </h3>
                        <p className="text-[var(--muted)] text-xs">
                          Результат генерации появится здесь
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Bar */}
                  {selectedResult && (
                    <div className="flex items-center justify-between p-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          Скачать
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 px-2.5 text-xs"
                          onClick={() => {
                            setReferenceImage(selectedResult.url);
                            setMode('i2i');
                            toast.success('Установлено как референс');
                          }}
                        >
                          <ImagePlus className="w-3 h-3 mr-1" />
                          Как референс
                        </Button>
                        <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs">
                          <Share2 className="w-3 h-3 mr-1" />
                          Поделиться
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Ещё
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Results Grid */}
                {results.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => useGeneratorStore.setState({ selectedResult: result })}
                        className={cn(
                          "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          selectedResult?.id === result.id
                            ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/20"
                            : "border-transparent hover:border-[var(--gold)]/50"
                        )}
                      >
                        <img src={result.thumbnail || result.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
