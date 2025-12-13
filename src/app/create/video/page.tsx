'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Sparkles, 
  Video,
  ChevronDown,
  Wand2,
  BookOpen,
  Settings2,
  Zap,
  Camera,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VIDEO_MODELS } from '@/lib/models';
import { useVideoGeneratorStore } from '@/stores/video-generator-store';
import { toast } from 'sonner';

const MODE_OPTIONS = [
  { id: 'text-to-video', label: 'Текст → Видео', icon: Wand2 },
  { id: 'image-to-video', label: 'Фото → Видео', icon: ImageIcon },
];

const DURATION_OPTIONS = [3, 5, 10, 15];

const CAMERA_MOVEMENTS = [
  { id: 'static', label: 'Статика' },
  { id: 'pan-left', label: 'Влево' },
  { id: 'pan-right', label: 'Вправо' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'orbit', label: 'Орбита' },
];

const QUICK_TAGS = [
  'кинематографичный',
  'плавное движение',
  '4K качество',
  'профессиональное',
  'эпичный',
  'атмосферный',
];

export default function VideoCreatePage() {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    mode,
    prompt,
    selectedModel,
    duration,
    cameraMovement,
    motionIntensity,
    fps,
    uploadedImage,
    isGenerating,
    progress,
    result,
    setMode,
    setPrompt,
    setSelectedModel,
    setDuration,
    setCameraMovement,
    setMotionIntensity,
    setFps,
    setUploadedImage,
    startGeneration,
    updateProgress,
    completeGeneration,
  } = useVideoGeneratorStore();

  const selectedModelData = VIDEO_MODELS.find(m => m.id === selectedModel);
  const canGenerate = prompt.trim().length > 0 && !isGenerating && (mode === 'text-to-video' || uploadedImage);

  const addTag = (tag: string) => {
    const newPrompt = prompt ? `${prompt}, ${tag}` : tag;
    setPrompt(newPrompt);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 10MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        toast.success('Изображение загружено');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;

    startGeneration('mock-job-id');
    toast.success('Генерация видео началась!');

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 10;
      if (p >= 100) {
        clearInterval(interval);
        completeGeneration({
          id: `video_${Date.now()}`,
          url: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=400',
          model: selectedModel,
          duration,
          resolution: '1080p',
          prompt,
          createdAt: new Date(),
        });
        toast.success('Видео готово! 🎬');
      } else {
        updateProgress(Math.min(99, Math.round(p)));
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-5">
            {/* Mode Selector */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                Режим генерации
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id as 'text-to-video' | 'image-to-video')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      mode === opt.id
                        ? "border-white bg-white/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-transparent"
                    )}
                  >
                    <opt.icon className="w-6 h-6 text-[var(--color-text-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload (for image-to-video) */}
            {mode === 'image-to-video' && (
              <div>
                <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                  Исходное изображение
                </label>
                {uploadedImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--color-border)]">
                    <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-[var(--color-border)] 
                               hover:border-white/30 transition-colors
                               flex flex-col items-center justify-center gap-2 bg-[var(--color-bg-secondary)]"
                  >
                    <Upload className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Загрузить изображение</span>
                    <span className="text-xs text-[var(--color-text-tertiary)]">PNG, JPG до 10MB</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Model Selector - Dropdown */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                AI Модель
              </label>
              <div className="relative">
                <button
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-[var(--color-border)] 
                             hover:border-[var(--color-border-strong)] bg-[var(--color-bg-secondary)] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                      <Video className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {selectedModelData?.name || 'Выберите модель'}
                        </span>
                        {selectedModelData?.quality === 'ultra' && (
                          <Badge variant="gold" className="text-[10px] px-1.5 py-0">PRO</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                        <span>{selectedModelData?.provider}</span>
                        {selectedModelData?.speed === 'fast' && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Быстро
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-semibold">
                      ⭐ {selectedModelData?.creditCost || 0}
                    </Badge>
                    <ChevronDown className={cn(
                      "w-5 h-5 text-[var(--color-text-secondary)] transition-transform",
                      modelDropdownOpen && "rotate-180"
                    )} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 z-50 
                               bg-[var(--color-bg-elevated)] border border-[var(--color-border)] 
                               rounded-xl shadow-xl overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto">
                      {VIDEO_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setModelDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-tertiary)] transition-colors",
                            selectedModel === model.id && "bg-[var(--color-bg-tertiary)]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center">
                              <Video className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[var(--color-text-primary)] text-sm">
                                  {model.name}
                                </span>
                                {model.quality === 'ultra' && (
                                  <Badge variant="gold" className="text-[10px] px-1.5 py-0">PRO</Badge>
                                )}
                              </div>
                              <span className="text-xs text-[var(--color-text-tertiary)]">{model.provider}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {model.speed === 'fast' && (
                              <Zap className="w-4 h-4 text-[var(--color-success)]" />
                            )}
                            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                              ⭐ {model.creditCost}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Промпт
                </label>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  ⌘ + Enter для генерации
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите видео, которое хотите создать..."
                className="w-full h-32 px-4 py-3 rounded-xl
                           bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)]
                           text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
                           focus:outline-none focus:border-white/30
                           resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-2">
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
                <span className="text-xs text-[var(--color-text-tertiary)]">
                  {prompt.length} / 2 000
                </span>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium
                             bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                             text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                             hover:border-[var(--color-border-strong)] transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                Длительность
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all",
                      duration === d
                        ? "border-white bg-white/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    )}
                  >
                    <span className="font-semibold text-[var(--color-text-primary)]">{d}с</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Movement */}
            <div>
              <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 block">
                Движение камеры
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CAMERA_MOVEMENTS.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setCameraMovement(cam.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all",
                      cameraMovement === cam.id
                        ? "border-white bg-white/10"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    )}
                  >
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{cam.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <details className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] 
                                  bg-[var(--color-bg-secondary)] cursor-pointer list-none
                                  hover:border-[var(--color-border-strong)] transition-all">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="font-medium text-[var(--color-text-primary)] text-sm">Расширенные настройки</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)] transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] space-y-4">
                {/* Motion Intensity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[var(--color-text-primary)]">Интенсивность движения</label>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{motionIntensity}%</span>
                  </div>
                  <Slider 
                    value={[motionIntensity]} 
                    onValueChange={([v]) => setMotionIntensity(v)} 
                    min={0} 
                    max={100} 
                    step={5} 
                  />
                </div>

                {/* FPS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[var(--color-text-primary)]">FPS</label>
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{fps}</span>
                  </div>
                  <Slider 
                    value={[fps]} 
                    onValueChange={([v]) => setFps(v)} 
                    min={24} 
                    max={60} 
                    step={6} 
                  />
                </div>
              </div>
            </details>

            {/* Generate Button */}
            <Button
              variant="default"
              size="lg"
              className="w-full"
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
                  Создать видео {(selectedModelData?.creditCost || 0) * Math.ceil(duration / 5)} ⭐
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Preview */}
          <div>
            <div className="sticky top-24">
              <div className="aspect-video rounded-2xl border-2 border-dashed border-[var(--color-border)] 
                              bg-[var(--color-bg-secondary)] flex items-center justify-center overflow-hidden">
                {isGenerating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[var(--color-purple-500)]/30 border-t-[var(--color-purple-500)] 
                                    rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[var(--color-text-secondary)]">Создаём видео {progress}%</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Это может занять несколько минут</p>
                  </div>
                ) : result ? (
                  <video 
                    src={result.url}
                    controls
                    className="w-full h-full object-contain"
                    poster={result.thumbnailUrl}
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-2xl border-2 border-[var(--color-border)] 
                                    flex items-center justify-center mx-auto mb-4">
                      <Video className="w-10 h-10 text-[var(--color-text-tertiary)]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                      Ваше видео появится здесь
                    </h3>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      Опишите видео и нажмите «Создать» для генерации
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}