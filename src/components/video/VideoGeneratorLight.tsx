'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Upload, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';

type SourceMode = 'text' | 'image' | 'video';
type VideoModel = 'sora' | 'kling' | 'veo' | 'flux';
type Quality = '720p' | '1080p' | '4k';

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
  const [withAudio, setWithAudio] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
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
      setVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
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
          {/* Left Column: Player & Timeline */}
          <div className="lg:col-span-8 space-y-4">
            {/* Video Player */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
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
                      <p className="text-gray-500 text-sm">Результат появится здесь после генерации</p>
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

            {/* Generation History (optional) */}
            {videoUrl && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">История генераций</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-video bg-gray-100 rounded-lg border border-gray-200" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings Panel */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-24">
              {/* Tabs */}
              <div className="border-b border-gray-200">
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
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                        activeTab === tab.id
                          ? 'text-violet-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6 space-y-6">
                {/* Source Mode */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Источник</label>
                  <div className="inline-flex bg-gray-100 rounded-lg p-1 w-full">
                    {[
                      { id: 'text', label: 'Текст' },
                      { id: 'image', label: 'Картинка' },
                      { id: 'video', label: 'Видео' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSourceMode(mode.id as SourceMode)}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                          sourceMode === mode.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    {sourceMode === 'text' ? 'Описание видео' : 'Описание (опционально)'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите желаемое видео..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      {referenceFile ? referenceFile.name : `Загрузить ${sourceMode === 'image' ? 'изображение' : 'видео'}`}
                    </button>
                  </div>
                )}

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Модель</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as VideoModel)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
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

                {/* Duration Slider */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Длительность: {duration} сек
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1s</span>
                    <span>15s</span>
                  </div>
                </div>

                {/* Quality Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Качество</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['720p', '1080p', '4k'] as Quality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                          quality === q
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        {q.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-900">Со звуком</label>
                  <button
                    onClick={() => setWithAudio(!withAudio)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      withAudio ? 'bg-violet-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        withAudio ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Cost Info */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Стоимость генерации:</span>
                    <span className="font-semibold text-gray-900">⭐ {estimatedCost}</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Генерируем...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
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
