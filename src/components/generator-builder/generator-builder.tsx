"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Package,
  Upload,
  X,
  Wand2,
  BookOpen,
  ChevronDown,
  Settings2,
  Zap,
  Clock,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useGeneratorBuilderStore } from "@/stores/generator-builder-store";
import { 
  getModelsByContentType, 
  getModelById, 
  getModeById,
  ASPECT_RATIOS,
  DURATION_OPTIONS,
  VARIANT_OPTIONS,
  FPS_OPTIONS,
  formatCredits,
} from "@/config/model-registry";
import type { ContentType, ModeId } from "@/config/generator-types";
import { toast } from "sonner";

// ===== CONTENT TYPE SELECTOR =====

const CONTENT_TYPES = [
  { id: "photo" as ContentType, label: "Фото", icon: ImageIcon },
  { id: "video" as ContentType, label: "Видео", icon: Video },
  { id: "product" as ContentType, label: "Продукт", icon: Package },
];

// ===== SPEED/QUALITY CONFIG =====

const speedConfig = {
  fast: { icon: Zap, label: "Быстро", color: "text-green-500" },
  medium: { icon: Clock, label: "Средне", color: "text-yellow-500" },
  slow: { icon: Clock, label: "Долго", color: "text-orange-500" },
};

const qualityConfig = {
  standard: { label: "STD", color: "bg-zinc-700 text-zinc-300" },
  high: { label: "HIGH", color: "bg-yellow-600 text-white" },
  ultra: { label: "ULTRA", color: "bg-purple-600 text-white" },
};

// ===== MAIN COMPONENT =====

