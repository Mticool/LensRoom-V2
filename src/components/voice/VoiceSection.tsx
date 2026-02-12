'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mic2,
  Image as ImageLucide,
  FileAudio,
  CheckCircle2,
  Star,
  Film,
  Info,
  Download,
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
    id: 'kling-ai-avatar-standard',
    name: 'Kling AI Avatar Standard',
    description: '720p, стабильный lipsync',
    badge: 'STANDARD',
  },
  {
    id: 'kling-ai-avatar-pro',
    name: 'Kling AI Avatar Pro',
    description: '1080p, максимальная детализация lipsync',
    badge: 'PRO',
  },
  {
    id: 'infinitalk-480p',
    name: 'InfiniteTalk 480p',
    description: 'Быстрый рендер для черновиков',
    badge: 'FAST',
  },
  {
    id: 'infinitalk-720p',
    name: 'InfiniteTalk 720p',
    description: 'HD качество для продакшена',
    badge: 'HD',
  },
];

const TABS = [
  {
    id: 'lipsync' as const,
    label: 'Lipsync',
    icon: Mic2,
    description: 'Синхронизация губ на фото и аватаре',
  },
  {
    id: 'animate' as const,
    label: 'Animation',
    icon: Film,
    description: 'Анимация движений по видео-референсу',
  },
];

export function VoiceSection() {
  const [activeTab, setActiveTab] = useState<'lipsync' | 'animate'>('lipsync');

  const [selectedModel, setSelectedModel] = useState('kling-ai-avatar-standard');
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
  const currentTab = TABS.find((t) => t.id === activeTab)!;

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
      setPollingStatus('polling');
      pollStatus(data.taskId || data.jobId);
    } catch (error: any) {
      console.error('[Voice] Generation error:', error);
      toast.error(error.message || 'Не удалось запустить генерацию');
      setGenerating(false);
    }
  }, [canGenerate, selectedModel, imageUrl, audioUrl, prompt, seed]);

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
            window.dispatchEvent(new Event('generations:refresh'));
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
        console.error('[Voice] Polling error:', error);
        attempts++;
        setTimeout(poll, 30000);
      }
    };

    poll();
  }, []);

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `lipsync-${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text)] sm:text-2xl">Voice Studio</h1>
            <p className="text-sm text-[var(--muted)]">Единый workflow: загрузка, настройка, генерация</p>
          </div>

          <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'lipsync' && (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full lg:w-[520px] lg:shrink-0">
              <div className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div>
                  <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Режим</div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm font-medium text-[var(--text)]">
                    {currentTab.description}
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Модель</div>
                  <div className="space-y-2">
                    {LIPSYNC_MODELS.map((model) => {
                      const active = selectedModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={cn(
                            'w-full rounded-xl border px-3.5 py-3 text-left transition-colors',
                            active
                              ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10'
                              : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-hover)]'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[var(--text)]">{model.name}</div>
                              <div className="mt-0.5 text-xs text-[var(--muted)]">{model.description}</div>
                            </div>
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                              {model.badge}
                            </span>
                          </div>
                          {active && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--gold)]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Выбрано
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Загрузки</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ImageUploader onImageUploaded={setImageUrl} disabled={generating} compact />
                    <AudioInput
                      onAudioUploaded={handleAudioUploaded}
                      maxDuration={15}
                      disabled={generating}
                      compact
                    />
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setOptionsOpen(!optionsOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 transition-colors hover:border-[var(--border-hover)]"
                  >
                    <span className="text-sm font-medium text-[var(--text)]">Дополнительные параметры</span>
                    {optionsOpen ? (
                      <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
                    )}
                  </button>

                  {optionsOpen && (
                    <div className="mt-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Промпт</label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          disabled={generating}
                          placeholder="Например: дружелюбная улыбка, спокойный темп"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40"
                          rows={2}
                        />
                      </div>

                    </div>
                  )}
                </div>

                {selectedModel.includes('infinitalk') && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      disabled={generating}
                      placeholder="10000-1000000"
                      min="10000"
                      max="1000000"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[var(--gold)]" />
                    <span className="text-sm text-[var(--muted)]">
                      {audioDuration > 0 ? `${audioDuration}с аудио` : 'Стоимость'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[var(--text)]">
                    {estimatedCost > 0 ? (
                      <>
                        {estimatedCost}
                        <span className="ml-1 text-sm text-[var(--muted)]">⭐</span>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">—</span>
                    )}
                  </span>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-all active:scale-[0.98]',
                    canGenerate
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[0_8px_30px_rgba(0,0,0,0.20)]'
                      : 'cursor-not-allowed bg-[var(--surface2)] text-[var(--muted)]'
                  )}
                >
                  {generating ? (
                    <>
                      <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{pollingStatus === 'polling' ? 'Генерация...' : 'Запуск...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>{estimatedCost > 0 ? `Создать за ${estimatedCost}⭐` : 'Создать'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {resultUrl ? (
                <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
                    <h3 className="text-lg font-semibold text-[var(--text)]">Результат</h3>
                    <button
                      onClick={downloadResult}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--btn-primary-text)] transition-colors hover:bg-[var(--btn-primary-bg-hover)]"
                    >
                      <Download className="h-4 w-4" />
                      Скачать
                    </button>
                  </div>
                  <div className="px-5 pb-5">
                    <video src={resultUrl} controls className="aspect-video w-full rounded-2xl bg-black" />
                    {(taskId || generationId) && (
                      <div className="mt-3 text-xs text-[var(--muted)]">
                        {taskId ? `Task: ${taskId}` : ''} {generationId ? `• Generation: ${generationId}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              ) : generating ? (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                  <div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-[var(--gold)]/20 border-t-[var(--gold)]" />
                  <h3 className="mb-2 text-lg font-semibold text-[var(--text)]">
                    {pollingStatus === 'polling' ? 'Генерация видео...' : 'Запуск генерации...'}
                  </h3>
                  <p className="max-w-sm text-center text-sm text-[var(--muted)]">
                    Обычно занимает 1-3 минуты. Результат появится автоматически.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/10">
                      <Mic2 className="h-6 w-6 text-[var(--gold)]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text)]">Lipsync</h2>
                      <p className="text-sm text-[var(--muted)]">Фото + Аудио → Говорящее видео</p>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/12">
                        <ImageLucide className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--text)]">1. Фото</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Загрузите портрет персонажа</div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--gold)]/15">
                        <FileAudio className="h-4 w-4 text-[var(--gold)]" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--text)]">2. Аудио</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Файл или запись с микрофона</div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/12">
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="text-sm font-semibold text-[var(--text)]">3. Результат</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Видео с синхронизацией губ</div>
                    </div>
                  </div>

                  <div className="mt-auto rounded-2xl border border-[var(--gold)]/15 bg-[var(--gold)]/6 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                      <p className="text-xs leading-relaxed text-[var(--muted)]">
                        Для лучшего результата используйте чёткий портрет в анфас и аудио с чистой речью без
                        сильного шума.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'animate' && <AnimateSection />}
      </div>
    </div>
  );
}
