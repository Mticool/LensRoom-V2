'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Sparkles, Video, Image as ImageIcon, Plus, Camera, Info } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MODELS } from '@/config/models';
import { getModelIcon } from '@/components/icons/model-icons';

type Tab = 'create' | 'edit' | 'motion';
type SceneControlMode = 'video' | 'image';

interface VideoGeneratorHiggsfieldProps {
  onGenerate?: (params: any) => void;
}

export function VideoGeneratorHiggsfield({ onGenerate }: VideoGeneratorHiggsfieldProps) {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [selectedModel, setSelectedModel] = useState('kling-2.6');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [enhanceOn, setEnhanceOn] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [duration, setDuration] = useState('5s');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [sceneControlMode, setSceneControlMode] = useState<SceneControlMode>('image');
  const [isGenerating, setIsGenerating] = useState(false);

  // File uploads
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [motionVideo, setMotionVideo] = useState<File | null>(null);
  const [motionVideoPreview, setMotionVideoPreview] = useState<string | null>(null);
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [characterImagePreview, setCharacterImagePreview] = useState<string | null>(null);
  const [editVideo, setEditVideo] = useState<File | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const motionVideoInputRef = useRef<HTMLInputElement>(null);
  const characterImageInputRef = useRef<HTMLInputElement>(null);
  const editVideoInputRef = useRef<HTMLInputElement>(null);

  const currentModel = VIDEO_MODELS.find(m => m.id === selectedModel) || VIDEO_MODELS[0];
  const ModelIcon = getModelIcon(currentModel.id);

  const handleImageUpload = useCallback((file: File | null, type: 'reference' | 'character') => {
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
      if (type === 'reference') {
        setReferenceImage(file);
        setReferenceImagePreview(preview);
      } else {
        setCharacterImage(file);
        setCharacterImagePreview(preview);
      }
    };
    reader.readAsDataURL(file);
    toast.success('Изображение загружено');
  }, []);

  const handleVideoUpload = useCallback((file: File | null, type: 'motion' | 'edit') => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Загрузите видео');
      return;
    }

    const maxSize = type === 'edit' ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Максимальный размер: ${type === 'edit' ? '100' : '50'} МБ`);
      return;
    }

    const url = URL.createObjectURL(file);
    if (type === 'motion') {
      setMotionVideo(file);
      setMotionVideoPreview(url);
    } else {
      setEditVideo(file);
      setEditVideoPreview(url);
    }
    toast.success('Видео загружено');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && activeTab !== 'edit') {
      toast.error('Введите описание видео');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Видео генерируется!');
      onGenerate?.({
        tab: activeTab,
        model: selectedModel,
        prompt,
        duration,
        aspectRatio,
        audioEnabled,
        sceneControlMode: activeTab === 'motion' ? sceneControlMode : undefined,
      });
    } catch (error) {
      toast.error('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  }, [activeTab, selectedModel, prompt, duration, aspectRatio, audioEnabled, sceneControlMode, onGenerate]);

  const getGenerateCost = () => {
    const costs = { create: 10, edit: 9, motion: 5 };
    return costs[activeTab];
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <div className="w-full max-w-[340px] flex flex-col border-r border-zinc-800 overflow-y-auto">
        {/* Tabs Switcher */}
        <div className="flex items-center gap-6 px-4 pt-4 pb-3 border-b border-[#262626]">
          <button
            onClick={() => setActiveTab('create')}
            className={`text-sm font-semibold transition-colors relative pb-1 ${
              activeTab === 'create' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Create Video
            {activeTab === 'create' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`text-sm font-semibold transition-colors relative pb-1 ${
              activeTab === 'edit' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Edit Video
            {activeTab === 'edit' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('motion')}
            className={`text-sm font-semibold transition-colors relative pb-1 ${
              activeTab === 'motion' ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            Motion Control
            {activeTab === 'motion' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Model Card */}
          <div
            className="relative h-28 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 overflow-hidden cursor-pointer group"
            onClick={() => setShowModelSelector(true)}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="relative h-full p-3 flex flex-col justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelSelector(true);
                }}
                className="self-end px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-md text-white text-[11px] font-medium hover:bg-white/25 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Change
              </button>
              <div>
                <div className="text-[#D4FF00] text-xs font-bold uppercase tracking-wide mb-0.5">
                  {activeTab === 'create' ? 'GENERAL' : activeTab === 'motion' ? 'MOTION CONTROL' : 'KLING O1 EDIT'}
                </div>
                <div className="text-white text-base font-semibold">{currentModel.name}</div>
              </div>
            </div>
          </div>

          {/* Create Video Tab */}
          {activeTab === 'create' && (
            <>
              {/* Upload Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Reference Image</label>
                  <span className="text-xs text-zinc-500">Optional</span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'reference')}
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-3 overflow-hidden cursor-pointer"
                >
                  {referenceImagePreview ? (
                    <img src={referenceImagePreview} alt="Reference" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-white font-medium mb-1">Upload image or <span className="text-[#D4FF00]">generate it</span></div>
                        <div className="text-xs text-zinc-500">PNG, JPG or Paste from clipboard</div>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the scene you imagine, with details."
                  rows={4}
                  className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
                <button
                  onClick={() => setEnhanceOn(!enhanceOn)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    enhanceOn
                      ? 'bg-[#D4FF00] text-black'
                      : 'bg-[#262626] text-zinc-400 hover:bg-[#2a2a2a]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Enhance {enhanceOn ? 'on' : 'off'}
                </button>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Audio</span>
                  <Info className="w-4 h-4 text-zinc-500" />
                </div>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    audioEnabled ? 'bg-[#D4FF00]' : 'bg-[#262626]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      audioEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-600'
                    }`}
                  />
                </button>
              </div>

              {/* Settings Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626] cursor-pointer hover:border-zinc-500 transition-colors">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Model</div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      Kling 2.6
                      <svg className="w-4 h-4 text-[#D4FF00]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626] cursor-pointer hover:border-zinc-500 transition-colors">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Duration</div>
                      <div className="text-sm font-medium text-white">{duration}</div>
                    </div>
                    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626] cursor-pointer hover:border-zinc-500 transition-colors">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Aspect Ratio</div>
                      <div className="text-sm font-medium text-white">{aspectRatio}</div>
                    </div>
                    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Motion Control Tab */}
          {activeTab === 'motion' && (
            <>
              {/* Upload Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  ref={motionVideoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleVideoUpload(e.target.files?.[0] || null, 'motion')}
                />
                <button
                  onClick={() => motionVideoInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-2 p-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                    <Camera className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white font-medium mb-0.5">Add motion to copy</div>
                    <div className="text-[10px] text-zinc-500">Video duration: 3-30 seconds</div>
                  </div>
                </button>

                <input
                  ref={characterImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null, 'character')}
                />
                <button
                  onClick={() => characterImageInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-2 p-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center">
                    <Plus className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white font-medium mb-0.5">Add your character</div>
                    <div className="text-[10px] text-zinc-500">Image with visible face and body</div>
                  </div>
                </button>
              </div>

              {/* Quality */}
              <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626] cursor-pointer hover:border-zinc-500 transition-colors">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Quality</div>
                  <div className="text-sm font-medium text-white">720p</div>
                </div>
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              {/* Scene Control Mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626]">
                  <span className="text-sm font-medium text-white">Scene control mode</span>
                  <button
                    onClick={() => setSceneControlMode(sceneControlMode === 'video' ? 'image' : 'video')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      sceneControlMode === 'image' ? 'bg-[#D4FF00]' : 'bg-[#262626]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                        sceneControlMode === 'image' ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-600'
                      }`}
                    />
                  </button>
                </div>

                {/* Segmented Control */}
                <div className="flex items-center gap-2 p-1 bg-[#161616] rounded-xl border border-[#262626]">
                  <button
                    onClick={() => setSceneControlMode('video')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      sceneControlMode === 'video'
                        ? 'bg-[#262626] text-white'
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </button>
                  <button
                    onClick={() => setSceneControlMode('image')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      sceneControlMode === 'image'
                        ? 'bg-[#262626] text-white'
                        : 'text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  Choose where the background should come from: the character image or the motion video
                </p>
              </div>

              {/* Advanced Settings */}
              <button className="w-full flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626] hover:border-zinc-500 transition-colors cursor-pointer">
                <span className="text-sm font-medium text-white">Advanced settings</span>
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </>
          )}

          {/* Edit Video Tab */}
          {activeTab === 'edit' && (
            <>
              {/* Upload Video */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Upload Video</label>
                <input
                  ref={editVideoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleVideoUpload(e.target.files?.[0] || null, 'edit')}
                />
                <button
                  onClick={() => editVideoInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-3 cursor-pointer"
                >
                  {editVideoPreview ? (
                    <video src={editVideoPreview} className="w-full h-full object-cover rounded-2xl" controls />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
                        <Video className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-white font-medium mb-1">Upload a video to edit</div>
                        <div className="text-xs text-zinc-500">Duration required: 3-10 secs</div>
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Upload Images & Elements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Upload images & elements</label>
                  <span className="text-xs text-zinc-500">Optional</span>
                </div>
                <button className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#262626] hover:border-zinc-600 transition-colors bg-[#161616] flex flex-col items-center justify-center gap-3 cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center">
                    <Plus className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-white font-medium mb-1">Upload images & elements</div>
                    <div className="text-xs text-zinc-500">Up to 4 images or elements</div>
                  </div>
                </button>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Describe the visual change you want - e.g., "Make it snow" or "Make it nighttime". Add reference images or elements using @...'
                  rows={4}
                  className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>

              {/* Auto Settings */}
              <div className="flex items-center justify-between p-3 bg-[#161616] rounded-2xl border border-[#262626]">
                <span className="text-sm font-medium text-white">Auto settings</span>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    audioEnabled ? 'bg-[#D4FF00]' : 'bg-[#262626]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                      audioEnabled ? 'translate-x-6 bg-black' : 'translate-x-1 bg-zinc-600'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-[#262626]">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 bg-[#D4FF00] text-black font-bold text-base rounded-2xl hover:bg-[#c4ef00] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <span>Generate</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  {getGenerateCost()}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] p-8">
        <div className="w-full max-w-4xl aspect-video bg-[#161616] rounded-3xl border border-[#262626] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#262626] flex items-center justify-center">
              <Video className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-600 text-sm">Preview will appear here</p>
          </div>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModelSelector(false)}>
          <div className="bg-[#161616] rounded-3xl border border-[#262626] p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-6">Select Model</h3>
            <div className="grid grid-cols-2 gap-4">
              {VIDEO_MODELS.filter(m => m.featured).map((m) => {
                const Icon = getModelIcon(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setShowModelSelector(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                      selectedModel === m.id
                        ? 'border-[#D4FF00] bg-[#D4FF00]/5'
                        : 'border-[#262626] hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon size={32} />
                      <div className="text-white text-sm font-semibold">{m.name}</div>
                    </div>
                    <div className="text-zinc-500 text-xs">{m.shortLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
