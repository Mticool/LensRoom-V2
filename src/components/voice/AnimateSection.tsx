'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  X,
  Image as ImageLucide,
  Film,
  Move,
  Users,
  ChevronDown,
  Download,
  Star,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getSkuFromRequest, calculateTotalStars } from '@/lib/pricing/pricing';

/* ── Configs ─────────────────────────────────────────────── */

const ANIMATE_MODES = [
  {
    id: 'move' as const,
    name: 'Motion Transfer',
    nameRu: 'Передать движения',
    shortRu: 'Движения',
    description: 'Движение из видео → на ваше фото',
    icon: Move,
    modelId: 'wan-animate-move',
  },
  {
    id: 'replace' as const,
    name: 'Character Swap',
    nameRu: 'Заменить персонажа',
    shortRu: 'Замена',
    description: 'Лицо из фото → в видео',
    icon: Users,
    modelId: 'wan-animate-replace',
  },
];

const QUALITY_OPTIONS = [
  { value: '480p', label: '480p' },
  { value: '580p', label: '580p' },
  { value: '720p', label: '720p' },
];

/* ── Helpers: Client-side video duration ────────────────── */

function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const dur = video.duration;
        URL.revokeObjectURL(video.src);
        resolve(isFinite(dur) && dur > 0 ? dur : null);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
      setTimeout(() => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }, 10000);
      video.src = URL.createObjectURL(file);
    } catch {
      resolve(null);
    }
  });
}

/* ── Inline Mini Uploader ─────────────────────────────────
   Small square upload zones used side-by-side in the sidebar.
   Each zone handles its own drag/drop/file-input and preview. */

interface MiniUploaderProps {
  type: 'image' | 'video';
  label: string;
  sublabel: string;
  accept: string;
  icon: React.ReactNode;
  preview: string | null;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  inputId: string;
  videoDuration?: number | null;
  accentClass?: string;
}

