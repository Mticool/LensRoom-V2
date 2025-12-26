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

  // Empty state
  if (!result && !isGenerating) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-[#0F0F10]">
        <div className="max-w-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-[#27272A]/50 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-[#00D9FF]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-medium text-white">
              Опишите {mode === 'video' ? 'видео' : 'изображение'}
            </h2>
            <p className="text-sm text-[#71717A]">
              AI воплотит вашу идею в реальность
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-[#52525B] uppercase tracking-wider">
              Примеры
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {examples.map((example, i) => (
                <button
                  key={i}
                  onClick={() => onExampleClick?.(example)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#27272A]/50 hover:bg-[#27272A] text-[#A1A1AA] hover:text-white text-[11px] transition-all text-left border border-transparent hover:border-[#3F3F46]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-[#0F0F10]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-[#27272A] flex items-center justify-center mx-auto">
              <Loader2 className="w-16 h-16 text-[#00D9FF] animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-[#00D9FF]/5 blur-3xl animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              {STAGE_LABELS[stage] || 'Генерация...'}
            </h2>
            <p className="text-[#A1A1AA] text-sm">
              {eta || `Примерно ${estimatedTime} сек`}
            </p>
          </div>

          <div className="w-full max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-medium">{Math.floor(progress)}%</span>
              <span className="text-[#71717A]">Создаем {mode === 'video' ? 'видео' : 'фото'}</span>
            </div>
            <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00D9FF] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            {(['queued', 'generating', 'finalizing']).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === stage 
                    ? 'bg-[#00D9FF] w-6' 
                    : progress > (['queued', 'generating', 'finalizing'].indexOf(s) * 33)
                    ? 'bg-[#3F3F46] w-2'
                    : 'bg-[#27272A] w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Result state - Gemini-style compact preview
  if (result) {
    return (
      <>
        {/* Compact Preview (Gemini-style) */}
        <div className="h-full w-full flex items-center justify-center p-4 md:p-8 bg-[#0F0F10]">
          <div className="max-w-lg w-full">
            {/* Preview Card */}
            <div 
              onClick={() => setShowLightbox(true)}
              className="relative rounded-2xl overflow-hidden border border-[#27272A] bg-[#18181B] cursor-pointer group transition-all duration-300 hover:border-[#3F3F46] hover:shadow-xl hover:shadow-[#00D9FF]/5"
            >
              {/* Media preview - constrained size */}
              <div className="relative aspect-square max-h-[320px] md:max-h-[400px] overflow-hidden bg-black">
                {result.mode === 'video' ? (
                  <video
                    src={result.url}
                    className="w-full h-full object-contain"
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
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* Hover overlay with expand icon */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                    <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Type badge */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium uppercase tracking-wide">
                  {result.mode === 'video' ? '🎬 Видео' : '🖼 Фото'}
                </div>
              </div>
              
              {/* Info section */}
              <div className="p-3 md:p-4 space-y-3">
                {/* Prompt preview */}
                <p className="text-[#E4E4E7] text-sm line-clamp-2 leading-relaxed">
                  {result.prompt}
                </p>
                
                {/* Meta & actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                    <span className="px-1.5 py-0.5 rounded bg-[#27272A]">{result.settings.model}</span>
                    <span>{result.settings.size}</span>
                  </div>
                  
                  {/* Quick actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyPrompt(); }}
                      className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      title="Копировать промпт"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                      className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
                      className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
                      title="Открыть"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-center text-[10px] text-[#52525B] mt-3">
              Нажмите для просмотра в полном размере
            </p>
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
