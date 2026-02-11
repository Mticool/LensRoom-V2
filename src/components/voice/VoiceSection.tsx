'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mic2,
  Image as ImageLucide,
  FileAudio,
  Wand2,
  CheckCircle2,
  Star,
  Clock3,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageUploader } from './ImageUploader';
import { AudioInput } from './AudioInput';
import { AnimateSection } from './AnimateSection';
import { getModelById } from '@/config/models';
import { getSkuFromRequest, calculateTotalStars } from '@/lib/pricing/pricing';

const LIPSYNC_MODELS = [
  {
    id: 'kling-ai-avatar',
    name: 'Kling AI Avatar',
    description: 'Качественная синхронизация с контролем эмоций',
    badge: 'AVATAR',
    color: 'violet',
  },
  {
    id: 'infinitalk-480p',
    name: 'InfiniteTalk 480p',
    description: 'Быстрая генерация • 3\u2B50/сек',
    badge: 'FAST',
    color: 'blue',
  },
  {
    id: 'infinitalk-720p',
    name: 'InfiniteTalk 720p',
    description: 'HD качество • 12\u2B50/сек',
    badge: 'HD',
    color: 'emerald',
  },
];

const TABS = [
  {
    id: 'lipsync' as const,
    label: 'Озвучка',
    icon: Mic2,
    description: 'Превратите фото в говорящее видео',
  },
  {
    id: 'animate' as const,
    label: 'Анимация движений',
    icon: Film,
    description: 'Оживите фото с помощью видео-референса',
  },
];

