'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageLucide,
  Film,
  Wand2,
  CheckCircle2,
  Star,
  Move,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageUploader } from './ImageUploader';
import { VideoUploader } from './VideoUploader';
import { getSkuFromRequest, calculateTotalStars } from '@/lib/pricing/pricing';

const ANIMATE_MODES = [
  {
    id: 'move' as const,
    name: 'Motion Transfer',
    nameRu: 'Передать движения',
    description: 'Движения из видео переносятся на ваше фото',
    icon: Move,
    color: 'violet',
    modelId: 'wan-animate-move',
  },
  {
    id: 'replace' as const,
    name: 'Character Swap',
    nameRu: 'Заменить персонажа',
    description: 'Лицо из фото заменяет персонажа в видео',
    icon: Users,
    color: 'rose',
    modelId: 'wan-animate-replace',
  },
];

const QUALITY_OPTIONS = [
  { value: '480p', label: '480p', sublabel: 'Быстро' },
  { value: '580p', label: '580p', sublabel: 'Баланс' },
  { value: '720p', label: '720p', sublabel: 'HD' },
];

export function AnimateSection() {
  const [animateMode, setAnimateMode] = useState<'move' | 'replace'>('move');
  const [quality, setQuality] = useState('480p');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const currentMode = ANIMATE_MODES.find((m) => m.id === animateMode)!;
  const modelId = currentMode.modelId;

  const estimatedCost = useMemo(() => {
    if (!videoDuration) return 0;
    try {
      const sku = getSkuFromRequest(modelId, {});
      return calculateTotalStars(sku, videoDuration);
    } catch {
      return 0;
    }
  }, [modelId, videoDuration]);

  const canGenerate = imageUrl && videoUrl && !generating;
  const missing = !imageUrl ? 'Загрузите фото' : !videoUrl ? 'Загрузите видео-референс' : null;

  const handleVideoUploaded = useCallback((url: string, duration?: number) => {
    setVideoUrl(url);
    if (duration) {
      setVideoDuration(duration);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setPollingStatus('idle');
    setResultUrl(null);

    try {
      const response = await fetch('/api/generate/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: animateMode,
          imageUrl,
          videoUrl,
          quality,
          prompt: prompt || undefined,
          videoDuration: videoDuration || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка генерации');
      }

      toast.success('Генерация запущена');
      setPollingStatus('polling');
      pollStatus(data.taskId || data.jobId);
    } catch (error: any) {
      console.error('[Animate] Generation error:', error);
      toast.error(error.message || 'Не удалось запустить генерацию');
      setGenerating(false);
    }
  }, [canGenerate, animateMode, imageUrl, videoUrl, quality, prompt, videoDuration]);

  const pollStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const pickResultUrl = (data: any): string | null => {
      const r0 = data?.results?.[0];
      if (typeof r0?.url === 'string' && r0.url) return r0.url;
      if (typeof r0 === 'string' && r0) return r0;
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

        attempts++;
        setTimeout(poll, 30000);
      } catch (error) {
        console.error('[Animate] Polling error:', error);
        attempts++;
        setTimeout(poll, 30000);
      }
    };

    poll();
  }, []);

  return (
    <>
      {/* Steps */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8"
      >
        <div className={cn(
          'rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3',
          imageUrl ? 'border-green-500/25' : 'border-[var(--border)]'
        )}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
            <ImageLucide className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              1. Фото
              {imageUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            </div>
            <div className="text-xs text-[var(--muted)] truncate">Персонаж для анимации</div>
          </div>
        </div>

        <div className={cn(
          'rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3',
          videoUrl ? 'border-green-500/25' : 'border-[var(--border)]'
        )}>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
            <Film className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              2. Видео
              {videoUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            </div>
            <div className="text-xs text-[var(--muted)] truncate">Референс с движениями</div>
          </div>
        </div>

        <div className={cn(
          'rounded-2xl border bg-[var(--surface)] px-4 py-3 flex items-center gap-3',
          resultUrl ? 'border-green-500/25' : 'border-[var(--border)]'
        )}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
              3. Результат
              {resultUrl && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            </div>
            <div className="text-xs text-[var(--muted)] truncate">Готово для скачивания</div>
          </div>
        </div>
      </motion.div>

      {/* Mode Selector */}
      <div className="mb-8">
        <div className="text-sm font-medium text-[var(--text)] mb-3">Режим анимации</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ANIMATE_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <motion.button
                key={mode.id}
                onClick={() => setAnimateMode(mode.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  'relative p-4 rounded-2xl border transition-all text-left overflow-hidden',
                  animateMode === mode.id
                    ? 'border-[var(--gold)] bg-[var(--gold)]/7 shadow-[0_0_0_1px_rgba(245,158,11,0.20)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface)]'
                )}
              >
                <div className="flex items-start justify-between mb-2 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center border',
                      mode.color === 'violet' && 'bg-violet-500/10 border-violet-500/15',
                      mode.color === 'rose' && 'bg-rose-500/10 border-rose-500/15'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        mode.color === 'violet' && 'text-violet-400',
                        mode.color === 'rose' && 'text-rose-400'
                      )} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text)] truncate">{mode.nameRu}</div>
                      <div className="text-sm text-[var(--muted)]">{mode.description}</div>
                    </div>
                  </div>
                  <span className={cn(
                    'shrink-0 text-xs px-2 py-1 rounded-full font-semibold border',
                    mode.color === 'violet' && 'bg-violet-500/10 text-violet-300 border-violet-500/20',
                    mode.color === 'rose' && 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  )}>
                    {mode.name.split(' ')[0]}
                  </span>
                </div>

                {animateMode === mode.id && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--gold)]">
                    <CheckCircle2 className="w-4 h-4" />
                    Выбрано
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Quality Selector */}
      <div className="mb-8">
        <div className="text-sm font-medium text-[var(--text)] mb-3">Качество</div>
        <div className="flex gap-2">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setQuality(opt.value)}
              className={cn(
                'flex-1 py-3 px-4 rounded-2xl border transition-all text-center',
                quality === opt.value
                  ? 'border-[var(--gold)] bg-[var(--gold)]/7 text-[var(--text)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-hover)]'
              )}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-xs opacity-70">{opt.sublabel}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Image + Video uploaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ImageUploader
          onImageUploaded={setImageUrl}
          disabled={generating}
        />
        <VideoUploader
          onVideoUploaded={handleVideoUploaded}
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
                    placeholder="Например: «Плавные движения, естественная мимика»"
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
                    rows={3}
                  />
                </div>
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
              {videoDuration > 0
                ? `Длина видео: ~${videoDuration} сек • ${animateMode === 'move' ? '6' : '8'}⭐/сек`
                : 'Определится после загрузки видео'}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-bold text-[var(--text)] flex items-center gap-2 justify-end">
            {estimatedCost || '—'}
            <span className="text-base text-[var(--muted)]">⭐</span>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={cn(
          'w-full py-4 rounded-3xl font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_20px_60px_rgba(0,0,0,0.18)] active:scale-[0.99]',
          canGenerate
            ? 'bg-[var(--accent-gradient-glow)] text-black hover:brightness-110'
            : 'bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed shadow-none'
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
            {estimatedCost > 0 ? `Создать за ${estimatedCost}⭐` : 'Создать'}
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
  );
}
