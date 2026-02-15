'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Download, ChevronRight, ChevronLeft, ChevronDown, Check, Star, Play } from 'lucide-react';
import { MotionUploadZone } from './MotionUploadZone';
import { MotionModelSelector } from './MotionModelSelector';
import { SegmentedControl } from '@/components/mobile/ui/SegmentedControl';

// Gradient backgrounds per model
const MODEL_GRADIENTS: Record<string, string> = {
  'kling-motion-control': 'from-rose-600 to-pink-600',
  'wan-animate-move': 'from-blue-600 to-indigo-600',
  'wan-animate-replace': 'from-purple-600 to-violet-600',
  'grok-video': 'from-emerald-600 to-teal-600',
  'kling-o1-edit': 'from-amber-600 to-orange-600',
};

const MODEL_TITLES: Record<string, string> = {
  'kling-motion-control': 'Motion Control',
  'wan-animate-move': 'Motion Transfer',
  'wan-animate-replace': 'Character Swap',
  'grok-video': 'Grok Video',
  'kling-o1-edit': 'Video Edit',
};

const MODEL_SUBTITLES: Record<string, string> = {
  'kling-motion-control': 'Перенос движения из видео на ваше фото',
  'wan-animate-move': 'Оживите фото по образцу движений из видео',
  'wan-animate-replace': 'Замена персонажа в видео на ваше лицо',
  'grok-video': 'Генерация видео с синхронизированным звуком',
  'kling-o1-edit': 'Редактирование видео промптом и фото-референсами',
};

// Per-model upload zone config
type ZoneConfig = {
  left: { title: string; subtitle: string; type: 'video' | 'image' };
  right: { title: string; subtitle: string; type: 'video' | 'image' } | null;
};

function getZoneConfig(modelId: string): ZoneConfig {
  switch (modelId) {
    case 'kling-motion-control':
    case 'wan-animate-move':
      return {
        left: { title: 'Видео движения', subtitle: 'MP4 / MOV / WebM', type: 'video' },
        right: { title: 'Фото персонажа', subtitle: 'JPG / PNG / WebP', type: 'image' },
      };
    case 'wan-animate-replace':
      return {
        left: { title: 'Видео для замены', subtitle: 'MP4 / MOV / WebM', type: 'video' },
        right: { title: 'Фото нового лица', subtitle: 'JPG / PNG / WebP', type: 'image' },
      };
    case 'grok-video':
      return {
        left: { title: 'Стиль-референс', subtitle: 'JPG / PNG (опционально)', type: 'image' },
        right: null, // Grok Video only needs prompt or single reference
      };
    case 'kling-o1-edit':
      return {
        left: { title: 'Видео для редактирования', subtitle: 'MP4 / MOV / WebM', type: 'video' },
        right: { title: 'Фото-референс', subtitle: 'JPG / PNG (опционально)', type: 'image' },
      };
    default:
      return {
        left: { title: 'Видео движения', subtitle: 'MP4 / MOV / WebM', type: 'video' },
        right: { title: 'Фото персонажа', subtitle: 'JPG / PNG / WebP', type: 'image' },
      };
  }
}

// Quality options per model
type QualityOption = { value: string; label: string; price: string };

function getQualityOptions(modelId: string): QualityOption[] {
  switch (modelId) {
    case 'kling-motion-control':
      return [
        { value: '720p', label: '720p', price: '6⭐/с' },
        { value: '1080p', label: '1080p', price: '9⭐/с' },
      ];
    case 'wan-animate-move':
      return [
        { value: '480p', label: '480p', price: '6⭐/с' },
        { value: '580p', label: '580p', price: '6⭐/с' },
        { value: '720p', label: '720p', price: '6⭐/с' },
      ];
    case 'wan-animate-replace':
      return [
        { value: '480p', label: '480p', price: '8⭐/с' },
        { value: '580p', label: '580p', price: '8⭐/с' },
        { value: '720p', label: '720p', price: '8⭐/с' },
      ];
    case 'grok-video':
      return [
        { value: '6', label: '6s', price: '17⭐' },
        { value: '10', label: '10s', price: '26⭐' },
      ];
    case 'kling-o1-edit':
      return [
        { value: '5', label: '5s', price: '75⭐' },
        { value: '10', label: '10s', price: '150⭐' },
      ];
    default:
      return [{ value: '720p', label: '720p', price: '6⭐/с' }];
  }
}