export function GeneratorBuilder() {
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);
  
  const {
    contentType,
    modelId,
    modeId,
    prompt,
    negativePrompt,
    refA,
    refB,
    aspectRatio,
    variants,
    duration,
    fps,
    guidance,
    steps,
    motionStrength,
    isGenerating,
    progress,
    setContentType,
    setModelId,
    setModeId,
    setPrompt,
    setNegativePrompt,
    setRefA,
    setRefB,
    setAspectRatio,
    setVariants,
    setDuration,
    setFps,
    setGuidance,
    setSteps,
    setMotionStrength,
    validate,
    startGeneration,
    updateProgress,
    completeGeneration,
    failGeneration,
    getTotalCredits,
  } = useGeneratorBuilderStore();
  
  const models = getModelsByContentType(contentType);
  const currentModel = getModelById(modelId);
  const currentMode = currentModel ? getModeById(currentModel, modeId) : null;
  const totalCredits = getTotalCredits();
  
  // File upload handler
  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setRef: (ref: File | string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 10MB)");
      return;
    }
    
    setRef(file);
    toast.success("Файл загружен");
  }, []);
  
  // Generate handler
  const handleGenerate = useCallback(async () => {
    const validation = validate();
    if (!validation.valid) {
      validation.errors.forEach((err) => toast.error(err.message));
      return;
    }
    
    startGeneration();
    
    // Mock generation
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        clearInterval(interval);
        completeGeneration([
          {
            id: `gen_${Date.now()}`,
            url: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800",
            type: contentType === "video" ? "video" : "image",
          },
        ]);
        toast.success("Генерация завершена! 🎉");
      } else {
        updateProgress(Math.min(99, Math.round(p)));
      }
    }, 500);
  }, [validate, startGeneration, updateProgress, completeGeneration, contentType]);
  
  const canGenerate = validate().valid && !isGenerating;
  
  return (
    <div className="space-y-5">
      {/* 1. Content Type */}
      <Card variant="hover" padding="md">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 block">
          Тип контента
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setContentType(type.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                contentType === type.id
                  ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              )}
            >
              <type.icon className="w-6 h-6 text-[var(--color-text-primary)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {type.label}
              </span>
            </button>
          ))}
        </div>
      </Card>
      
      {/* 2. Model Selector */}
      <Card variant="hover" padding="md">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 block">
          AI Модель
        </label>
        <ModelDropdown
          models={models}
          selectedId={modelId}
          onSelect={setModelId}
        />
      </Card>
      
      {/* 3. Mode Tabs */}
      {currentModel && currentModel.modes.length > 1 && (
        <Card variant="hover" padding="md">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 block">
            Режим
          </label>
          <div className="flex flex-wrap gap-2">
            {currentModel.modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => !mode.comingSoon && setModeId(mode.id as ModeId)}
                disabled={mode.comingSoon}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  mode.comingSoon && "opacity-50 cursor-not-allowed",
                  modeId === mode.id
                    ? "bg-[var(--color-purple-500)] text-white"
                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {mode.label}
                {mode.comingSoon && " (скоро)"}
              </button>
            ))}
          </div>
          {currentMode?.description && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
              {currentMode.description}
            </p>
          )}
        </Card>
      )}
      
      {/* 4. References */}
      {currentMode && currentMode.refSlots > 0 && (
        <Card variant="hover" padding="md">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 block">
            Референсы
          </label>
          <div className={cn("grid gap-3", currentMode.refSlots === 2 && "grid-cols-2")}>
            {/* Ref A */}
            <RefUploader
              label={currentMode.refLabels.a || "Референс A"}
              required={currentMode.requiredRefs.a}
              value={refA}
              onChange={setRefA}
              inputRef={fileInputRefA}
              onUpload={(e) => handleFileUpload(e, setRefA)}
            />
            
            {/* Ref B */}
            {currentMode.refSlots === 2 && (
              <RefUploader
                label={currentMode.refLabels.b || "Референс B"}
                required={currentMode.requiredRefs.b}
                value={refB}
                onChange={setRefB}
                inputRef={fileInputRefB}
                onUpload={(e) => handleFileUpload(e, setRefB)}
              />
            )}
          </div>
        </Card>
      )}
      
      {/* 5. Prompt */}
      {currentMode?.showPrompt && (
        <Card variant="hover" padding="md">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Промпт
            </label>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {prompt.length} / 2000
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите, что хотите создать..."
            className="w-full h-32 px-4 py-3 rounded-xl
                       bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-border)]
                       text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
                       focus:outline-none focus:border-[var(--color-purple-500)]
                       resize-none transition-all"
          />
          <div className="flex gap-2 mt-3">
            <Button variant="secondary" size="sm">
              <Wand2 className="w-4 h-4 mr-1.5" />
              Улучшить AI
            </Button>
            <Button variant="secondary" size="sm">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Шаблоны
            </Button>
          </div>
        </Card>
      )}
      
      {/* 6. Output Controls */}
      {currentMode && (
        <Card variant="hover" padding="md">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 block">
            Настройки вывода
          </label>
          
          <div className="space-y-4">
            {/* Aspect Ratio */}
            {currentMode.outputControls.aspectRatio && (
              <div>
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-1.5">Соотношение сторон</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_RATIOS.slice(0, 4).map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-all",
                        aspectRatio === ratio.id
                          ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                      )}
                    >
                      <span className="text-sm">{ratio.icon}</span>
                      <span className="text-[10px] text-[var(--color-text-primary)]">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Variants */}
            {currentMode.outputControls.variants && (
              <div>
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-1.5">Количество вариантов</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {VARIANT_OPTIONS.map((v) => (
                    <button
                      key={v}
                      onClick={() => setVariants(v)}
                      className={cn(
                        "p-1.5 rounded-md border text-center text-sm font-medium transition-all",
                        variants === v
                          ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10 text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Duration (Video) */}
            {currentMode.outputControls.duration && (
              <div>
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-1.5">Длительность</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.seconds}
                      onClick={() => setDuration(d.seconds)}
                      className={cn(
                        "p-1.5 rounded-md border text-center text-sm font-medium transition-all",
                        duration === d.seconds
                          ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10 text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* FPS (Video) */}
            {currentMode.outputControls.fps && (
              <div>
                <p className="text-[10px] text-[var(--color-text-secondary)] mb-1.5">FPS</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {FPS_OPTIONS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFps(f)}
                      className={cn(
                        "p-1.5 rounded-md border text-center text-sm font-medium transition-all",
                        fps === f
                          ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10 text-[var(--color-text-primary)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* 7. Advanced Settings */}
      {currentMode && Object.values(currentMode.advancedControls).some(Boolean) && (
        <Card variant="hover" padding="none">
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">
                  Расширенные настройки
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-4">
              {/* Guidance */}
              {currentMode.advancedControls.guidance && (
                <SliderControl
                  label="CFG Scale"
                  value={guidance}
                  onChange={setGuidance}
                  min={1}
                  max={20}
                  step={0.5}
                />
              )}
              
              {/* Steps */}
              {currentMode.advancedControls.steps && (
                <SliderControl
                  label="Steps"
                  value={steps}
                  onChange={setSteps}
                  min={10}
                  max={50}
                  step={5}
                />
              )}
              
              {/* Motion Strength */}
              {currentMode.advancedControls.motionStrength && (
                <SliderControl
                  label="Интенсивность движения"
                  value={motionStrength}
                  onChange={setMotionStrength}
                  min={0}
                  max={100}
                  step={5}
                  suffix="%"
                />
              )}
              
              {/* Negative Prompt */}
              {currentMode.advancedControls.negativePrompt && (
                <div>
                  <label className="text-xs text-[var(--color-text-primary)] mb-2 block">
                    Негативный промпт
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Что исключить из генерации..."
                    className="w-full h-20 px-3 py-2 rounded-lg text-sm
                               bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
                               text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
                               focus:outline-none focus:border-[var(--color-purple-500)]
                               resize-none transition-all"
                  />
                </div>
              )}
            </div>
          </details>
        </Card>
      )}
      
      {/* 8. Generate Button */}
      <Button
        size="lg"
        className="w-full shadow-lg shadow-purple-500/20"
        disabled={!canGenerate}
        onClick={handleGenerate}
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Генерация {progress}%
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Создать • {totalCredits !== null ? `${totalCredits} ⭐` : "—"}
          </>
        )}
      </Button>
    </div>
  );
}

// ===== SUB-COMPONENTS =====

interface ModelDropdownProps {
  models: ReturnType<typeof getModelsByContentType>;
  selectedId: string;
  onSelect: (id: string) => void;
}

function ModelDropdown({ models, selectedId, onSelect }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selected = models.find((m) => m.id === selectedId) || models[0];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all",
          isOpen
            ? "border-[var(--color-purple-500)] bg-[var(--color-purple-500)]/10"
            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-purple-500)]/20 to-[var(--color-blue-500)]/20 flex items-center justify-center">
            {selected.contentType === "video" ? (
              <Video className="w-5 h-5 text-[var(--color-purple-400)]" />
            ) : (
              <ImageIcon className="w-5 h-5 text-[var(--color-purple-400)]" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--color-text-primary)]">
                {selected.name}
              </span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[selected.quality].color)}>
                {qualityConfig[selected.quality].label}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-1">
              {selected.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="gap-1">
            <Star className="w-3 h-3 fill-current" />
            {formatCredits(selected.credits)}
          </Badge>
          <ChevronDown className={cn("w-4 h-4 text-[var(--color-text-secondary)] transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            style={{ zIndex: 9999 }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 transition-colors",
                    selectedId === model.id ? "bg-purple-600" : "hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      selectedId === model.id ? "bg-purple-500" : "bg-zinc-800"
                    )}>
                      {model.contentType === "video" ? (
                        <Video className="w-4 h-4 text-white" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">
                          {model.name}
                        </span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[model.quality].color)}>
                          {qualityConfig[model.quality].label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">
                        {model.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-yellow-500">
                    ⭐ {formatCredits(model.credits)}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

interface RefUploaderProps {
  label: string;
  required: boolean;
  value: File | string | null;
  onChange: (ref: File | string | null) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function RefUploader({ label, required, value, onChange, inputRef, onUpload }: RefUploaderProps) {
  const preview = value instanceof File ? URL.createObjectURL(value) : value;
  
  return (
    <div>
      <p className="text-xs text-[var(--color-text-secondary)] mb-2">
        {label} {required && <span className="text-[var(--color-error)]">*</span>}
      </p>
      {preview ? (
        <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--color-border)]">
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--color-border)] 
                     hover:border-[var(--color-border-strong)] transition-colors
                     flex flex-col items-center justify-center gap-2 bg-[var(--color-bg-tertiary)]"
        >
          <Upload className="w-6 h-6 text-[var(--color-text-tertiary)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">Загрузить</span>
        </button>
      )}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
    </div>
  );
}

interface SliderControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

function SliderControl({ label, value, onChange, min, max, step, suffix = "" }: SliderControlProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-[var(--color-text-primary)]">{label}</label>
        <span className="text-xs font-semibold text-[var(--color-purple-400)]">
          {value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

// Add React import for useState
import React from "react";


