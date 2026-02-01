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
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Play,
  Pause,
  ArrowRight,
  Zap,
  Move,
} from 'lucide-react';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { calcMotionControlStars, MOTION_CONTROL_CONFIG } from '@/lib/pricing/motionControl';
import { MotionControlTips } from './MotionControlTips';

// Higgsfield-style Motion Flow Visualization
function MotionFlowVisualization({
  hasImage,
  hasVideo,
  isProcessing
}: {
  hasImage: boolean;
  hasVideo: boolean;
  isProcessing: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-4 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-purple-500/5 rounded-xl border border-white/5">
      {/* Character */}
      <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${hasImage ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${hasImage ? 'bg-purple-500/20 border border-purple-500/40' : 'bg-white/5 border border-white/10'}`}>
          <ImageIcon className={`w-5 h-5 ${hasImage ? 'text-purple-400' : 'text-white/40'}`} />
        </div>
        <span className="text-[10px] text-white/60 font-medium">Персонаж</span>
      </div>

      {/* Arrow with motion wave animation */}
      <div className="flex items-center gap-1">
        <div className={`flex gap-0.5 ${isProcessing ? 'animate-pulse' : ''}`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-full transition-all duration-500 ${
                hasImage && hasVideo
                  ? 'bg-gradient-to-b from-purple-500 to-cyan-500'
                  : 'bg-white/20'
              }`}
              style={{
                animationDelay: `${i * 100}ms`,
                transform: hasImage && hasVideo ? 'scaleY(1)' : 'scaleY(0.5)',
              }}
            />
          ))}
        </div>
        <ArrowRight className={`w-4 h-4 ${hasImage && hasVideo ? 'text-cyan-400' : 'text-white/20'}`} />
      </div>

      {/* Motion Source */}
      <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${hasVideo ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center relative ${hasVideo ? 'bg-cyan-500/20 border border-cyan-500/40' : 'bg-white/5 border border-white/10'}`}>
          <Video className={`w-5 h-5 ${hasVideo ? 'text-cyan-400' : 'text-white/40'}`} />
          {hasVideo && (
            <div className="absolute -top-1 -right-1">
              <Move className="w-3 h-3 text-cyan-400 animate-pulse" />
            </div>
          )}
        </div>
        <span className="text-[10px] text-white/60 font-medium">Движение</span>
      </div>

      {/* Arrow */}
      <ArrowRight className={`w-4 h-4 ${hasImage && hasVideo ? 'text-cyan-400' : 'text-white/20'}`} />

      {/* Result */}
      <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${hasImage && hasVideo ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          hasImage && hasVideo
            ? 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/40'
            : 'bg-white/5 border border-white/10'
        }`}>
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          ) : (
            <Zap className={`w-5 h-5 ${hasImage && hasVideo ? 'text-purple-400' : 'text-white/40'}`} />
          )}
        </div>
        <span className="text-[10px] text-white/60 font-medium">Результат</span>
      </div>
    </div>
  );
}

// Video Preview with Play Button
function VideoPreview({
  src,
  duration,
  onClear
}: {
  src: string;
  duration: number | null;
  onClear: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        className="max-h-32 mx-auto rounded-lg"
        loop
        muted
        playsInline
        onEnded={() => setIsPlaying(false)}
      />
      {/* Play/Pause overlay */}
      <button
        type="button"
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
      >
        {isPlaying ? (
          <Pause className="w-8 h-8 text-white drop-shadow-lg" />
        ) : (
          <Play className="w-8 h-8 text-white drop-shadow-lg" />
        )}
      </button>
      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white font-medium">
          {duration.toFixed(1)}s
        </div>
      )}
      {/* Info */}
      <div className="mt-2 space-y-1">
        <p className="text-xs text-[var(--muted)] text-center">Видео загружено</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onClear();
          }}
          className="block mx-auto text-xs text-red-400 hover:text-red-300"
        >
          Удалить
        </button>
      </div>
    </div>
  );
}

// Types
type CharacterOrientation = 'image' | 'video';
type Resolution = '720p' | '1080p';
type GenerationStatus = 'idle' | 'queued' | 'processing' | 'success' | 'error';

