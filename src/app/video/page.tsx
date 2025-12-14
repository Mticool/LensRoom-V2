'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Video, Star, Upload, X, ArrowDown, Loader2, 
  Sparkles, Play, Download, ExternalLink, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VIDEO_GENERATOR_MODELS,
  getFeaturedVideoModels,
  getVideoModelById,
  getVariantFromUIState,
  getMinCost,
  MODE_LABELS,
  MODE_DESCRIPTIONS,
  type VideoModeId,
  type VideoModelConfig,
} from '@/config/videoGeneratorRegistry';

// ===== MAIN PAGE =====

export default function VideoGeneratorPage() {
  // Model & Mode selection
  const [selectedModelId, setSelectedModelId] = useState(VIDEO_GENERATOR_MODELS[0].id);
  const [selectedMode, setSelectedMode] = useState<VideoModeId>('t2v');
  
  // Inputs
  const [prompt, setPrompt] = useState('');
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  
  // Settings
  const [duration, setDuration] = useState<number | string>(5);
  const [quality, setQuality] = useState<'720p' | '1080p' | 'fast' | 'quality'>('fast');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  // Get current model
  const model = getVideoModelById(selectedModelId);
  
  // Get variant and cost
  const { variant, starsCost } = model 
    ? getVariantFromUIState(selectedModelId, duration, quality, audioEnabled)
    : { variant: null, starsCost: 0 };

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    const newModel = getVideoModelById(modelId);
    if (!newModel) return;
    
    setSelectedModelId(modelId);
    
    // Reset mode if not supported
    if (!newModel.modes.includes(selectedMode)) {
      setSelectedMode(newModel.modes[0]);
    }
    
    // Reset duration to first available
    if (newModel.fixedDuration) {
      setDuration(newModel.fixedDuration);
    } else if (newModel.durationOptions[0]) {
      setDuration(newModel.durationOptions[0]);
    }
    
    // Reset quality
    if (newModel.qualityOptions?.[0]) {
      setQuality(newModel.qualityOptions[0]);
    }
    
    // Reset audio
    setAudioEnabled(false);
    
    // Clear frames
    setStartFrame(null);
    setEndFrame(null);
    setStartFramePreview(null);
    setEndFramePreview(null);
    setResultUrl(null);
  }, [selectedMode]);

  // Handle mode change
  const handleModeChange = useCallback((mode: VideoModeId) => {
    setSelectedMode(mode);
    // Clear frames when changing mode
    if (mode === 't2v') {
      setStartFrame(null);
      setEndFrame(null);
      setStartFramePreview(null);
      setEndFramePreview(null);
    }
  }, []);

  // Validation
  const getValidationError = useCallback((): string | null => {
    if (selectedMode === 't2v' && !prompt.trim()) {
      return 'Введите описание видео';
    }
    if (selectedMode === 'i2v' && !startFrame) {
      return 'Загрузите стартовый кадр';
    }
    if (selectedMode === 'start_end') {
      if (!startFrame) return 'Загрузите стартовый кадр';
      if (!endFrame) return 'Загрузите финальный кадр';
    }
    if (selectedMode === 'storyboard') {
      return 'Раскадровка скоро будет доступна';
    }
    return null;
  }, [selectedMode, prompt, startFrame, endFrame]);

  const validationError = getValidationError();
  const canGenerate = !validationError && !generating;

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || !model || !variant) return;

    setGenerating(true);
    setProgress(0);
    setResultUrl(null);

    try {
      // Build payload
      const formData = new FormData();
      formData.append('model', selectedModelId);
      formData.append('variantId', variant.id);
      formData.append('mode', selectedMode);
      formData.append('prompt', prompt);
      formData.append('aspectRatio', aspectRatio);
      formData.append('duration', String(duration));
      
      if (startFrame) formData.append('startFrame', startFrame);
      if (endFrame) formData.append('endFrame', endFrame);
      if (quality) formData.append('quality', quality);
      if (model.supportsAudio) formData.append('audio', String(audioEnabled));

      // Log payload for now (wire to real API later)
      console.log('Generate video payload:', {
        model: selectedModelId,
        variantId: variant.id,
        mode: selectedMode,
        prompt,
        aspectRatio,
        duration,
        quality,
        audioEnabled,
        hasStartFrame: !!startFrame,
        hasEndFrame: !!endFrame,
        starsCost,
      });

      // TODO: Replace with actual API call
      // const response = await fetch('/api/generate/video', { method: 'POST', body: formData });
      
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(r => setTimeout(r, 300));
        setProgress(i);
      }

      toast.success(`Видео создано! Использовано: ${starsCost} ⭐`);
      // setResultUrl(data.url);
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Ошибка при генерации');
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, model, variant, selectedModelId, selectedMode, prompt, aspectRatio, duration, quality, audioEnabled, startFrame, endFrame, starsCost]);

  if (!model) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-32">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* ===== LEFT SIDEBAR: Model List ===== */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-[var(--gold)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Видео</h1>
                <p className="text-xs text-white/40">{VIDEO_GENERATOR_MODELS.length} моделей</p>
              </div>
            </div>

            {/* Featured Models */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1 mb-2">
                Рекомендуем
              </p>
              {getFeaturedVideoModels().map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={selectedModelId === m.id}
                  onClick={() => handleModelChange(m.id)}
                />
              ))}
            </div>

            {/* All Models */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1 mb-2 mt-3">
                Все модели
              </p>
              {VIDEO_GENERATOR_MODELS.filter(m => !m.featured).map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={selectedModelId === m.id}
                  onClick={() => handleModelChange(m.id)}
                />
              ))}
            </div>
          </div>

          {/* ===== RIGHT PANEL: Preview + Inputs + Settings ===== */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-5">
            
            {/* Preview Card */}
            <PreviewCard 
              resultUrl={resultUrl}
              generating={generating}
              progress={progress}
            />

            {/* Mode Tabs */}
            {model.modes.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {model.modes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                      selectedMode === mode
                        ? "bg-[var(--gold)] text-black"
                        : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}

            {/* Mode Description */}
            <p className="text-sm text-white/40">
              {MODE_DESCRIPTIONS[selectedMode]}
            </p>

            {/* Inputs Card */}
            <InputsCard
              mode={selectedMode}
              prompt={prompt}
              setPrompt={setPrompt}
              startFrame={startFrame}
              setStartFrame={setStartFrame}
              startFramePreview={startFramePreview}
              setStartFramePreview={setStartFramePreview}
              endFrame={endFrame}
              setEndFrame={setEndFrame}
              endFramePreview={endFramePreview}
              setEndFramePreview={setEndFramePreview}
            />

            {/* Basic Settings */}
            <BasicSettingsRow
              model={model}
              duration={duration}
              setDuration={setDuration}
              quality={quality}
              setQuality={setQuality}
              audioEnabled={audioEnabled}
              setAudioEnabled={setAudioEnabled}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
          </div>
        </div>
      </div>

      {/* ===== STICKY COST BAR ===== */}
      <StickyCostBar
        starsCost={starsCost}
        canGenerate={canGenerate}
        validationError={validationError}
        generating={generating}
        progress={progress}
        onGenerate={handleGenerate}
      />
    </div>
  );
}

