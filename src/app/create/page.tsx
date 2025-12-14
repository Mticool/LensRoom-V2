'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { useGenerations } from '@/contexts/generation-context';
import { PHOTO_MODELS, VIDEO_MODELS } from '@/lib/models-config';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Loader2, Download, RefreshCw, Image as ImageIcon, 
  Video, Star, Zap, Clock, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function CreatePage() {
  const { user } = useAuth();
  const { balance, fetchBalance } = useCreditsStore();
  const { addGeneration } = useGenerations();
  
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [selectedModel, setSelectedModel] = useState(PHOTO_MODELS[0].id);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImages, setNumImages] = useState(1);
  
  const [generating, setGenerating] = useState(false);
  const [sendingBackground, setSendingBackground] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [backgroundMode, setBackgroundMode] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const models = mode === 'photo' ? PHOTO_MODELS : VIDEO_MODELS;
  const model = models.find(m => m.id === selectedModel);
  const totalCost = (model?.credits || 0) * (mode === 'photo' ? numImages : 1);

  // Reset model when mode changes
  useEffect(() => {
    const defaultModel = mode === 'photo' ? PHOTO_MODELS[0].id : VIDEO_MODELS[0].id;
    setSelectedModel(defaultModel);
    setResults([]);
    setTaskId(null);
  }, [mode]);

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
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleGenerate = async (runInBackground = false) => {
    if (!user) {
      toast.error('Войдите чтобы создавать контент');
      return;
    }

    if (!prompt.trim()) {
      toast.error('Введите описание');
      return;
    }

    if (balance < totalCost) {
      toast.error(`Недостаточно кредитов. Нужно: ${totalCost}, есть: ${balance}`);
      return;
    }

    // Set appropriate loading state
    if (runInBackground) {
      setSendingBackground(true);
    } else {
      setGenerating(true);
      setResults([]);
      setProgress(0);
    }
    setBackgroundMode(runInBackground);

    try {
      const endpoint = mode === 'photo' ? '/api/generate/photo' : '/api/generate/video';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          negativePrompt,
          aspectRatio,
          numImages: mode === 'photo' ? numImages : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Недостаточно кредитов. Нужно: ${data.required}, есть: ${data.current}`);
          setGenerating(false);
          setSendingBackground(false);
          return;
        }
        throw new Error(data.error);
      }

      // Update balance
      fetchBalance();

      if (runInBackground) {
        // Add to background generation context
        addGeneration({
          id: `gen_${Date.now()}`,
          taskId: data.taskId,
          type: mode,
          prompt: prompt.slice(0, 50),
        });
        
        toast.success(`🚀 Генерация в фоне! Можете продолжить работу`);
        setSendingBackground(false);
        // Don't clear prompt so user can generate more
      } else {
        setTaskId(data.taskId);
        toast.success(`Генерация началась! Использовано: ${data.creditsUsed} ⭐`);
        // Start polling
        pollStatus(data.taskId);
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ошибка при генерации';
      toast.error(message);
      setGenerating(false);
      setSendingBackground(false);
    }
  };

  const pollStatus = async (id: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate/status?taskId=${id}`);
        const data = await response.json();

        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          setResults(data.results || []);
          setGenerating(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.success(mode === 'photo' ? 'Изображения готовы!' : 'Видео готово!');
        } else if (data.status === 'failed') {
          toast.error(data.error || 'Ошибка при генерации');
          setGenerating(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    // Stop after 5 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (generating) {
        setGenerating(false);
        toast.error('Превышено время ожидания');
      }
    }, 300000);
  };

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `lensroom-${Date.now()}-${index + 1}.${mode === 'photo' ? 'png' : 'mp4'}`;
    link.click();
  };

  const handleReset = () => {
    setResults([]);
    setTaskId(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Left: Model Selector */}
          <div className="lg:col-span-3 space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMode('photo')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'photo'
                    ? 'bg-[#c8ff00] text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Фото
              </button>
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'video'
                    ? 'bg-[#c8ff00] text-black'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-4 h-4" />
                Видео
              </button>
            </div>

            {/* Video Mode Link */}
            {mode === 'video' && (
              <Link 
                href="/create/video"
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#c8ff00]/10 
                         border border-[#c8ff00]/30 text-[#c8ff00] text-sm font-medium
                         hover:bg-[#c8ff00]/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Расширенный видео-редактор
              </Link>
            )}

            {/* Models List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin">
              {models.map((m) => (
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
                      selectedModel === m.id 
                        ? 'text-[#c8ff00]'
                        : 'text-white'
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
                </button>
              ))}
            </div>
          </div>

          {/* Right: Generator */}
          <div className="lg:col-span-9 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {mode === 'photo' ? 'Создать изображение' : 'Создать видео'}
                </h1>
                <p className="text-sm text-white/50 mt-1">
                  Модель: <span className="text-[#c8ff00]">{model?.name}</span>
                </p>
              </div>
              {user && (
                <div className="text-right">
                  <p className="text-sm text-white/50">Баланс</p>
                  <p className="text-lg font-bold text-[#c8ff00]">{balance} ⭐</p>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Описание {mode === 'photo' ? 'изображения' : 'видео'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'photo' 
                  ? 'Опишите что вы хотите создать...' 
                  : 'Опишите сцену, действия, настроение...'}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder:text-white/30 resize-none 
                         focus:outline-none focus:border-[#c8ff00]/50 focus:ring-1 focus:ring-[#c8ff00]/30"
                rows={4}
              />
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Что исключить <span className="text-white/30">(опционально)</span>
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted, watermark..."
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder:text-white/30
                         focus:outline-none focus:border-[#c8ff00]/50 focus:ring-1 focus:ring-[#c8ff00]/30"
              />
            </div>

            {/* Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Aspect Ratio */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-2 block">
                  Формат
                </label>
                <div className="flex flex-wrap gap-2">
                  {model?.aspectRatios?.map((ratio) => (
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

              {/* Number of Images (photo only) */}
              {mode === 'photo' && (
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 flex items-center justify-between">
                    <span>Количество</span>
                    <span className="text-[#c8ff00]">{numImages} шт × {model?.credits} ⭐</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max={model?.maxImages || 4}
                    value={numImages}
                    onChange={(e) => setNumImages(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                             [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-[#c8ff00] [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Generate Buttons */}
            <div className="flex gap-2">
              <Button
                size="lg"
                className="flex-1 h-14 bg-[#c8ff00] hover:bg-[#b8ef00] text-black font-semibold text-lg
                         disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleGenerate(false)}
                disabled={generating || !prompt.trim() || !user || balance < totalCost}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {progress > 0 ? `${progress}%` : '...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Создать ({totalCost} ⭐)
                  </>
                )}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-4 border-zinc-700 hover:bg-zinc-800 text-white disabled:opacity-50"
                onClick={() => handleGenerate(true)}
                disabled={sendingBackground || !prompt.trim() || !user || balance < totalCost}
                title="Генерировать в фоне (можно запускать несколько)"
              >
                {sendingBackground ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </Button>
            </div>

            {!user && (
              <p className="text-center text-white/40 text-sm">
                <Link href="/login" className="text-[#c8ff00] hover:underline">Войдите</Link> чтобы создавать контент
              </p>
            )}

            {/* Results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Результаты
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
                  
                  <div className={`grid gap-4 ${
                    mode === 'video' || results.length === 1 
                      ? 'grid-cols-1 max-w-2xl mx-auto' 
                      : 'md:grid-cols-2'
                  }`}>
                    {results.map((url, i) => (
                      <Card 
                        key={i} 
                        className="overflow-hidden group bg-white/5 border-white/10"
                      >
                        <div className={`relative ${mode === 'photo' ? 'aspect-square' : 'aspect-video'}`}>
                          {mode === 'photo' ? (
                            <img 
                              src={url} 
                              alt={`Result ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video 
                              src={url}
                              controls
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                                        transition-opacity flex items-center justify-center gap-3">
                            <Button
                              size="sm"
                              onClick={() => handleDownload(url, i)}
                              className="bg-[#c8ff00] hover:bg-[#b8ef00] text-black"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Скачать
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(url, '_blank')}
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Открыть
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generating Placeholder */}
            {generating && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#c8ff00] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#c8ff00]">{progress}%</span>
                  </div>
                </div>
                <p className="text-white/50 text-sm">
                  {mode === 'photo' ? 'Создаём изображения...' : 'Создаём видео...'}
                </p>
                <p className="text-white/30 text-xs">
                  Обычно это занимает 20-60 секунд
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
