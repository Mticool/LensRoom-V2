'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Video,
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { calcMotionControlStars, MOTION_CONTROL_CONFIG } from '@/lib/pricing/motionControl';

// Types
type CharacterOrientation = 'image' | 'video';
type Resolution = '720p' | '1080p';
type GenerationStatus = 'idle' | 'queued' | 'processing' | 'success' | 'error';

// Limits from Kie.ai documentation
const LIMITS = {
  PROMPT_MAX_LENGTH: 2500,
  IMAGE_MAX_SIZE_MB: 10,
  IMAGE_MIN_DIMENSION: 300,
  IMAGE_ASPECT_MIN: 2 / 5,
  IMAGE_ASPECT_MAX: 5 / 2,
  VIDEO_MAX_SIZE_MB: 100,
  VIDEO_MIN_DURATION: 3,
  VIDEO_MAX_DURATION_IMAGE_ORIENTATION: 10,
  VIDEO_MAX_DURATION_VIDEO_ORIENTATION: 30,
  ALLOWED_IMAGE_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'],
  ALLOWED_VIDEO_FORMATS: ['video/mp4', 'video/quicktime', 'video/mov'],
};

interface MotionTabContentProps {
  isAuthenticated: boolean;
  credits: number;
  refreshCredits: () => void;
  onLoginRequired: () => void;
}