// ===== MODEL CARD =====

interface ModelCardProps {
  model: VideoModelConfig;
  selected: boolean;
  onClick: () => void;
}

function ModelCard({ model, selected, onClick }: ModelCardProps) {
  const minCost = getMinCost(model);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all",
        selected
          ? "bg-[var(--gold)]/10 border-2 border-[var(--gold)]/50"
          : "bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold text-sm truncate",
            selected ? "text-[var(--gold)]" : "text-white"
          )}>
            {model.name}
          </h3>
          <p className="text-xs text-white/40 truncate mt-0.5">
            {model.short}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[var(--gold)] text-sm font-bold shrink-0 ml-2">
          <span>от {minCost}</span>
          <Star className="w-3.5 h-3.5 fill-current" />
        </div>
      </div>
    </button>
  );
}

// ===== PREVIEW CARD =====

interface PreviewCardProps {
  resultUrl: string | null;
  generating: boolean;
  progress: number;
}

function PreviewCard({ resultUrl, generating, progress }: PreviewCardProps) {
  return (
    <Card className="overflow-hidden bg-white/[0.02] border-white/10">
      <div className="aspect-video relative bg-black/40 flex items-center justify-center">
        {resultUrl ? (
          <video 
            src={resultUrl} 
            controls 
            className="w-full h-full object-contain"
            autoPlay
            loop
          />
        ) : generating ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[var(--gold)] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-[var(--gold)]">{progress}%</span>
              </div>
            </div>
            <p className="text-white/50 text-sm">Создаём видео...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <Play className="w-12 h-12" />
            <p className="text-sm">Превью появится здесь</p>
          </div>
        )}
      </div>
      
      {resultUrl && (
        <div className="p-3 flex gap-2 bg-white/5 border-t border-white/10">
          <Button size="sm" className="bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black">
            <Download className="w-4 h-4 mr-1.5" />
            Скачать
          </Button>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Открыть
          </Button>
        </div>
      )}
    </Card>
  );
}

