'use client';

import { useState, useRef } from 'react';
import { Play } from 'lucide-react';
import { VideoGeneratorPanel } from './VideoGeneratorPanel';

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface VideoGeneratorLightProps {
  onGenerate?: (params: any) => void;
}

export function VideoGeneratorLight({ onGenerate }: VideoGeneratorLightProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentRatio, setCurrentRatio] = useState<AspectRatio>('16:9');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle generation from panel
  const handleGenerate = (params: any) => {
    // Update ratio from params to make preview adaptive
    if (params.ratio) {
      setCurrentRatio(params.ratio);
    }
    
    // Simulate generation
    const mockUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    setVideoUrl(mockUrl);
    setGenerationHistory(prev => [mockUrl, ...prev].slice(0, 8));
    
    onGenerate?.(params);
  };

  // Get aspect ratio class based on current selection
  const getAspectClass = () => {
    switch (currentRatio) {
      case '16:9':
        return 'aspect-video';
      case '9:16':
        return 'aspect-[9/16]';
      case '1:1':
        return 'aspect-square';
      case '4:3':
        return 'aspect-[4/3]';
      default:
        return 'aspect-video';
    }
  };

  const getMaxWidth = () => {
    switch (currentRatio) {
      case '9:16':
        return 'max-w-md';
      case '1:1':
        return 'max-w-2xl';
      case '4:3':
        return 'max-w-3xl';
      default:
        return 'max-w-4xl';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      {/* Hero Section */}
      <div className="max-w-[1600px] mx-auto px-6 pt-8 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Видео-генератор</h1>
        <p className="text-base text-gray-400">Создавайте профессиональные видео с помощью топовых нейросетей</p>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Panel */}
          <div className="lg:col-span-4" style={{ zIndex: 10 }}>
            <div className="sticky top-24">
              <VideoGeneratorPanel onGenerate={handleGenerate} />
            </div>
          </div>

          {/* Right Column: Player & History */}
          <div className="lg:col-span-8 space-y-6">
            {/* Video Player - Adaptive Aspect Ratio */}
            <div className="flex items-start justify-center">
              <div className={`w-full ${getMaxWidth()}`}>
                <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 overflow-hidden shadow-sm">
                  <div className={`relative ${getAspectClass()} bg-black/50 max-h-[60vh]`}>
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
                          <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                            <Play className="w-10 h-10 text-gray-400" />
                          </div>
                          <p className="text-gray-400 text-sm">Результат появится здесь</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  {videoUrl && (
                    <div className="p-4 border-t border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 font-mono">{formatTime(currentTime)}</span>
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#CDFF00] transition-all"
                            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 font-mono">{formatTime(totalDuration)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Мои работы - Compact History Grid */}
            <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Мои работы</h3>
              {generationHistory.length > 0 ? (
                <div className="grid grid-cols-4 gap-3">
                  {generationHistory.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setVideoUrl(url)}
                      className="relative aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden hover:border-[#CDFF00] transition-colors group"
                    >
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">Здесь появятся ваши работы</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