export function MotionTabContent({
  isAuthenticated,
  credits,
  refreshCredits,
  onLoginRequired,
}: MotionTabContentProps) {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [characterOrientation, setCharacterOrientation] = useState<CharacterOrientation>('image');
  const [resolution, setResolution] = useState<Resolution>('720p');

  // File state
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [characterImagePreview, setCharacterImagePreview] = useState<string | null>(null);
  const [characterImageError, setCharacterImageError] = useState<string | null>(null);

  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [motionVideoPreview, setMotionVideoPreview] = useState<string | null>(null);
  const [motionVideoDuration, setMotionVideoDuration] = useState<number | null>(null);
  const [motionVideoError, setMotionVideoError] = useState<string | null>(null);

  // Generation state
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Tips expanded state
  const [tipsExpanded, setTipsExpanded] = useState(false);

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  const maxVideoDuration = characterOrientation === 'image'
    ? LIMITS.VIDEO_MAX_DURATION_IMAGE_ORIENTATION
    : LIMITS.VIDEO_MAX_DURATION_VIDEO_ORIENTATION;

  const estimatedCost = motionVideoDuration
    ? calcMotionControlStars(motionVideoDuration, resolution, true) || 0
    : calcMotionControlStars(LIMITS.VIDEO_MIN_DURATION, resolution, true) || 0;

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const validateImage = async (file: File): Promise<string | null> => {
    if (!LIMITS.ALLOWED_IMAGE_FORMATS.includes(file.type)) {
      return 'Формат не поддерживается. Используйте JPG или PNG.';
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.IMAGE_MAX_SIZE_MB) {
      return `Файл слишком большой (${sizeMB.toFixed(1)} МБ). Максимум ${LIMITS.IMAGE_MAX_SIZE_MB} МБ.`;
    }
    const { width, height } = await getImageDimensions(file);
    if (width < LIMITS.IMAGE_MIN_DIMENSION || height < LIMITS.IMAGE_MIN_DIMENSION) {
      return `Изображение слишком маленькое (${width}x${height}). Минимум ${LIMITS.IMAGE_MIN_DIMENSION}px.`;
    }
    const aspectRatio = width / height;
    if (aspectRatio < LIMITS.IMAGE_ASPECT_MIN || aspectRatio > LIMITS.IMAGE_ASPECT_MAX) {
      return `Соотношение сторон вне диапазона. Допустимо: от 2:5 до 5:2.`;
    }
    return null;
  };

  const validateVideo = async (file: File, maxDuration: number): Promise<{ error: string | null; duration: number }> => {
    const isValidFormat = LIMITS.ALLOWED_VIDEO_FORMATS.some(
      (format) => file.type === format || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov')
    );
    if (!isValidFormat) {
      return { error: 'Формат не поддерживается. Используйте MP4 или MOV.', duration: 0 };
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.VIDEO_MAX_SIZE_MB) {
      return { error: `Файл слишком большой (${sizeMB.toFixed(1)} МБ). Максимум ${LIMITS.VIDEO_MAX_SIZE_MB} МБ.`, duration: 0 };
    }
    const duration = await getVideoDuration(file);
    if (duration < LIMITS.VIDEO_MIN_DURATION) {
      return { error: `Видео слишком короткое (${duration.toFixed(1)} сек). Минимум ${LIMITS.VIDEO_MIN_DURATION} сек.`, duration };
    }
    if (duration > maxDuration) {
      return { error: `Видео слишком длинное (${duration.toFixed(1)} сек). Максимум ${maxDuration} сек.`, duration };
    }
    return { error: null, duration };
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCharacterImageError(null);
    const error = await validateImage(file);
    if (error) {
      setCharacterImageError(error);
      return;
    }
    setCharacterImage(file);
    setCharacterImagePreview(URL.createObjectURL(file));
  }, []);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMotionVideoError(null);
    const { error, duration } = await validateVideo(file, maxVideoDuration);
    if (error) {
      setMotionVideoError(error);
      if (duration > 0) setMotionVideoDuration(duration);
      return;
    }
    setMotionVideo(file);
    setMotionVideoPreview(URL.createObjectURL(file));
    setMotionVideoDuration(duration);
  }, [maxVideoDuration]);

  const clearImage = useCallback(() => {
    setCharacterImage(null);
    if (characterImagePreview) URL.revokeObjectURL(characterImagePreview);
    setCharacterImagePreview(null);
    setCharacterImageError(null);
  }, [characterImagePreview]);

  const clearVideo = useCallback(() => {
    setMotionVideo(null);
    if (motionVideoPreview) URL.revokeObjectURL(motionVideoPreview);
    setMotionVideoPreview(null);
    setMotionVideoDuration(null);
    setMotionVideoError(null);
  }, [motionVideoPreview]);

  const handleReset = useCallback(() => {
    setPrompt('');
    setCharacterOrientation('image');
    setResolution('720p');
    clearImage();
    clearVideo();
    setStatus('idle');
    setProgress(0);
    setResultUrl(null);
    setError(null);
    setJobId(null);
    isCancelledRef.current = true;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [clearImage, clearVideo]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      if (isCancelledRef.current) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) throw new Error('Не удалось получить статус');

        const data = await response.json();
        if (typeof data.progress === 'number') setProgress(data.progress);

        if (data.status === 'completed' || data.status === 'success') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatus('success');
          setProgress(100);
          setResultUrl(data.resultUrl || data.videoUrl || null);
          refreshCredits();
          toast.success('Видео готово!');
          return;
        }

        if (data.status === 'failed' || data.status === 'error') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatus('error');
          const errorMsg = data.error || 'Ошибка генерации';
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        if (data.status === 'processing' && status !== 'processing') {
          setStatus('processing');
        }

        attempts++;
        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatus('error');
          setError('Превышено время ожидания');
          toast.error('Превышено время ожидания');
        }
      } catch (err) {
        console.error('[MotionTab] Polling error:', err);
      }
    };

    pollingIntervalRef.current = setInterval(poll, 3000);
    poll();
  }, [status, refreshCredits]);

  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    if (credits < estimatedCost) {
      toast.error(`Недостаточно звёзд. Нужно ${estimatedCost}⭐, у вас ${credits}⭐`);
      return;
    }

    if (!characterImage) {
      toast.error('Загрузите изображение персонажа');
      return;
    }

    if (!motionVideo) {
      toast.error('Загрузите видео с движениями');
      return;
    }

    isCancelledRef.current = false;
    setStatus('queued');
    setProgress(0);
    setResultUrl(null);
    setError(null);

    try {
      const [imageDataUrl, videoDataUrl] = await Promise.all([
        fileToDataUrl(characterImage),
        fileToDataUrl(motionVideo),
      ]);

      const requestBody = {
        model: 'kling-motion-control',
        prompt: prompt.trim() || 'Natural movement animation',
        mode: 'i2v',
        referenceImage: imageDataUrl,
        referenceVideo: videoDataUrl,
        videoDuration: motionVideoDuration,
        resolution: resolution,
        characterOrientation: characterOrientation,
        autoTrim: true,
      };

      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Не удалось запустить генерацию');
      }

      setJobId(data.jobId);
      toast.loading('Генерация началась...', { id: 'mc-gen' });
      await pollJobStatus(data.jobId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setStatus('error');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      toast.dismiss('mc-gen');
    }
  }, [isAuthenticated, credits, estimatedCost, characterImage, motionVideo, motionVideoDuration, prompt, resolution, characterOrientation, pollJobStatus, onLoginRequired]);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `motion-control-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Скачивание началось');
  }, [resultUrl]);

  const isGenerating = status === 'queued' || status === 'processing';
  const canGenerate = characterImage && motionVideo && !isGenerating && !motionVideoError && !characterImageError;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <p className="text-sm text-purple-300">
          <strong>Kling 2.6 Motion Control</strong> — перенос движений, жестов и мимики из видео на персонажа с изображения.
        </p>
      </div>

      {/* Result Preview (если есть) */}
      {(resultUrl || isGenerating) && (
        <div className="rounded-xl bg-[var(--surface2)] border border-[var(--border)] overflow-hidden">
          <div className="aspect-video bg-black/50 flex items-center justify-center relative">
            {resultUrl ? (
              <video src={resultUrl} controls autoPlay loop className="w-full h-full object-contain" />
            ) : (
              <div className="text-center">
                <Loader2 className="w-10 h-10 mx-auto text-[var(--accent-primary)] animate-spin mb-2" />
                <p className="text-sm text-[var(--muted)]">
                  {status === 'queued' ? 'В очереди...' : `${progress}%`}
                </p>
              </div>
            )}
          </div>
          {resultUrl && (
            <div className="p-3 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Готово
              </span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-primary)] text-black text-sm font-medium rounded-lg"
              >
                <Download className="w-4 h-4" /> Скачать
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Описание сцены</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, LIMITS.PROMPT_MAX_LENGTH))}
          placeholder="Опишите сцену, фон, настроение..."
          className="w-full px-3 py-2.5 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 resize-none min-h-[80px] text-sm"
        />
        <p className="text-xs text-[var(--muted)] mt-1">{prompt.length}/{LIMITS.PROMPT_MAX_LENGTH}</p>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Изображение персонажа <span className="text-red-400">*</span>
        </label>
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            characterImageError ? 'border-red-500 bg-red-500/5' :
            characterImagePreview ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' :
            'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface2)]'
          }`}>
            {characterImagePreview ? (
              <div className="space-y-2">
                <img src={characterImagePreview} alt="Preview" className="max-h-24 mx-auto rounded-lg" />
                <button type="button" onClick={(e) => { e.preventDefault(); clearImage(); }} className="text-xs text-red-400">Удалить</button>
              </div>
            ) : (
              <div className="space-y-1">
                <ImageIcon className="w-8 h-8 mx-auto text-[var(--muted)]" />
                <p className="text-xs text-[var(--muted)]">JPG/PNG до 10 МБ</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleImageUpload} className="hidden" />
        </label>
        {characterImageError && <p className="text-xs text-red-400 mt-1">{characterImageError}</p>}
      </div>

      {/* Video Upload */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Референс-видео <span className="text-red-400">*</span>
        </label>
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            motionVideoError ? 'border-red-500 bg-red-500/5' :
            motionVideoPreview ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' :
            'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface2)]'
          }`}>
            {motionVideoPreview ? (
              <div className="space-y-2">
                <Video className="w-8 h-8 mx-auto text-[var(--accent-primary)]" />
                <p className="text-xs text-[var(--muted)]">{motionVideoDuration?.toFixed(1)} сек</p>
                <button type="button" onClick={(e) => { e.preventDefault(); clearVideo(); }} className="text-xs text-red-400">Удалить</button>
              </div>
            ) : (
              <div className="space-y-1">
                <Video className="w-8 h-8 mx-auto text-[var(--muted)]" />
                <p className="text-xs text-[var(--muted)]">MP4/MOV, {LIMITS.VIDEO_MIN_DURATION}-{maxVideoDuration} сек</p>
              </div>
            )}
          </div>
          <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" onChange={handleVideoUpload} className="hidden" />
        </label>
        {motionVideoError && <p className="text-xs text-red-400 mt-1">{motionVideoError}</p>}
      </div>

      {/* Character Orientation */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Ориентация персонажа</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCharacterOrientation('image')}
            className={`p-2.5 rounded-xl border-2 text-left transition-all text-sm ${
              characterOrientation === 'image'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'border-[var(--border)] bg-[var(--surface2)]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <ImageIcon className="w-3.5 h-3.5" /> Image
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">Макс. 10 сек</p>
          </button>
          <button
            type="button"
            onClick={() => setCharacterOrientation('video')}
            className={`p-2.5 rounded-xl border-2 text-left transition-all text-sm ${
              characterOrientation === 'video'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'border-[var(--border)] bg-[var(--surface2)]'
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <Video className="w-3.5 h-3.5" /> Video
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">Макс. 30 сек</p>
          </button>
        </div>
      </div>

      {/* Resolution */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Качество</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setResolution('720p')}
            className={`p-2.5 rounded-xl border-2 text-center transition-all text-sm ${
              resolution === '720p'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'border-[var(--border)] bg-[var(--surface2)]'
            }`}
          >
            <span className="font-medium">720p</span>
            <p className="text-xs text-[var(--muted)]">{MOTION_CONTROL_CONFIG.RATE_720P}⭐/сек</p>
          </button>
          <button
            type="button"
            onClick={() => setResolution('1080p')}
            className={`p-2.5 rounded-xl border-2 text-center transition-all text-sm ${
              resolution === '1080p'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'border-[var(--border)] bg-[var(--surface2)]'
            }`}
          >
            <span className="font-medium">1080p</span>
            <p className="text-xs text-[var(--muted)]">{MOTION_CONTROL_CONFIG.RATE_1080P}⭐/сек</p>
          </button>
        </div>
      </div>

      {/* Cost */}
      <div className="p-3 bg-[var(--surface2)] rounded-xl flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">Стоимость:</span>
        <span className="text-lg font-bold text-[var(--accent-primary)]">
          {motionVideoDuration ? `${estimatedCost}⭐` : `от ${calcMotionControlStars(LIMITS.VIDEO_MIN_DURATION, resolution, true) || 50}⭐`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          disabled={isGenerating}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] font-medium rounded-xl transition-colors disabled:opacity-50 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-black font-semibold rounded-xl px-4 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Генерация...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Запустить</span>
              <span className="ml-auto font-bold">{estimatedCost}⭐</span>
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
        <button
          onClick={() => setTipsExpanded(!tipsExpanded)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Советы
          </span>
          {tipsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {tipsExpanded && (
          <div className="px-3 pb-3 space-y-2 text-xs text-[var(--muted)]">
            <p>• Совмещайте кадрирование тела на фото и видео</p>
            <p>• Выбирайте видео с плавным, естественным движением</p>
            <p>• Оставьте пространство для жестов на изображении</p>
            <p>• Один персонаж в кадре, хорошо виден</p>
            <p>• Без резких смен камеры и склеек в видео</p>
          </div>
        )}
      </div>
    </div>
  );
}
