'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Star,
  Check,
  Download,
  Share2,
  RotateCcw,
  Upload,
  X,
  Type,
  ImageIcon,
  History,
  Volume2,
  Clock,
  Layers,
  Plus,
  Trash2,
  GripVertical,
  Film,
  ArrowRight,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VIDEO_MODELS, getModelById } from '@/config/models';
import { useVideoGeneratorStore } from '@/stores/video-generator-store';
import { toast } from 'sonner';
import { getEffectById } from '@/config/effectsGallery';
import { computePrice, formatPriceDisplay } from '@/lib/pricing/compute-price';

type VideoModeId = 't2v' | 'i2v' | 'start_end' | 'storyboard';

function VideoCreatePageLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
    </div>
  );
}

export default function VideoCreatePage() {
  return (
    <Suspense fallback={<VideoCreatePageLoading />}>
      <VideoCreatePageContent />
    </Suspense>
  );
}

interface StoryboardScene {
  id: string;
  prompt: string;
  image?: string;
}

const MODES = [
  { id: 't2v' as VideoModeId, label: 'Текст → Видео', icon: Type, description: 'Создать из описания' },
  { id: 'i2v' as VideoModeId, label: 'Фото → Видео', icon: ImageIcon, description: 'Анимировать фото' },
  { id: 'start_end' as VideoModeId, label: 'Старт → Финиш', icon: ArrowRight, description: 'Переход между кадрами' },
  { id: 'storyboard' as VideoModeId, label: 'Раскадровка', icon: LayoutGrid, description: 'Мультисцены' },
];

