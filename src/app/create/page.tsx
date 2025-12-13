'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, 
  Image as ImageIcon,
  Video,
  Package,
  ChevronDown,
  Wand2,
  BookOpen,
  Settings2,
  Zap,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PHOTO_MODELS, VIDEO_MODELS } from '@/lib/models';
import { useGeneratorStore } from '@/stores/generator-store';
import { useGenerateFromStore } from '@/hooks/use-generate-photo';

const CONTENT_TYPES = [
  { id: 'photo', label: 'Фото', icon: Sparkles },
  { id: 'video', label: 'Видео', icon: Video },
  { id: 'product', label: 'Продукт', icon: Package },
];

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

export default function CreatePage() {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  
  const {
    contentType,
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
    setContentType,
    setPrompt,
    setSelectedModel,
    setAspectRatio,
    setVariants,
    setCfgScale,
    setSteps,
    setNegativePrompt,
  } = useGeneratorStore();

  const { generate, canGenerate } = useGenerateFromStore();

  const models = contentType === 'video' ? VIDEO_MODELS : PHOTO_MODELS;
  const selectedModelData = models.find(m => m.id === selectedModel);

  const addTag = (tag: string) => {
    const newPrompt = prompt ? `${prompt}, ${tag}` : tag;
    setPrompt(newPrompt);
  };

  return (
    <div className="min-h-screen bg-[#08080C]">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-5">
            {/* Content Type Selector */}
            <Card variant="hover">
              <label className="text-xs font-medium text-[#A0A0AA] uppercase tracking-wider mb-3 block">
                Тип контента
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id as 'photo' | 'video' | 'product')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      contentType === type.id
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-[#26262E] hover:border-[#3A3A45] bg-transparent text-[#A0A0AA]"
                    )}
                  >
                    <type.icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Model Selector - Dropdown */}
            <Card variant="hover">
              <label className="text-xs font-medium text-[#A0A0AA] uppercase tracking-wider mb-3 block">
                AI Модель
              </label>
              <div className="relative">
                <button
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                    modelDropdownOpen
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-[#26262E] hover:border-[#3A3A45] bg-[#0F0F14]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#16161D] flex items-center justify-center">
                      <Camera className="w-5 h-5 text-[#A0A0AA]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {selectedModelData?.name || 'Выберите модель'}
                        </span>
                        {selectedModelData?.quality === 'ultra' && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">HIGH</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6B6B78]">
                        <span className="line-clamp-1">{selectedModelData?.description}</span>
                        {selectedModelData?.speed === 'fast' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-500">
                              <Zap className="w-3 h-3" />
                              Быстро
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary" className="font-semibold">
                      ⭐ {selectedModelData?.creditCost ?? '—'}
                    </Badge>
                    <ChevronDown className={cn(
                      "w-5 h-5 text-[#A0A0AA] transition-transform",
                      modelDropdownOpen && "rotate-180"
                    )} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {modelDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setModelDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 
                                 bg-[#0F0F14] border border-[#26262E] 
                                 rounded-xl shadow-2xl overflow-hidden"
                      style={{ zIndex: 9999 }}
                    >
                      <div className="max-h-[300px] overflow-y-auto">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setModelDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3 transition-colors",
                              selectedModel === model.id 
                                ? "bg-purple-600 text-white" 
                                : "hover:bg-[#16161D] text-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                selectedModel === model.id ? "bg-purple-500" : "bg-[#16161D]"
                              )}>
                                <Camera className="w-4 h-4 text-white" />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {model.name}
                                  </span>
                                  {model.quality === 'ultra' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-600 text-white font-bold">HIGH</span>
                                  )}
                                </div>
                                <span className="text-xs text-[#6B6B78] line-clamp-1">{model.description}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {model.speed === 'fast' && (
                                <Zap className="w-4 h-4 text-green-500" />
                              )}
                              <span className="text-sm font-semibold text-yellow-400">
                                ⭐ {model.creditCost ?? '—'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            </Card>

            {/* Prompt */}
            <Card variant="hover">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-[#A0A0AA] uppercase tracking-wider">
                  Промпт
                </label>
                <span className="text-xs text-[#6B6B78]">
                  ⌘ + Enter для генерации
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, что хотите создать..."
                className="w-full h-32 px-4 py-3 rounded-xl
                           bg-[#0F0F14] border-2 border-[#26262E]
                           text-white placeholder:text-[#6B6B78]
                           focus:outline-none focus:border-purple-500
                           resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="text-xs">
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Улучшить AI
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    Библиотека
                  </Button>
                </div>
                <span className="text-xs text-[#6B6B78]">
                  {prompt.length} / 2 000
                </span>
              </div>
            </Card>

            {/* Quick Tags */}
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium
                             bg-[#0F0F14] border border-[#26262E]
                             text-[#A0A0AA] hover:text-white
                             hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>

            {/* Aspect Ratio */}
            <Card variant="hover">
              <label className="text-xs font-medium text-[#A0A0AA] uppercase tracking-wider mb-3 block">
                Соотношение сторон
              </label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id as '1:1' | '16:9' | '9:16' | '4:3')}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      aspectRatio === ratio.id
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-[#26262E] hover:border-[#3A3A45] text-[#A0A0AA]"
                    )}
                  >
                    <span className="text-xl">{ratio.icon}</span>
                    <span className="text-xs font-medium">{ratio.label}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Number of Variants */}
            <Card variant="hover">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-[#A0A0AA] uppercase tracking-wider">
                  Количество вариантов
                </label>
                <span className="text-xs text-[#6B6B78]">{variants}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setVariants(num)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center font-semibold transition-all",
                      variants === num
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-[#26262E] hover:border-[#3A3A45] text-[#A0A0AA]"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </Card>

            {/* Advanced Settings */}
            <Card variant="hover" padding="none">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#A0A0AA]" />
                    <span className="font-medium text-white text-sm">Расширенные настройки</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#A0A0AA] transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 space-y-4 border-t border-[#26262E] pt-4">
                  {/* CFG Scale */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-white">CFG Scale</label>
                      <span className="text-xs font-semibold text-purple-400">{cfgScale}</span>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-white">Steps</label>
                      <span className="text-xs font-semibold text-purple-400">{steps}</span>
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
                    <label className="text-xs text-white mb-2 block">Негативный промпт</label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Что исключить из генерации..."
                      className="w-full h-20 px-3 py-2 rounded-lg text-sm
                                 bg-[#16161D] border border-[#26262E]
                                 text-white placeholder:text-[#6B6B78]
                                 focus:outline-none focus:border-purple-500
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
              className="w-full shadow-lg shadow-purple-500/20"
              disabled={!canGenerate}
              onClick={generate}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                  Генерация {progress}%
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Создать • {selectedModelData?.creditCost ? (selectedModelData.creditCost * variants) + ' ⭐' : '—'}
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Preview */}
          <div>
            <div className="sticky top-24">
              <Card variant="hover" className="overflow-hidden">
                <div className="aspect-square lg:aspect-[4/3] flex items-center justify-center bg-[#0F0F14]">
                  {isGenerating ? (
                    <div className="text-center p-8">
                      <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 
                                      rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-white font-medium">Генерация {progress}%</p>
                      <p className="text-[#6B6B78] text-sm mt-1">Это займёт несколько секунд</p>
                    </div>
                  ) : selectedResult ? (
                    <img 
                      src={selectedResult.url} 
                      alt="" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#26262E] 
                                      flex items-center justify-center mx-auto mb-4 bg-[#16161D]">
                        <ImageIcon className="w-10 h-10 text-[#6B6B78]" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Ваше изображение появится здесь
                      </h3>
                      <p className="text-[#A0A0AA] text-sm">
                        Введите промпт слева и нажмите «Создать» для генерации
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Results Grid */}
              {results.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => useGeneratorStore.setState({ selectedResult: result })}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        selectedResult?.id === result.id
                          ? "border-purple-500"
                          : "border-transparent hover:border-[#3A3A45]"
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
      </div>
    </div>
  );
}
