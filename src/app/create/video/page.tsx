'use client';

import { useState } from 'react';
import { VIDEO_MODELS, getModelById, hasFeature } from '@/lib/models-config';
import { Button } from '@/components/ui/button';
import { 
  FirstLastFrame,
  CameraControl,
  AudioSync,
  Storyboard,
  AspectRatioSelector,
} from '@/components/generator/features';
import { 
  Sparkles, 
  Video,
  Zap,
  Star,
  Clock,
  Info,
  ChevronDown,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DURATION_OPTIONS = [
  { value: 3, label: '3 сек' },
  { value: 5, label: '5 сек' },
  { value: 10, label: '10 сек' },
];

const QUICK_STYLES = [
  'кинематографичный',
  'плавное движение',
  'эпичный',
  'slow motion',
];

export default function VideoCreatePage() {
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation params
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [camera, setCamera] = useState({ movement: 'static', speed: 50 });
  const [scenes, setScenes] = useState<Array<{ id: string; prompt: string; duration: number }>>([]);

  const model = getModelById(selectedModel);
  const totalCredits = model ? Math.ceil(model.credits * (duration / 5)) : 0;

  const handleGenerate = async () => {
    console.log('Generating video:', { selectedModel, prompt, duration, aspectRatio });
  };

  const addStyle = (style: string) => {
    setPrompt(prev => prev ? `${prev}, ${style}` : style);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Left: Model Selector */}
          <div className="lg:col-span-3 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center">
                <Video className="w-5 h-5 text-[#c8ff00]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Видео</h1>
                <p className="text-xs text-white/40">{VIDEO_MODELS.length} моделей</p>
              </div>
            </div>

            {/* Models List */}
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all",
                    selectedModel === m.id
                      ? "bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50"
                      : "bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={cn(
                      "font-semibold",
                      selectedModel === m.id ? "text-[#c8ff00]" : "text-white"
                    )}>
                      {m.name}
                    </h3>
                    <span className="text-[#c8ff00] font-bold text-sm">{m.credits}</span>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {m.quality === 'ultra' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />ULTRA
                      </span>
                    )}
                    {m.speed === 'fast' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />FAST
                      </span>
                    )}
                    {m.speed === 'slow' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />PRO
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-white/40 line-clamp-2">
                    {m.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Generator */}
          <div className="lg:col-span-9 space-y-5">
            {/* Model Info */}
            {model && (
              <div className="p-4 rounded-xl bg-[#c8ff00]/5 border border-[#c8ff00]/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#c8ff00]/10 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5 text-[#c8ff00]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{model.name}</h3>
                      <p className="text-sm text-white/50">{model.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {model.quality === 'ultra' && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-0.5 border border-amber-500/20">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />ULTRA
                          </span>
                        )}
                        {model.speed === 'fast' && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                            <Zap className="w-2.5 h-2.5" />FAST
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-[#c8ff00]">{model.credits}</div>
                    <div className="text-xs text-white/30">кредитов</div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Prompt */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Описание видео
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите видео которое хотите создать..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder:text-white/30
                         resize-none focus:outline-none focus:border-[#c8ff00]/50 transition-colors"
                rows={4}
              />
              <div className="flex justify-between mt-2">
                <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#c8ff00] transition-colors">
                  <Wand2 className="w-3.5 h-3.5" />
                  Улучшить AI
                </button>
                <span className="text-xs text-white/30">{prompt.length} символов</span>
              </div>
            </div>

            {/* Quick Styles */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => addStyle(style)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-white/10 
                           text-white/40 hover:border-[#c8ff00]/50 hover:text-[#c8ff00] transition-all"
                >
                  + {style}
                </button>
              ))}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#c8ff00]" />
                Длительность
              </label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      duration === d.value
                        ? "border-[#c8ff00]/50 bg-[#c8ff00]/10 text-[#c8ff00]"
                        : "border-white/10 text-white/50 hover:border-white/20"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            {model?.aspectRatios && (
              <AspectRatioSelector
                ratios={model.aspectRatios}
                selected={aspectRatio}
                onChange={setAspectRatio}
              />
            )}

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* First/Last Frame */}
              {hasFeature(selectedModel, 'first-last-frame') && (
                <FirstLastFrame
                  onFirstFrameChange={setFirstFrame}
                  onLastFrameChange={setLastFrame}
                />
              )}

              {/* Audio Sync */}
              {hasFeature(selectedModel, 'audio-sync') && (
                <div className="md:col-span-2">
                  <AudioSync onAudioChange={setAudioFile} />
                </div>
              )}
            </div>

            {/* Camera Control */}
            {hasFeature(selectedModel, 'camera-control') && (
              <CameraControl onCameraChange={setCamera} />
            )}

            {/* Storyboard */}
            {hasFeature(selectedModel, 'storyboard') && (
              <Storyboard onScenesChange={setScenes} />
            )}

            {/* Advanced Settings */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-3 rounded-xl border border-white/10 
                       hover:border-white/20 transition-colors text-white/70"
            >
              <span className="text-sm font-medium">Расширенные настройки</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
            </button>

            {showAdvanced && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-2 flex justify-between">
                    <span>Интенсивность движения</span>
                    <span className="text-white font-medium">50%</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-[#c8ff00]" 
                    min="0" 
                    max="100" 
                    defaultValue={50}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-2 flex justify-between">
                    <span>FPS</span>
                    <span className="text-white font-medium">30</span>
                  </label>
                  <input 
                    type="range" 
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-[#c8ff00]" 
                    min="24" 
                    max="60" 
                    step="6"
                    defaultValue={30}
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full h-14 text-base font-semibold rounded-xl bg-[#c8ff00] text-black hover:bg-[#b8ef00] disabled:bg-[#c8ff00]/30 disabled:text-black/50"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Создать видео
              <span className="ml-2 opacity-70">• {totalCredits} кредитов</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