// ===== INPUTS CARD =====

interface InputsCardProps {
  mode: VideoModeId;
  prompt: string;
  setPrompt: (v: string) => void;
  startFrame: File | null;
  setStartFrame: (f: File | null) => void;
  startFramePreview: string | null;
  setStartFramePreview: (p: string | null) => void;
  endFrame: File | null;
  setEndFrame: (f: File | null) => void;
  endFramePreview: string | null;
  setEndFramePreview: (p: string | null) => void;
}

function InputsCard({
  mode,
  prompt,
  setPrompt,
  startFrame,
  setStartFrame,
  startFramePreview,
  setStartFramePreview,
  endFrame,
  setEndFrame,
  endFramePreview,
  setEndFramePreview,
}: InputsCardProps) {
  
  const handleFileUpload = useCallback(async (
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 10MB)');
      return;
    }
    
    setFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    toast.success('Изображение загружено');
  }, []);

  const removeFile = useCallback((
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    setFile(null);
    setPreview(null);
  }, []);

  // Storyboard placeholder
  if (mode === 'storyboard') {
    return (
      <Card className="p-6 bg-white/[0.02] border-white/10">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Раскадровка</h3>
          <p className="text-white/40 text-sm max-w-md">
            Создание видео из нескольких сцен скоро будет доступно.
            Пока попробуйте другие режимы.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 bg-white/[0.02] border-white/10 space-y-5">
      
      {/* Frame Uploaders */}
      {(mode === 'i2v' || mode === 'start_end') && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-white/70 block">
            {mode === 'start_end' ? 'Кадры для перехода' : 'Стартовый кадр'}
            <span className="text-[var(--gold)] ml-1">*</span>
          </label>
          
          {mode === 'start_end' ? (
            // Two uploaders with arrow
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <FrameUploader
                label="Стартовый кадр"
                file={startFrame}
                preview={startFramePreview}
                onUpload={(f) => handleFileUpload(f, setStartFrame, setStartFramePreview)}
                onRemove={() => removeFile(setStartFrame, setStartFramePreview)}
              />
              
              {/* Arrow */}
              <div className="flex flex-col items-center gap-1 py-2 md:py-0">
                <ArrowDown className="w-6 h-6 text-[var(--gold)] md:rotate-[-90deg]" />
                <span className="text-xs text-white/40">Переход</span>
              </div>
              
              <FrameUploader
                label="Финальный кадр"
                file={endFrame}
                preview={endFramePreview}
                onUpload={(f) => handleFileUpload(f, setEndFrame, setEndFramePreview)}
                onRemove={() => removeFile(setEndFrame, setEndFramePreview)}
              />
            </div>
          ) : (
            // Single uploader
            <FrameUploader
              label="Стартовый кадр"
              file={startFrame}
              preview={startFramePreview}
              onUpload={(f) => handleFileUpload(f, setStartFrame, setStartFramePreview)}
              onRemove={() => removeFile(setStartFrame, setStartFramePreview)}
              className="max-w-sm"
            />
          )}
          
          {mode === 'start_end' && (
            <p className="text-xs text-white/30">
              💡 Лучше один персонаж и похожий ракурс для плавного перехода
            </p>
          )}
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="text-sm font-medium text-white/70 mb-2 block">
          Описание видео
          {mode === 't2v' && <span className="text-[var(--gold)] ml-1">*</span>}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === 't2v' 
              ? 'Опишите сцену, действия, атмосферу...' 
              : 'Опишите желаемое движение (опционально)...'
          }
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                   text-white placeholder:text-white/30 resize-none 
                   focus:outline-none focus:border-[var(--gold)]/50 focus:ring-1 focus:ring-[var(--gold)]/20
                   transition-all"
          rows={3}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-white/30">{prompt.length} / 1000</span>
        </div>
      </div>
    </Card>
  );
}

// ===== FRAME UPLOADER =====

interface FrameUploaderProps {
  label: string;
  file: File | null;
  preview: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  className?: string;
}

