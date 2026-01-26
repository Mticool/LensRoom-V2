'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Info, X, Check, Upload, Image as ImageIcon, Video as VideoIcon, User, Film } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { VIDEO_MODELS_CONFIG, getDefaultVideoSettings } from '@/config/video-models-config';

// Gradient backgrounds for each model
const MODEL_GRADIENTS: Record<string, string> = {
  'veo-3.1-fast': 'from-blue-600 to-purple-600',
  'kling-2.1': 'from-pink-600 to-orange-600',
  'kling-2.5': 'from-violet-600 to-fuchsia-600',
  'kling-2.6': 'from-cyan-600 to-blue-600',
  'grok-video': 'from-purple-600 to-violet-600',
  'sora-2': 'from-emerald-600 to-teal-600',
  'wan-2.6': 'from-indigo-600 to-cyan-600',
  'kling-motion-control': 'from-rose-600 to-pink-600',
};

type Tab = 'create' | 'motion';

interface VideoGeneratorHiruProps {
  onGenerate?: (params: any) => void;
}

// Dropdown component
interface DropdownProps {
  label: string;
  value: string | number;
  options: Array<{ value: string | number; label: string }>;
  onChange: (value: any) => void;
}

function Dropdown({ label, value, options, onChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

            return (
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full flex items-center justify-between p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200"
                >
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</div>
                    <div className="text-[13px] font-medium text-white">{selectedOption?.label || value}</div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="absolute top-auto bottom-full left-0 right-0 mb-2 bg-[#1A1A1C]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-[100] max-h-48 overflow-y-auto">
                    {options.map((option) => (
                      <button
                        key={String(option.value)}
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-white/5 transition-all duration-150 flex items-center justify-between first:rounded-t-xl last:rounded-b-xl ${
                          option.value === value ? 'text-[#D4FF00] bg-white/5' : 'text-white'
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.value === value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        
export function VideoGeneratorHiru({ onGenerate }: VideoGeneratorHiruProps) {
  // Main tabs
  const [activeTab, setActiveTab] = useState<Tab>('create');
  
  // Model selection
  const STANDARD_MODELS = VIDEO_MODELS.filter(m => m.id !== 'kling-motion-control' && m.featured);
  const MOTION_MODEL = VIDEO_MODELS.find(m => m.id === 'kling-motion-control');
  
  const [selectedModel, setSelectedModel] = useState(STANDARD_MODELS[0]?.id || 'veo-3.1-fast');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Content tabs for Create Video (Frames/Ingredients)
  const [contentTab, setContentTab] = useState<'frames' | 'ingredients'>('frames');
  
  // Files
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null); // Simple I2V input (Grok, Sora)
  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  
  // Audio generation toggle (Kling 2.6, Grok)
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Settings
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(8);
  const [sceneControlMode, setSceneControlMode] = useState<'video' | 'image'>('video');
  
  // Loading
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get current model info
  const currentModel = VIDEO_MODELS.find(m => m.id === selectedModel) as VideoModelConfig | undefined;
  const currentGradient = MODEL_GRADIENTS[selectedModel] || 'from-blue-600 to-purple-600';
  const modelConfig = VIDEO_MODELS_CONFIG[selectedModel];
  
  // Update settings when model changes
  useEffect(() => {
    if (modelConfig) {
      const defaults = getDefaultVideoSettings(selectedModel);
      if (defaults.duration_seconds) setDuration(defaults.duration_seconds);
      if (defaults.resolution) setQuality(defaults.resolution);
      if (defaults.aspect_ratio) setAspectRatio(defaults.aspect_ratio);
    }
  }, [selectedModel, modelConfig]);
  
  // Get available options for current model
  const getQualityOptions = () => {
    if (!currentModel) return [{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }];
    if (currentModel.resolutionOptions) {
      return currentModel.resolutionOptions.map(res => ({ value: res, label: res }));
    }
    return [{ value: '720p', label: '720p' }, { value: '1080p', label: '1080p' }];
  };

  const getAspectRatioOptions = () => {
    if (!currentModel) return [{ value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }];
    return currentModel.aspectRatios.map(ratio => ({ value: ratio, label: ratio }));
  };

  const getDurationOptions = () => {
    if (!currentModel) return [{ value: 8, label: '8s' }];
    return currentModel.durationOptions.map(dur => ({
      value: typeof dur === 'number' ? dur : parseInt(dur),
      label: typeof dur === 'number' ? `${dur}s` : dur
    }));
  };
  
  // Check what features current model supports
  const supportsStartEndFrames = currentModel?.supportsFirstLastFrame || false;
  const supportsReferenceImages = (currentModel?.maxReferenceImages || 0) > 0;
  const supportsI2v = currentModel?.supportsI2v || false;
  const hasResolutionOptions = (currentModel?.resolutionOptions?.length || 0) > 0;
  const supportsAudioGeneration = currentModel?.supportsAudioGeneration || false;
  
  // Simple I2V input (no tabs): Grok, Sora
  const useSimpleImageInput = ['grok-video', 'sora-2'].includes(selectedModel) && supportsI2v;
  
  // Calculate cost (real calculation from pricing)
  const calculateCost = () => {
    if (!currentModel) return 0;
    const pricing = currentModel.pricing as any;
    
    // Motion Control per-second pricing
    if (selectedModel === 'kling-motion-control') {
      const perSecondRate = pricing[quality]?.per_second || 16;
      return Math.round(perSecondRate * duration);
    }
    
    // Fixed pricing by duration
    let baseCost = 0;
    if (typeof pricing === 'number') {
      baseCost = pricing;
    } else if (pricing[duration]) {
      const durationPrice = pricing[duration];
      // Kling 2.6 has nested object: { no_audio: 105, audio: 135 }
      if (typeof durationPrice === 'object' && durationPrice !== null) {
        baseCost = audioEnabled ? (durationPrice.audio || durationPrice.no_audio || 0) : (durationPrice.no_audio || 0);
      } else {
        baseCost = durationPrice;
      }
    } else if (pricing[String(duration)]) {
      const durationPrice = pricing[String(duration)];
      if (typeof durationPrice === 'object' && durationPrice !== null) {
        baseCost = audioEnabled ? (durationPrice.audio || durationPrice.no_audio || 0) : (durationPrice.no_audio || 0);
      } else {
        baseCost = durationPrice;
      }
    } else {
      baseCost = 22; // default
    }
    
    // Grok: Audio adds +30 credits (Kling 2.6 already handled above)
    if (selectedModel === 'grok-video' && audioEnabled) {
      baseCost += 30;
    }
    
    return baseCost;
  };
  
  const cost = calculateCost();
  
  // Handle generate
  const handleGenerate = async () => {
    if (!prompt && activeTab !== 'motion') {
      toast.error('Пожалуйста, введите описание');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Call API
      if (onGenerate) {
        await onGenerate({
          prompt,
          model: selectedModel,
          duration,
          quality,
          aspectRatio,
          startFrame,
          endFrame,
          referenceImages,
          referenceImage, // Simple I2V (Grok, Sora)
          motionVideo,
          characterImage,
          sceneControlMode,
          audioEnabled,
        });
      }
      
      toast.success('Video generation started!');
    } catch (error) {
      toast.error('Failed to generate video');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="w-full max-w-[380px] bg-[#1A1A1C] rounded-2xl border border-zinc-800/50 overflow-hidden flex flex-col shadow-2xl">
      {/* Tabs Navigation - Compact Apple Style */}
      <div className="flex gap-1 p-2 bg-zinc-900/80 border-b border-white/5">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'create'
              ? 'bg-[#D4FF00] text-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Создать
        </button>
        <button
          onClick={() => setActiveTab('motion')}
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'motion'
              ? 'bg-[#D4FF00] text-black'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Движение
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* CREATE VIDEO TAB */}
        {activeTab === 'create' && (
          <>
            {/* Model Card - Compact */}
            <div 
              onClick={() => setShowModelSelector(true)}
              className="group relative h-20 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.01]"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentGradient}`} />
              
              {/* Content */}
              <div className="relative h-full px-3 py-2.5 flex items-center justify-between">
                {/* Model Info */}
                <div>
                  <div className="inline-block px-1.5 py-0.5 bg-[#D4FF00] rounded text-[#000] text-[9px] font-black uppercase tracking-wider mb-1">
                    {currentModel?.modelTag || 'GENERAL'}
                  </div>
                  <div className="text-white text-sm font-bold">{currentModel?.name}</div>
                </div>
                
                {/* Change Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModelSelector(true);
                  }}
                  className="px-2.5 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-white text-[10px] font-semibold hover:bg-white/25 transition-all"
                >
                  Изменить →
                </button>
              </div>
            </div>
            
            {/* Simple Image Input for I2V (Grok, Sora) */}
            {useSimpleImageInput && (
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                />
                {/* Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors">
                  {/* Icon */}
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-purple-400 transition-colors relative z-10" />
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1">Референсное изображение</p>
                  <p className="text-xs text-zinc-500">PNG, JPG • Для режима изображение→видео</p>
                  
                  {referenceImage && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#D4FF00] font-medium">
                      <Check className="w-3 h-3" />
                      <span>Загружено</span>
                    </div>
                  )}
                </div>
              </label>
            )}
            
            {/* Frames / Ingredients Toggle (only if model supports AND not using simple input) */}
            {!useSimpleImageInput && (supportsStartEndFrames || supportsReferenceImages) && (
              <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg">
                {supportsStartEndFrames && (
                  <button
                    onClick={() => setContentTab('frames')}
                    className={`flex-1 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200 ${
                      contentTab === 'frames'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Кадры
                  </button>
                )}
                {supportsReferenceImages && !useSimpleImageInput && (
                  <button
                    onClick={() => setContentTab('ingredients')}
                    className={`flex-1 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-200 ${
                      contentTab === 'ingredients'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Референсы
                  </button>
                )}
              </div>
            )}
            
            {/* Frames Content */}
            {!useSimpleImageInput && supportsStartEndFrames && contentTab === 'frames' && (
              <div className="grid grid-cols-2 gap-2">
                {/* Start Frame */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setStartFrame(e.target.files?.[0] || null)}
                  />
                  <div className="border border-dashed border-zinc-700 bg-zinc-900/50 rounded-lg p-3 flex flex-col items-center group-hover:border-zinc-500 transition-colors">
                    <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400 mb-1.5" />
                    <p className="text-[11px] text-white font-medium">Первый кадр</p>
                    <p className="text-[9px] text-zinc-500">Опционально</p>
                    {startFrame && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-[#D4FF00]">
                        <Check className="w-2.5 h-2.5" />
                        <span>✓</span>
                      </div>
                    )}
                  </div>
                </label>
                
                {/* End Frame */}
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setEndFrame(e.target.files?.[0] || null)}
                  />
                  <div className="border border-dashed border-zinc-700 bg-zinc-900/50 rounded-lg p-3 flex flex-col items-center group-hover:border-zinc-500 transition-colors">
                    <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-zinc-400 mb-1.5" />
                    <p className="text-[11px] text-white font-medium">Последний кадр</p>
                    <p className="text-[9px] text-zinc-500">Опционально</p>
                    {endFrame && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-[#D4FF00]">
                        <Check className="w-2.5 h-2.5" />
                        <span>✓</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
            
            {/* Ingredients Content */}
            {!useSimpleImageInput && supportsReferenceImages && contentTab === 'ingredients' && (
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setReferenceImages(Array.from(e.target.files || []))}
                />
                {/* Animated Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 via-zinc-800/30 to-zinc-900/50 backdrop-blur-sm rounded-xl p-8 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors">
                  {/* Icon with glow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 p-3 rounded-xl bg-zinc-800/50 group-hover:bg-zinc-800 transition-colors">
                      <Upload className="w-8 h-8 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1">Загрузите до {currentModel?.maxReferenceImages || 3} изображений</p>
                  <p className="text-xs text-zinc-500">PNG, JPG или вставить из буфера</p>
                  
                  {referenceImages.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-lg">
                      <Check className="w-4 h-4 text-[#D4FF00]" />
                      <span className="text-xs text-[#D4FF00] font-semibold">{referenceImages.length} загружено</span>
                    </div>
                  )}
                </div>
              </label>
            )}
            
            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-white/90">Описание</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите сцену, которую хотите создать, с деталями..."
                rows={4}
                className="w-full px-4 py-3 bg-black/20 backdrop-blur-xl border border-white/[0.08] rounded-xl text-white text-[13px] placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all resize-none"
              />
            </div>
            
            {/* Audio Generation Toggle (Kling 2.6, Grok Video) */}
            {supportsAudioGeneration && (
              <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white">Генерация звука</span>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-zinc-500 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 backdrop-blur-xl text-white text-xs rounded-lg shadow-xl z-50 border border-white/10">
                      Создать синхронизированный звук (+30 кредитов)
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                    audioEnabled ? 'bg-[#D4FF00]' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full transition-transform shadow-lg ${
                      audioEnabled ? 'translate-x-6 bg-black' : 'translate-x-0.5 bg-white'
                    }`}
                  />
                </button>
              </div>
            )}
            
            {/* Model Selector Dropdown - Active */}
            <button 
              onClick={() => setShowModelSelector(true)}
              className="w-full flex items-center justify-between p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200 cursor-pointer"
            >
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Модель</div>
                <div className="text-[13px] font-medium text-white">{currentModel?.name}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
            
            {/* Settings Row (Quality, Ratio, Duration) - Apple Style */}
            <div className="flex gap-2">
              {/* Quality - only if model has resolution options */}
              {hasResolutionOptions && (
                <Dropdown
                  label="Качество"
                  value={quality}
                  options={getQualityOptions()}
                  onChange={setQuality}
                />
              )}
              
              {/* Ratio */}
              <Dropdown
                label="Формат"
                value={aspectRatio}
                options={getAspectRatioOptions()}
                onChange={setAspectRatio}
              />
              
              {/* Duration */}
              <Dropdown
                label="Длина"
                value={duration}
                options={getDurationOptions()}
                onChange={setDuration}
              />
            </div>
          </>
        )}
        
        {/* MOTION CONTROL TAB */}
        {activeTab === 'motion' && (
          <>
            {/* Model Card */}
            <div className={`relative h-48 rounded-2xl bg-gradient-to-br ${MODEL_GRADIENTS['kling-motion-control']} overflow-hidden`}>
              <div className="absolute bottom-0 left-0 p-4">
                <div className="text-[#D4FF00] text-xs font-bold uppercase">MOTION CONTROL</div>
                <div className="text-white text-sm">Transfer motion from reference video to your character</div>
              </div>
              <button className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs flex items-center gap-2">
                📚 Motion Library
              </button>
            </div>
            
            {/* Dual Upload Areas */}
            <div className="grid grid-cols-2 gap-3">
              {/* Motion Video */}
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setMotionVideo(e.target.files?.[0] || null)}
                />
                {/* Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors min-h-[160px]">
                  {/* Icon with glow */}
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-rose-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Film className="w-9 h-9 text-zinc-600 group-hover:text-rose-400 transition-colors relative z-10" />
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1 text-center">Motion Video</p>
                  <p className="text-xs text-zinc-500 text-center">Duration: 3–30s</p>
                  
                  {motionVideo && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#D4FF00] font-medium">
                      <Check className="w-3 h-3" />
                      <span>Uploaded</span>
                    </div>
                  )}
                </div>
              </label>
              
              {/* Character */}
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setCharacterImage(e.target.files?.[0] || null)}
                />
                {/* Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors min-h-[160px]">
                  {/* Icon with glow */}
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <User className="w-9 h-9 text-zinc-600 group-hover:text-cyan-400 transition-colors relative z-10" />
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1 text-center">Your Character</p>
                  <p className="text-xs text-zinc-500 text-center">Image with face and body</p>
                  
                  {characterImage && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#D4FF00] font-medium">
                      <Check className="w-3 h-3" />
                      <span>Uploaded</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
            
            {/* Quality */}
            <button className="w-full flex items-center justify-between p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200">
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Quality</div>
                <div className="text-[13px] font-medium text-white">{quality}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            
            {/* Pricing Info */}
            <div className="p-3 bg-blue-500/10 backdrop-blur-xl border border-blue-400/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <span className="font-semibold">Price per second:</span> Price depends on your source video duration. 
                  {quality === '720p' && ' 16 credits/sec for 720p'}
                  {quality === '1080p' && ' 25 credits/sec for 1080p'}
                  {!quality && ' 16-25 credits/second'}
                </div>
              </div>
            </div>
            
            {/* Scene Control Mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-white font-medium">Scene Control Mode</span>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#D4FF00]">
                  <span className="inline-block h-5 w-5 transform rounded-full bg-black shadow-lg translate-x-6" />
                </button>
              </div>
              
              <div>
                <div className="flex gap-1 p-1 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                  <button
                    onClick={() => setSceneControlMode('video')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      sceneControlMode === 'video'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🎥</span>
                    <span className="text-[13px] font-medium">Video</span>
                  </button>
                  <button
                    onClick={() => setSceneControlMode('image')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      sceneControlMode === 'image'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🖼️</span>
                    <span className="text-[13px] font-medium">Image</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Choose background source: character image or motion video
                </p>
              </div>
            </div>
            
            {/* Advanced Settings */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200">
                <h3 className="text-[13px] font-medium text-white">Advanced Settings</h3>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>
            </details>
          </>
        )}
      </div>
      
      {/* Generate Button */}
      <div className="p-4 border-t border-[#262626]/50 bg-gradient-to-b from-transparent to-zinc-900/50">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-4 bg-gradient-to-r from-[#D4FF00] via-[#c4ef00] to-[#D4FF00] bg-size-200 bg-pos-0 hover:bg-pos-100 text-black font-bold text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg shadow-[#D4FF00]/20 hover:shadow-[#D4FF00]/40"
          style={{ backgroundSize: '200% 100%' }}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              <span className="animate-pulse">Generating...</span>
            </>
          ) : (
            <>
              {/* Sparkle animation */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
              
              <span className="relative z-10 font-extrabold">Создать</span>
              <span className="flex items-center gap-1.5 relative z-10 px-2 py-0.5 bg-black/10 rounded-lg">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="font-extrabold">{cost}</span>
              </span>
            </>
          )}
        </button>
      </div>
      
      {/* Model Selector Modal - Apple Style Minimalist */}
      {showModelSelector && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#1A1A1C]/98 backdrop-blur-3xl rounded-[24px] p-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/[0.08] shadow-2xl">
            {/* Header - Minimal */}
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-semibold text-white tracking-tight">Выберите модель</h2>
              <button 
                onClick={() => setShowModelSelector(false)} 
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Models Grid - Apple Clean Style */}
            <div className="grid grid-cols-2 gap-5">
              {STANDARD_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelSelector(false);
                  }}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                    selectedModel === model.id ? 'ring-2 ring-white/30 shadow-xl' : 'hover:shadow-lg'
                  }`}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${MODEL_GRADIENTS[model.id]} opacity-90 group-hover:opacity-100 transition-all duration-300`} />
                  
                  {/* Subtle Grain */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+')] opacity-30 mix-blend-overlay" />
                  
                  {/* Content */}
                  <div className="relative p-6 h-36 flex flex-col justify-between">
                    {/* Badge - Minimal */}
                    <div className="inline-flex items-center self-start">
                      <div className="px-2.5 py-1 bg-black/40 backdrop-blur-xl rounded-md border border-white/10">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">{model.modelTag || 'GENERAL'}</span>
                      </div>
                    </div>
                    
                    {/* Model Name & Info - Clean Typography */}
                    <div className="space-y-1">
                      <div className="text-white text-lg font-semibold tracking-tight">{model.name}</div>
                      <div className="text-white/60 text-xs font-medium">{model.shortLabel}</div>
                    </div>
                  </div>
                  
                  {/* Selection Check - Subtle */}
                  {selectedModel === model.id && (
                    <div className="absolute top-4 right-4 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
