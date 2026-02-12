'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Music,
  Mic,
  Sparkles,
  Loader2,
  Upload,
  Wand2,
  Settings2,
  RefreshCw,
  ExternalLink,
  PlayCircle,
  ChevronDown,
  Scissors,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AudioStudio } from './AudioStudio';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';
import { LoginDialog } from '@/components/auth/login-dialog';

type Tab = 'music' | 'voice';
type GenerationType = 'generate' | 'extend' | 'cover' | 'add-vocals' | 'separate';

type AudioGeneration = {
  id: string;
  status: string | null;
  prompt: string | null;
  model_id: string | null;
  model_name: string | null;
  task_id: string | null;
  thread_id: string | null;
  asset_url: string | null;
  result_urls: string[] | null;
  error: string | null;
  credits_used: number | null;
  created_at: string;
};

function pickAudioUrl(g: AudioGeneration): string | null {
  if (g.asset_url) return g.asset_url;
  if (Array.isArray(g.result_urls) && g.result_urls[0]) return g.result_urls[0];
  return null;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

async function uploadAudioFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'audio');
  const res = await fetch('/api/upload/voice-assets', {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || 'Не удалось загрузить файл');
  if (!data?.url) throw new Error('URL загрузки не получен');
  return String(data.url);
}

export function MusicAndVoiceStudio() {
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const [tab, setTab] = useState<Tab>('music');

  const [generationType, setGenerationType] = useState<GenerationType>('generate');
  const [sunoModel, setSunoModel] = useState<'V4_5PLUS' | 'V4_0' | 'V3_5'>('V4_5PLUS');
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);

  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState<'not_specified' | 'male' | 'female'>('not_specified');
  const [styleWeight, setStyleWeight] = useState<number>(55);
  const [weirdness, setWeirdness] = useState<number>(20);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced ops inputs (best-effort, user-supplied).
  const [audioId, setAudioId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [continuePrompt, setContinuePrompt] = useState('');

  // For cover/add-vocals
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [audioSourceMode, setAudioSourceMode] = useState<'upload' | 'record'>('upload');
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Thread/project
  const threadId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search);
    const v = (sp.get('project') || sp.get('thread') || '').trim();
    return v;
  }, []);

  // Running job state
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [pollingState, setPollingState] = useState<'idle' | 'polling'>('idle');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History
  const [history, setHistory] = useState<AudioGeneration[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPollingState('idle');
    setJobId(null);
    setJobProgress(0);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const reloadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('type', 'audio');
      qs.set('limit', '30');
      if (threadId) qs.set('thread_id', threadId);
      const res = await fetch(`/api/generations?${qs.toString()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const items: AudioGeneration[] = Array.isArray(data?.generations) ? data.generations : [];
      setHistory(items);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated, threadId]);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  const pollJob = useCallback(async (id: string) => {
    setPollingState('polling');

    let attempts = 0;
    const maxAttempts = 120; // ~10 min with backoff

    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        setIsGenerating(false);
        stopPolling();
        toast.error('Таймаут генерации. Проверьте историю через минуту.');
        return;
      }

      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // transient; keep trying a bit
          pollTimerRef.current = setTimeout(poll, 2500);
          return;
        }

        const st = String(data?.status || '').toLowerCase();
        const p = Number(data?.progress || 0);
        if (Number.isFinite(p)) setJobProgress(Math.max(0, Math.min(100, p)));

        if (st === 'completed' || st === 'success') {
          setIsGenerating(false);
          stopPolling();
          toast.success('Аудио готово!');
          await reloadHistory();
          return;
        }

        if (st === 'failed') {
          setIsGenerating(false);
          stopPolling();
          toast.error(String(data?.error || 'Генерация не удалась'));
          await reloadHistory();
          return;
        }

        const next = Math.min(6000, 1200 + attempts * 200);
        pollTimerRef.current = setTimeout(poll, next);
      } catch {
        pollTimerRef.current = setTimeout(poll, 3000);
      }
    };

    poll();
  }, [reloadHistory, stopPolling]);

  const canGenerate = useMemo(() => {
    if (generationType === 'generate') {
      if (customMode) return !!(lyrics.trim() || prompt.trim());
      return !!prompt.trim();
    }
    if (generationType === 'extend' || generationType === 'separate') {
      return !!audioId.trim();
    }
    if (generationType === 'cover' || generationType === 'add-vocals') {
      return !!uploadedAudioUrl.trim();
    }
    return false;
  }, [generationType, customMode, lyrics, prompt, audioId, uploadedAudioUrl]);

  const submit = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);
    setJobProgress(0);

    try {
      const body: any = {
        model: 'suno',
        generation_type: generationType,
        suno_model: sunoModel,
        custom_mode: customMode,
        title: title.trim() || undefined,
        style: style.trim() || undefined,
        instrumental,
        prompt: prompt.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        negative_tags: negativeTags.trim() || undefined,
        vocal_gender: vocalGender,
        style_weight: styleWeight,
        weirdness: weirdness,
        // Advanced/best-effort:
        audio_id: audioId.trim() || undefined,
        task_id: taskId.trim() || undefined,
        continue_prompt: continuePrompt.trim() || undefined,
        audioFile: uploadedAudioUrl.trim() || undefined,
        threadId: threadId || undefined,
      };

      const res = await fetch('/api/generate/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(String(data?.message || data?.error || 'Ошибка запуска генерации'));
      }

      const jid = String(data?.jobId || data?.taskId || '');
      const creditCost = Number(data?.creditCost || 0);
      if (creditCost > 0) toast.message(`Списано: ${creditCost}⭐`);

      if (!jid) {
        // Some providers might return completed URLs immediately; we fallback to history.
        setIsGenerating(false);
        await reloadHistory();
        toast.success('Запрос принят. Проверьте историю.');
        return;
      }

      setJobId(jid);
      await pollJob(jid);
    } catch (e) {
      setIsGenerating(false);
      const msg = e instanceof Error ? e.message : 'Ошибка генерации';
      toast.error(msg);
    }
  }, [
    isAuthenticated,
    canGenerate,
    isGenerating,
    generationType,
    sunoModel,
    customMode,
    title,
    style,
    instrumental,
    prompt,
    lyrics,
    negativeTags,
    vocalGender,
    styleWeight,
    weirdness,
    audioId,
    taskId,
    continuePrompt,
    uploadedAudioUrl,
    threadId,
    pollJob,
    reloadHistory,
  ]);

  const onPickFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAudioFile(file);
      setUploadedAudioUrl(url);
      toast.success('Файл загружен');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  }, [isAuthenticated]);

  const onRecordingComplete = useCallback((url: string) => {
    setUploadedAudioUrl(url);
    toast.success('Запись готова');
  }, []);

  const presets = useMemo(
    () => [
      { label: 'Phonk', v: 'phonk, aggressive, 90 bpm, distorted 808', emoji: '🔥', color: 'bg-red-500/8 border-red-500/20 hover:bg-red-500/15' },
      { label: 'Lo-fi', v: 'lofi hip hop, chill, warm vinyl, 80 bpm', emoji: '🎧', color: 'bg-amber-500/8 border-amber-500/20 hover:bg-amber-500/15' },
      { label: 'House', v: 'house, club, four-on-the-floor, 124 bpm', emoji: '🪩', color: 'bg-purple-500/8 border-purple-500/20 hover:bg-purple-500/15' },
      { label: 'Synthwave', v: 'synthwave, retro, neon, 100 bpm', emoji: '🌆', color: 'bg-cyan-500/8 border-cyan-500/20 hover:bg-cyan-500/15' },
      { label: 'Cinematic', v: 'cinematic, orchestral, trailer, epic', emoji: '🎬', color: 'bg-blue-500/8 border-blue-500/20 hover:bg-blue-500/15' },
      { label: 'Pop', v: 'pop, catchy, modern, radio', emoji: '🎤', color: 'bg-pink-500/8 border-pink-500/20 hover:bg-pink-500/15' },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-[var(--gold)]/8 blur-[180px]" />
      <div className="pointer-events-none absolute top-40 -left-32 w-[520px] h-[520px] rounded-full bg-[var(--accent-secondary)]/6 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-10 -right-28 w-[520px] h-[520px] rounded-full bg-[var(--gold)]/5 blur-[160px]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-10">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/15">
              <Music className="w-6 h-6 text-[var(--gold)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text)]">
              Музыка
            </h1>
          </div>
          <p className="text-[var(--muted)] text-base sm:text-lg">
            Suno генерация треков плюс озвучка и клонирование голоса
          </p>
        </div>

        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_18px_50px_rgba(0,0,0,0.10)]">
            <button
              type="button"
              onClick={() => setTab('music')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition',
                tab === 'music'
                  ? 'bg-[var(--gold)] text-black'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Suno
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('voice')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition',
                tab === 'voice'
                  ? 'bg-[var(--gold)] text-black'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Голос (TTS)
              </span>
            </button>
          </div>
        </div>

        {tab === 'voice' ? (
          <AudioStudio />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            {/* Left: Create */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)]">
                      Генерация музыки
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Основной режим: Generate. Остальные режимы работают по данным от провайдера (audio_id/task_id).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={reloadHistory}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Обновить
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Режим</label>
                    <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] overflow-x-auto">
                      {([
                        { value: 'generate' as const, label: 'Новый трек', icon: <Sparkles className="w-3.5 h-3.5" /> },
                        { value: 'extend' as const, label: 'Продолжить', icon: <RefreshCw className="w-3.5 h-3.5" /> },
                        { value: 'cover' as const, label: 'Кавер', icon: <Music className="w-3.5 h-3.5" /> },
                        { value: 'add-vocals' as const, label: 'Вокал', icon: <Mic className="w-3.5 h-3.5" /> },
                        { value: 'separate' as const, label: 'Разделить', icon: <Scissors className="w-3.5 h-3.5" /> },
                      ] as const).map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setGenerationType(mode.value)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                            generationType === mode.value
                              ? 'bg-[var(--gold)] text-black shadow-sm'
                              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]'
                          )}
                        >
                          {mode.icon}
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Модель</label>
                    <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                      {([
                        { value: 'V4_5PLUS' as const, label: 'V4.5+', badge: 'NEW' },
                        { value: 'V4_0' as const, label: 'V4.0', badge: undefined },
                        { value: 'V3_5' as const, label: 'V3.5', badge: undefined },
                      ] as const).map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setSunoModel(m.value)}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative',
                            sunoModel === m.value
                              ? 'bg-[var(--gold)] text-black shadow-sm'
                              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]'
                          )}
                        >
                          {m.label}
                          {m.badge && sunoModel !== m.value && (
                            <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 text-[9px] font-bold bg-[var(--gold)] text-black rounded-full leading-none">
                              {m.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { label: 'Custom Mode', sublabel: 'Свой текст', checked: customMode, toggle: () => setCustomMode(!customMode) },
                      { label: 'Instrumental', sublabel: 'Без вокала', checked: instrumental, toggle: () => setInstrumental(!instrumental) },
                    ] as const).map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={t.toggle}
                        className={cn(
                          'flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                          t.checked
                            ? 'bg-[var(--gold)]/8 border-[var(--gold)]/30'
                            : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--border-hover)]'
                        )}
                      >
                        <div>
                          <div className="text-sm font-medium text-[var(--text)]">{t.label}</div>
                          <div className="text-[11px] text-[var(--muted)]">{t.sublabel}</div>
                        </div>
                        <div className={cn(
                          'w-10 h-6 rounded-full p-0.5 transition-colors shrink-0',
                          t.checked ? 'bg-[var(--gold)]' : 'bg-[var(--surface3,var(--surface2))]'
                        )}>
                          <div className={cn(
                            'w-5 h-5 rounded-full bg-white shadow-md transition-transform',
                            t.checked ? 'translate-x-4' : 'translate-x-0'
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Title (опционально)</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        placeholder="Например: Neon Drift"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Style / Tags</label>
                      <input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        placeholder="genre, mood, bpm..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setStyle((prev) => (prev ? `${prev}, ${p.v}` : p.v))}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                          p.color
                        )}
                      >
                        <span className="mr-1">{p.emoji}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">
                      Prompt (описание трека)
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
                      placeholder="Например: cinematic cyberpunk chase, driving bass, wide stereo, build-up and drop"
                    />
                  </div>

                  {customMode && (
                    <div>
                      <label className="block text-xs text-[var(--muted)] mb-1">Lyrics</label>
                      <textarea
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
                        placeholder="Куплет / припев..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Голос</label>
                      <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                        {([
                          { value: 'not_specified' as const, label: 'Любой' },
                          { value: 'male' as const, label: '♂ Муж' },
                          { value: 'female' as const, label: '♀ Жен' },
                        ] as const).map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            onClick={() => setVocalGender(g.value)}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                              vocalGender === g.value
                                ? 'bg-[var(--gold)] text-black shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]'
                            )}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Negative tags</label>
                      <input
                        value={negativeTags}
                        onChange={(e) => setNegativeTags(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                        placeholder="low quality, noisy..."
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      className="flex w-full items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
                        <Settings2 className="w-4 h-4 text-[var(--gold)]" />
                        Тонкая настройка
                      </div>
                      <ChevronDown className={cn('w-4 h-4 text-[var(--muted)] transition-transform', advancedOpen && 'rotate-180')} />
                    </button>

                    {advancedOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pb-4 pt-0 border-t border-[var(--border)]">
                        <div className="pt-4">
                          <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
                            <span>Style weight</span>
                            <span className="px-2 py-0.5 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] font-semibold">{styleWeight}%</span>
                          </div>
                          <Slider value={[styleWeight]} onValueChange={([v]: number[]) => setStyleWeight(v)} min={0} max={100} step={1} />
                        </div>
                        <div className="pt-4">
                          <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
                            <span>Weirdness</span>
                            <span className="px-2 py-0.5 rounded-md bg-[var(--gold)]/10 text-[var(--gold)] font-semibold">{weirdness}%</span>
                          </div>
                          <Slider value={[weirdness]} onValueChange={([v]: number[]) => setWeirdness(v)} min={0} max={100} step={1} />
                        </div>
                      </div>
                    )}
                  </div>

                  {(generationType === 'cover' || generationType === 'add-vocals') && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-sm font-semibold text-[var(--text)]">Исходный аудио-файл</div>
                        <div className="inline-flex p-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          <button
                            type="button"
                            onClick={() => setAudioSourceMode('upload')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                              audioSourceMode === 'upload' ? "bg-[var(--gold)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5" />
                              Загрузить
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setAudioSourceMode('record')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                              audioSourceMode === 'record' ? "bg-[var(--gold)] text-black" : "text-[var(--muted)] hover:text-[var(--text)]"
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5" />
                              Записать
                            </span>
                          </button>
                        </div>
                      </div>

                      {audioSourceMode === 'upload' ? (
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)] disabled:opacity-60"
                          >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Выбрать файл
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                          />
                          {uploadedAudioUrl && (
                            <button
                              type="button"
                              onClick={() => setUploadedAudioUrl('')}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                            >
                              Очистить
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                          <VoiceRecorder
                            maxDuration={180}
                            onRecordingComplete={onRecordingComplete}
                            disabled={isGenerating || uploading}
                          />
                        </div>
                      )}

                      {uploadedAudioUrl ? (
                        <div className="mt-3">
                          <audio controls src={uploadedAudioUrl} className="w-full" />
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-[var(--muted)]">
                          Для Cover/Add Vocals нужен аудио-источник: загрузка файла или запись с микрофона.
                        </div>
                      )}
                    </div>
                  )}

                  {(generationType === 'extend' || generationType === 'separate') && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                      <div className="text-sm font-semibold text-[var(--text)] mb-2">Advanced параметры</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">audio_id</label>
                          <input
                            value={audioId}
                            onChange={(e) => setAudioId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                            placeholder="audio_id от провайдера"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--muted)] mb-1">task_id (optional)</label>
                          <input
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                            placeholder="task_id от провайдера"
                          />
                        </div>
                      </div>
                      {generationType === 'extend' && (
                        <div className="mt-3">
                          <label className="block text-xs text-[var(--muted)] mb-1">continue_prompt (optional)</label>
                          <input
                            value={continuePrompt}
                            onChange={(e) => setContinuePrompt(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                            placeholder="как продолжать"
                          />
                        </div>
                      )}
                      <div className="mt-2 text-xs text-[var(--muted)]">
                        Эти режимы зависят от того, какие ID возвращает провайдер. Если нужно, добавим авто-подстановку из истории.
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canGenerate || isGenerating}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.99]',
                      !canGenerate || isGenerating
                        ? 'bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed'
                        : 'bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 shadow-lg shadow-[var(--gold)]/20'
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Генерация… {jobId ? `${jobProgress}%` : ''}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Создать
                      </>
                    )}
                  </button>

                  <div className="text-xs text-[var(--muted)]">
                    Списание звезд: для музыки обычно происходит до старта (upfront). Результат появится в истории и в библиотеке.
                  </div>
                </div>
              </div>
            </div>

            {/* Right: History */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)]">История</h3>
                  <span className="text-xs text-[var(--muted)]">{history.length} файлов</span>
                </div>

                {historyLoading ? (
                  <div className="text-sm text-[var(--muted)]">Загрузка…</div>
                ) : history.length === 0 ? (
                  <div className="text-sm text-[var(--muted)]">Пока нет генераций.</div>
                ) : (
                  <div className="space-y-4">
                    {history.map((g) => {
                      const url = pickAudioUrl(g);
                      const st = String(g.status || '').toLowerCase();
                      return (
                        <div key={g.id} className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[var(--text)] truncate">
                                {g.model_name || g.model_id || 'Audio'}
                              </div>
                              <div className="text-xs text-[var(--muted)]">{formatTs(g.created_at)}</div>
                            </div>
                            <div className={cn(
                              'px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                              st === 'success' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                              st === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                              'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            )}>
                              {st || 'queued'}
                            </div>
                          </div>

                          {g.prompt ? (
                            <div className="mt-2 text-sm text-[var(--text)] line-clamp-2">
                              {g.prompt}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            {url ? (
                              <audio controls src={url} className="w-full" />
                            ) : st === 'failed' ? (
                              <div className="text-xs text-red-400">
                                {g.error || 'Ошибка генерации'}
                              </div>
                            ) : (
                              <div className="text-xs text-[var(--muted)]">В обработке…</div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="text-xs text-[var(--muted)]">
                              {g.credits_used ? `⭐ ${g.credits_used}` : ''}
                            </div>
                            <div className="flex items-center gap-2">
                              {g.task_id && (st === 'queued' || st === 'generating' || st === 'pending' || st === 'processing') ? (
                                <button
                                  type="button"
                                  onClick={() => pollJob(String(g.task_id))}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                  Проверить
                                </button>
                              ) : null}
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Открыть
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