export interface MotionControlStudioProps {
  // Model selection
  selectedModelId: string;
  onModelSelect: (id: string) => void;

  // Upload
  referenceImage: File | null;
  onReferenceImageChange: (f: File | null) => void;
  motionReferenceVideo: File | null;
  onMotionReferenceVideoChange: (f: File | null) => void;
  motionReferenceVideoDurationSec: number | null;

  // Quality
  quality: string;
  onQualityChange: (q: string) => void;

  // Character orientation (kling-motion-control only)
  characterOrientation: 'video' | 'image';
  onCharacterOrientationChange: (v: 'video' | 'image') => void;

  // Prompt
  prompt: string;
  onPromptChange: (p: string) => void;

  // Price
  estimatedStars: number;

  // Generation
  isGenerating: boolean;
  canGenerate: boolean;
  onGenerate: () => void;

  // Validation
  videoValidationError?: string | null;
  imageValidationError?: string | null;

  // Result
  resultUrls: string[];
  activeRunIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onDownload: () => void;
}

export function MotionControlStudio(props: MotionControlStudioProps) {
  const {
    selectedModelId,
    onModelSelect,
    referenceImage,
    onReferenceImageChange,
    motionReferenceVideo,
    onMotionReferenceVideoChange,
    motionReferenceVideoDurationSec,
    quality,
    onQualityChange,
    characterOrientation,
    onCharacterOrientationChange,
    prompt,
    onPromptChange,
    estimatedStars,
    isGenerating,
    canGenerate,
    onGenerate,
    resultUrls,
    activeRunIndex,
    onPrev,
    onNext,
    onDownload,
    videoValidationError,
    imageValidationError,
  } = props;

  const [qualityOpen, setQualityOpen] = useState(false);
  const qualityRef = useRef<HTMLDivElement>(null);

  // Close quality dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) {
        setQualityOpen(false);
      }
    };
    if (qualityOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [qualityOpen]);

  const zoneConfig = useMemo(() => getZoneConfig(selectedModelId), [selectedModelId]);
  const qualityOptions = useMemo(() => getQualityOptions(selectedModelId), [selectedModelId]);
  const selectedQuality = qualityOptions.find((q) => q.value === quality) || qualityOptions[0];
  const gradient = MODEL_GRADIENTS[selectedModelId] || 'from-rose-600 to-pink-600';
  const isKlingMotion = selectedModelId === 'kling-motion-control';
  const isGrok = selectedModelId === 'grok-video';
  const isKlingO1Edit = selectedModelId === 'kling-o1-edit';
  const isDurationBased = isGrok || isKlingO1Edit;
  const hasResult = resultUrls.length > 0;

  // For kling-motion-control: show total cost based on video duration
  const costLabel = useMemo(() => {
    if (estimatedStars > 0) return `${estimatedStars}⭐`;
    if (selectedQuality) return selectedQuality.price;
    return '';
  }, [estimatedStars, selectedQuality]);

  const orientationOptions = useMemo(
    () => [
      { value: 'image', label: 'Image' },
      { value: 'video', label: 'Video' },
    ],
    []
  );

  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--app-header-h,64px))] bg-[var(--bg)] text-white">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero banner / Result area */}
        {hasResult ? (
          <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden bg-black">
            <video
              key={resultUrls[activeRunIndex]}
              src={resultUrls[activeRunIndex]}
              className="w-full aspect-video object-contain"
              controls
              autoPlay
              loop
              playsInline
            />
            {resultUrls.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
                <button
                  onClick={onPrev}
                  className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs text-white/80 font-medium">
                  {activeRunIndex + 1} / {resultUrls.length}
                </span>
                <button
                  onClick={onNext}
                  className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* Download button */}
            <button
              onClick={onDownload}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className={`mx-4 mt-4 h-36 rounded-2xl bg-gradient-to-br ${gradient} relative overflow-hidden flex flex-col items-start justify-end p-5`}
          >
            {/* Decorative dots */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-6 w-20 h-20 rounded-full bg-white/40 blur-2xl" />
              <div className="absolute bottom-2 left-8 w-14 h-14 rounded-full bg-white/30 blur-xl" />
            </div>
            <h1 className="text-2xl font-bold text-[#8cf425] relative z-10">
              {MODEL_TITLES[selectedModelId] || 'Motion Control'}
            </h1>
            <p className="text-xs text-white/70 mt-1 relative z-10">
              {MODEL_SUBTITLES[selectedModelId] || ''}
            </p>
          </div>
        )}

        {/* Upload zones */}
        <div className={`mx-4 mt-4 ${zoneConfig.right ? 'grid grid-cols-2 gap-3' : ''}`}>
          <MotionUploadZone
            type={zoneConfig.left.type}
            file={zoneConfig.left.type === 'video' ? motionReferenceVideo : referenceImage}
            onChange={zoneConfig.left.type === 'video' ? onMotionReferenceVideoChange : onReferenceImageChange}
            title={zoneConfig.left.title}
            subtitle={zoneConfig.left.subtitle}
            durationSec={zoneConfig.left.type === 'video' ? motionReferenceVideoDurationSec : undefined}
            disabled={isGenerating}
            validationError={zoneConfig.left.type === 'video' ? videoValidationError : imageValidationError}
          />
          {zoneConfig.right && (
            <MotionUploadZone
              type={zoneConfig.right.type}
              file={zoneConfig.right.type === 'video' ? motionReferenceVideo : referenceImage}
              onChange={zoneConfig.right.type === 'video' ? onMotionReferenceVideoChange : onReferenceImageChange}
              title={zoneConfig.right.title}
              subtitle={zoneConfig.right.subtitle}
              durationSec={zoneConfig.right.type === 'video' ? motionReferenceVideoDurationSec : undefined}
              disabled={isGenerating}
              validationError={zoneConfig.right.type === 'video' ? videoValidationError : imageValidationError}
            />
          )}
        </div>

        {/* Model selector */}
        <div className="mx-4 mt-4">
          <MotionModelSelector selectedId={selectedModelId} onSelect={onModelSelect} />
        </div>

        {/* Quality selector */}
        <div className="mx-4 mt-3 relative" ref={qualityRef}>
          <button
            type="button"
            onClick={() => setQualityOpen((v) => !v)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] active:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#8cf425] shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                  {isDurationBased ? 'Длительность' : 'Качество'}
                </div>
                <div className="text-sm font-semibold text-white">
                  {selectedQuality?.label || quality} <span className="text-white/40 font-normal">• {selectedQuality?.price}</span>
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${qualityOpen ? 'rotate-180' : ''}`} />
          </button>

          {qualityOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#1A1A1C]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onQualityChange(opt.value);
                    setQualityOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                    opt.value === quality ? 'bg-[#8cf425]/10 text-[#8cf425]' : 'text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label} <span className="text-white/40">• {opt.price}</span></span>
                  {opt.value === quality && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scene control mode — only for kling-motion-control */}
        {isKlingMotion && (
          <div className="mx-4 mt-3">
            <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium mb-2 px-1">
              Scene Control Mode
            </div>
            <SegmentedControl
              options={orientationOptions}
              value={characterOrientation}
              onChange={(v) => onCharacterOrientationChange(v as 'video' | 'image')}
              size="sm"
            />
          </div>
        )}

        {/* Info card — duration + price */}
        {motionReferenceVideoDurationSec && !isDurationBased && (
          <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/50">
                Длительность видео: <span className="text-white/80 font-medium">{Math.round(motionReferenceVideoDurationSec)}s</span>
              </div>
              <div className="text-sm font-bold text-[#8cf425]">{costLabel}</div>
            </div>
          </div>
        )}

        {/* Prompt textarea */}
        <div className="mx-4 mt-3">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={isGrok ? 'Описание сцены...' : isKlingO1Edit ? 'Опишите изменения...' : 'Промпт (опционально)...'}
            rows={3}
            disabled={isGenerating}
            className="w-full p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-[#8cf425]/30 transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {/* Fixed bottom — Generate button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className={`
            w-full h-14 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5
            transition-all duration-200
            ${canGenerate && !isGenerating
              ? 'bg-[#8cf425] text-black active:scale-[0.98] shadow-[0_0_24px_-6px_rgba(140,244,37,0.5)]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Создать
              {costLabel && (
                <span className="ml-1 text-black/60 font-semibold">{costLabel}</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
