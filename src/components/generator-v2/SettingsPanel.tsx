'use client';

import { useState, useMemo } from 'react';
import { Settings2, Sparkles, Upload, X, ChevronDown, ChevronUp, Wand2, Zap, Clock, Star } from 'lucide-react';
import { GeneratorMode, GenerationSettings } from './GeneratorV2';
import { Tooltip } from './Tooltip';
import { PHOTO_MODELS, VIDEO_MODELS, PhotoModelConfig, VideoModelConfig } from '@/config/models';

interface SettingsPanelProps {
  mode: GeneratorMode;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  referenceImage: string | null;
  onReferenceImageChange: (image: string | null) => void;
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
}: SettingsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  // Handle reference image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        onReferenceImageChange(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
    }
  };

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

        {/* Reference Image (i2i / i2v) */}
        {((mode === 'image' && currentModel && 'supportsI2i' in currentModel && currentModel.supportsI2i) ||
          (mode === 'video' && currentModel && 'supportsI2v' in currentModel && currentModel.supportsI2v)) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">
                Референс
              </label>
              {referenceImage && (
                <button
                  onClick={() => onReferenceImageChange(null)}
                  className="text-[10px] text-[#EF4444] hover:text-red-400"
                >
                  Удалить
                </button>
              )}
            </div>
            
            {referenceImage ? (
              <div className="relative rounded-lg overflow-hidden border border-[#27272A]">
                <img 
                  src={referenceImage} 
                  alt="Reference" 
                  className="w-full h-20 object-cover"
                />
                <button
                  onClick={() => onReferenceImageChange(null)}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black/80 text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-16 rounded-lg border border-dashed border-[#3F3F46] hover:border-[#52525B] cursor-pointer transition-colors bg-[#27272A]/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className="w-4 h-4 text-[#71717A] mb-1" />
                <span className="text-[10px] text-[#71717A]">
                  {isUploading ? 'Загрузка...' : 'Загрузить'}
                </span>
              </label>
            )}
          </div>
        )}

        {/* Midjourney Settings */}
        {settings.model === 'midjourney' && (
          <div className="space-y-3 p-3 rounded-lg bg-[#27272A]/30 border border-[#3F3F46]/50">
            <div className="flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-[#A855F7]" />
              <span className="text-[11px] font-medium text-white">Midjourney</span>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#A1A1AA]">Stylize</label>
                  <span className="text-[10px] text-white">{settings.mjSettings?.stylization || 100}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={settings.mjSettings?.stylization || 100}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    mjSettings: { ...settings.mjSettings, stylization: parseInt(e.target.value) }
                  })}
                  className="w-full h-1 bg-[#3F3F46] rounded-lg appearance-none cursor-pointer accent-[#A855F7]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#A1A1AA]">Chaos</label>
                  <span className="text-[10px] text-white">{settings.mjSettings?.chaos || 0}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.mjSettings?.chaos || 0}
                  onChange={(e) => onSettingsChange({
                    ...settings,
                    mjSettings: { ...settings.mjSettings, chaos: parseInt(e.target.value) }
                  })}
                  className="w-full h-1 bg-[#3F3F46] rounded-lg appearance-none cursor-pointer accent-[#A855F7]"
                />
              </div>
            </div>
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