const DURATION_OPTIONS = [
  { value: 5, label: '5с' },
  { value: 10, label: '10с' },
  { value: 15, label: '15с' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', icon: '▭' },
  { id: '9:16', label: '9:16', icon: '▯' },
  { id: '1:1', label: '1:1', icon: '□' },
];

const QUICK_TAGS = [
  'кинематографичный',
  'плавное движение',
  '4K качество',
  'эпичный',
  'атмосферный',
  'динамичный',
];

function VideoCreatePageContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startImageRef = useRef<HTMLInputElement>(null);
  const endImageRef = useRef<HTMLInputElement>(null);
  const sceneImageRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [currentMode, setCurrentMode] = useState<VideoModeId>('t2v');
  const [presetApplied, setPresetApplied] = useState(false);
  
  // Start/End mode states
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  
  // Storyboard mode states
  const [scenes, setScenes] = useState<StoryboardScene[]>([
    { id: '1', prompt: '' },
    { id: '2', prompt: '' },
  ]);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);

  const {
    mode,
    prompt,
    selectedModel,
    duration,
    motionIntensity,
    fps,
    uploadedImage,
    isGenerating,
    progress,
    result,
    history,
    setMode,
    setPrompt,
    setSelectedModel,
    setDuration,
    setMotionIntensity,
    setFps,
    setUploadedImage,
    startGeneration,
    updateProgress,
    completeGeneration,
  } = useVideoGeneratorStore();

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [selectedQuality, setSelectedQuality] = useState<string | undefined>(undefined);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const selectedModelData = getModelById(selectedModel);
  const isVideoModel = selectedModelData?.type === 'video';
  const videoModel = isVideoModel ? selectedModelData : null;

  // Handle preset from URL params
  useEffect(() => {
    if (presetApplied) return;
    
    const presetId = searchParams.get('preset');
    const modelParam = searchParams.get('model');
    const modeParam = searchParams.get('mode') as VideoModeId | null;
    const durationParam = searchParams.get('duration');
    
    if (presetId) {
      const preset = getEffectById(presetId);
      if (preset) {
        if (preset.templatePrompt) {
          setPrompt(preset.templatePrompt);
        }
        if (preset.modelKey) {
          setSelectedModel(preset.modelKey);
        }
        if (preset.mode === 'i2v') {
          setCurrentMode('i2v');
          setMode('image-to-video');
        } else if (preset.mode === 'start_end') {
          setCurrentMode('start_end');
        } else if (preset.mode === 'storyboard') {
          setCurrentMode('storyboard');
        }
        toast.success(`Пресет "${preset.title}" загружен`);
        setPresetApplied(true);
        return;
      }
    }
    
    if (modelParam) {
      const model = getModelById(modelParam);
      if (model && model.type === 'video') {
        setSelectedModel(modelParam);
      }
    }
    
    if (modeParam && ['t2v', 'i2v', 'start_end', 'storyboard'].includes(modeParam)) {
      setCurrentMode(modeParam);
      if (modeParam === 'i2v') {
        setMode('image-to-video');
      }
    }
    
    if (durationParam) {
      const dur = parseInt(durationParam, 10);
      if (!isNaN(dur)) {
        setDuration(dur);
      }
    }
    
    setPresetApplied(true);
  }, [searchParams, presetApplied, setPrompt, setSelectedModel, setDuration, setMode]);
  
  const modelSupportsI2v = videoModel?.supportsI2v ?? false;
  const modelSupportsStartEnd = videoModel?.supportsStartEnd ?? false;
  const modelSupportsStoryboard = videoModel?.supportsStoryboard ?? false;
  const modelSupportsAudio = videoModel?.supportsAudio ?? false;

  const getAvailableModes = useCallback(() => {
    const modes: VideoModeId[] = ['t2v'];
    if (modelSupportsI2v) modes.push('i2v');
    if (modelSupportsStartEnd) modes.push('start_end');
    if (modelSupportsStoryboard) modes.push('storyboard');
    return modes;
  }, [modelSupportsI2v, modelSupportsStartEnd, modelSupportsStoryboard]);

  const handleModeChange = useCallback((newMode: VideoModeId) => {
    const availableModes = getAvailableModes();
    if (!availableModes.includes(newMode)) {
      toast.error(`${selectedModelData?.name} не поддерживает этот режим`);
      return;
    }
    setCurrentMode(newMode);
    if (newMode === 'i2v') {
      setMode('image-to-video');
    } else {
      setMode('text-to-video');
    }
  }, [getAvailableModes, selectedModelData?.name, setMode]);

  const handleModelChange = useCallback((modelId: string) => {
    const model = getModelById(modelId);
    if (!model || model.type !== 'video') return;
    
    setSelectedModel(modelId);
    setSelectedQuality(undefined);
    setAudioEnabled(false);
    
    const supportedModes: VideoModeId[] = model.modes || ['t2v'];
    
    if (!supportedModes.includes(currentMode)) {
      if (model.modes?.includes('storyboard')) {
        setCurrentMode('storyboard');
        toast.info(`${model.name} работает в режиме Раскадровка`);
      } else {
        setCurrentMode('t2v');
        toast.info(`${model.name} — переключено на Текст → Видео`);
      }
    }
  }, [currentMode, setSelectedModel]);

  const canGenerate = (() => {
    if (isGenerating) return false;
    
    switch (currentMode) {
      case 't2v':
        return prompt.trim().length > 0;
      case 'i2v':
        return prompt.trim().length > 0 && !!uploadedImage;
      case 'start_end':
        return !!startImage && !!endImage;
      case 'storyboard':
        return scenes.filter(s => s.prompt.trim().length > 0).length >= 2;
      default:
        return false;
    }
  })();

  const addTag = (tag: string) => {
    const newPrompt = prompt ? `${prompt}, ${tag}` : tag;
    setPrompt(newPrompt);
  };

  const handleFileUpload = useCallback((file: File, target: 'main' | 'start' | 'end' | 'scene') => {
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
      const result = e.target?.result as string;
      switch (target) {
        case 'main':
          setUploadedImage(result);
          break;
        case 'start':
          setStartImage(result);
          break;
        case 'end':
          setEndImage(result);
          break;
        case 'scene':
          if (editingSceneId) {
            setScenes(prev => prev.map(s => 
              s.id === editingSceneId ? { ...s, image: result } : s
            ));
            setEditingSceneId(null);
          }
          break;
      }
      toast.success('Изображение загружено');
    };
    reader.readAsDataURL(file);
  }, [setUploadedImage, editingSceneId]);

  const handleDrop = useCallback((e: React.DragEvent, target: 'main' | 'start' | 'end') => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file, target);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const addScene = () => {
    if (scenes.length >= 6) {
      toast.error('Максимум 6 сцен');
      return;
    }
    setScenes(prev => [...prev, { id: Date.now().toString(), prompt: '' }]);
  };

  const removeScene = (id: string) => {
    if (scenes.length <= 2) {
      toast.error('Минимум 2 сцены');
      return;
    }
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const updateScenePrompt = (id: string, prompt: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, prompt } : s));
  };

  const removeSceneImage = (id: string) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, image: undefined } : s));
  };

  // Compute price using new system
  const price = videoModel ? computePrice(selectedModel, {
    mode: currentMode,
    duration: duration || videoModel.fixedDuration || 5,
    videoQuality: selectedQuality,
    audio: modelSupportsAudio ? audioEnabled : undefined,
    variants: 1,
  }) : { credits: 0, stars: 0, approxRub: 0 };
  
  const priceDisplay = formatPriceDisplay(price);

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
          prompt: currentMode === 'storyboard' 
            ? scenes.map(s => s.prompt).join(' → ') 
            : prompt,
          createdAt: new Date(),
        });
        toast.success('Видео готово! 🎬');
      } else {
        updateProgress(Math.min(99, Math.round(p)));
      }
    }, 800);
  };

  const isModeAvailable = (modeId: VideoModeId) => {
    switch (modeId) {
      case 't2v': return true;
      case 'i2v': return modelSupportsI2v;
      case 'start_end': return modelSupportsStartEnd;
      case 'storyboard': return modelSupportsStoryboard;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="flex">
        {/* Left Sidebar - Models & History */}
        <aside className="w-64 min-h-screen border-r border-[var(--border)] bg-[var(--surface)] flex-shrink-0 sticky top-0 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 px-2">
              Видео модели
            </h2>
            <div className="space-y-1">
              {VIDEO_MODELS.map((model) => {
                const minPrice = computePrice(model.id, { 
                  duration: model.fixedDuration || model.durationOptions?.[0] || 5,
                  variants: 1,
                });
                return (
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
                          {model.shortLabel ? `${model.shortLabel} • ${model.description}` : model.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {model.quality === 'ultra' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                          ULTRA
                        </span>
                      )}
                      {model.speed === 'fast' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {model.supportsI2v && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--gold)]/20 text-[var(--gold)] font-bold">
                          i2v
                        </span>
                      )}
                      {model.supportsAudio && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-bold flex items-center gap-0.5">
                          <Volume2 className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {model.supportsStartEnd && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold flex items-center gap-0.5">
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {model.supportsStoryboard && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-bold flex items-center gap-0.5">
                          <LayoutGrid className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--muted)] flex items-center gap-0.5 ml-auto">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        от {minPrice.stars}⭐
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {history && history.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    История
                  </h2>
                  <button 
                    onClick={() => useVideoGeneratorStore.setState({ history: [] })}
                    className="text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors"
                  >
                    Очистить
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {history.slice(0, 6).map((item: any) => {
                    // Parse result_urls if it's a string
                    let videoUrl = item.url;
                    let thumbnailUrl = item.thumbnailUrl;
                    
                    if (!videoUrl && item.result_urls) {
                      try {
                        const urls = typeof item.result_urls === 'string' 
                          ? JSON.parse(item.result_urls) 
                          : item.result_urls;
                        videoUrl = Array.isArray(urls) ? urls[0] : urls;
                      } catch (e) {
                        console.error('Error parsing result_urls:', e);
                      }
                    }

                    // Generate thumbnail from video URL if not available
                    if (!thumbnailUrl && videoUrl) {
                      thumbnailUrl = videoUrl.replace(/\.(mp4|webm|mov)$/, '_thumb.jpg');
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          console.log('[Video History] Clicked:', item);
                          setSelectedVideo({ ...item, url: videoUrl, thumbnailUrl });
                          setVideoModalOpen(true);
                        }}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--gold)]/50 transition-all"
                      >
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
                            <Film className="w-6 h-6 text-[var(--muted)]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-white">
                          {item.status === 'completed' ? '✓' : item.status === 'processing' ? '...' : '⏱'}
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                  {MODES.map((m) => {
                    const isAvailable = isModeAvailable(m.id);
                    const isActive = currentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleModeChange(m.id)}
                        disabled={!isAvailable}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all",
                          isActive
                            ? "bg-[var(--gold)] text-[#0a0a0f] shadow-lg shadow-[var(--gold-glow)]"
                            : isAvailable
                              ? "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                              : "text-[var(--muted)]/50 cursor-not-allowed"
                        )}
                      >
                        <m.icon className="w-4 h-4" />
                        <span className="whitespace-nowrap">{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Model Info */}
                {videoModel && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/20 flex items-center justify-center">
                      <Video className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text)]">{videoModel.name}</span>
                        {videoModel.quality === 'ultra' && (
                          <Badge variant="warning" className="text-[9px] px-1.5 py-0">ULTRA</Badge>
                        )}
                        {videoModel.supportsAudio && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex items-center gap-0.5">
                            <Volume2 className="w-2.5 h-2.5" />
                            Звук
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted)]">{videoModel.description}</p>
                    </div>
                    <Badge variant="primary" className="font-bold">
                      {priceDisplay.stars}
                    </Badge>
                  </div>
                )}

                {/* Quality Selector */}
                {videoModel && videoModel.qualityOptions && (
                  <Card variant="hover" padding="sm">
                    <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                      Качество
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {videoModel.qualityOptions.map((quality) => {
                        const qualityPrice = computePrice(videoModel.id, { 
                          duration: duration || videoModel.fixedDuration || 5,
                          videoQuality: quality,
                          audio: modelSupportsAudio ? audioEnabled : undefined,
                          variants: 1,
                        });
                        return (
                          <button
                            key={quality}
                            onClick={() => setSelectedQuality(quality)}
                            className={cn(
                              "p-2 rounded-lg border text-center text-xs transition-all",
                              selectedQuality === quality
                                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                                : "border-[var(--border)] hover:border-[var(--gold)]/50 text-[var(--text2)]"
                            )}
                          >
                            <div className="font-medium">{quality.toUpperCase()}</div>
                            <div className="text-[10px] text-[var(--muted)] mt-0.5">{qualityPrice.stars}⭐</div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Audio Toggle */}
                {videoModel && modelSupportsAudio && (
                  <Card variant="hover" padding="sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider block mb-1">
                          Аудио
                        </label>
                        <p className="text-[10px] text-[var(--text2)]">
                          {audioEnabled ? 'С синхронизированным звуком' : 'Без звука'}
                        </p>
                      </div>
                      <button
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className={cn(
                          "relative w-12 h-6 rounded-full transition-colors",
                          audioEnabled ? "bg-[var(--gold)]" : "bg-[var(--border)]"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                          audioEnabled ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </Card>
                )}

                {/* MODE: Text to Video */}
                {currentMode === 't2v' && (
                  <>
                    <Card variant="hover" padding="md">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wider">
                          Промпт
                        </label>
                        <span className="text-[10px] text-[var(--muted)]">{prompt.length} / 2000</span>
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Опишите видео, которое хотите создать..."
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
                  </>
                )}

                {/* MODE: Image to Video */}
                {currentMode === 'i2v' && (
                  <>
                    <Card variant="hover" padding="sm">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">
                          Исходное фото <span className="text-red-400">*</span>
                        </label>
                        {uploadedImage && (
                          <button
                            onClick={() => { setUploadedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-28 flex-shrink-0">
                          {uploadedImage ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--surface2)] border border-[var(--border)]">
                              <img src={uploadedImage} alt="Reference" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              onDrop={(e) => handleDrop(e, 'main')}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              className={cn(
                                "aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all",
                                "flex flex-col items-center justify-center",
                                isDragging
                                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                                  : "border-[var(--border)] hover:border-[var(--gold)]/50 bg-[var(--surface2)]"
                              )}
                            >
                              <Upload className="w-5 h-5 text-[var(--muted)]" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center">
                          <p className="text-[11px] text-[var(--text2)]">
                            {uploadedImage ? 'Изображение будет анимировано' : 'Перетащите или выберите фото'}
                          </p>
                          {!uploadedImage && <p className="text-[9px] text-[var(--muted)] mt-0.5">PNG, JPG до 10MB</p>}
                        </div>
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'main')}
                        className="hidden"
                      />
                    </Card>

                    <Card variant="hover" padding="md">
                      <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wider mb-2 block">
                        Описание движения
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Опишите как должно двигаться изображение..."
                        className="w-full h-20 px-3 py-2.5 rounded-lg text-sm
                                   bg-[var(--surface2)] border border-[var(--border)]
                                   text-[var(--text)] placeholder:text-[var(--muted)]
                                   focus:outline-none focus:border-[var(--gold)]
                                   resize-none transition-all"
                      />
                    </Card>
                  </>
                )}

                {/* MODE: Start to End */}
                {currentMode === 'start_end' && (
                  <Card variant="hover" padding="md">
                    <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wider mb-3 block">
                      Старт → Финиш
                    </label>
                    <p className="text-[11px] text-[var(--muted)] mb-4">
                      AI создаст плавный переход между двумя кадрами
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] text-[var(--muted)] mb-1.5 text-center">Начальный кадр</p>
                        {startImage ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--surface2)] border border-[var(--border)] group">
                            <img src={startImage} alt="Start" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setStartImage(null)}
                              className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => startImageRef.current?.click()}
                            onDrop={(e) => handleDrop(e, 'start')}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className="aspect-video rounded-lg border-2 border-dashed border-[var(--border)] hover:border-emerald-500/50 
                                       bg-[var(--surface2)] cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <Upload className="w-5 h-5 text-emerald-400/50" />
                            <span className="text-[9px] text-[var(--muted)]">Старт</span>
                          </div>
                        )}
                        <input
                          ref={startImageRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'start')}
                          className="hidden"
                        />
                      </div>

                      <div className="flex-shrink-0 flex items-center justify-center">
                        <ArrowRight className="w-6 h-6 text-[var(--muted)]" />
                      </div>

                      <div className="flex-1">
                        <p className="text-[10px] text-[var(--muted)] mb-1.5 text-center">Конечный кадр</p>
                        {endImage ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--surface2)] border border-[var(--border)] group">
                            <img src={endImage} alt="End" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setEndImage(null)}
                              className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => endImageRef.current?.click()}
                            onDrop={(e) => handleDrop(e, 'end')}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className="aspect-video rounded-lg border-2 border-dashed border-[var(--border)] hover:border-rose-500/50 
                                       bg-[var(--surface2)] cursor-pointer transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <Upload className="w-5 h-5 text-rose-400/50" />
                            <span className="text-[9px] text-[var(--muted)]">Финиш</span>
                          </div>
                        )}
                        <input
                          ref={endImageRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'end')}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </Card>
                )}

                {/* MODE: Storyboard */}
                {currentMode === 'storyboard' && (
                  <Card variant="hover" padding="md">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-[var(--text2)] uppercase tracking-wider flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-orange-400" />
                        Раскадровка ({scenes.length}/6)
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addScene}
                        disabled={scenes.length >= 6}
                        className="h-6 px-2 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Сцена
                      </Button>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] mb-4">
                      Опишите каждую сцену. Можно добавить изображение как референс.
                    </p>
                    
                    <div className="space-y-3">
                      {scenes.map((scene, idx) => (
                        <div key={scene.id} className="flex gap-2 group">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </div>
                            <GripVertical className="w-3 h-3 text-[var(--muted)] opacity-0 group-hover:opacity-100 cursor-grab" />
                          </div>
                          
                          <div className="flex-1 flex gap-2">
                            <div className="w-16 flex-shrink-0">
                              {scene.image ? (
                                <div className="relative aspect-video rounded-md overflow-hidden bg-[var(--surface2)] border border-[var(--border)] group/img">
                                  <img src={scene.image} alt="" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => removeSceneImage(scene.id)}
                                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  >
                                    <X className="w-2.5 h-2.5 text-white" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingSceneId(scene.id);
                                    sceneImageRef.current?.click();
                                  }}
                                  className="aspect-video rounded-md border border-dashed border-[var(--border)] hover:border-orange-500/50
                                             bg-[var(--surface2)] w-full flex items-center justify-center transition-all"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-[var(--muted)]" />
                                </button>
                              )}
                            </div>
                            
                            <textarea
                              value={scene.prompt}
                              onChange={(e) => updateScenePrompt(scene.id, e.target.value)}
                              placeholder={`Сцена ${idx + 1}: опишите что происходит...`}
                              className="flex-1 h-14 px-2.5 py-2 rounded-lg text-xs
                                         bg-[var(--surface2)] border border-[var(--border)]
                                         text-[var(--text)] placeholder:text-[var(--muted)]
                                         focus:outline-none focus:border-orange-500/50
                                         resize-none transition-all"
                            />
                          </div>
                          
                          <button
                            onClick={() => removeScene(scene.id)}
                            disabled={scenes.length <= 2}
                            className={cn(
                              "p-1.5 rounded transition-all self-start mt-1",
                              scenes.length > 2
                                ? "text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10"
                                : "text-[var(--border)] cursor-not-allowed"
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <input
                      ref={sceneImageRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'scene')}
                      className="hidden"
                    />
                  </Card>
                )}

                {/* Settings Row */}
                {(currentMode === 't2v' || currentMode === 'i2v') && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card variant="hover" padding="sm">
                      <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                        Длительность
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {DURATION_OPTIONS.map((d) => (
                          <button
                            key={d.value}
                            onClick={() => setDuration(d.value)}
                            className={cn(
                              "p-1.5 rounded-md border text-center text-sm font-medium transition-all",
                              duration === d.value
                                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                                : "border-[var(--border)] hover:border-[var(--gold)]/50 text-[var(--text2)]"
                            )}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </Card>

                    <Card variant="hover" padding="sm">
                      <label className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                        Соотношение
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio.id}
                            onClick={() => setAspectRatio(ratio.id as '16:9' | '9:16' | '1:1')}
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
                  </div>
                )}

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
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-[var(--text2)]">Интенсивность движения</label>
                          <span className="text-[10px] font-semibold text-[var(--gold)]">{motionIntensity}%</span>
                        </div>
                        <Slider 
                          value={[motionIntensity]} 
                          onValueChange={([v]) => setMotionIntensity(v)} 
                          min={0} 
                          max={100} 
                          step={5} 
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] text-[var(--text2)]">FPS</label>
                          <span className="text-[10px] font-semibold text-[var(--gold)]">{fps}</span>
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
                </Card>

                {/* Price Display */}
                {videoModel && (
                  <div className="text-center py-3 px-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <p className="text-lg font-bold text-[var(--text)] mb-1">
                      {priceDisplay.full}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {duration ? `${duration}с` : videoModel.fixedDuration ? `${videoModel.fixedDuration}с` : '—'}
                    </p>
                  </div>
                )}

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
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                      Генерация {progress}%
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      {currentMode === 'storyboard' ? 'Собрать видео' : currentMode === 'start_end' ? 'Создать переход' : currentMode === 'i2v' ? 'Анимировать' : 'Создать'}
                    </>
                  )}
                </Button>

                {currentMode === 'i2v' && !uploadedImage && (
                  <p className="text-xs text-center text-amber-400/80">Загрузите изображение для анимации</p>
                )}
                {currentMode === 'start_end' && (!startImage || !endImage) && (
                  <p className="text-xs text-center text-amber-400/80">Загрузите начальный и конечный кадры</p>
                )}
                {currentMode === 'storyboard' && scenes.filter(s => s.prompt.trim()).length < 2 && (
                  <p className="text-xs text-center text-amber-400/80">Заполните минимум 2 сцены</p>
                )}
              </div>

              {/* Preview Panel */}
              <div className="xl:sticky xl:top-6 xl:self-start">
                <Card variant="hover" className="overflow-hidden" padding="none">
                  <div className="aspect-video flex items-center justify-center bg-[var(--surface2)]">
                    {isGenerating ? (
                      <div className="text-center p-8">
                        <div className="w-14 h-14 border-4 border-[var(--gold)]/30 border-t-[var(--gold)] 
                                        rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[var(--text)] font-medium text-sm">Генерация {progress}%</p>
                        <p className="text-[var(--muted)] text-xs mt-1">Это займёт несколько минут</p>
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
                        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-[var(--border)] 
                                        flex items-center justify-center mx-auto mb-4 bg-[var(--surface)]">
                          <Video className="w-8 h-8 text-[var(--muted)]" />
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
                  
                  {result && (
                    <div className="flex items-center justify-between p-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5">
                        <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          Скачать
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
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Video Modal */}
      {videoModalOpen && selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoModalOpen(false)}
        >
          <div 
            className="relative max-w-5xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player */}
            <div className="aspect-video bg-black">
              {selectedVideo.url ? (
                <video 
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={selectedVideo.thumbnailUrl}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white gap-3">
                  <Film className="w-16 h-16 text-[var(--muted)]" />
                  <p className="text-sm">Видео недоступно</p>
                  <p className="text-xs text-[var(--muted)]">Статус: {selectedVideo.status}</p>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-6 border-t border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text)] mb-1">
                    {selectedVideo.model_name || selectedVideo.model}
                  </h3>
                  <p className="text-sm text-[var(--text2)] line-clamp-2">
                    {selectedVideo.prompt}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedVideo.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {selectedVideo.credits_used && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {selectedVideo.credits_used} кредитов
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedVideo.url && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = selectedVideo.url;
                        a.download = `video_${selectedVideo.id}.mp4`;
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedVideo.url);
                        toast.success('Ссылка скопирована!');
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Поделиться
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
