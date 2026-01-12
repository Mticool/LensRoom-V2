'use client';

import { useState, useMemo } from 'react';
import { Settings2, Sparkles, ChevronDown, ChevronUp, Wand2, Zap, Clock, Star, Info, AlertTriangle, Scissors } from 'lucide-react';
import { GeneratorMode, GenerationSettings } from './GeneratorV2';
import { ImageUploader } from './ImageUploader';
import { VideoUploader } from './VideoUploader';
import { Tooltip } from './Tooltip';
import { PHOTO_MODELS, VIDEO_MODELS, PhotoModelConfig, VideoModelConfig } from '@/config/models';
import { 
  calcMotionControlStars, 
  validateMotionControlDuration, 
  MOTION_CONTROL_CONFIG,
  type MotionControlResolution 
} from '@/lib/pricing/motionControl';

interface SettingsPanelProps {
  mode: GeneratorMode;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  referenceImage: string | null;
  onReferenceImageChange: (image: string | null) => void;
  referenceVideo?: string | null;
  onReferenceVideoChange?: (video: string | null, durationSec?: number) => void;
  // Motion Control specific
  videoDuration?: number | null;
  autoTrim?: boolean;
  onAutoTrimChange?: (autoTrim: boolean) => void;
}

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', desc: 'Пост' },
  { id: '16:9', label: '16:9', desc: 'Видео' },
  { id: '9:16', label: '9:16', desc: 'Сторис' },
  { id: '4:3', label: '4:3', desc: 'Фото' },
  { id: '3:4', label: '3:4', desc: 'Портрет' },
  { id: '21:9', label: '21:9', desc: 'Кино' },
];

// Speed & quality badges
const SPEED_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  fast: { label: 'Быстро', color: 'text-emerald-400', icon: Zap },
  medium: { label: 'Средне', color: 'text-amber-400', icon: Clock },
  slow: { label: 'Качество', color: 'text-purple-400', icon: Star },
};

