'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, Sparkles, Maximize2, ZoomIn, ZoomOut, X, 
  Download, Copy, RefreshCw, ExternalLink 
} from 'lucide-react';
import { GenerationResult, GeneratorMode } from './GeneratorV2';
import { toast } from 'sonner';

interface GenerationProgress {
  stage: 'queued' | 'generating' | 'processing' | 'finalizing';
  progress: number;
  eta?: string;
}

interface CanvasProps {
  result: GenerationResult | null;
  isGenerating: boolean;
  mode: GeneratorMode;
  onExampleClick?: (prompt: string) => void;
  progress?: GenerationProgress | null;
}

const STAGE_LABELS: Record<string, string> = {
  queued: 'В очереди...',
  queue: 'В очереди...',
  generating: 'Генерация...',
  processing: 'Обработка...',
  finalizing: 'Финализация...',
};

export function Canvas({ result, isGenerating, mode, onExampleClick, progress: externalProgress }: CanvasProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  // Progress state handling - MUST be at top level before any conditional returns
  const [internalProgress, setInternalProgress] = useState(0);
  const [internalStage, setInternalStage] = useState<string>('queued');
  const [estimatedTime, setEstimatedTime] = useState(30);
  
  const progress = externalProgress?.progress ?? internalProgress;
  const stage = externalProgress?.stage ?? internalStage;
  const eta = externalProgress?.eta;

  // Progress simulation effect
  useEffect(() => {
    if (!isGenerating) {
      setInternalProgress(0);
      setInternalStage('queued');
      setEstimatedTime(30);
      return;
    }

    if (externalProgress) return;

    const interval = setInterval(() => {
      setInternalProgress(prev => {
        const next = Math.min(prev + Math.random() * 5, 95);
        
        if (next < 20) {
          setInternalStage('queued');
          setEstimatedTime(25);
        } else if (next < 80) {
          setInternalStage('generating');
          setEstimatedTime(Math.max(5, 20 - Math.floor((next - 20) / 3)));
        } else {
          setInternalStage('finalizing');
          setEstimatedTime(Math.max(2, 10 - Math.floor((next - 80) / 2)));
        }
        
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating, externalProgress]);
  
  const examples = mode === 'video' 
    ? [
        'Медленная съёмка волн океана на закате',
        'Кот играет с клубком пряжи',
        'Таймлапс цветения розы',
        'Человек идёт по неоновому городу',
      ]
    : [
        'Космический корабль в стиле киберпанк, детализация 8k',
        'Портрет девушки с цветами в волосах, студийное освещение',
        'Неоновый город будущего, ночь, дождь, отражения',
        'Абстрактное искусство в стиле Кандинского, яркие цвета',
      ];

  // Keyboard handler for lightbox
  useEffect(() => {
    if (!showLightbox) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLightbox(false);
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(200, z + 10));
      if (e.key === '-') setZoom(z => Math.max(50, z - 10));
      if (e.key === '0') setZoom(100);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!result?.url) return;
    
    try {
      const response = await fetch(result.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-${result.mode}-${Date.now()}.${result.mode === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Файл скачан');
    } catch {
      toast.error('Ошибка при скачивании');
    }
  }, [result]);

  // Copy prompt
  const handleCopyPrompt = useCallback(() => {
    if (!result?.prompt) return;
    navigator.clipboard.writeText(result.prompt);
    toast.success('Промпт скопирован');
  }, [result]);

  // Empty state - Freepik style (clean canvas placeholder)
  if (!result && !isGenerating) {
    return (
      <div className="h-full w-full flex items-center justify-center p-3 md:p-6 bg-[#0F0F10]">
        {/* Empty canvas placeholder - matches result layout */}
        <div className="relative w-full h-full max-w-4xl max-h-full flex items-center justify-center">
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-[#18181B]/50 border border-dashed border-[#27272A] w-full max-w-2xl aspect-square max-h-[calc(100vh-280px)] flex items-center justify-center">
            {/* Content */}
            <div className="text-center p-6 md:p-8 space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#00D9FF]/10 to-[#00D9FF]/5 border border-[#00D9FF]/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#00D9FF]" />
              </div>
              
              {/* Text */}
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-semibold text-white">
                  {mode === 'video' ? 'Создайте видео' : 'Создайте изображение'}
                </h2>
                <p className="text-sm text-[#71717A] max-w-sm mx-auto">
                  Опишите что вы хотите увидеть, и AI создаст это для вас
                </p>
              </div>

              {/* Example prompts */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] text-[#52525B] uppercase tracking-wider font-medium">
                  Попробуйте
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {examples.slice(0, 3).map((example, i) => (
                    <button
                      key={i}
                      onClick={() => onExampleClick?.(example)}
                      className="px-3 py-2 rounded-xl bg-[#27272A]/60 hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-xs transition-all border border-transparent hover:border-[#3F3F46] max-w-[200px] truncate"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard hint */}
              <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-[#3F3F46]">
                <kbd className="px-1.5 py-0.5 rounded bg-[#27272A] text-[#52525B] font-mono">⌘</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#27272A] text-[#52525B] font-mono">Enter</kbd>
                <span className="ml-1">для генерации</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state - Freepik style (canvas placeholder with progress)
  if (isGenerating) {
    return (
      <div className="h-full w-full flex items-center justify-center p-3 md:p-6 bg-[#0F0F10]">
        {/* Placeholder matching result layout */}
        <div className="relative w-full h-full max-w-4xl max-h-full flex items-center justify-center">
          {/* Generating placeholder - matches result container */}
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-[#18181B] border border-[#27272A] shadow-2xl shadow-black/50 w-full max-w-2xl aspect-square max-h-[calc(100vh-280px)] flex items-center justify-center">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00D9FF]/5 via-transparent to-[#00D9FF]/5 animate-pulse" />
            
            {/* Generating content */}
            <div className="relative z-10 text-center p-8 space-y-6">
              {/* Spinner */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#27272A]" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00D9FF] animate-spin"
                  style={{ animationDuration: '1s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#00D9FF]" />
                </div>
              </div>
              
              {/* Status */}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  {STAGE_LABELS[stage] || 'Создаём...'}
                </h3>
                <p className="text-sm text-[#71717A]">
                  {eta || `~${estimatedTime} сек`}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs mx-auto">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-[#00D9FF] font-medium">{Math.floor(progress)}%</span>
                  <span className="text-[#52525B]">{mode === 'video' ? 'Видео' : 'Фото'}</span>
                </div>
                <div className="h-1 bg-[#27272A] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00D9FF] to-[#22D3EE] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stage dots */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {(['queued', 'generating', 'finalizing']).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all ${
                      s === stage 
                        ? 'bg-[#00D9FF] scale-125' 
                        : progress > (i * 33)
                        ? 'bg-[#3F3F46]'
                        : 'bg-[#27272A]'
                    }`} />
                    {i < 2 && <div className="w-8 h-px bg-[#27272A]" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result state - Freepik Pikaso style (full canvas, minimal overlay)
  if (result) {
    return (
      <>
        {/* Full Canvas Result - Freepik style */}
        <div className="h-full w-full flex items-center justify-center p-3 md:p-6 bg-[#0F0F10]">
          {/* Result fills the canvas area */}
          <div 
            className="relative w-full h-full max-w-4xl max-h-full flex items-center justify-center group cursor-pointer"
            onClick={() => setShowLightbox(true)}
          >
            {/* Main media - fills available space */}
            <div className="relative rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-black/50 max-h-full">
              {result.mode === 'video' ? (
                <video
                  src={result.url}
                  className="max-w-full max-h-[calc(100vh-280px)] object-contain rounded-xl md:rounded-2xl"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.url}
                  alt={result.prompt}
                  className="max-w-full max-h-[calc(100vh-280px)] object-contain rounded-xl md:rounded-2xl"
                />
              )}
              
              {/* Hover overlay - Freepik style minimal */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl md:rounded-2xl">
                {/* Top actions */}
                <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
                    className="p-2 rounded-lg bg-white/20 backdrop-blur-md hover:bg-white/30 text-white transition-all"
                    title="На весь экран"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom bar with actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  {/* Left: Prompt preview */}
                  <div className="flex-1 mr-4">
                    <p className="text-white/90 text-sm line-clamp-2 leading-relaxed drop-shadow-lg">
                      {result.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-white/60">
                      <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm">
                        {result.settings?.model || 'AI'}
                      </span>
                      <span>{result.settings?.size || '1:1'}</span>
                      <span>•</span>
                      <span>{result.mode === 'video' ? '🎬 Видео' : '🖼 Фото'}</span>
                    </div>
                  </div>
                  
                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyPrompt(); }}
                      className="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 text-white text-xs font-medium transition-all flex items-center gap-1.5"
                      title="Копировать промпт"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Копировать</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                      className="px-3 py-2 rounded-lg bg-[#00D9FF] hover:bg-[#22D3EE] text-[#0F0F10] text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[#00D9FF]/20"
                      title="Скачать"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Скачать</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Always visible badge - top left */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Готово
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox Modal */}
        {showLightbox && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowLightbox(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Zoom controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(Math.max(50, zoom - 10)); }}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-white text-xs font-medium min-w-[40px] text-center">{zoom}%</span>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(Math.min(200, zoom + 10)); }}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(100); }}
                className="px-2 py-0.5 rounded text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Media container */}
            <div 
              className="absolute inset-0 flex items-center justify-center p-4 md:p-16 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="relative max-w-full max-h-full animate-in zoom-in-95 duration-300"
                style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.2s ease-out' }}
              >
                {result.mode === 'video' ? (
                  <video
                    src={result.url}
                    controls
                    autoPlay
                    loop
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.url}
                    alt={result.prompt}
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                  />
                )}
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="max-w-3xl mx-auto">
                <p className="text-white/90 text-sm mb-3 line-clamp-2">{result.prompt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-white/50">
                    <span>{result.settings.model}</span>
                    <span>•</span>
                    <span>{result.settings.size}</span>
                    <span>•</span>
                    <span>{result.mode === 'video' ? 'Видео' : 'Изображение'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPrompt}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Копировать
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 rounded-lg bg-[#00D9FF] hover:bg-[#22D3EE] text-[#0F0F10] text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Скачать
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="absolute bottom-4 left-4 text-[10px] text-white/30 hidden md:block">
              <span className="mr-3">ESC закрыть</span>
              <span className="mr-3">+/- зум</span>
              <span>0 сброс</span>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
