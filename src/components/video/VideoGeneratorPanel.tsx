'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Sparkles, Edit2, Info, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MODELS } from '@/config/models';
import { getModelIcon } from '@/components/icons/model-icons';
import { VIDEO_MODELS_CONFIG, getDefaultVideoSettings, type VideoModelSetting } from '@/config/video-models-config';

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface VideoGeneratorPanelProps {
  onGenerate?: (params: any) => void;
  onRatioChange?: (ratio: AspectRatio) => void;
}

// Get featured video models (7 standard + 1 motion control)
const STANDARD_MODELS = VIDEO_MODELS.filter(m => m.featured && m.id !== 'kling-motion-control');
const MOTION_CONTROL_MODEL = VIDEO_MODELS.find(m => m.id === 'kling-motion-control');
const FEATURED_MODELS = VIDEO_MODELS.filter(m => m.featured);

export function VideoGeneratorPanel({ onGenerate, onRatioChange }: VideoGeneratorPanelProps) {
  const [selectedModel, setSelectedModel] = useState(FEATURED_MODELS[0].id);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [enhanceOn, setEnhanceOn] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic settings based on selected model
  const [modelSettings, setModelSettings] = useState<Record<string, any>>(() => {
    return getDefaultVideoSettings(FEATURED_MODELS[0].id);
  });

  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [motionReference, setMotionReference] = useState<File | null>(null);
  const [motionReferencePreview, setMotionReferencePreview] = useState<string | null>(null);

  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const motionRefInputRef = useRef<HTMLInputElement>(null);

  const currentModel = FEATURED_MODELS.find(m => m.id === selectedModel) || FEATURED_MODELS[0];
  const ModelIcon = getModelIcon(currentModel.id);
  const modelConfig = VIDEO_MODELS_CONFIG[currentModel.id];

  // Update settings when model changes
  useEffect(() => {
    setModelSettings(getDefaultVideoSettings(selectedModel));
  }, [selectedModel]);

  const handleFileUpload = useCallback((file: File | null, type: 'start' | 'motion') => {
    if (!file) return;

    const isVideo = type === 'motion';
    const allowedTypes = isVideo ? 'video/' : 'image/';
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

    if (!file.type.startsWith(allowedTypes)) {
      toast.error(`Загрузите ${isVideo ? 'видео' : 'изображение'}`);
      return;
    }

    if (file.size > maxSize) {
      toast.error(`Максимальный размер: ${isVideo ? '100' : '10'} МБ`);
      return;
    }

    if (type === 'start') {
      setStartFrame(file);
      const reader = new FileReader();
      reader.onload = (e) => setStartFramePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setMotionReference(file);
      const url = URL.createObjectURL(file);
      setMotionReferencePreview(url);
    }

    toast.success(`${isVideo ? 'Видео' : 'Изображение'} загружено`);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Введите промпт для улучшения');
      return;
    }
    toast.info('Улучшение промпта...');
    // TODO: Implement AI prompt enhancement
    setTimeout(() => {
      toast.success('Промпт улучшен!');
    }, 1000);
  }, [prompt]);

  // Poll generation status
  const pollGenerationStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/video/status?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      setGenerationStatus(data.status);

      if (data.status === 'completed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsGenerating(false);
        toast.success('Видео готово!');

        // Call onGenerate callback with completed video
        onGenerate?.({
          id: data.id,
          status: data.status,
          videoUrl: data.video_url,
          thumbnailUrl: data.thumbnail_url,
        });
      } else if (data.status === 'failed') {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsGenerating(false);
        toast.error(data.error || 'Ошибка генерации');
      } else {
        // Still processing
        if (data.eta_seconds) {
          setEtaSeconds(data.eta_seconds);
        }
      }
    } catch (error) {
      console.error('[VideoGenerator] Status poll error:', error);
    }
  }, [onGenerate]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && modelSettings.mode !== 'video_to_video') {
      toast.error('Введите описание видео');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('queued');

    try {
      // Upload files if needed
      let referenceImageUrls: string[] = [];
      let inputVideoUrl: string | undefined;

      if (startFrame) {
        // TODO: Upload image to storage
        // For now, using data URL (not recommended for production)
        if (startFramePreview) {
          referenceImageUrls.push(startFramePreview);
        }
      }

      if (motionReference && motionReferencePreview) {
        // TODO: Upload video to storage
        inputVideoUrl = motionReferencePreview;
      }

      // Call generation API
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          provider: currentModel.provider,
          mode: modelSettings.mode || 'text_to_video',
          prompt: prompt.trim(),
          reference_images: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          input_video: inputVideoUrl,
          duration_seconds: modelSettings.duration_seconds || 5,
          resolution: modelSettings.resolution || '1080p',
          aspect_ratio: modelSettings.aspect_ratio || '16:9',
          options: {
            quality: modelSettings.quality,
            style: modelSettings.style,
            motion_strength: modelSettings.motion_strength,
            camera_motion: modelSettings.camera_motion,
            generate_audio: modelSettings.generate_audio,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start generation');
      }

      const data = await response.json();
      setGenerationId(data.id);
      setGenerationStatus(data.status);
      setEtaSeconds(data.eta_seconds);

      toast.success('Видео поставлено в очередь!');

      // Start polling for status
      pollingIntervalRef.current = setInterval(() => {
        pollGenerationStatus(data.id);
      }, 3000); // Poll every 3 seconds

      // Also poll immediately
      setTimeout(() => pollGenerationStatus(data.id), 1000);

    } catch (error: any) {
      console.error('[VideoGenerator] Generation error:', error);
      toast.error(error.message || 'Ошибка генерации');
      setIsGenerating(false);
      setGenerationStatus('failed');
    }
  }, [selectedModel, currentModel, prompt, modelSettings, startFrame, motionReference, startFramePreview, motionReferencePreview, pollGenerationStatus]);

  // Calculate cost based on model and settings
  const calculateCost = useCallback(() => {
    const duration = modelSettings.duration_seconds || 5;
    const baseCost = duration * 10; // Rough estimate
    return Math.round(baseCost);
  }, [modelSettings]);

  const cost = calculateCost();

  // Render dynamic setting control
  const renderSetting = (key: string, setting: VideoModelSetting) => {
    if (setting.type === 'buttons') {
      return (
        <div key={key}>
          <label className="text-xs text-gray-400 mb-1.5 block">{setting.label}</label>
          <div className="grid grid-cols-2 gap-2">
            {setting.options?.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setModelSettings(prev => ({ ...prev, [key]: opt.value }))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  modelSettings[key] === opt.value
                    ? 'bg-[#CDFF00] text-black'
                    : 'bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (setting.type === 'select') {
      return (
        <div key={key}>
          <label className="text-xs text-gray-400 mb-1.5 block">{setting.label}</label>
          <select
            value={String(modelSettings[key] || setting.default)}
            onChange={(e) => setModelSettings(prev => ({ ...prev, [key]: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#CDFF00]/50 appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
            }}
          >
            {setting.options?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (setting.type === 'checkbox') {
      return (
        <div key={key} className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-semibold text-white">{setting.label}</label>
            {setting.description && <Info className="w-3.5 h-3.5 text-gray-400" />}
          </div>
          <button
            onClick={() => setModelSettings(prev => ({ ...prev, [key]: !prev[key] }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              modelSettings[key] ? 'bg-[#CDFF00]' : 'bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                modelSettings[key] ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
              }`}
            />
          </button>
        </div>
      );
    }

    if (setting.type === 'slider') {
      return (
        <div key={key}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-white">{setting.label}</label>
            <span className="text-xs text-gray-400">{modelSettings[key] || setting.default}%</span>
          </div>
          <input
            type="range"
            min={setting.min || 0}
            max={setting.max || 100}
            step={setting.step || 1}
            value={modelSettings[key] || setting.default}
            onChange={(e) => setModelSettings(prev => ({ ...prev, [key]: Number(e.target.value) }))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
          />
        </div>
      );
    }

    return null;
  };

  // Check if current mode supports file uploads
  const supportsImageUpload = modelSettings.mode === 'image_to_video' || modelSettings.mode === 'i2v';
  const supportsVideoUpload = selectedModel === 'kling-motion-control' || modelSettings.mode === 'video_to_video';

  return (
    <div className="w-full max-w-sm bg-[#1A1A1C] rounded-2xl border border-white/10 p-5 space-y-5">
      {/* Model Selection Card */}
      <div
        className="relative h-24 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden group cursor-pointer"
        onClick={() => setShowModelSelector(true)}
      >
        {startFramePreview && (
          <div className="absolute inset-0 opacity-20">
            <img src={startFramePreview} alt="" className="w-full h-full object-cover blur-sm" />
          </div>
        )}

        <div className="relative h-full p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ModelIcon size={32} className="opacity-90" />
            <div className="text-white text-base font-bold">{currentModel.name}</div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModelSelector(true);
            }}
            className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-white text-[10px] font-medium hover:bg-white/30 transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Change
          </button>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModelSelector(false)}>
          <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Выбор модели</h3>

            {/* Standard Models */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Стандартные модели</h4>
              <div className="grid grid-cols-2 gap-3">
                {STANDARD_MODELS.map((m) => {
                  const Icon = getModelIcon(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelSelector(false);
                      }}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        selectedModel === m.id
                          ? 'border-[#CDFF00] bg-[#CDFF00]/10'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon size={32} />
                        <div className="text-white text-sm font-semibold">{m.name}</div>
                      </div>
                      <div className="text-gray-400 text-xs">{m.shortLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Motion Control Section */}
            {MOTION_CONTROL_MODEL && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Продвинутые функции</h4>
                <div className="grid grid-cols-1 gap-3">
                  {(() => {
                    const m = MOTION_CONTROL_MODEL;
                    const Icon = getModelIcon(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelSelector(false);
                        }}
                        className={`p-4 rounded-xl border transition-all text-left ${
                          selectedModel === m.id
                            ? 'border-[#CDFF00] bg-[#CDFF00]/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Icon size={32} />
                          <div>
                            <div className="text-white text-sm font-semibold">{m.name}</div>
                            <div className="text-gray-400 text-xs mt-1">{m.shortLabel}</div>
                          </div>
                        </div>
                        <div className="text-gray-500 text-xs mt-2">
                          Передача движений из референсного видео на сгенерированное
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Uploads */}
      {(supportsImageUpload || supportsVideoUpload) && (
        <div className="space-y-3">
          {supportsImageUpload && (
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Референсное изображение</label>
              <input
                ref={startFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'start')}
              />
              <button
                onClick={() => startFrameInputRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-[#CDFF00]/50 transition-colors flex flex-col items-center justify-center gap-2 bg-white/5 overflow-hidden"
              >
                {startFramePreview ? (
                  <img src={startFramePreview} alt="Start" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Upload Image</span>
                  </>
                )}
              </button>
            </div>
          )}

          {supportsVideoUpload && (
            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Референсное видео</label>
              <input
                ref={motionRefInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'motion')}
              />
              {motionReferencePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50">
                  <video
                    src={motionReferencePreview}
                    className="w-full aspect-video object-cover"
                    controls
                    muted
                    playsInline
                  />
                  <button
                    onClick={() => {
                      setMotionReference(null);
                      setMotionReferencePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:bg-black/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => motionRefInputRef.current?.click()}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-[#CDFF00]/50 transition-colors flex flex-col items-center justify-center gap-3 bg-white/5"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-white font-medium mb-1">Upload Motion Reference</div>
                    <div className="text-xs text-gray-400">Video file up to 100MB</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prompt Field */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the scene you imagine, with details."
          rows={4}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#CDFF00]/50 focus:ring-1 focus:ring-[#CDFF00]/30 transition-all resize-none"
        />
        <button
          onClick={handleEnhance}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            enhanceOn
              ? 'bg-[#CDFF00] text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Enhance {enhanceOn ? 'on' : 'off'}
        </button>
      </div>

      {/* Dynamic Settings */}
      {modelConfig && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          {Object.entries(modelConfig.settings)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([key, setting]) => renderSetting(key, setting))}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3.5 bg-[#CDFF00] text-black font-bold text-base rounded-xl hover:bg-[#CDFF00]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            {generationStatus === 'queued' && 'В очереди...'}
            {generationStatus === 'processing' && (etaSeconds ? `Генерация... ~${Math.ceil(etaSeconds / 60)} мин` : 'Обработка...')}
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate ⚡ {cost}
          </>
        )}
      </button>
    </div>
  );
}
