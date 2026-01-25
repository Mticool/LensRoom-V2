'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Upload, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';

type SourceMode = 'text' | 'image' | 'video';
type VideoModel = 'sora' | 'kling' | 'veo' | 'flux';
type Quality = '720p' | '1080p' | '4k';
type AspectRatio = '16:9' | '9:16' | '1:1';

interface VideoGeneratorLightProps {
  onGenerate?: (params: any) => void;
}

export function VideoGeneratorLight({ onGenerate }: VideoGeneratorLightProps) {
  const { credits } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'video' | 'motion' | 'edit' | 'music'>('video');
  const [sourceMode, setSourceMode] = useState<SourceMode>('text');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<VideoModel>('kling');
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState<Quality>('1080p');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [withAudio, setWithAudio] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handlers
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Загрузите изображение или видео');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Максимальный размер файла: 50 МБ');
      return;
    }

    setReferenceFile(file);
    toast.success(`Файл загружен: ${file.name}`);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (sourceMode === 'text' && !prompt.trim()) {
      toast.error('Введите описание видео');
      return;
    }

    if ((sourceMode === 'image' || sourceMode === 'video') && !referenceFile) {
      toast.error('Загрузите файл');
      return;
    }

    setIsGenerating(true);

    try {
      // Simulate generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock video URL
      const mockUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      setVideoUrl(mockUrl);
      setGenerationHistory(prev => [mockUrl, ...prev].slice(0, 8));
      toast.success('Видео успешно сгенерировано!');
    } catch (error) {
      toast.error('Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  }, [sourceMode, prompt, referenceFile]);

  const estimatedCost = duration * (quality === '4k' ? 15 : quality === '1080p' ? 10 : 5);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get aspect ratio class based on selection
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9':
        return 'aspect-video'; // 16:9
      case '9:16':
        return 'aspect-[9/16]'; // vertical
      case '1:1':
        return 'aspect-square'; // 1:1
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">LensRoom</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-900">
              ⭐ {credits || 0} звезд
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12 pb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Видео-генератор</h1>
        <p className="text-lg text-gray-600">Создавайте профессиональные видео с помощью топовых нейросетей</p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Player & History */}
          <div className="lg:col-span-8 space-y-6">
            {/* Video Player - Adaptive Aspect Ratio */}
            <div className="flex items-start justify-center">
              <div className={`w-full max-w-4xl ${aspectRatio === '9:16' ? 'max-w-md' : aspectRatio === '1:1' ? 'max-w-2xl' : ''}`}>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className={`relative ${getAspectClass()} bg-gray-100 max-h-[60vh]`}>
                    {videoUrl ? (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setTotalDuration(e.currentTarget.duration)}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <Play className="w-10 h-10 text-gray-700" />
                          </div>
                          <p className="text-gray-500 text-sm">Результат появится здесь</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  {videoUrl && (
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-mono">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-violet-600 transition-all"
                            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 font-mono">{formatTime(totalDuration)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Мои работы - Compact History Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Мои работы</h3>
              {generationHistory.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {generationHistory.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setVideoUrl(url)}
                      className="aspect-video bg-gray-100 rounded-lg border border-gray-200 overflow-hidden hover:border-violet-400 transition-colors group"
                    >
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Здесь появятся ваши работы</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings Panel - Dark Theme */}
          <div className="lg:col-span-4">
            <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden sticky top-24 shadow-xl">
              {/* Tabs */}
              <div className="border-b border-zinc-800">
                <div className="flex">
                  {[
                    { id: 'video', label: 'Видео' },
                    { id: 'motion', label: 'Motion' },
                    { id: 'edit', label: 'Редактор' },
                    { id: 'music', label: 'Музыка' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 px-4 py-3 text-xs font-medium transition-colors relative ${
                        activeTab === tab.id
                          ? 'text-violet-400'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content - Compact Spacing */}
              <div className="p-5 pb-24 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {/* Source Mode */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Источник</label>
                  <div className="inline-flex bg-zinc-900 rounded-lg p-1 w-full">
                    {[
                      { id: 'text', label: 'Текст' },
                      { id: 'image', label: 'Картинка' },
                      { id: 'video', label: 'Видео' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSourceMode(mode.id as SourceMode)}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          sourceMode === mode.id
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    {sourceMode === 'text' ? 'Описание видео' : 'Описание (опционально)'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите желаемое видео..."
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
                  />
                </div>

                {/* File Upload */}
                {(sourceMode === 'image' || sourceMode === 'video') && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={sourceMode === 'image' ? 'image/*' : 'video/*'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-300 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-xs font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      {referenceFile ? referenceFile.name : `Загрузить ${sourceMode === 'image' ? 'изображение' : 'видео'}`}
                    </button>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Модель</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as VideoModel)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                    }}
                  >
                    <option value="sora">OpenAI Sora</option>
                    <option value="kling">Kling AI</option>
                    <option value="veo">Google Veo</option>
                    <option value="flux">FLUX Video</option>
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Соотношение сторон</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['16:9', '1:1', '9:16'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                          aspectRatio === ratio
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:border-violet-500'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Slider */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Длительность: {duration} сек
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>1s</span>
                    <span>15s</span>
                  </div>
                </div>

                {/* Quality Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Качество</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['720p', '1080p', '4k'] as Quality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                          quality === q
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-zinc-900 text-gray-400 border-zinc-800 hover:border-violet-500'
                        }`}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">Со звуком</label>
                  <button
                    onClick={() => setWithAudio(!withAudio)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      withAudio ? 'bg-violet-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        withAudio ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Generate Button - Sticky to Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 bg-zinc-950 border-t border-zinc-800">
                {/* Cost Info */}
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Итого:</span>
                  <span className="font-bold text-violet-400 text-sm">⭐ {estimatedCost}</span>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Генерируем...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Сгенерировать
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
