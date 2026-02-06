'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ImageUploader } from './ImageUploader';
import { AudioInput } from './AudioInput';
import { getModelById } from '@/config/models';
import { getSkuFromRequest, calculateTotalStars } from '@/lib/pricing/pricing';

const MODELS = [
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
    description: 'Быстрая генерация • 3⭐/сек',
    badge: 'FAST',
    color: 'blue',
  },
  {
    id: 'infinitalk-720p',
    name: 'InfiniteTalk 720p',
    description: 'HD качество • 12⭐/сек',
    badge: 'HD',
    color: 'emerald',
  },
];

export function VoiceSection() {
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
          const videoUrl = data.outputs?.[0]?.url || data.result_url || data.asset_url;
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

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="container mx-auto px-6 py-10 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-3">
            Озвучка персонажа
          </h1>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            Превратите фото в говорящее видео с реалистичной синхронизацией губ
          </p>
        </div>

        {/* Model Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-[var(--text)] mb-3">
            Выберите модель
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  selectedModel === model.id
                    ? "border-[var(--gold)] bg-[var(--gold)]/5"
                    : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface)]"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[var(--text)]">{model.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-bold",
                    model.color === 'violet' && "bg-violet-500/20 text-violet-400",
                    model.color === 'blue' && "bg-blue-500/20 text-blue-400",
                    model.color === 'emerald' && "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {model.badge}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)]">{model.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors"
          >
            <span className="text-sm font-medium text-[var(--text)]">
              Дополнительные параметры
            </span>
            {optionsOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--muted)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
            )}
          </button>

          {optionsOpen && (
            <div className="mt-4 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Промпт (опционально)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={generating}
                  placeholder="Опишите желаемые эмоции, стиль речи..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
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
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
                  />
                  <p className="text-xs text-[var(--muted)] mt-2">
                    Число от 10000 до 1000000 для воспроизводимости результата
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cost Display */}
        <div className="mb-6 p-4 rounded-xl bg-[var(--surface2)] flex items-center justify-between">
          <span className="text-sm text-[var(--muted)]">Будет списано:</span>
          <span className="text-lg font-bold text-[var(--text)]">
            {estimatedCost} ⭐
          </span>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2",
            canGenerate
              ? "bg-gradient-to-r from-[var(--gold)] to-violet-500 hover:shadow-lg hover:shadow-[var(--gold)]/30"
              : "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
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
              Списать {estimatedCost}⭐
            </>
          )}
        </button>

        {/* Result */}
        {resultUrl && (
          <div className="mt-8 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
              Результат
            </h3>
            <video
              src={resultUrl}
              controls
              className="w-full rounded-xl bg-black"
            />
            <a
              href={resultUrl}
              download
              className="mt-4 block w-full py-3 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold)]/80 text-white text-center font-medium transition-colors"
            >
              Скачать видео
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
