'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Info, X, Check, Upload, Image as ImageIcon, Video as VideoIcon, User, Film } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { VIDEO_MODELS_CONFIG, getDefaultVideoSettings } from '@/config/video-models-config';
import { VIDEO_MODELS as CAPABILITY_MODELS, getModelCapability, getDefaultsForModel, getCapabilitySummary } from '@/lib/videoModels/capabilities';
import type { ModelCapability } from '@/lib/videoModels/schema';
import { computePrice } from '@/lib/pricing/compute-price';

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
  onRatioChange?: (newRatio: string) => void;
  isGeneratingProp?: boolean;
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
        
export function VideoGeneratorHiru({ onGenerate, onRatioChange, isGeneratingProp = false }: VideoGeneratorHiruProps) {
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
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null); // For ref2v mode
  const [v2vVideo, setV2vVideo] = useState<File | null>(null); // For v2v mode
  
  // Audio generation toggle (Kling 2.6, Grok)
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Settings
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(8);
  const [sceneControlMode, setSceneControlMode] = useState<'video' | 'image'>('video');
  const [mode, setMode] = useState<'t2v' | 'i2v' | 'v2v' | 'ref2v'>('t2v');
  const [style, setStyle] = useState<string>('');
  const [cameraMotion, setCameraMotion] = useState<string>('static');
  const [stylePreset, setStylePreset] = useState<string>('');
  const [motionStrength, setMotionStrength] = useState(50);
  
  // Use prop for loading state if provided, otherwise local state
  const isGenerating = isGeneratingProp;
  
  // Get current model info
  const currentModel = VIDEO_MODELS.find(m => m.id === selectedModel) as VideoModelConfig | undefined;
  const currentGradient = MODEL_GRADIENTS[selectedModel] || 'from-blue-600 to-purple-600';
  const modelConfig = VIDEO_MODELS_CONFIG[selectedModel];
  
  // NEW: Get capability-based config
  const capability = getModelCapability(selectedModel);
  
  // Update settings when model changes - reset invalid values
  useEffect(() => {
    if (capability) {
      const defaults = getDefaultsForModel(selectedModel);
      if (defaults) {
        // Always reset to defaults to avoid invalid states
        setDuration(defaults.durationSec);
        setQuality(defaults.quality || '720p');
        setAspectRatio(defaults.aspectRatio);
        setAudioEnabled(false);
        
        // Reset mode to first supported
        if (capability.supportedModes && capability.supportedModes.length > 0) {
          setMode(capability.supportedModes[0] as any);
        }
        
        // Reset advanced settings
        setStyle('');
        setCameraMotion('static');
        setStylePreset('');
        setMotionStrength(50);
        
        // Reset files
        setReferenceImage(null);
        setStartFrame(null);
        setEndFrame(null);
        setReferenceImages([]);
        setReferenceVideo(null);
        setV2vVideo(null);
      }
    } else if (modelConfig) {
      const defaults = getDefaultVideoSettings(selectedModel);
      if (defaults.duration_seconds) setDuration(defaults.duration_seconds);
      if (defaults.resolution) setQuality(defaults.resolution);
      if (defaults.aspect_ratio) setAspectRatio(defaults.aspect_ratio);
    }
  }, [selectedModel, modelConfig, capability]);
  
  // Get available options for current model (STRICT: capability-driven only)
  const getQualityOptions = () => {
    if (!capability?.supportedQualities?.length) return [];
    return capability.supportedQualities.map(q => ({ value: q, label: q.toUpperCase() }));
  };

  const getAspectRatioOptions = () => {
    if (!capability) return [];
    return capability.supportedAspectRatios.map(ar => ({ value: ar, label: ar }));
  };

  const handleAspectRatioChange = (newRatio: string) => {
    setAspectRatio(newRatio);
    onRatioChange?.(newRatio);
  };

  const getDurationOptions = () => {
    if (!capability) return [];
    return capability.supportedDurationsSec.map(dur => ({ value: dur, label: `${dur}s` }));
  };
  
  // Check what features current model supports (STRICT: capability-driven only)
  const supportsStartEndFrames = capability?.supportsStartEndFrames || false;
  const supportsReferenceImages = capability?.supportsReferenceImages || false;
  const supportsI2v = capability?.supportedModes.includes('i2v') || false;
  const hasResolutionOptions = (capability?.supportedQualities?.length || 0) > 0;
  const supportsAudioGeneration = capability?.supportsSound || false;
  
  // Simple I2V input (no tabs): Grok, Sora
  // Veo uses tabs but needs i2v logic for first frame
  const useSimpleImageInput = ['grok-video', 'sora-2'].includes(selectedModel) && supportsI2v;
  
  // Calculate cost using centralized pricing
  const calculateCost = () => {
    try {
      // Determine if quality is a tier (for Kling 2.1) or resolution
      const isTier = ['standard', 'pro', 'master'].includes(quality);
      const result = computePrice(selectedModel, {
        duration,
        resolution: isTier ? undefined : quality,
        audio: audioEnabled,
        qualityTier: isTier ? (quality as 'standard' | 'pro' | 'master') : undefined,
        variants: 1,
      });
      return result.stars;
    } catch (error) {
      console.error('Price calculation error:', error);
      return 0;
    }
  };
  
  const cost = calculateCost();
  
  // Handle generate
  const handleGenerate = async () => {
    if (!prompt && activeTab !== 'motion') {
      toast.error('Пожалуйста, введите описание');
      return;
    }
    
    try {
      // For Veo i2v mode: use first image from referenceImages as startFrame
      const effectiveStartFrame = mode === 'i2v' && selectedModel === 'veo-3.1-fast' && referenceImages.length > 0
        ? referenceImages[0]
        : startFrame;
      
      // For ref2v mode: use referenceImages array
      const effectiveReferenceImages = mode === 'ref2v' ? referenceImages : [];
      
      console.log('[VideoGeneratorHiru] Calling onGenerate with:', {
        mode,
        model: selectedModel,
        hasStartFrame: !!effectiveStartFrame,
        hasReferenceImages: effectiveReferenceImages.length,
        hasReferenceImage: !!referenceImage,
      });
      
      // Call API
      if (onGenerate) {
        await onGenerate({
          prompt,
          model: selectedModel,
          duration,
          quality,
          aspectRatio,
          startFrame: effectiveStartFrame,
          endFrame,
          referenceImages: effectiveReferenceImages,
          referenceImage, // Simple I2V (Grok, Sora)
          motionVideo,
          characterImage,
          sceneControlMode,
          audioEnabled,
          mode,
          style,
          cameraMotion,
          stylePreset,
          motionStrength,
          referenceVideo, // For ref2v
          v2vVideo, // For v2v
        });
      }
    } catch (error) {
      toast.error('Ошибка генерации');
      console.error(error);
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
            {useSimpleImageInput && mode === 'i2v' && (
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
            
            {/* Reference Video Input for Ref2V (Veo) */}
            {mode === 'ref2v' && capability?.supportedModes?.includes('ref2v') && (
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setReferenceVideo(e.target.files?.[0] || null)}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <VideoIcon className="w-8 h-8 text-zinc-600 group-hover:text-blue-400 transition-colors relative z-10" />
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1">Референсное видео</p>
                  <p className="text-xs text-zinc-500">MP4 • Для ref2v режима</p>
                  
                  {referenceVideo && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[#D4FF00] font-medium">
                      <Check className="w-3 h-3" />
                      <span>Загружено</span>
                    </div>
                  )}
                </div>
              </label>
            )}
            
            {/* V2V Video Input (WAN) */}
            {mode === 'v2v' && capability?.supportedModes?.includes('v2v') && (
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => setV2vVideo(e.target.files?.[0] || null)}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-green-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <VideoIcon className="w-8 h-8 text-zinc-600 group-hover:text-green-400 transition-colors relative z-10" />
                  </div>
                  
                  <p className="text-sm text-white font-semibold mb-1">Входное видео</p>
                  <p className="text-xs text-zinc-500">MP4 • Для video-to-video</p>
                  
                  {v2vVideo && (
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
            
            {/* Mode Selector (if model supports multiple modes) */}
            {capability?.supportedModes && capability.supportedModes.length > 1 && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Режим</div>
                <div className="flex gap-2">
                  {capability.supportedModes.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        mode === m
                          ? 'bg-[#D4FF00] text-black'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m === 't2v' ? 'Text→Video' : m === 'i2v' ? 'Image→Video' : m === 'v2v' ? 'Video→Video' : m === 'ref2v' ? 'Ref→Video' : m}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Style Selector (Grok, WAN styleOptions) */}
            {capability?.styleOptions && capability.styleOptions.length > 0 && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Стиль</div>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-white/5 text-white text-[13px] rounded-lg px-3 py-2 border border-white/10 focus:border-[#D4FF00] focus:outline-none"
                >
                  <option value="">По умолчанию</option>
                  {capability.styleOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* WAN Style Preset */}
            {selectedModel === 'wan-2.6' && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Пресет стиля</div>
                <select
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                  className="w-full bg-white/5 text-white text-[13px] rounded-lg px-3 py-2 border border-white/10 focus:border-[#D4FF00] focus:outline-none"
                >
                  <option value="">По умолчанию</option>
                  <option value="realistic">Реалистичный</option>
                  <option value="anime">Аниме</option>
                  <option value="cinematic">Кинематографичный</option>
                  <option value="artistic">Художественный</option>
                </select>
              </div>
            )}
            
            {/* Camera Motion (WAN) */}
            {capability?.cameraMotionOptions && capability.cameraMotionOptions.length > 0 && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Движение камеры</div>
                <select
                  value={cameraMotion}
                  onChange={(e) => setCameraMotion(e.target.value)}
                  className="w-full bg-white/5 text-white text-[13px] rounded-lg px-3 py-2 border border-white/10 focus:border-[#D4FF00] focus:outline-none"
                >
                  {capability.cameraMotionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'static' ? 'Статичная' :
                       c === 'pan_left' ? 'Панорама влево' :
                       c === 'pan_right' ? 'Панорама вправо' :
                       c === 'tilt_up' ? 'Наклон вверх' :
                       c === 'tilt_down' ? 'Наклон вниз' :
                       c === 'zoom_in' ? 'Приближение' :
                       c === 'zoom_out' ? 'Отдаление' :
                       c === 'orbit' ? 'Орбита' :
                       c === 'follow' ? 'Следование' : c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Motion Strength Slider (WAN) */}
            {selectedModel === 'wan-2.6' && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Сила движения</div>
                  <div className="text-[13px] text-white font-medium">{motionStrength}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={motionStrength}
                  onChange={(e) => setMotionStrength(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#D4FF00]"
                />
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
                onChange={handleAspectRatioChange}
              />
              
              {/* Duration - locked if only one option, dropdown otherwise */}
              {capability?.fixedDuration || getDurationOptions().length === 1 ? (
                <div className="flex-1 p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Длина</div>
                  <div className="text-[13px] font-medium text-white">{duration}s (фиксировано)</div>
                </div>
              ) : (
                <Dropdown
                  label="Длина"
                  value={duration}
                  options={getDurationOptions()}
                  onChange={setDuration}
                />
              )}
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
      
      {/* Model Selector Modal - Dark Unified List */}
      {showModelSelector && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-zinc-800/50 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/50">
              <h2 className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Выберите модель
              </h2>
              <button 
                onClick={() => setShowModelSelector(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Search (optional - can add state later) */}
            <div className="px-6 py-4 border-b border-zinc-800/50">
              <input 
                type="text"
                placeholder="Поиск модели..."
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
              />
            </div>
            
            {/* Models List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-2">
                {STANDARD_MODELS.map((model) => {
                  const cap = getModelCapability(model.id);
                  const isSelected = selectedModel === model.id;
                  
                  // Build meta info
                  const durationText = cap?.supportedDurationsSec?.length 
                    ? cap.supportedDurationsSec.length === 1 
                      ? `${cap.supportedDurationsSec[0]}с` 
                      : `${Math.min(...cap.supportedDurationsSec)}-${Math.max(...cap.supportedDurationsSec)}с`
                    : model.fixedDuration ? `${model.fixedDuration}с` : null;
                  
                  const modesText = cap?.supportedModes?.length
                    ? cap.supportedModes.join(' • ').toUpperCase()
                    : null;
                  
                  const qualityText = cap?.supportedQualities?.length
                    ? cap.supportedQualities.join(', ')
                    : null;
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelSelector(false);
                      }}
                      className={`w-full text-left px-4 py-4 rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-zinc-800/80 ring-1 ring-zinc-700' 
                          : 'bg-zinc-900/50 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Name + Badges + Meta */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Name + Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-base tracking-tight" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                              {model.name}
                            </span>
                            {model.modelTag && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wide rounded">
                                {model.modelTag}
                              </span>
                            )}
                            {model.speed === 'fast' && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide rounded">
                                FAST
                              </span>
                            )}
                            {model.quality === 'ultra' && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wide rounded">
                                ULTRA
                              </span>
                            )}
                          </div>
                          
                          {/* Meta: Duration, Modes, Quality, Audio */}
                          <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                            {durationText && (
                              <span className="flex items-center gap-1">
                                <VideoIcon className="w-3 h-3" />
                                {durationText}
                              </span>
                            )}
                            {modesText && (
                              <span className="text-zinc-400">{modesText}</span>
                            )}
                            {qualityText && (
                              <span className="text-zinc-400">{qualityText}</span>
                            )}
                            {model.supportsAudio && (
                              <span className="text-zinc-400">+ Аудио</span>
                            )}
                          </div>
                          
                          {/* Subtitle */}
                          {model.shortLabel && (
                            <div className="text-xs text-zinc-600 line-clamp-1">
                              {model.shortLabel}
                            </div>
                          )}
                        </div>
                        
                        {/* Right: Checkmark */}
                        {isSelected && (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <Check className="w-3 h-3 text-black" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