// Limits from API documentation
const LIMITS = {
  PROMPT_MAX_LENGTH: 2500,
  IMAGE_MAX_SIZE_MB: 10,
  IMAGE_MIN_DIMENSION: 300,
  IMAGE_ASPECT_MIN: 2 / 5, // 2:5
  IMAGE_ASPECT_MAX: 5 / 2, // 5:2
  VIDEO_MAX_SIZE_MB: 100,
  VIDEO_MIN_DURATION: 3,
  VIDEO_MAX_DURATION_IMAGE_ORIENTATION: 10,
  VIDEO_MAX_DURATION_VIDEO_ORIENTATION: 30,
  ALLOWED_IMAGE_FORMATS: ['image/jpeg', 'image/jpg', 'image/png'],
  ALLOWED_VIDEO_FORMATS: ['video/mp4', 'video/quicktime', 'video/mov'],
};

export function MotionControlGenerator() {
  // Auth
  const { isAuthenticated, credits, refreshCredits } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

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

  // Refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);

  // Max video duration based on character orientation
  const maxVideoDuration = characterOrientation === 'image'
    ? LIMITS.VIDEO_MAX_DURATION_IMAGE_ORIENTATION
    : LIMITS.VIDEO_MAX_DURATION_VIDEO_ORIENTATION;

  // Calculate cost
  const estimatedCost = motionVideoDuration
    ? calcMotionControlStars(motionVideoDuration, resolution, true) || 0
    : calcMotionControlStars(LIMITS.VIDEO_MIN_DURATION, resolution, true) || 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // File to Data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Get video duration
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

  // Get image dimensions
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

  // Validate image
  const validateImage = async (file: File): Promise<string | null> => {
    // Check format
    if (!LIMITS.ALLOWED_IMAGE_FORMATS.includes(file.type)) {
      return 'Формат не поддерживается. Используйте JPG, JPEG или PNG.';
    }

    // Check size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.IMAGE_MAX_SIZE_MB) {
      return `Файл слишком большой (${sizeMB.toFixed(1)} МБ). Максимум ${LIMITS.IMAGE_MAX_SIZE_MB} МБ.`;
    }

    // Check dimensions
    const { width, height } = await getImageDimensions(file);
    if (width < LIMITS.IMAGE_MIN_DIMENSION || height < LIMITS.IMAGE_MIN_DIMENSION) {
      return `Изображение слишком маленькое (${width}x${height}). Минимум ${LIMITS.IMAGE_MIN_DIMENSION}px.`;
    }

    // Check aspect ratio
    const aspectRatio = width / height;
    if (aspectRatio < LIMITS.IMAGE_ASPECT_MIN || aspectRatio > LIMITS.IMAGE_ASPECT_MAX) {
      return `Соотношение сторон ${aspectRatio.toFixed(2)} вне диапазона. Допустимо: от 2:5 до 5:2.`;
    }

    return null;
  };

  // Validate video
  const validateVideo = async (file: File, maxDuration: number): Promise<{ error: string | null; duration: number }> => {
    // Check format
    const isValidFormat = LIMITS.ALLOWED_VIDEO_FORMATS.some(
      (format) => file.type === format || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mov')
    );
    if (!isValidFormat) {
      return { error: 'Формат не поддерживается. Используйте MP4 или MOV.', duration: 0 };
    }

    // Check size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > LIMITS.VIDEO_MAX_SIZE_MB) {
      return { error: `Файл слишком большой (${sizeMB.toFixed(1)} МБ). Максимум ${LIMITS.VIDEO_MAX_SIZE_MB} МБ.`, duration: 0 };
    }

    // Check duration
    const duration = await getVideoDuration(file);
    if (duration < LIMITS.VIDEO_MIN_DURATION) {
      return { error: `Видео слишком короткое (${duration.toFixed(1)} сек). Минимум ${LIMITS.VIDEO_MIN_DURATION} секунды.`, duration };
    }
    if (duration > maxDuration) {
      return { error: `Видео слишком длинное (${duration.toFixed(1)} сек). Для режима "${characterOrientation}" максимум ${maxDuration} секунд.`, duration };
    }

    return { error: null, duration };
  };

  // Handle image upload
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

  // Handle video upload
  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMotionVideoError(null);

    const { error, duration } = await validateVideo(file, maxVideoDuration);
    if (error) {
      setMotionVideoError(error);
      if (duration > 0) {
        setMotionVideoDuration(duration);
      }
      return;
    }

    setMotionVideo(file);
    setMotionVideoPreview(URL.createObjectURL(file));
    setMotionVideoDuration(duration);
  }, [maxVideoDuration, characterOrientation]);

  // Clear image
  const clearImage = useCallback(() => {
    setCharacterImage(null);
    if (characterImagePreview) {
      URL.revokeObjectURL(characterImagePreview);
    }
    setCharacterImagePreview(null);
    setCharacterImageError(null);
  }, [characterImagePreview]);

  // Clear video
  const clearVideo = useCallback(() => {
    setMotionVideo(null);
    if (motionVideoPreview) {
      URL.revokeObjectURL(motionVideoPreview);
    }
    setMotionVideoPreview(null);
    setMotionVideoDuration(null);
    setMotionVideoError(null);
  }, [motionVideoPreview]);

  // Reset all
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
    toast.info('Форма очищена');
  }, [clearImage, clearVideo]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 120; // 6 minutes max (3s intervals)
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
        if (!response.ok) {
          throw new Error('Не удалось получить статус');
        }

        const data = await response.json();

        if (typeof data.progress === 'number') {
          setProgress(data.progress);
        }

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
          console.error('[MotionControl] Generation failed:', data);
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
          setError('Превышено время ожидания (6 минут)');
          toast.error('Превышено время ожидания');
        }
      } catch (err) {
        console.error('[MotionControl] Polling error:', err);
      }
    };

    pollingIntervalRef.current = setInterval(poll, 3000);
    poll();
  }, [status, refreshCredits]);

  // Generate video
  const handleGenerate = useCallback(async () => {
    // Check auth
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    // Check credits
    if (credits < estimatedCost) {
      toast.error(`Недостаточно звёзд. Нужно ${estimatedCost}⭐, у вас ${credits}⭐`);
      return;
    }

    // Validate inputs
    if (!characterImage) {
      toast.error('Загрузите изображение персонажа');
      return;
    }

    if (!motionVideo) {
      toast.error('Загрузите видео с движениями');
      return;
    }

    if (motionVideoDuration && motionVideoDuration > maxVideoDuration) {
      toast.error(`Видео слишком длинное. Максимум ${maxVideoDuration} сек для режима "${characterOrientation}"`);
      return;
    }

    // Reset state
    isCancelledRef.current = false;
    setStatus('queued');
    setProgress(0);
    setResultUrl(null);
    setError(null);
    setJobId(null);

    try {
      // Convert files to data URLs
      const [imageDataUrl, videoDataUrl] = await Promise.all([
        fileToDataUrl(characterImage),
        fileToDataUrl(motionVideo),
      ]);

      // Build request
      const requestBody = {
        model: 'kling-motion-control',
        prompt: prompt.trim() || 'Natural movement animation',
        mode: 'i2v',
        referenceImage: imageDataUrl, // Character image
        referenceVideo: videoDataUrl, // Motion reference video
        videoDuration: motionVideoDuration,
        resolution: resolution,
        characterOrientation: characterOrientation,
        autoTrim: true,
      };

      console.log('[MotionControl] Starting generation:', {
        hasImage: !!imageDataUrl,
        hasVideo: !!videoDataUrl,
        videoDuration: motionVideoDuration,
        resolution,
        characterOrientation,
      });

      // Call API
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Не удалось запустить генерацию');
      }

      setJobId(data.jobId);
      toast.loading('Генерация началась...', { id: 'mc-gen' });

      // Start polling
      await pollJobStatus(data.jobId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      console.error('[MotionControl] Generation error:', err);
      setStatus('error');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      toast.dismiss('mc-gen');
    }
  }, [
    isAuthenticated,
    credits,
    estimatedCost,
    characterImage,
    motionVideo,
    motionVideoDuration,
    maxVideoDuration,
    characterOrientation,
    prompt,
    resolution,
    pollJobStatus,
  ]);

  // Download result
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
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-2xl">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Motion Control 2.6</h1>
          </div>
          <p className="text-[var(--muted)] text-base max-w-3xl">
            Image-to-video модель, которая переносит движение, жесты и мимику из референс-видео на персонажа с изображения, сохраняя тайминг и естественность.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Higgsfield-style Motion Flow Visualization */}
        <div className="mb-8">
          <MotionFlowVisualization
            hasImage={!!characterImage}
            hasVideo={!!motionVideo}
            isProcessing={isGenerating}
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Result Preview */}
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
              <div className="aspect-video bg-[var(--surface2)] flex items-center justify-center relative">
                {resultUrl ? (
                  <video
                    src={resultUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <Video className="w-full h-full text-[var(--muted)] opacity-30" />
                      {isGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-full border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-[var(--muted)]">
                      {isGenerating ? 'Генерация видео...' : 'Здесь появится результат'}
                    </p>
                    {!isGenerating && !resultUrl && characterImage && motionVideo && (
                      <p className="text-xs text-purple-400 mt-2">
                        Нажмите «Запустить» для генерации
                      </p>
                    )}
                  </div>
                )}

                {/* Processing overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-[var(--accent-primary)] animate-spin" />
                    <div className="text-center">
                      <p className="text-white font-medium">
                        {status === 'queued' ? 'В очереди...' : `Генерация... ${progress}%`}
                      </p>
                      <p className="text-white/60 text-sm mt-1">Это займёт 1-3 минуты</p>
                    </div>
                    {progress > 0 && (
                      <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status & Download */}
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status === 'success' && (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-500 font-medium">Готово!</span>
                    </>
                  )}
                  {status === 'error' && (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-500 font-medium text-sm truncate max-w-[300px]">{error}</span>
                    </>
                  )}
                  {status === 'idle' && (
                    <span className="text-[var(--muted)] text-sm">Загрузите файлы и нажмите «Запустить»</span>
                  )}
                </div>

                {resultUrl && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-black font-medium rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Скачать MP4
                  </button>
                )}
              </div>
            </div>

            {/* Tips Section */}
            <MotionControlTips />
          </div>

          {/* Right: Form */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-6">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Описание сцены <span className="text-[var(--muted)]">(опционально)</span>
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, LIMITS.PROMPT_MAX_LENGTH))}
                  placeholder="Опишите сцену, фон, настроение, стиль..."
                  className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] resize-none min-h-[100px]"
                  maxLength={LIMITS.PROMPT_MAX_LENGTH}
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  {prompt.length}/{LIMITS.PROMPT_MAX_LENGTH} символов. Опишите сцену, фон, настроение, стиль.
                </p>
              </div>

              {/* Character Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Изображение персонажа <span className="text-red-400">*</span>
                </label>
                <label className="block cursor-pointer">
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      characterImageError
                        ? 'border-red-500 bg-red-500/5'
                        : characterImagePreview
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                          : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface2)]'
                    }`}
                  >
                    {characterImagePreview ? (
                      <div className="space-y-2">
                        <img src={characterImagePreview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                        <p className="text-xs text-[var(--muted)]">Изображение загружено</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            clearImage();
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Удалить
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <ImageIcon className="w-10 h-10 mx-auto text-[var(--muted)]" />
                        <p className="text-sm text-[var(--muted)]">Нажмите для загрузки</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {characterImageError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {characterImageError}
                  </p>
                )}
                <p className="text-xs text-[var(--muted)] mt-2">
                  JPG/PNG до {LIMITS.IMAGE_MAX_SIZE_MB} МБ, размер &gt; {LIMITS.IMAGE_MIN_DIMENSION}px, соотношение 2:5 – 5:2
                </p>
              </div>

              {/* Motion Video Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Референс-видео движения <span className="text-red-400">*</span>
                </label>
                <label className="block cursor-pointer">
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      motionVideoError
                        ? 'border-red-500 bg-red-500/5'
                        : motionVideoPreview
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                          : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface2)]'
                    }`}
                  >
                    {motionVideoPreview ? (
                      <VideoPreview
                        src={motionVideoPreview}
                        duration={motionVideoDuration}
                        onClear={clearVideo}
                      />
                    ) : (
                      <div className="space-y-2">
                        <Video className="w-10 h-10 mx-auto text-[var(--muted)]" />
                        <p className="text-sm text-[var(--muted)]">Нажмите для загрузки</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
                {motionVideoError && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {motionVideoError}
                  </p>
                )}
                <p className="text-xs text-[var(--muted)] mt-2">
                  MP4/MOV до {LIMITS.VIDEO_MAX_SIZE_MB} МБ, длительность {LIMITS.VIDEO_MIN_DURATION}–{maxVideoDuration} сек
                </p>
              </div>

              {/* Character Orientation - Higgsfield Style */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Move className="w-4 h-4 text-purple-400" />
                  Ориентация персонажа
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCharacterOrientation('image')}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all overflow-hidden ${
                      characterOrientation === 'image'
                        ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-purple-500/5'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-purple-500/30'
                    }`}
                  >
                    {characterOrientation === 'image' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        characterOrientation === 'image' ? 'bg-purple-500/20' : 'bg-white/5'
                      }`}>
                        <ImageIcon className={`w-3.5 h-3.5 ${characterOrientation === 'image' ? 'text-purple-400' : 'text-white/60'}`} />
                      </div>
                      <span className="font-medium">Image</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">Поза с фото</p>
                    <p className="text-[10px] text-purple-400/80 mt-1">Макс. 10 сек</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCharacterOrientation('video')}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all overflow-hidden ${
                      characterOrientation === 'video'
                        ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-cyan-500/30'
                    }`}
                  >
                    {characterOrientation === 'video' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        characterOrientation === 'video' ? 'bg-cyan-500/20' : 'bg-white/5'
                      }`}>
                        <Video className={`w-3.5 h-3.5 ${characterOrientation === 'video' ? 'text-cyan-400' : 'text-white/60'}`} />
                      </div>
                      <span className="font-medium">Video</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">Динамика из видео</p>
                    <p className="text-[10px] text-cyan-400/80 mt-1">Макс. 30 сек</p>
                  </button>
                </div>
              </div>

              {/* Resolution - Higgsfield Style */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Качество
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResolution('720p')}
                    className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                      resolution === '720p'
                        ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-amber-500/5'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-amber-500/30'
                    }`}
                  >
                    {resolution === '720p' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    <span className="font-bold text-lg">720p</span>
                    <p className="text-xs text-amber-400 font-medium">{MOTION_CONTROL_CONFIG.RATE_720P}⭐/сек</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">Стандарт</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('1080p')}
                    className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                      resolution === '1080p'
                        ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-purple-500/5'
                        : 'border-[var(--border)] bg-[var(--surface2)] hover:border-purple-500/30'
                    }`}
                  >
                    {resolution === '1080p' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                      </div>
                    )}
                    <span className="font-bold text-lg">1080p</span>
                    <p className="text-xs text-purple-400 font-medium">{MOTION_CONTROL_CONFIG.RATE_1080P}⭐/сек</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">Высокое качество</p>
                  </button>
                </div>
              </div>

              {/* Cost Estimator - Higgsfield Style */}
              <div className="p-4 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--muted)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Стоимость:
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      {motionVideoDuration
                        ? estimatedCost
                        : `от ${calcMotionControlStars(LIMITS.VIDEO_MIN_DURATION, resolution, true) || 50}`}
                    </span>
                    <span className="text-sm text-amber-400">⭐</span>
                  </div>
                </div>
                {motionVideoDuration && (
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                        style={{ width: `${Math.min((motionVideoDuration / maxVideoDuration) * 100, 100)}%` }}
                      />
                    </div>
                    <span>{motionVideoDuration.toFixed(1)}s</span>
                    <span className="text-white/40">×</span>
                    <span className="text-amber-400">
                      {resolution === '720p' ? MOTION_CONTROL_CONFIG.RATE_720P : MOTION_CONTROL_CONFIG.RATE_1080P}⭐/s
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  Сбросить
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-black font-semibold rounded-xl px-6 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Генерация...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Запустить</span>
                      <span className="ml-auto font-bold">{estimatedCost}⭐</span>
                    </>
                  )}
                </button>
              </div>

              {/* Balance */}
              {isAuthenticated && (
                <p className="text-xs text-center text-[var(--muted)]">
                  Ваш баланс: <span className="font-medium text-[var(--text)]">{credits}⭐</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
