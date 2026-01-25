'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Sparkles, Edit2, Info, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type VideoModel = 'sora' | 'kling' | 'veo' | 'flux';
type Quality = '720p' | '1080p' | '4k';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface VideoGeneratorPanelProps {
  onGenerate?: (params: any) => void;
  onRatioChange?: (ratio: AspectRatio) => void;
}

const MODEL_CONFIGS = {
  sora: { name: 'OpenAI Sora', badge: 'PREMIUM', gradient: 'from-purple-500 to-pink-500' },
  kling: { name: 'Kling AI', badge: 'FAST', gradient: 'from-blue-500 to-cyan-500' },
  veo: { name: 'Google VEO 3.1', badge: 'GENERAL', gradient: 'from-emerald-500 to-teal-500' },
  flux: { name: 'FLUX Video', badge: 'NEW', gradient: 'from-orange-500 to-red-500' },
};

export function VideoGeneratorPanel({ onGenerate, onRatioChange }: VideoGeneratorPanelProps) {
  const [activeTab, setActiveTab] = useState<'frames' | 'motion'>('frames');
  const [model, setModel] = useState<VideoModel>('veo');
  const [quality, setQuality] = useState<Quality>('1080p');
  const [ratio, setRatio] = useState<AspectRatio>('16:9');
  const [cameraMovement, setCameraMovement] = useState({
    pan: 0,
    tilt: 0,
    zoom: 0,
    rotation: 0,
  });
  const [prompt, setPrompt] = useState('');
  const [enhanceOn, setEnhanceOn] = useState(false);
  const [multiShotMode, setMultiShotMode] = useState(false);
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [endFrame, setEndFrame] = useState<File | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);
  const [endFramePreview, setEndFramePreview] = useState<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [motionReference, setMotionReference] = useState<File | null>(null);
  const [motionReferencePreview, setMotionReferencePreview] = useState<string | null>(null);
  
  const motionRefInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelDropdown]);

  const modelConfig = MODEL_CONFIGS[model];

  // Calculate cost based on parameters
  const calculateCost = useCallback(() => {
    let base = 50;
    if (quality === '4k') base *= 2;
    else if (quality === '1080p') base *= 1.5;
    if (multiShotMode) base *= 1.5;
    return Math.round(base);
  }, [quality, multiShotMode]);

  const cost = calculateCost();

  const handleFileUpload = useCallback((file: File | null, type: 'start' | 'end') => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Загрузите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Максимальный размер: 10 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (type === 'start') {
        setStartFrame(file);
        setStartFramePreview(preview);
      } else {
        setEndFrame(file);
        setEndFramePreview(preview);
      }
    };
    reader.readAsDataURL(file);
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

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание видео');
      return;
    }

    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Видео генерируется!');
      onGenerate?.({ model, quality, ratio, prompt, startFrame, endFrame, multiShotMode });
    } catch (error) {
      toast.error('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  }, [model, quality, ratio, prompt, startFrame, endFrame, multiShotMode, onGenerate]);

  return (
    <div className="w-full max-w-sm bg-[#1A1A1C] rounded-2xl border border-white/10 p-5 space-y-5">
      {/* Model Selection Card - Compact */}
      <div className={`relative h-24 rounded-xl bg-gradient-to-br ${modelConfig.gradient} overflow-hidden group cursor-pointer`}
        onClick={() => setShowModelSelector(true)}
      >
        {/* Background image if start frame exists */}
        {startFramePreview && (
          <div className="absolute inset-0 opacity-20">
            <img src={startFramePreview} alt="" className="w-full h-full object-cover blur-sm" />
          </div>
        )}
        
        <div className="relative h-full p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[#CDFF00] text-[9px] font-bold uppercase tracking-wider">
              {modelConfig.badge}
            </div>
            <div className="text-white text-base font-bold">{modelConfig.name}</div>
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
          <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Выбор модели</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(MODEL_CONFIGS) as VideoModel[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setShowModelSelector(false);
                  }}
                  className={`p-4 rounded-xl border transition-all ${
                    model === m
                      ? 'border-[#CDFF00] bg-[#CDFF00]/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`h-20 rounded-lg bg-gradient-to-br ${MODEL_CONFIGS[m].gradient} mb-2`} />
                  <div className="text-white text-sm font-semibold">{MODEL_CONFIGS[m].name}</div>
                  <div className="text-gray-400 text-xs">{MODEL_CONFIGS[m].badge}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('frames')}
          className={`pb-2 text-sm font-medium transition-colors relative ${
            activeTab === 'frames' ? 'text-white' : 'text-gray-400'
          }`}
        >
          Frames
          {activeTab === 'frames' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CDFF00]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('motion')}
          className={`pb-2 text-sm font-medium transition-colors relative ${
            activeTab === 'motion' ? 'text-white' : 'text-gray-400'
          }`}
        >
          Motion Control
          {activeTab === 'motion' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CDFF00]" />
          )}
        </button>
      </div>

      {/* Frames Content */}
      {activeTab === 'frames' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Start Frame */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-semibold text-white">Start frame</label>
                <span className="text-xs text-gray-500">Optional</span>
              </div>
              <input
                ref={startFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'start')}
              />
              <button
                onClick={() => startFrameInputRef.current?.click()}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-[#CDFF00]/50 transition-colors flex flex-col items-center justify-center gap-2 bg-white/5 overflow-hidden"
              >
                {startFramePreview ? (
                  <img src={startFramePreview} alt="Start" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Upload</span>
                  </>
                )}
              </button>
            </div>

            {/* End Frame */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-semibold text-white">End frame</label>
                <span className="text-xs text-gray-500">Optional</span>
              </div>
              <input
                ref={endFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null, 'end')}
              />
              <button
                onClick={() => endFrameInputRef.current?.click()}
                className="w-full aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-[#CDFF00]/50 transition-colors flex flex-col items-center justify-center gap-2 bg-white/5 overflow-hidden"
              >
                {endFramePreview ? (
                  <img src={endFramePreview} alt="End" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motion Control Content */}
      {activeTab === 'motion' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-400 mb-3">
            Загрузите референсное видео для передачи движения камеры
          </div>

          {/* Motion Reference Upload */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Референсное видео</label>
            <input
              ref={motionRefInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                if (!file.type.startsWith('video/')) {
                  toast.error('Загрузите видео файл');
                  return;
                }
                
                if (file.size > 100 * 1024 * 1024) {
                  toast.error('Максимальный размер: 100 МБ');
                  return;
                }
                
                setMotionReference(file);
                const url = URL.createObjectURL(file);
                setMotionReferencePreview(url);
                toast.success('Референс загружен');
              }}
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

          {/* Motion Strength */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">Motion Strength</label>
              <span className="text-xs text-gray-400">{cameraMovement.pan}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cameraMovement.pan}
              onChange={(e) => setCameraMovement(prev => ({ ...prev, pan: Number(e.target.value) }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Subtle</span>
              <span>Strong</span>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-200/80 leading-relaxed">
                AI will analyze camera movement from your reference video and apply it to the generated content
              </div>
            </div>
          </div>
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

      {/* Multi-shot Mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-semibold text-white">Multi-shot mode</label>
          <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <button
          onClick={() => setMultiShotMode(!multiShotMode)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            multiShotMode ? 'bg-[#CDFF00]' : 'bg-white/10'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
              multiShotMode ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white'
            }`}
          />
        </button>
      </div>

      {/* Settings Section */}
      <div className="space-y-3 pt-3 border-t border-white/10">
        {/* Model - Visual Dropdown */}
        <div className="relative" ref={modelDropdownRef}>
          <label className="text-xs text-gray-400 mb-1.5 block">Model</label>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm flex items-center justify-between hover:bg-white/10 transition-colors"
          >
            <span>{modelConfig.name}</span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Dropdown List */}
          {showModelDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1C] border border-white/10 rounded-lg overflow-hidden shadow-xl z-50">
              {(Object.keys(MODEL_CONFIGS) as VideoModel[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setShowModelDropdown(false);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${
                    model === m
                      ? 'bg-[#CDFF00]/10 border-l-2 border-[#CDFF00]'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${MODEL_CONFIGS[m].gradient} flex-shrink-0`} />
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-white">{MODEL_CONFIGS[m].name}</div>
                    <div className="text-xs text-gray-400">{MODEL_CONFIGS[m].badge}</div>
                  </div>
                  {model === m && (
                    <svg className="w-4 h-4 text-[#CDFF00]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quality & Ratio */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as Quality)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#CDFF00]/50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Ratio</label>
            <select
              value={ratio}
              onChange={(e) => {
                const newRatio = e.target.value as AspectRatio;
                setRatio(newRatio);
                onRatioChange?.(newRatio);
              }}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#CDFF00]/50 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3.5 bg-[#CDFF00] text-black font-bold text-base rounded-xl hover:bg-[#CDFF00]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            Generating...
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
