'use client';

import { useState, useCallback, useRef } from 'react';
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
  const [isGenerating, setIsGenerating] = useState(false);

  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);

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
      {/* Model Selection Card */}
      <div className={`relative h-36 rounded-xl bg-gradient-to-br ${modelConfig.gradient} overflow-hidden group cursor-pointer`}
        onClick={() => setShowModelSelector(true)}
      >
        {/* Background image if start frame exists */}
        {startFramePreview && (
          <div className="absolute inset-0 opacity-20">
            <img src={startFramePreview} alt="" className="w-full h-full object-cover blur-sm" />
          </div>
        )}
        
        <div className="relative h-full p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[#CDFF00] text-[10px] font-bold uppercase tracking-wider">
              {modelConfig.badge}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModelSelector(true);
              }}
              className="px-2.5 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Change
            </button>
          </div>
          
          <div>
            <div className="text-white text-xl font-bold">{modelConfig.name}</div>
          </div>
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
          <div className="text-sm text-gray-400 mb-4">
            Управление движением камеры и динамикой сцены
          </div>

          {/* Camera Pan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">Pan (Панорама)</label>
              <span className="text-xs text-gray-400">{cameraMovement.pan}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={cameraMovement.pan}
              onChange={(e) => setCameraMovement(prev => ({ ...prev, pan: Number(e.target.value) }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>←  Left</span>
              <span>Right  →</span>
            </div>
          </div>

          {/* Camera Tilt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">Tilt (Наклон)</label>
              <span className="text-xs text-gray-400">{cameraMovement.tilt}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={cameraMovement.tilt}
              onChange={(e) => setCameraMovement(prev => ({ ...prev, tilt: Number(e.target.value) }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>↓  Down</span>
              <span>Up  ↑</span>
            </div>
          </div>

          {/* Camera Zoom */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">Zoom (Зум)</label>
              <span className="text-xs text-gray-400">{cameraMovement.zoom}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={cameraMovement.zoom}
              onChange={(e) => setCameraMovement(prev => ({ ...prev, zoom: Number(e.target.value) }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Zoom Out</span>
              <span>Zoom In</span>
            </div>
          </div>

          {/* Camera Rotation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-white">Rotation (Поворот)</label>
              <span className="text-xs text-gray-400">{cameraMovement.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={cameraMovement.rotation}
              onChange={(e) => setCameraMovement(prev => ({ ...prev, rotation: Number(e.target.value) }))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#CDFF00]"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>↺  CCW</span>
              <span>CW  ↻</span>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">Пресеты движения</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCameraMovement({ pan: 50, tilt: 0, zoom: 0, rotation: 0 })}
                className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:border-[#CDFF00]/50 transition-colors"
              >
                Pan Right
              </button>
              <button
                onClick={() => setCameraMovement({ pan: 0, tilt: 30, zoom: 0, rotation: 0 })}
                className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:border-[#CDFF00]/50 transition-colors"
              >
                Tilt Up
              </button>
              <button
                onClick={() => setCameraMovement({ pan: 0, tilt: 0, zoom: 50, rotation: 0 })}
                className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:border-[#CDFF00]/50 transition-colors"
              >
                Zoom In
              </button>
              <button
                onClick={() => setCameraMovement({ pan: 0, tilt: 0, zoom: 0, rotation: 45 })}
                className="px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:border-[#CDFF00]/50 transition-colors"
              >
                Rotate 45°
              </button>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setCameraMovement({ pan: 0, tilt: 0, zoom: 0, rotation: 0 })}
            className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-colors"
          >
            Сбросить все
          </button>
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
        {/* Model */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Model</label>
          <button
            onClick={() => setShowModelSelector(true)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm flex items-center justify-between hover:bg-white/10 transition-colors"
          >
            <span>{modelConfig.name}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
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