function MiniUploader({
  type,
  label,
  sublabel,
  accept,
  icon,
  preview,
  uploading,
  disabled,
  onFile,
  onRemove,
  inputId,
  videoDuration,
  accentClass = 'border-[var(--gold)]/40',
}: MiniUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [disabled, uploading, onFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => !disabled && setIsDragOver(true)}
      onDragLeave={() => setIsDragOver(false)}
      className={cn(
        'relative flex-1 min-w-0 rounded-2xl border border-dashed transition-all overflow-hidden',
        preview
          ? 'border-solid border-[var(--border)]'
          : isDragOver
            ? `${accentClass} bg-[var(--gold)]/5`
            : 'border-[var(--border)] hover:border-[var(--border-hover)]',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {preview ? (
        <div className="relative aspect-[3/4] bg-black/30">
          {type === 'video' ? (
            <video
              src={preview}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
              loop
              autoPlay
            />
          ) : (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          )}

          {/* Duration badge */}
          {type === 'video' && videoDuration && videoDuration > 0 && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-[10px] text-white font-medium backdrop-blur-sm">
              {videoDuration}с
            </div>
          )}

          {!disabled && (
            <button
              onClick={onRemove}
              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
              title="Удалить"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center aspect-[3/4] p-3 text-center cursor-pointer"
        >
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            disabled={disabled || uploading}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-[var(--gold)]/25 border-t-[var(--gold)] rounded-full animate-spin" />
              <span className="text-[11px] text-[var(--muted)]">Загрузка...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center mb-2.5">
                {icon}
              </div>
              <span className="text-xs font-semibold text-[var(--text)] leading-tight">{label}</span>
              <span className="text-[10px] text-[var(--muted)] mt-0.5">{sublabel}</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export function AnimateSection() {
  /* State */
  const [animateMode, setAnimateMode] = useState<'move' | 'replace'>('move');
  const [quality, setQuality] = useState('480p');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'polling' | 'completed' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [qualityOpen, setQualityOpen] = useState(false);

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

  /* ── Image upload handler ──────────── */
  const handleImageFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Макс. размер фото 10MB');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) && !ext.endsWith('.jpg') && !ext.endsWith('.jpeg') && !ext.endsWith('.png') && !ext.endsWith('.webp')) {
      toast.error('Поддерживаются JPG, PNG, WEBP');
      return;
    }

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const response = await fetch('/api/upload/voice-assets', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Ошибка загрузки');
      }
      const { url } = await response.json();
      setImageUrl(url);
      toast.success('Фото загружено');
    } catch (err: any) {
      toast.error(err?.message || 'Не удалось загрузить фото');
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  }, []);

  const handleImageRemove = useCallback(() => {
    setImagePreview(null);
    setImageUrl('');
  }, []);

  /* ── Video upload handler ──────────── */
  const handleVideoFile = useCallback(async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Макс. размер видео 100MB');
      return;
    }
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const ext = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) && !ext.endsWith('.mp4') && !ext.endsWith('.mov') && !ext.endsWith('.webm')) {
      toast.error('Поддерживаются MP4, MOV, WEBM');
      return;
    }

    // Check duration
    const dur = await getVideoDuration(file);
    if (dur !== null && dur > 30) {
      toast.error(`Видео слишком длинное (${Math.ceil(dur)}с). Максимум 30с`);
      return;
    }

    setVideoUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);
      if (dur !== null) setVideoDuration(Math.ceil(dur));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'video');

      const response = await fetch('/api/upload/voice-assets', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Ошибка загрузки');
      }
      const { url } = await response.json();
      setVideoUrl(url);
      toast.success('Видео загружено');
    } catch (err: any) {
      toast.error(err?.message || 'Не удалось загрузить видео');
      setVideoPreview(null);
      setVideoDuration(0);
    } finally {
      setVideoUploading(false);
    }
  }, []);

  const handleVideoRemove = useCallback(() => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setVideoUrl('');
    setVideoDuration(0);
  }, [videoPreview]);

  /* ── Generate ──────────────────────── */
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

  /* ── Polling ───────────────────────── */
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
          const url = pickResultUrl(data);
          if (url) {
            setResultUrl(url);
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

  /* ── Render ─────────────────────────── */
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ====== LEFT SIDEBAR ====== */}
      <div className="w-full lg:w-[380px] lg:shrink-0">
        <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-5 space-y-5">

          {/* ── Mode toggle (pills) ─── */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">Режим</div>
            <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              {ANIMATE_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = animateMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAnimateMode(mode.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{mode.shortRu}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed">{currentMode.description}</p>
          </div>

          {/* ── Two upload zones side-by-side ─── */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">Загрузки</div>
            <div className="flex gap-3">
              <MiniUploader
                type="video"
                label="Видео"
                sublabel="MP4 до 30с"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                icon={<Film className="w-5 h-5 text-[var(--gold)]" />}
                preview={videoPreview}
                uploading={videoUploading}
                disabled={generating}
                onFile={handleVideoFile}
                onRemove={handleVideoRemove}
                inputId="animate-video-upload"
                videoDuration={videoDuration}
                accentClass="border-[var(--gold)]/40"
              />
              <MiniUploader
                type="image"
                label="Персонаж"
                sublabel="JPG, PNG"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                icon={<ImageLucide className="w-5 h-5 text-blue-400" />}
                preview={imagePreview}
                uploading={imageUploading}
                disabled={generating}
                onFile={handleImageFile}
                onRemove={handleImageRemove}
                inputId="animate-image-upload"
                accentClass="border-blue-500/40"
              />
            </div>
          </div>

          {/* ── Quality row (dropdown-style) ─── */}
          <div className="relative">
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">Качество</div>
            <button
              onClick={() => setQualityOpen(!qualityOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors"
            >
              <span className="text-sm font-medium text-[var(--text)]">{quality}</span>
              <ChevronDown className={cn('w-4 h-4 text-[var(--muted)] transition-transform', qualityOpen && 'rotate-180')} />
            </button>

            {qualityOpen && (
              <div className="absolute z-20 mt-1.5 w-full rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setQuality(opt.value);
                      setQualityOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                      quality === opt.value
                        ? 'bg-[var(--gold)]/10 text-[var(--gold)] font-semibold'
                        : 'text-[var(--text)] hover:bg-[var(--surface2)]',
                    )}
                  >
                    {opt.label}
                    {quality === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Prompt (optional) ─── */}
          <div>
            <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2.5">
              Промпт <span className="normal-case font-normal">(необязательно)</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
              placeholder="Плавные движения, естественная мимика..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40 disabled:opacity-50 resize-none"
              rows={2}
            />
          </div>

          {/* ── Cost ─── */}
          <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <Star className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <span className="text-sm text-[var(--muted)]">
                {videoDuration > 0
                  ? `${videoDuration}с × ${animateMode === 'move' ? '6' : '8'}⭐`
                  : 'Стоимость'}
              </span>
            </div>
            <span className="text-lg font-bold text-[var(--text)]">
              {estimatedCost > 0 ? (
                <>
                  {estimatedCost}
                  <span className="text-sm text-[var(--muted)] ml-1">⭐</span>
                </>
              ) : (
                <span className="text-sm text-[var(--muted)]">—</span>
              )}
            </span>
          </div>

          {/* ── Generate button ─── */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={cn(
              'w-full py-3.5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]',
              canGenerate
                ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[0_8px_30px_rgba(0,0,0,0.20)]'
                : 'bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed',
            )}
          >
            {generating ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{pollingStatus === 'polling' ? 'Генерация...' : 'Запуск...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                <span>{estimatedCost > 0 ? `Создать за ${estimatedCost}⭐` : 'Создать'}</span>
              </>
            )}
          </button>

          {/* Missing fields hint */}
          {!canGenerate && !generating && (
            <p className="text-[11px] text-[var(--muted)] text-center">
              {!videoUrl && !imageUrl
                ? 'Загрузите видео и фото для начала'
                : !videoUrl
                  ? 'Загрузите видео-референс с движениями'
                  : !imageUrl
                    ? 'Загрузите фото персонажа'
                    : null}
            </p>
          )}
        </div>
      </div>

      {/* ====== RIGHT MAIN AREA ====== */}
      <div className="flex-1 min-w-0">
        {/* Result video */}
        {resultUrl ? (
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="p-5 pb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--text)]">Результат</h3>
              <a
                href={resultUrl}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] text-[var(--btn-primary-text)] text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Скачать
              </a>
            </div>
            <div className="px-5 pb-5">
              <video
                src={resultUrl}
                controls
                className="w-full rounded-2xl bg-black aspect-video"
              />
            </div>
          </div>
        ) : generating ? (
          /* Generating state */
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin mb-6" />
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
              {pollingStatus === 'polling' ? 'Генерация видео...' : 'Запуск генерации...'}
            </h3>
            <p className="text-sm text-[var(--muted)] text-center max-w-sm">
              Обычно занимает 2-4 минуты. Можно уйти со страницы — результат сохранится в «Мои работы».
            </p>
          </div>
        ) : (
          /* Hero / Explanation area */
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-6 sm:p-8 min-h-[400px] flex flex-col">
            {/* Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/15 flex items-center justify-center">
                  <Film className="w-6 h-6 text-[var(--gold)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">
                    {animateMode === 'move' ? 'Motion Transfer' : 'Character Swap'}
                  </h2>
                  <p className="text-sm text-[var(--muted)]">WAN 2.2 Animate</p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg">
                {animateMode === 'move'
                  ? 'Загрузите видео с движениями и фото персонажа. Нейросеть перенесёт движения из видео на ваше фото, создав новое видео с анимированным персонажем.'
                  : 'Загрузите видео и фото нового персонажа. Нейросеть заменит лицо в видео на лицо из вашего фото, сохраняя оригинальные движения.'}
              </p>
            </div>

            {/* How it works steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                <div className="w-8 h-8 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Film className="w-4 h-4 text-[var(--gold)]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)] mb-0.5">1. Видео</div>
                  <div className="text-xs text-[var(--muted)] leading-relaxed">
                    {animateMode === 'move' ? 'Видео с нужными движениями' : 'Видео с персонажем для замены'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <ImageLucide className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)] mb-0.5">2. Фото</div>
                  <div className="text-xs text-[var(--muted)] leading-relaxed">
                    {animateMode === 'move' ? 'Статичное фото персонажа' : 'Фото нового лица'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)] mb-0.5">3. Результат</div>
                  <div className="text-xs text-[var(--muted)] leading-relaxed">Видео с анимированным персонажем</div>
                </div>
              </div>
            </div>

            {/* Tips / Info */}
            <div className="mt-auto">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--gold)]/5 border border-[var(--gold)]/10">
                <Info className="w-4 h-4 text-[var(--gold)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--muted)] leading-relaxed">
                  <span className="font-semibold text-[var(--text)]">Совет:</span>{' '}
                  {animateMode === 'move'
                    ? 'Используйте видео с чёткими движениями тела и фронтальное фото персонажа для лучшего результата. Максимальная длительность видео — 30 секунд.'
                    : 'Выберите видео с хорошим освещением и чёткий портрет нового персонажа. Для лучшего результата используйте фото в анфас.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