function FrameUploader({ label, file, preview, onUpload, onRemove, className }: FrameUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (preview) {
    return (
      <div className={cn("relative aspect-video rounded-xl overflow-hidden border-2 border-[var(--gold)]/50 flex-1", className)}>
        <img src={preview} alt={label} className="w-full h-full object-cover" />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-500 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <span className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 rounded text-[var(--gold)]">
          {label}
        </span>
      </div>
    );
  }

  return (
    <label className={cn(
      "flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed",
      "border-white/20 cursor-pointer hover:border-[var(--gold)]/50 hover:bg-white/5 transition-all flex-1",
      className
    )}>
      <Upload className="w-8 h-8 text-white/40 mb-2" />
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-xs text-white/30 mt-1">PNG, JPG до 10MB</span>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </label>
  );
}

// ===== BASIC SETTINGS ROW =====

interface BasicSettingsRowProps {
  model: VideoModelConfig;
  duration: number | string;
  setDuration: (d: number | string) => void;
  quality: '720p' | '1080p' | 'fast' | 'quality';
  setQuality: (q: '720p' | '1080p' | 'fast' | 'quality') => void;
  audioEnabled: boolean;
  setAudioEnabled: (a: boolean) => void;
  aspectRatio: string;
  setAspectRatio: (ar: string) => void;
}

function BasicSettingsRow({
  model,
  duration,
  setDuration,
  quality,
  setQuality,
  audioEnabled,
  setAudioEnabled,
  aspectRatio,
  setAspectRatio,
}: BasicSettingsRowProps) {
  
  return (
    <Card className="p-5 bg-white/[0.02] border-white/10">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Duration */}
        <div>
          <label className="text-xs font-medium text-white/50 mb-2 block">Длительность</label>
          {model.fixedDuration ? (
            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm">
              {model.fixedDuration}с (фикс.)
            </div>
          ) : (
            <div className="flex gap-1.5">
              {model.durationOptions.map((d) => (
                <button
                  key={String(d)}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    duration === d
                      ? "bg-[var(--gold)] text-black"
                      : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
                  )}
                >
                  {typeof d === 'number' ? `${d}с` : d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quality */}
        {model.qualityOptions && (
          <div>
            <label className="text-xs font-medium text-white/50 mb-2 block">Качество</label>
            <div className="flex gap-1.5">
              {model.qualityOptions.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                    quality === q
                      ? "bg-[var(--gold)] text-black"
                      : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
                  )}
                >
                  {q === 'fast' ? 'Fast' : q === 'quality' ? 'Quality' : q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Audio Toggle */}
        {model.supportsAudio && (
          <div>
            <label className="text-xs font-medium text-white/50 mb-2 block">Звук</label>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={cn(
                "w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                audioEnabled
                  ? "bg-[var(--gold)] text-black"
                  : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
              )}
            >
              {audioEnabled ? '🔊 Включен' : '🔇 Выключен'}
            </button>
          </div>
        )}

        {/* Aspect Ratio */}
        <div>
          <label className="text-xs font-medium text-white/50 mb-2 block">Формат</label>
          <div className="flex gap-1.5">
            {model.aspectRatios.map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  aspectRatio === ar
                    ? "bg-[var(--gold)] text-black"
                    : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
                )}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ===== STICKY COST BAR =====

interface StickyCostBarProps {
  starsCost: number;
  canGenerate: boolean;
  validationError: string | null;
  generating: boolean;
  progress: number;
  onGenerate: () => void;
}

function StickyCostBar({
  starsCost,
  canGenerate,
  validationError,
  generating,
  progress,
  onGenerate,
}: StickyCostBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg)]/95 backdrop-blur-lg border-t border-white/10 z-50">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="flex items-center justify-between py-4">
          {/* Cost Display */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-sm">Стоимость:</span>
              <span className="text-2xl font-bold text-[var(--gold)] flex items-center gap-1">
                {starsCost}
                <Star className="w-5 h-5 fill-current" />
              </span>
            </div>
            
            {validationError && (
              <span className="text-sm text-amber-400">
                {validationError}
              </span>
            )}
          </div>

          {/* Generate Button */}
          <Button
            size="lg"
            className="h-14 px-8 bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-black font-semibold text-lg
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--gold)]/20"
            disabled={!canGenerate}
            onClick={onGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Генерация {progress}%
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Создать видео
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