export function VoiceSection() {
  const [activeTab, setActiveTab] = useState<'lipsync' | 'animate'>('lipsync');

  // --- Lip-sync state ---
  const [selectedModel, setSelectedModel] = useState('kling-ai-avatar');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [generating, setGenerating] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const modelConfig = useMemo(() => getModelById(selectedModel), [selectedModel]);

  const estimatedCost = useMemo(() => {
    if (!modelConfig) return 0;

    try {
      const sku = getSkuFromRequest(selectedModel, { audioDurationSec: audioDuration });
      return calculateTotalStars(sku, audioDuration);
    } catch {
      return 0;
    }
  }, [selectedModel, audioDuration, modelConfig]);

  const canGenerate = imageUrl && audioUrl && !generating;
  const missing = !imageUrl ? 'Загрузите фото' : !audioUrl ? 'Добавьте аудио' : null;

  const handleAudioUploaded = useCallback((url: string, duration?: number) => {
    setAudioUrl(url);
    if (duration) {
      setAudioDuration(duration);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setPollingStatus('idle');
    setResultUrl(null);

    try {
      const response = await fetch('/api/generate/lipsync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          imageUrl,
          audioUrl,
          prompt: prompt || undefined,
          seed: seed ? parseInt(seed) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка генерации');
      }

      setTaskId(data.taskId);
      setGenerationId(data.generationId);
      toast.success('Генерация запущена');

      // Начать polling
      setPollingStatus('polling');
      pollStatus(data.taskId || data.jobId);
    } catch (error: any) {
      console.error('[Voice] Generation error:', error);
      toast.error(error.message || 'Не удалось запустить генерацию');
      setGenerating(false);
    }
  }, [canGenerate, selectedModel, imageUrl, audioUrl, prompt, seed]);

  const pollStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 60; // 30 минут при интервале 30 сек
    let attempts = 0;

    const pickResultUrl = (data: any): string | null => {
      // New API shape: { results: [{ url }] }
      const r0 = data?.results?.[0];
      if (typeof r0?.url === 'string' && r0.url) return r0.url;
      if (typeof r0 === 'string' && r0) return r0;

      // Legacy / provider-specific shapes
      const o0 = data?.outputs?.[0];
      if (typeof o0?.url === 'string' && o0.url) return o0.url;
      if (typeof data?.result?.url === 'string' && data.result.url) return data.result.url;
      if (typeof data?.result_url === 'string' && data.result_url) return data.result_url;
      if (typeof data?.asset_url === 'string' && data.asset_url) return data.asset_url;
      if (Array.isArray(data?.result_urls) && typeof data.result_urls?.[0] === 'string') return data.result_urls[0];

      return null;
    };

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPollingStatus('failed');
        setGenerating(false);
        toast.error('Превышено время ожидания');
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed' || data.status === 'success') {
          setPollingStatus('completed');
          setGenerating(false);

          // Получить URL результата
          const videoUrl = pickResultUrl(data);
          if (videoUrl) {
            setResultUrl(videoUrl);
            toast.success('Видео готово!');
          } else {
            toast.error('Видео сгенерировано, но URL не найден');
          }
          return;
        }

        if (data.status === 'failed' || data.status === 'error') {
          setPollingStatus('failed');
          setGenerating(false);
          toast.error(data.error_message || 'Ошибка генерации');
          return;
        }

        // Продолжить polling
        attempts++;
        setTimeout(poll, 30000); // 30 секунд
      } catch (error) {
        console.error('[Voice] Polling error:', error);
        attempts++;
        setTimeout(poll, 30000);
      }
    };

    poll();
  }, []);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[var(--gold)]/18 blur-[140px]" />
      <div className="pointer-events-none absolute top-32 -left-28 w-[420px] h-[420px] rounded-full bg-violet-500/18 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 -right-24 w-[420px] h-[420px] rounded-full bg-blue-500/12 blur-[140px]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text)] tracking-[-0.02em] mb-2">
            Анимация персонажа
          </h1>
          <p className="text-[var(--muted)] text-base sm:text-lg max-w-2xl mx-auto">
            {currentTab.description}
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_10px_40px_rgba(0,0,0,0.10)]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    isActive
                      ? 'bg-[var(--gold)]/15 text-[var(--gold)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ============= LIP-SYNC TAB ============= */}
        {activeTab === 'lipsync' && (
          <>
            {/* Steps */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8"
            >
              <div className={cn(
                "rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3",
                imageUrl ? "border-green-500/25" : "border-[var(--border)]"
              )}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                  <ImageLucide className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                    1. Фото
                    {imageUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">Портрет/лицо крупным планом</div>
                </div>
              </div>

              <div className={cn(
                "rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3",
                audioUrl ? "border-green-500/25" : "border-[var(--border)]"
              )}>
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/15 flex items-center justify-center">
                  <FileAudio className="w-5 h-5 text-[var(--gold)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                    2. Аудио
                    {audioUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">Файл или запись с микрофона</div>
                </div>
              </div>

              <div className={cn(
                "rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3",
                resultUrl ? "border-green-500/25" : "border-[var(--border)]"
              )}>
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                    3. Видео
                    {resultUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  </div>
                  <div className="text-xs text-[var(--muted)] truncate">Готово для скачивания</div>
                </div>
              </div>
            </motion.div>

            {/* Model Selector */}
            <div className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-medium text-[var(--text)]">Выберите модель</div>
                <div className="text-xs text-[var(--muted)] flex items-center gap-2">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>Зависит от длины аудио</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {LIPSYNC_MODELS.map((model) => (
                  <motion.button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "relative p-4 rounded-2xl border transition-all text-left overflow-hidden",
                      selectedModel === model.id
                        ? "border-[var(--gold)] bg-[var(--gold)]/7 shadow-[0_0_0_1px_rgba(245,158,11,0.20)]"
                        : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface)]"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)] truncate">{model.name}</div>
                        <div className="text-sm text-[var(--muted)]">{model.description}</div>
                      </div>
                      <span className={cn(
                        "shrink-0 text-xs px-2 py-1 rounded-full font-semibold border",
                        model.color === 'violet' && "bg-violet-500/10 text-violet-300 border-violet-500/20",
                        model.color === 'blue' && "bg-blue-500/10 text-blue-300 border-blue-500/20",
                        model.color === 'emerald' && "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      )}>
                        {model.badge}
                      </span>
                    </div>

                    {selectedModel === model.id && (
                      <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--gold)]">
                        <CheckCircle2 className="w-4 h-4" />
                        Выбрано
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ImageUploader
                onImageUploaded={setImageUrl}
                disabled={generating}
              />

              <AudioInput
                onAudioUploaded={handleAudioUploaded}
                maxDuration={selectedModel.includes('infinitalk') ? 15 : 0}
                disabled={generating}
              />
            </div>

            {/* Advanced Options */}
            <div className="mb-6">
              <button
                onClick={() => setOptionsOpen(!optionsOpen)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors shadow-[0_20px_60px_rgba(0,0,0,0.10)]"
              >
                <span className="text-sm font-semibold text-[var(--text)]">
                  Дополнительные параметры
                </span>
                {optionsOpen ? (
                  <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
                )}
              </button>

              <AnimatePresence>
                {optionsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-5 sm:p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,0.10)] space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text)] mb-2">
                          Промпт (опционально)
                        </label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          disabled={generating}
                          placeholder="Например: «Дружелюбная улыбка, спокойный темп»"
                          className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
                          rows={3}
                        />
                      </div>

                      {selectedModel.includes('infinitalk') && (
                        <div>
                          <label className="block text-sm font-medium text-[var(--text)] mb-2">
                            Seed (опционально)
                          </label>
                          <input
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            disabled={generating}
                            placeholder="10000-1000000"
                            min="10000"
                            max="1000000"
                            className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
                          />
                          <p className="text-xs text-[var(--muted)] mt-2">
                            Для воспроизводимости результата
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cost Display */}
            <div className="mb-4 p-4 sm:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.10)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[var(--gold)]/12 border border-[var(--gold)]/15 flex items-center justify-center">
                  <Star className="w-5 h-5 text-[var(--gold)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text)]">Стоимость</div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {audioDuration > 0 ? `Длина аудио: ~${audioDuration} сек` : 'Определится после загрузки аудио'}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold text-[var(--text)] flex items-center gap-2 justify-end">
                  {estimatedCost}
                  <span className="text-base text-[var(--muted)]">⭐</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={cn(
                "w-full py-4 rounded-3xl font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_20px_60px_rgba(0,0,0,0.18)] active:scale-[0.99]",
                canGenerate
                  ? "bg-[var(--accent-gradient-glow)] text-black hover:brightness-110"
                  : "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed shadow-none"
              )}
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  {pollingStatus === 'polling' ? 'Генерация...' : 'Запуск...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Создать за {estimatedCost}⭐
                </>
              )}
            </button>
            {missing && (
              <div className="mt-3 text-sm text-[var(--muted)] text-center flex items-center justify-center gap-2">
                <Wand2 className="w-4 h-4" />
                {missing}
              </div>
            )}

            {/* Result */}
            {resultUrl && (
              <div className="mt-8 p-5 sm:p-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Результат
                </h3>
                <video
                  src={resultUrl}
                  controls
                  className="w-full rounded-2xl bg-black"
                />
                <a
                  href={resultUrl}
                  download
                  className="mt-4 block w-full py-3 rounded-2xl bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-center font-semibold transition-colors"
                >
                  Скачать видео
                </a>
              </div>
            )}
          </>
        )}

        {/* ============= ANIMATE TAB ============= */}
        {activeTab === 'animate' && (
          <AnimateSection />
        )}
      </div>
    </div>
  );
}
