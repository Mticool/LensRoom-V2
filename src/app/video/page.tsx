'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { VIDEO_MODELS, hasFeature } from '@/lib/models-config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Loader2, Download, Play, Video, Star, Zap, Clock, 
  ExternalLink, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FirstLastFrame } from '@/components/generator/features/first-last-frame';
import { CameraControl } from '@/components/generator/features/camera-control';
import { Storyboard } from '@/components/generator/features/storyboard';
import { AspectRatioSelector } from '@/components/generator/features/aspect-ratio-selector';
import Link from 'next/link';

export default function VideoPage() {
  const { user } = useAuth();
  const { balance, fetchBalance } = useCreditsStore();
  
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  
  // Advanced features
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [cameraSettings, setCameraSettings] = useState<{ movement: string; speed: number } | null>(null);
  const [scenes, setScenes] = useState<Array<{ id: string; prompt: string; duration: number }>>([]);
  
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const model = VIDEO_MODELS.find(m => m.id === selectedModel);
  const creditsNeeded = model?.credits || 0;

  // Update aspect ratio when model changes
  useEffect(() => {
    if (model?.aspectRatios?.[0]) {
      setAspectRatio(model.aspectRatios[0]);
    }
  }, [model]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Войдите чтобы создавать видео');
      return;
    }

    if (!prompt.trim() && scenes.length === 0) {
      toast.error('Введите описание видео или создайте раскадровку');
      return;
    }

    if (balance < creditsNeeded) {
      toast.error(`Недостаточно кредитов. Нужно: ${creditsNeeded}, есть: ${balance}`);
      return;
    }

    setGenerating(true);
    setResult(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('model', selectedModel);
      formData.append('prompt', prompt);
      formData.append('aspectRatio', aspectRatio);
      formData.append('duration', duration.toString());

      if (firstFrame) formData.append('firstFrame', firstFrame);
      if (lastFrame) formData.append('lastFrame', lastFrame);
      
      if (cameraSettings) {
        formData.append('cameraMovement', cameraSettings.movement);
        formData.append('cameraSpeed', cameraSettings.speed.toString());
      }

      if (scenes.length > 0) {
        formData.append('scenes', JSON.stringify(scenes));
      }

      const response = await fetch('/api/generate/video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Недостаточно кредитов. Нужно: ${data.required}, есть: ${data.current}`);
          setGenerating(false);
          return;
        }
        throw new Error(data.error);
      }

      setTaskId(data.taskId);
      toast.success(`Генерация видео началась! Использовано: ${data.creditsUsed} ⭐`);
      
      fetchBalance();
      pollStatus(data.taskId);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при генерации';
      toast.error(message);
      setGenerating(false);
    }
  };

  const pollStatus = async (id: string) => {
    let pollInterval = 3000; // Start with 3 seconds
    let attempts = 0;
    const startTime = Date.now();

    const poll = async () => {
      try {
        const response = await fetch(`/api/generate/status?taskId=${id}`);
        const data = await response.json();

        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          setResult(data.results?.[0]);
          setGenerating(false);
          toast.success('Видео готово!', {
            description: `Генерация заняла ${elapsedSeconds}с`,
          });
          return;
        } else if (data.status === 'failed') {
          toast.error(data.error || 'Ошибка при генерации');
          setGenerating(false);
          return;
        }

        // Adaptive polling - увеличиваем интервал со временем
        attempts++;
        if (attempts > 10) pollInterval = 5000; // After 30s, poll every 5s
        if (attempts > 30) pollInterval = 10000; // After 2.5min, poll every 10s

        // Continue polling
        if (attempts < 120) { // Max 20 minutes
          pollingRef.current = setTimeout(poll, pollInterval) as unknown as NodeJS.Timeout;
        } else {
          setGenerating(false);
          toast.error('Превышено время ожидания');
        }

      } catch (error) {
        console.error('Polling error:', error);
        // Retry on error
        if (attempts < 120) {
          pollingRef.current = setTimeout(poll, pollInterval) as unknown as NodeJS.Timeout;
        }
      }
    };

    poll();
  };

  const handleReset = () => {
    setResult(null);
    setTaskId(null);
    setProgress(0);
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `lensroom-video-${Date.now()}.mp4`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Left: Model Selector */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-[#c8ff00]" />
                Модели
              </h2>
              {user && (
                <span className="text-sm font-bold text-[#c8ff00]">{balance} ⭐</span>
              )}
            </div>
            
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 scrollbar-thin">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModel(m.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedModel === m.id
                      ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50'
                      : 'bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold ${
                      selectedModel === m.id ? 'text-[#c8ff00]' : 'text-white'
                    }`}>
                      {m.name}
                    </h3>
                    <span className="text-sm font-bold text-[#c8ff00]">
                      {m.credits} ⭐
                    </span>
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
                  
                  {m.recommendedFor && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.recommendedFor.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-[#c8ff00]/10 text-[#c8ff00]/70 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Generator */}
          <div className="lg:col-span-9 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Создать видео</h1>
                <p className="text-sm text-white/50 mt-1">
                  Модель: <span className="text-[#c8ff00]">{model?.name}</span>
                </p>
              </div>
              <Link
                href="/create"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                ← Назад к фото
              </Link>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Описание видео
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите что должно происходить в видео: действия, движения, атмосферу..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder:text-white/30 resize-none 
                         focus:outline-none focus:border-[#c8ff00]/50 focus:ring-1 focus:ring-[#c8ff00]/30"
                rows={4}
              />
            </div>

            {/* Settings Row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 flex items-center justify-between">
                  <span>Длительность</span>
                  <span className="text-[#c8ff00]">{duration} сек</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                           [&::-webkit-slider-thumb]:bg-[#c8ff00] [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Aspect Ratio */}
              {model?.aspectRatios && (
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Формат
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {model.aspectRatios.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          aspectRatio === ratio
                            ? 'bg-[#c8ff00] text-black'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Features */}
            <div className="space-y-4">
              {/* First/Last Frame */}
              {hasFeature(selectedModel, 'first-last-frame') && (
                <FirstLastFrame
                  onFirstFrameChange={setFirstFrame}
                  onLastFrameChange={setLastFrame}
                />
              )}

              {/* Camera Control */}
              {hasFeature(selectedModel, 'camera-control') && (
                <CameraControl
                  onCameraChange={setCameraSettings}
                />
              )}

              {/* Storyboard */}
              {hasFeature(selectedModel, 'storyboard') && (
                <Storyboard
                  onScenesChange={setScenes}
                />
              )}
            </div>

            {/* Generate Button */}
            <Button
              size="lg"
              className="w-full h-14 bg-[#c8ff00] hover:bg-[#b8ef00] text-black font-semibold text-lg
                       disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerate}
              disabled={generating || (!prompt.trim() && scenes.length === 0) || !user || balance < creditsNeeded}
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Генерация {progress > 0 ? `${progress}%` : '...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Создать видео ({creditsNeeded} ⭐)
                </>
              )}
            </Button>

            {!user && (
              <p className="text-center text-white/40 text-sm">
                <Link href="/login" className="text-[#c8ff00] hover:underline">Войдите</Link> чтобы создавать видео
              </p>
            )}

            {/* Progress */}
            {generating && (
              <Card className="p-4 bg-[#c8ff00]/5 border-[#c8ff00]/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-[#c8ff00] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#c8ff00]">{progress}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      Генерация видео...
                    </p>
                    <p className="text-xs text-white/50">
                      Это может занять до {model?.speed === 'slow' ? '5' : '2'} минут
                    </p>
                  </div>
                </div>
                {progress > 0 && (
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-[#c8ff00] to-emerald-400"
                    />
                  </div>
                )}
              </Card>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Результат
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-white/50 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Создать ещё
                    </Button>
                  </div>
                  
                  <Card className="overflow-hidden bg-black border-white/10">
                    <div className="aspect-video">
                      <video 
                        src={result} 
                        controls
                        className="w-full h-full"
                        autoPlay
                        loop
                      />
                    </div>
                    <div className="p-4 flex gap-3 bg-white/5">
                      <Button
                        onClick={handleDownload}
                        className="bg-[#c8ff00] hover:bg-[#b8ef00] text-black"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Скачать видео
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(result, '_blank')}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