// Get minimum price for a model
function getMinPrice(model: PhotoModelConfig | VideoModelConfig): number {
  const pricing = model.pricing;
  if (typeof pricing === 'number') return pricing;
  
  const extractPrices = (obj: any): number[] => {
    if (typeof obj === 'number') return [obj];
    if (typeof obj === 'object') {
      return Object.values(obj).flatMap(v => extractPrices(v));
    }
    return [];
  };
  
  const prices = extractPrices(pricing);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export function SettingsPanel({ 
  mode, 
  settings, 
  onSettingsChange,
  referenceImage,
  onReferenceImageChange,
  referenceVideo,
  onReferenceVideoChange,
  videoDuration,
  autoTrim = true,
  onAutoTrimChange,
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  // Get models based on mode
  const models = useMemo(() => {
    if (mode === 'video') {
      return VIDEO_MODELS.filter(m => m.featured).map(m => ({
        id: m.id,
        name: m.name,
        cost: getMinPrice(m),
        speed: m.speed,
        description: m.description,
        shortDesc: m.shortLabel || '',
        supportsI2v: m.supportsI2v,
        variants: m.modelVariants,
        qualityOptions: m.qualityOptions,
        durationOptions: m.durationOptions,
        resolutionOptions: m.resolutionOptions,
        supportsAudio: m.supportsAudio,
      }));
    }
    return PHOTO_MODELS.filter(m => m.featured && m.id !== 'topaz-image-upscale' && m.id !== 'recraft-remove-background')
      .map(m => ({
        id: m.id,
        name: m.name,
        cost: getMinPrice(m),
        speed: m.speed,
        description: m.description,
        shortDesc: m.shortDescription || '',
        supportsI2i: m.supportsI2i,
        qualityOptions: m.qualityOptions,
      }));
  }, [mode]);

  // Get current model config
  const currentModel = useMemo(() => {
    const allModels = mode === 'video' ? VIDEO_MODELS : PHOTO_MODELS;
    return allModels.find(m => m.id === settings.model);
  }, [mode, settings.model]);

  // Get aspect ratios for current model
  const availableAspectRatios = useMemo(() => {
    if (!currentModel) return ASPECT_RATIOS;
    const supported = currentModel.aspectRatios;
    return ASPECT_RATIOS.filter(ar => supported.includes(ar.id));
  }, [currentModel]);

  const SpeedIcon = SPEED_CONFIG[currentModel?.speed || 'medium']?.icon || Clock;

  return (
    <div className="w-full md:w-72 md:border-r border-[#27272A] bg-[#18181B] overflow-y-auto flex flex-col text-[13px]">
      <div className="p-4 space-y-5 flex-1">
        {/* Header - Compact */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-[#71717A]" />
            <span className="text-sm font-medium text-white">Настройки</span>
          </div>
        </div>

        {/* Model Selection - Freepik style compact list */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Модель</label>
          <div className="space-y-1">
            {models.map((model) => {
              const speedConfig = SPEED_CONFIG[model.speed] || SPEED_CONFIG.medium;
              const isSelected = settings.model === model.id;
              const isExpanded = expandedModel === model.id;
              
              return (
                <div key={model.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isSelected) {
                        // Повторный клик - переключаем описание
                        setExpandedModel(isExpanded ? null : model.id);
                      } else {
                        // Первый клик - выбираем модель и показываем описание
                        onSettingsChange({ 
                          ...settings, 
                          model: model.id,
                          modelVariant: (model as any).variants?.[0]?.id,
                        });
                        setExpandedModel(model.id);
                      }
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'border-[#00D9FF]/50 bg-[#00D9FF]/10'
                        : 'border-transparent bg-[#27272A]/50 hover:bg-[#27272A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isSelected ? 'bg-[#00D9FF]' : 'bg-[#3F3F46]'
                        }`} />
                        <span className={`text-[13px] font-medium truncate ${
                          isSelected ? 'text-white' : 'text-[#E4E4E7]'
                        }`}>
                          {model.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] ${speedConfig.color}`}>
                          {speedConfig.label}
                        </span>
                        <span className="text-[11px] text-[#00D9FF] font-medium">
                          {model.cost}⭐
                        </span>
                        {/* Индикатор раскрытия */}
                        {isSelected && model.description && (
                          <ChevronDown className={`w-3 h-3 text-[#71717A] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </div>
                    
                    {/* Short description */}
                    {model.shortDesc && !isExpanded && (
                      <p className="text-[10px] text-[#71717A] mt-1 pl-3.5 line-clamp-1">
                        {model.shortDesc}
                      </p>
                    )}
                  </button>
                  
                  {/* Expanded description - показываем только когда раскрыто */}
                  {isExpanded && model.description && (
                    <div className="px-2.5 py-2 rounded-lg bg-[#27272A]/30 ml-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        {model.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Variant (for Kling, WAN, etc.) */}
        {currentModel && 'modelVariants' in currentModel && currentModel.modelVariants && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Версия</label>
            <div className="flex flex-wrap gap-1.5">
              {currentModel.modelVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => onSettingsChange({ ...settings, modelVariant: variant.id })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    settings.modelVariant === variant.id
                      ? 'bg-[#00D9FF] text-[#0F0F10] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                      : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
                  }`}
                >
                  {variant.name.replace('Kling ', '').replace('WAN ', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quality Options */}
        {currentModel?.qualityOptions && currentModel.qualityOptions.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Качество</label>
            <div className="flex flex-wrap gap-1.5">
              {currentModel.qualityOptions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSettingsChange({ ...settings, quality: q })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    settings.quality === q
                      ? 'bg-[#00D9FF] text-[#0F0F10] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                      : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
                  }`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resolution (for video) */}
        {mode === 'video' && currentModel && 'resolutionOptions' in currentModel && currentModel.resolutionOptions && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Разрешение</label>
            <div className="flex flex-wrap gap-1.5">
              {currentModel.resolutionOptions.map((res) => (
                <button
                  key={res}
                  onClick={() => onSettingsChange({ ...settings, resolution: res })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    settings.resolution === res
                      ? 'bg-[#00D9FF] text-[#0F0F10] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                      : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration (for video) */}
        {mode === 'video' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Длительность</label>
            <div className="flex flex-wrap gap-1.5">
              {(currentModel && 'durationOptions' in currentModel ? currentModel.durationOptions : [5, 10]).map((dur) => (
                <button
                  key={String(dur)}
                  onClick={() => onSettingsChange({ ...settings, duration: typeof dur === 'number' ? dur : 10 })}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    settings.duration === dur
                      ? 'bg-[#00D9FF] text-[#0F0F10] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                      : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
                  }`}
                >
                  {typeof dur === 'number' ? `${dur}с` : dur}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aspect Ratio - Compact inline buttons */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Формат</label>
          <div className="flex flex-wrap gap-1.5">
            {availableAspectRatios.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => onSettingsChange({ ...settings, size: ratio.id })}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  settings.size === ratio.id
                    ? 'bg-[#00D9FF] text-[#0F0F10] shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                    : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46] hover:text-white'
                }`}
                title={ratio.desc}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference Image (i2i / i2v) - but NOT for Motion Control */}
        {((mode === 'image' && currentModel && 'supportsI2i' in currentModel && currentModel.supportsI2i) ||
          (mode === 'video' && currentModel && 'supportsI2v' in currentModel && currentModel.supportsI2v && settings.model !== 'kling-motion-control')) && (
          <ImageUploader
            value={referenceImage}
            onChange={onReferenceImageChange}
            mode="compact"
          />
        )}

        {/* Motion Control - Special UI for character image + reference video */}
        {settings.model === 'kling-motion-control' && (
          <div className="space-y-4 pt-2 border-t border-[#27272A]">
            {/* Info banner */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Info className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-purple-200 leading-relaxed">
                Загрузите фото персонажа и видео с движениями. Персонаж повторит движения из видео.
              </p>
            </div>
            
            {/* Character Image */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-lg">🖼️</span>
                Фото персонажа
              </label>
              <ImageUploader
                value={referenceImage}
                onChange={onReferenceImageChange}
                mode="compact"
              />
              <p className="text-[9px] text-[#52525B] leading-tight">
                Чёткое фото с видимой головой, плечами и торсом
              </p>
            </div>
            
            {/* Reference Video */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide flex items-center gap-1.5">
                <span className="text-lg">📹</span>
                Видео с движениями
              </label>
              {onReferenceVideoChange && (
                <VideoUploader
                  value={referenceVideo || null}
                  onChange={onReferenceVideoChange}
                  mode="compact"
                  label="Референс движений"
                  hint={`${MOTION_CONTROL_CONFIG.MIN_DURATION_SEC}-${MOTION_CONTROL_CONFIG.MAX_DURATION_SEC} сек, плавные движения`}
                  duration={videoDuration}
                />
              )}
            </div>
            
            {/* Duration & Auto-trim section */}
            {videoDuration != null && videoDuration > 0 && (() => {
              const resolution = (settings.resolution || '720p') as MotionControlResolution;
              const validation = validateMotionControlDuration(videoDuration, autoTrim);
              const price = calcMotionControlStars(validation.effectiveDuration || videoDuration, resolution, autoTrim);
              const needsTrim = videoDuration > MOTION_CONTROL_CONFIG.MAX_DURATION_SEC;
              
              return (
                <div className="space-y-3 p-3 rounded-lg bg-[#27272A]/50 border border-[#3F3F46]">
                  {/* Duration info */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#A1A1AA]">Длительность референса:</span>
                      <span className={`font-medium ${needsTrim ? 'text-amber-400' : 'text-white'}`}>
                        {videoDuration.toFixed(1)} сек
                        {needsTrim && ' (макс 30)'}
                      </span>
                    </div>
                    {validation.effectiveDuration && validation.effectiveDuration > 0 && validation.effectiveDuration !== videoDuration && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#A1A1AA]">Итоговая длительность:</span>
                        <span className="text-[#00D9FF] font-medium">
                          {validation.effectiveDuration.toFixed(1)} сек
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Auto-trim toggle for long videos */}
                  {needsTrim && onAutoTrimChange && (
                    <div className="flex items-center justify-between py-2 border-t border-[#3F3F46]">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] text-[#A1A1AA]">Обрезать до 30 сек</span>
                      </div>
                      <button
                        onClick={() => onAutoTrimChange(!autoTrim)}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                          autoTrim ? 'bg-[#00D9FF] justify-end' : 'bg-[#3F3F46] justify-start'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white mx-0.5 transition-transform`} />
                      </button>
                    </div>
                  )}
                  
                  {/* Warning for disabled auto-trim */}
                  {needsTrim && !autoTrim && (
                    <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-red-300 leading-relaxed">
                        Генерация невозможна. Включите обрезку или загрузите видео до 30 сек.
                      </p>
                    </div>
                  )}
                  
                  {/* Error for too short */}
                  {validation.error && !needsTrim && (
                    <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-red-300">{validation.error}</p>
                    </div>
                  )}
                  
                  {/* Price display */}
                  {price != null && validation.valid && validation.effectiveDuration && (
                    <div className="flex justify-between items-center pt-2 border-t border-[#3F3F46]">
                      <span className="text-[11px] text-[#A1A1AA]">Стоимость:</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#00D9FF]">{price}⭐</span>
                        <p className="text-[9px] text-[#52525B]">
                          {validation.effectiveDuration.toFixed(1)}с × {resolution === '720p' ? MOTION_CONTROL_CONFIG.RATE_720P : MOTION_CONTROL_CONFIG.RATE_1080P}⭐/с
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Advanced Settings - Collapsed by default */}
        <div className="pt-3 border-t border-[#27272A]">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-[11px] font-medium text-[#71717A] hover:text-white transition-colors"
          >
            <span>Дополнительно</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              {/* Negative Prompt */}
              <div>
                <label className="text-[10px] text-[#A1A1AA] mb-1 block">Негативный промпт</label>
                <textarea
                  value={settings.negativePrompt || ''}
                  onChange={(e) => onSettingsChange({ ...settings, negativePrompt: e.target.value })}
                  placeholder="blur, low quality..."
                  className="w-full px-2 py-1.5 rounded-lg bg-[#27272A] border border-[#27272A] text-white text-[11px] placeholder:text-[#52525B] focus:outline-none focus:border-[#3F3F46] resize-none"
                  rows={2}
                />
              </div>

              {/* Seed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#A1A1AA]">Seed</label>
                  <button
                    onClick={() => onSettingsChange({ ...settings, seed: Math.floor(Math.random() * 1000000) })}
                    className="text-[10px] text-[#00D9FF] hover:text-[#22D3EE]"
                  >
                    🎲
                  </button>
                </div>
                <input
                  type="number"
                  value={settings.seed || ''}
                  onChange={(e) => onSettingsChange({ ...settings, seed: parseInt(e.target.value) || undefined })}
                  placeholder="Авто"
                  className="w-full px-2 py-1.5 rounded-lg bg-[#27272A] border border-[#27272A] text-white text-[11px] placeholder:text-[#52525B] focus:outline-none focus:border-[#3F3F46]"
                />
              </div>

              {/* Audio for video */}
              {mode === 'video' && currentModel && 'supportsAudio' in currentModel && currentModel.supportsAudio && (
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#A1A1AA]">Аудио</label>
                  <button
                    onClick={() => onSettingsChange({ ...settings, audio: !settings.audio })}
                    className={`w-8 h-4 rounded-full transition-colors ${
                      settings.audio ? 'bg-[#00D9FF]' : 'bg-[#3F3F46]'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      settings.audio ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom tip - Freepik style */}
      <div className="p-3 border-t border-[#27272A] bg-[#27272A]/30">
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#00D9FF] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[#71717A] leading-relaxed">
            Детализируйте промпт: стиль, освещение, настроение
          </p>
        </div>
      </div>
    </div>
  );
}