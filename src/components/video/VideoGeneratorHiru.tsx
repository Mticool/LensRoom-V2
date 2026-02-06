'use client';

import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, ChevronDown, Info, X, Check, Upload, Image as ImageIcon, Video as VideoIcon, User, Film } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { VIDEO_MODELS_CONFIG, getDefaultVideoSettings } from '@/config/video-models-config';
import { VIDEO_MODELS as CAPABILITY_MODELS, getModelCapability, getDefaultsForModel, getCapabilitySummary } from '@/lib/videoModels/capabilities';
import type { ModelCapability } from '@/lib/videoModels/schema';
import { computePrice } from '@/lib/pricing/pricing';
import { calcMotionControlStars } from '@/lib/pricing/pricing';

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
  /** Model id from URL — opens with this model selected */
  initialModel?: string;
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

const Dropdown = memo(({ label, value, options, onChange }: DropdownProps) => {
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

  const selectedOption = useMemo(
    () => options.find(opt => opt.value === value),
    [options, value]
  );

  const toggleOpen = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
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
});

const VideoGeneratorHiruComponent = ({ initialModel, onGenerate, onRatioChange, isGeneratingProp = false }: VideoGeneratorHiruProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Model selection
  const STANDARD_MODELS = useMemo(
    () => VIDEO_MODELS.filter(m => m.id !== 'kling-motion-control' && m.featured),
    []
  );
  const MOTION_MODEL = useMemo(
    () => VIDEO_MODELS.find(m => m.id === 'kling-motion-control'),
    []
  );

  const defaultModel = STANDARD_MODELS[0]?.id || 'veo-3.1-fast';
  const validInitialModel = initialModel && VIDEO_MODELS.some(m => m.id === initialModel) ? initialModel : null;
  const initialSelectedModel = validInitialModel ?? defaultModel;
  const initialDefaults = getDefaultsForModel(initialSelectedModel);
  const initialConfigDefaults = getDefaultVideoSettings(initialSelectedModel);
  const initialKlingDuration =
    initialSelectedModel === 'kling-2.6' ||
    initialSelectedModel === 'kling-2.5' ||
    initialSelectedModel === 'kling-2.1'
      ? 5
      : undefined;
  const [selectedModel, setSelectedModel] = useState(initialSelectedModel);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const isMotionModel = selectedModel === 'kling-motion-control';

  // Motion Control from URL: open on "Движение" tab
  const initialTab: Tab = validInitialModel === 'kling-motion-control' ? 'motion' : 'create';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Sync selected model and tab when URL initialModel changes (e.g. user navigates via header)
  useEffect(() => {
    const valid = initialModel && VIDEO_MODELS.some(m => m.id === initialModel);
    if (valid) {
      setSelectedModel(initialModel);
      if (initialModel === 'kling-motion-control') setActiveTab('motion');
      else setActiveTab('create');
    }
  }, [initialModel]);

  const switchToModel = useCallback((modelId: string, nextTab: Tab) => {
    setSelectedModel(modelId);
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('section', 'video');
    params.set('model', modelId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleMotionTabClick = useCallback(() => {
    if (isMotionModel) {
      setActiveTab('motion');
      return;
    }
    if (MOTION_MODEL) {
      switchToModel(MOTION_MODEL.id, 'motion');
    } else {
      toast.error('Модель Motion Control временно недоступна');
    }
  }, [isMotionModel, MOTION_MODEL, switchToModel]);

  // Files
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null); // Simple I2V input (Grok, Sora)
  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [v2vVideo, setV2vVideo] = useState<File | null>(null); // For v2v mode
  
  // Audio generation toggle (Kling 2.6, Grok)
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Settings
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [quality, setQuality] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(
    initialDefaults?.durationSec ?? initialConfigDefaults?.duration_seconds ?? initialKlingDuration ?? 5
  );
  const [sceneControlMode, setSceneControlMode] = useState<'video' | 'image'>('image');
  const [mode, setMode] = useState<'t2v' | 'i2v' | 'v2v' | 'start_end' | 'extend'>('t2v');
  const [style, setStyle] = useState<string>('');
  const [cfgScale, setCfgScale] = useState<number>(7.5);
  const [cameraControlJson, setCameraControlJson] = useState<string>('{}');
  
  // Extend mode state
  const [sourceGenerationId, setSourceGenerationId] = useState<string | null>(null);
  const [extendableGenerations, setExtendableGenerations] = useState<any[]>([]);
  const [cameraMotion, setCameraMotion] = useState<string>('static');
  const [stylePreset, setStylePreset] = useState<string>('');
  const [motionStrength, setMotionStrength] = useState(50);
  
  // Motion Control tab: quality (720p/1080p) and video duration (from uploaded file)
  const [motionQuality, setMotionQuality] = useState<'720p' | '1080p'>('720p');
  const [motionVideoDurationSec, setMotionVideoDurationSec] = useState<number | null>(null);
  
  // Use prop for loading state if provided, otherwise local state
  const isGenerating = isGeneratingProp;

  // Get current model info
  const currentModel = useMemo(
    () => VIDEO_MODELS.find(m => m.id === selectedModel) as VideoModelConfig | undefined,
    [selectedModel]
  );
  const isKling26 = selectedModel === 'kling-2.6';
  const isKling25 = selectedModel === 'kling-2.5';
  const isKling21 = selectedModel === 'kling-2.1';
  const isKlingModel = isKling21 || isKling25 || isKling26;
  const currentGradient = useMemo(
    () => MODEL_GRADIENTS[selectedModel] || 'from-blue-600 to-purple-600',
    [selectedModel]
  );
  const modelConfig = useMemo(
    () => VIDEO_MODELS_CONFIG[selectedModel],
    [selectedModel]
  );


  // NEW: Get capability-based config
  const capability = useMemo(
    () => getModelCapability(selectedModel),
    [selectedModel]
  );
  const hasQualityOptions = (capability?.supportedQualities?.length || 0) > 0;
  
  useEffect(() => {
    if (activeTab === 'motion') {
      setAspectRatio('source');
      return;
    }
    if (aspectRatio === 'source' && capability?.supportedAspectRatios?.length) {
      setAspectRatio(capability.supportedAspectRatios[0]);
    }
  }, [activeTab, aspectRatio, capability?.supportedAspectRatios]);
  
  // Update settings when model changes - reset invalid values
  useEffect(() => {
    if (capability) {
      const defaults = getDefaultsForModel(selectedModel);
      if (defaults) {
        // Always reset to defaults to avoid invalid states
        setDuration(defaults.durationSec);
        setQuality(defaults.quality || '720p');
        setAspectRatio(defaults.aspectRatio);
        setAudioEnabled(capability.audioSupport === 'always');
        
        // Reset mode to first supported (exclude motion_control in create tab)
        const modelModes = (capability.supportedModes || []).filter(m => m !== 'motion_control');
        if (modelModes.length > 0) {
          setMode(modelModes[0] as any);
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
        setV2vVideo(null);
        setNegativePrompt('');
        setCfgScale(7.5);
      }
    } else if (modelConfig) {
      const defaults = getDefaultVideoSettings(selectedModel);
      if (defaults.duration_seconds) setDuration(defaults.duration_seconds);
      if (defaults.resolution) setQuality(defaults.resolution);
      if (defaults.aspect_ratio) setAspectRatio(defaults.aspect_ratio);
    }
  }, [selectedModel, modelConfig, capability]);

  // Kling 2.x defaults: hide quality selector, but keep internal defaults for pricing
  useEffect(() => {
    if (isKling26 || isKling25) {
      setQuality('720p');
    }
    if (isKling21) {
      setQuality((quality === 'standard' || quality === 'pro' || quality === 'master') ? quality : 'standard');
    }
  }, [isKling21, isKling25, isKling26, quality]);

  // If user switches away from Motion Control, force create tab
  useEffect(() => {
    if (!isMotionModel && activeTab === 'motion') {
      setActiveTab('create');
    }
  }, [isMotionModel, activeTab]);

  // Read duration from motion video when file is selected
  useEffect(() => {
    if (!motionVideo) {
      setMotionVideoDurationSec(null);
      return;
    }
    const url = URL.createObjectURL(motionVideo);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const sec = Math.ceil(video.duration);
      setMotionVideoDurationSec(sec);
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      setMotionVideoDurationSec(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
    return () => URL.revokeObjectURL(url);
  }, [motionVideo]);

  // Check what features current model supports (STRICT: capability-driven only)
  const supportedModes = useMemo(
    () => (capability?.supportedModes || []).filter(m => m !== 'motion_control'),
    [capability]
  );
  const supportsStartEndFrames = useMemo(
    () => capability?.supportsStartEndFrames || false,
    [capability]
  );
  const supportsReferenceImages = useMemo(
    () => capability?.supportsReferenceImages || false,
    [capability]
  );
  const supportsI2v = useMemo(
    () => supportedModes.includes('i2v'),
    [supportedModes]
  );
  const hasResolutionOptions = useMemo(
    () => (capability?.supportedQualities?.length || 0) > 0,
    [capability]
  );
  const supportsAudioGeneration = useMemo(
    () => capability?.audioSupport === 'toggle',
    [capability]
  );
  const audioAlwaysOn = useMemo(
    () => capability?.audioSupport === 'always',
    [capability]
  );

  // Simple I2V input (no tabs): Grok, Sora
  const useSimpleImageInput = useMemo(
    () => ['grok-video', 'sora-2'].includes(selectedModel) && supportsI2v,
    [selectedModel, supportsI2v]
  );

  const isT2vMode = useMemo(() => mode === 't2v', [mode]);
  const isI2vMode = useMemo(() => mode === 'i2v', [mode]);
  const isStartEndMode = useMemo(() => mode === 'start_end', [mode]);
  const isV2vMode = useMemo(() => mode === 'v2v', [mode]);
  const isExtendMode = useMemo(() => mode === 'extend', [mode]);

  const showStartEndInputs = useMemo(
    () => isStartEndMode && supportsStartEndFrames,
    [isStartEndMode, supportsStartEndFrames]
  );
  const showV2vInput = useMemo(
    () => isV2vMode && supportedModes.includes('v2v'),
    [isV2vMode, supportedModes]
  );
  const showI2vInput = useMemo(
    () => isI2vMode && supportsI2v,
    [isI2vMode, supportsI2v]
  );

  useEffect(() => {
    if (isI2vMode && isKlingModel) {
      setAspectRatio('source');
      return;
    }
    if (aspectRatio === 'source' && capability?.supportedAspectRatios?.length) {
      setAspectRatio(capability.supportedAspectRatios[0]);
    }
  }, [isI2vMode, isKlingModel, capability?.supportedAspectRatios, aspectRatio]);

  // Reset incompatible inputs when mode changes
  useEffect(() => {
    if (isT2vMode) {
      setReferenceImage(null);
      setStartFrame(null);
      setEndFrame(null);
      setV2vVideo(null);
    }

    if (isI2vMode) {
      if (!isKling25) {
        setStartFrame(null);
        setEndFrame(null);
      }
      setV2vVideo(null);
    }

    if (isStartEndMode) {
      setReferenceImage(null);
      setV2vVideo(null);
    }

    if (isV2vMode) {
      setReferenceImage(null);
      setStartFrame(null);
    }

    if (isExtendMode) {
      setReferenceImage(null);
      setStartFrame(null);
      setEndFrame(null);
      setV2vVideo(null);
    }
  }, [isT2vMode, isI2vMode, isStartEndMode, isV2vMode, isExtendMode, isKling25]);

  // Load extendable generations when extend mode is active
  useEffect(() => {
    if (isExtendMode && selectedModel === 'veo-3.1-fast') {
      loadExtendableGenerations();
    }
  }, [isExtendMode, selectedModel]);

  const loadExtendableGenerations = useCallback(async () => {
    try {
      const response = await fetch('/api/generations?type=video&model=veo-3.1-fast&limit=50', {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('[VideoGeneratorHiru] Failed to load generations');
        return;
      }

      const data = await response.json();
      const generations = Array.isArray(data?.generations) ? data.generations : [];

      // Фильтруем только генерации с task_id (сгенерированные через API)
      const extendable = generations.filter((g: any) =>
        g.task_id &&
        ['success', 'completed'].includes(String(g.status || '').toLowerCase())
      );

      setExtendableGenerations(extendable);
    } catch (error) {
      console.error('[VideoGeneratorHiru] Failed to load extendable generations:', error);
    }
  }, []);
  
  // Get available options for current model (STRICT: capability-driven only)
  const getQualityOptions = useCallback(() => {
    if (!capability?.supportedQualities?.length) return [];
    return capability.supportedQualities.map(q => ({
      value: q,
      label: q === 'standard' ? 'Standard' : q === 'pro' ? 'Pro' : q === 'master' ? 'Master' : q.toUpperCase()
    }));
  }, [capability]);

  const getAspectRatioOptions = useCallback(() => {
    const ratios = capability?.modeAspectRatios?.[mode] || capability?.supportedAspectRatios || [];
    if (!ratios.length) return [];
    return ratios
      .filter(ar => ar !== 'source')
      .map(ar => ({ value: ar, label: ar }));
  }, [capability, mode]);

  const handleAspectRatioChange = useCallback((newRatio: string) => {
    setAspectRatio(newRatio);
    onRatioChange?.(newRatio);
  }, [onRatioChange]);

  const getDurationOptions = useCallback(() => {
    const durations = capability?.modeDurationsSec?.[mode] || capability?.supportedDurationsSec || [];
    if (!durations.length) return [];
    return durations.map(dur => ({ value: dur, label: `${dur}s` }));
  }, [capability, mode]);

  const aspectRatioOptions = useMemo(() => {
    if (isI2vMode && isKlingModel) {
      return [{ value: 'source', label: 'Source' }];
    }
    return getAspectRatioOptions();
  }, [getAspectRatioOptions, isI2vMode, isKlingModel]);
  const durationOptions = useMemo(() => getDurationOptions(), [getDurationOptions]);
  const normalizedDuration = useMemo(() => {
    const durations = capability?.modeDurationsSec?.[mode] || capability?.supportedDurationsSec || [];
    if (!durations.length) return duration;
    return durations.includes(duration)
      ? duration
      : durations[0];
  }, [capability?.modeDurationsSec, capability?.supportedDurationsSec, duration, mode]);
  const motionMaxDuration = sceneControlMode === 'image' ? 10 : 30;
  const effectiveMotionDuration = motionVideoDurationSec != null
    ? Math.min(motionVideoDurationSec, motionMaxDuration)
    : null;

  // Ensure duration always matches supported options for the current model
  useEffect(() => {
    const durations = capability?.modeDurationsSec?.[mode] || capability?.supportedDurationsSec || [];
    if (!durations.length) return;
    if (!durations.includes(duration)) {
      setDuration(durations[0]);
    }
  }, [capability?.modeDurationsSec, capability?.supportedDurationsSec, duration, mode]);
  
  // Calculate cost using centralized pricing
  const calculateCost = useCallback(() => {
    try {
      // Motion Control tab: per-second pricing
      if (activeTab === 'motion') {
        const durationSec = motionVideoDurationSec ?? 10;
        const stars = calcMotionControlStars(durationSec, motionQuality as '720p' | '1080p', true);
        return stars ?? 0;
      }

      // Determine if quality is a tier (for Kling 2.1) or resolution
      const isTier = ['standard', 'pro', 'master'].includes(quality);

      // Map UI mode to API mode for pricing
      // Note: All veo modes (t2v, i2v, ref2v) use same base price, so map to t2v
      let pricingMode: 't2v' | 'i2v' | 'start_end' | 'storyboard' | undefined;
      if (mode === 't2v') pricingMode = 't2v';
      else if (mode === 'i2v') pricingMode = 't2v'; // Same price as t2v
      else if (mode === 'start_end') pricingMode = 't2v'; // Same price as t2v
      // For extend mode, use t2v as base (extend pricing handled in route via SKU)
      else if (mode === 'extend') pricingMode = 't2v';

      const result = computePrice(selectedModel, {
        duration: normalizedDuration,
        resolution: isTier ? undefined : quality,
        audio: audioEnabled,
        qualityTier: isTier ? (quality as 'standard' | 'pro' | 'master') : undefined,
        variants: 1,
        mode: pricingMode,
      });
      return result.stars;
    } catch (error) {
      console.error('Price calculation error:', error);
      return 0;
    }
  }, [activeTab, motionVideoDurationSec, motionQuality, selectedModel, quality, normalizedDuration, audioEnabled, mode]);

  const cost = useMemo(() => calculateCost(), [calculateCost]);
  
  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!prompt && activeTab !== 'motion') {
      toast.error('Пожалуйста, введите описание');
      return;
    }
    if (isI2vMode && isKling25 && !startFrame) {
      toast.error('Загрузите первый кадр (обязателен для Kling 2.5 I2V)');
      return;
    }

    // Motion Control tab: require motion video, character image, and duration
    if (activeTab === 'motion') {
      if (!motionVideo) {
        toast.error('Загрузите видео с движением (Motion Video)');
        return;
      }
      if (!characterImage) {
        toast.error('Загрузите изображение персонажа');
        return;
      }
      if (motionVideoDurationSec == null || motionVideoDurationSec < 3) {
        toast.error('Определяется длительность видео. Подождите или загрузите видео от 3 до 30 сек.');
        return;
      }
      if (!effectiveMotionDuration) {
        toast.error('Не удалось определить длительность видео');
        return;
      }
      if (!cameraControlJson.trim()) {
        toast.error('Укажите camera_control (JSON)');
        return;
      }
      try {
        JSON.parse(cameraControlJson);
      } catch {
        toast.error('camera_control должен быть валидным JSON');
        return;
      }
    }

    // Extend mode validation
    if (mode === 'extend' && !sourceGenerationId) {
      toast.error('Выберите исходное видео для продления');
      return;
    }

    try {
      // Motion tab: always use Kling Motion Control model and mode
      if (activeTab === 'motion') {
        if (onGenerate) {
          await onGenerate({
            prompt: prompt || 'Motion transfer',
            model: 'kling-motion-control',
            duration: effectiveMotionDuration || 10,
            quality: motionQuality,
            aspectRatio,
            startFrame: null,
            endFrame: null,
            referenceImage: null,
            referenceImages: null,
            motionVideo,
            characterImage,
            sceneControlMode,
            characterOrientation: sceneControlMode,
            videoDuration: effectiveMotionDuration ?? undefined,
            audioEnabled: false,
            mode: 'motion_control',
            style: '',
            cameraMotion: 'static',
            stylePreset: '',
            motionStrength: 50,
            v2vVideo: null,
            sourceGenerationId: null,
            negativePrompt,
            cfgScale,
            cameraControl: cameraControlJson,
          });
        }
        return;
      }

      const effectiveMode = supportedModes.includes(mode) ? mode : (supportedModes[0] || 't2v');

      // i2v: use single reference image
      const effectiveReferenceImage = effectiveMode === 'i2v' && supportsI2v
        ? referenceImage
        : null;

      // Veo 3.1 Fast: convert single referenceImage to referenceImages array
      const isVeo31 = selectedModel === 'veo-3.1-fast';
      const effectiveReferenceImages = isVeo31 && effectiveMode === 'i2v' && referenceImage
        ? [referenceImage]
        : null;

      // start_end: first/last frame control
      const effectiveStartFrame = effectiveMode === 'start_end' && supportsStartEndFrames ? startFrame : null;
      const effectiveEndFrame = effectiveMode === 'start_end' && supportsStartEndFrames ? endFrame : null;
      const effectiveV2vVideo = effectiveMode === 'v2v' && supportedModes.includes('v2v') ? v2vVideo : null;

      console.log('[VideoGeneratorHiru] Calling onGenerate with:', {
        mode,
        model: selectedModel,
        hasStartFrame: !!effectiveStartFrame,
        hasEndFrame: !!effectiveEndFrame,
        hasReferenceImages: effectiveReferenceImages?.length || 0,
        hasReferenceImage: !!effectiveReferenceImage,
        hasReferenceVideo: false,
        hasV2vVideo: !!effectiveV2vVideo,
        isVeo31,
      });

      // Call API
      if (onGenerate) {
        await onGenerate({
          prompt,
          model: selectedModel,
          duration: normalizedDuration,
          quality: (!isKling21 && hasQualityOptions) ? quality : undefined,
          aspectRatio,
          startFrame: effectiveStartFrame,
          endFrame: effectiveEndFrame,
          referenceImage: isVeo31 ? null : effectiveReferenceImage, // I2V single image (not for Veo)
          referenceImages: effectiveReferenceImages, // Veo 3.1 uses array
          motionVideo,
          characterImage,
          sceneControlMode,
            audioEnabled: audioAlwaysOn ? true : audioEnabled,
            mode: effectiveMode,
            style,
            cameraMotion,
            stylePreset,
            motionStrength,
          v2vVideo: effectiveV2vVideo, // For v2v
          sourceGenerationId: effectiveMode === 'extend' ? sourceGenerationId : null, // For extend
          negativePrompt,
          cfgScale,
          qualityTier: isKling21 ? (quality as 'standard' | 'pro' | 'master') : undefined,
        });
      }
    } catch (error) {
      toast.error('Ошибка генерации');
      console.error(error);
    }
  }, [
    prompt,
    activeTab,
    mode,
    sourceGenerationId,
    supportedModes,
    supportsI2v,
    supportsStartEndFrames,
    selectedModel,
    referenceImage,
    startFrame,
    endFrame,
    v2vVideo,
    onGenerate,
    normalizedDuration,
    hasQualityOptions,
    quality,
    aspectRatio,
    motionVideo,
    characterImage,
    sceneControlMode,
    audioEnabled,
    style,
    cameraMotion,
    stylePreset,
    motionStrength,
    motionVideoDurationSec,
    motionQuality,
  ]);

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
          onClick={handleMotionTabClick}
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
            
            {/* Mode Selector (if model supports multiple modes) */}
            {supportedModes.length > 1 && (
              <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Режим</div>
                <div className="flex gap-2 flex-wrap">
                  {supportedModes.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={`px-4 py-2 min-w-[90px] rounded-lg text-[13px] font-medium transition-all ${
                        mode === m
                          ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/20'
                          : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m === 't2v'
                        ? 'Описание'
                        : m === 'i2v'
                          ? 'Изображение'
                          : m === 'v2v'
                            ? 'Видео'
                            : m === 'start_end'
                              ? 'Кадры'
                              : m === 'extend'
                                ? 'Продлить'
                                : m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extend Mode - Select Source Generation */}
            {isExtendMode && (
              <div className="p-4 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-3">Исходное видео для продления</div>
                
                {extendableGenerations.length === 0 ? (
                  <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800/50 text-center">
                    <p className="text-sm text-zinc-400 mb-2">Нет доступных видео для продления</p>
                    <p className="text-xs text-zinc-500">
                      Сначала сгенерируйте видео с помощью Veo 3.1 Fast
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {extendableGenerations.map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => setSourceGenerationId(gen.id)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          sourceGenerationId === gen.id
                            ? 'bg-[#D4FF00]/10 border-2 border-[#D4FF00]'
                            : 'bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-400">
                            {new Date(gen.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {sourceGenerationId === gen.id && (
                            <Check className="w-4 h-4 text-[#D4FF00]" />
                          )}
                        </div>
                        <p className="text-sm text-white line-clamp-2">
                          {gen.prompt || 'Без описания'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Simple Image Input for I2V (Grok, Sora) */}
            {useSimpleImageInput && showI2vInput && !isKling25 && (
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

            {/* I2V Image Input for other models */}
            {!useSimpleImageInput && showI2vInput && !isKling25 && (
              <label className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setReferenceImage(e.target.files?.[0] || null)}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative border-2 border-dashed border-zinc-700/50 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center justify-center group-hover:border-zinc-600 transition-colors">
                  <div className="relative mb-3">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-cyan-400 transition-colors relative z-10" />
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
            
            {/* Kling 2.5 Pro: Start/End frames in i2v */}
            {showI2vInput && isKling25 && (
              <div className="grid grid-cols-2 gap-2">
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
                    <p className="text-[9px] text-zinc-500">Обязателен</p>
                    {startFrame && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-[#D4FF00]">
                        <Check className="w-2.5 h-2.5" />
                        <span>✓</span>
                      </div>
                    )}
                  </div>
                </label>
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
            
            {/* V2V Video Input (WAN) */}
            {showV2vInput && (
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
            
            {/* Frames Content */}
            {!useSimpleImageInput && showStartEndInputs && (
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
            
            {/* Audio Generation Toggle (Only if model supports toggle) */}
            {supportsAudioGeneration && (
              <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white">Генерация звука</span>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-zinc-500 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 backdrop-blur-xl text-white text-xs rounded-lg shadow-xl z-50 border border-white/10">
                      Создать синхронизированный звук (цена по модели)
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
            
            {/* WAN-specific advanced motion/style controls are hidden unless API mapping exists */}
            
            {/* Settings Row (Quality, Ratio, Duration) - Apple Style */}
            <div className="flex gap-2">
              {/* Quality - only if model has resolution options */}
              {hasResolutionOptions && !isKling26 && !isKling25 && (
                <Dropdown
                  label="Качество"
                  value={quality}
                  options={getQualityOptions()}
                  onChange={setQuality}
                />
              )}
              
              {/* Ratio */}
              {aspectRatioOptions.length > 0 && !(aspectRatioOptions.length === 1 && aspectRatioOptions[0]?.value === 'source') && (
                <Dropdown
                  label="Формат"
                  value={aspectRatio}
                  options={aspectRatioOptions}
                  onChange={handleAspectRatioChange}
                />
              )}
              {aspectRatioOptions.length === 1 && aspectRatioOptions[0]?.value === 'source' && (
                <div className="flex-1 p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Формат</div>
                  <div className="text-[13px] font-medium text-white">Источник</div>
                </div>
              )}
              
              {/* Duration - locked if only one option, dropdown otherwise */}
              {capability?.fixedDuration || durationOptions.length === 1 ? (
                <div className="flex-1 p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Длина</div>
                  <div className="text-[13px] font-medium text-white">{normalizedDuration}s (фиксировано)</div>
                </div>
              ) : durationOptions.length > 0 ? (
                <Dropdown
                  label="Длина"
                  value={normalizedDuration}
                  options={durationOptions}
                  onChange={setDuration}
                />
              ) : null}
            </div>

            {/* Advanced Settings */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200">
                <h3 className="text-[13px] font-medium text-white">Advanced Settings</h3>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-[12px] text-zinc-400">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Что избегать в видео..."
                    rows={3}
                    className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] rounded-lg text-white text-[12px] placeholder:text-zinc-500 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] text-zinc-400">CFG Scale</label>
                    <span className="text-[12px] text-white">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#D4FF00]"
                  />
                </div>
              </div>
            </details>
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
            <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Качество</div>
              <select
                value={motionQuality}
                onChange={(e) => setMotionQuality(e.target.value as '720p' | '1080p')}
                className="w-full bg-white/5 text-white text-[13px] rounded-lg px-3 py-2 border border-white/10 focus:border-[#D4FF00] focus:outline-none"
              >
                <option value="720p">720p — 6⭐/сек</option>
                <option value="1080p">1080p — 8⭐/сек</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Ориентация персонажа</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSceneControlMode('image')}
                  className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    sceneControlMode === 'image'
                      ? 'bg-[#D4FF00] text-black'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Image-driven
                </button>
                <button
                  type="button"
                  onClick={() => setSceneControlMode('video')}
                  className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    sceneControlMode === 'video'
                      ? 'bg-[#D4FF00] text-black'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Video-driven
                </button>
              </div>
              <div className="text-[11px] text-zinc-500 mt-2">
                Лимит длительности: {sceneControlMode === 'image' ? '10с' : '30с'}
              </div>
            </div>

            {/* Duration (clamped) */}
            <div className="p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08]">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Длительность</div>
              <div className="text-[13px] text-white font-medium">
                {effectiveMotionDuration != null ? `${Math.round(effectiveMotionDuration)}с` : '—'}
              </div>
              {motionVideoDurationSec != null && effectiveMotionDuration != null && motionVideoDurationSec > motionMaxDuration && (
                <div className="text-[11px] text-amber-400 mt-1">
                  Видео {Math.round(motionVideoDurationSec)}с будет ограничено до {motionMaxDuration}с
                </div>
              )}
            </div>
            
            {/* Pricing Info */}
            <div className="p-3 bg-blue-500/10 backdrop-blur-xl border border-blue-400/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-200">
                  <span className="font-semibold">Цена за секунду:</span> зависит от длительности видео. 720p = 6⭐/сек, 1080p = 8⭐/сек.
                  {motionVideoDurationSec != null && (
                    <span className="block mt-1">Ваше видео: {motionVideoDurationSec} сек → {calcMotionControlStars(motionVideoDurationSec, motionQuality, true) ?? 0}⭐</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Scene Control Mode */}
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Orientation определяет, откуда брать ориентацию персонажа (image/video).
              </p>
            </div>
            
            {/* Advanced Settings */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer p-3 bg-black/20 backdrop-blur-xl rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-200">
                <h3 className="text-[13px] font-medium text-white">Advanced Settings</h3>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <label className="text-[12px] text-zinc-400">camera_control (JSON)</label>
                  <textarea
                    value={cameraControlJson}
                    onChange={(e) => setCameraControlJson(e.target.value)}
                    placeholder='{"key":"value"}'
                    rows={4}
                    className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] rounded-lg text-white text-[12px] placeholder:text-zinc-500 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] text-zinc-400">Negative Prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Что избегать в видео..."
                    rows={3}
                    className="w-full px-3 py-2 bg-black/20 border border-white/[0.08] rounded-lg text-white text-[12px] placeholder:text-zinc-500 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] text-zinc-400">CFG Scale</label>
                    <span className="text-[12px] text-white">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#D4FF00]"
                  />
                </div>
              </div>
            </details>
          </>
        )}
      </div>
      
      {/* Generate Button */}
      <div className="p-4 border-t border-[#262626]/50 bg-gradient-to-b from-transparent to-zinc-900/50">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-4 bg-[#f59e0b] hover:bg-[#fbbf24] text-black font-bold text-base rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group shadow-lg shadow-[#f59e0b]/30 hover:shadow-[#f59e0b]/50"
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
              
              <span className="relative z-10 font-extrabold">Списать</span>
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
                    ? cap.supportedModes.filter((m) => m !== 'motion_control').join(' • ').toUpperCase()
                    : null;
                  
                  const qualityText = cap?.supportedQualities?.length
                    ? cap.supportedQualities.join(', ')
                    : null;
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        setShowModelSelector(false);
                        const nextTab: Tab = model.id === 'kling-motion-control' ? 'motion' : 'create';
                        switchToModel(model.id, nextTab);
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
};

export const VideoGeneratorHiru = memo(VideoGeneratorHiruComponent);
