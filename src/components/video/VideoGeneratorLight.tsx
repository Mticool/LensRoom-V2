'use client';

import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { VideoGeneratorHiru } from './VideoGeneratorHiru';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface VideoGeneratorLightProps {
  onGenerate?: (params: any) => void;
}

export function VideoGeneratorLight({ onGenerate }: VideoGeneratorLightProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [currentRatio, setCurrentRatio] = useState<AspectRatio>('16:9');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[VideoGeneratorLight] No user for history');
        return;
      }

      const { data, error } = await supabase
        .from('generations')
        .select('result_urls')
        .eq('user_id', user.id)
        .eq('type', 'video')
        .in('status', ['success', 'completed'])
        .not('result_urls', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('[VideoGeneratorLight] History query error:', error);
        throw error;
      }
      
      // Extract first URL from result_urls array
      const urls = data?.map((g: any) => g.result_urls?.[0]).filter(Boolean) || [];
      console.log('[VideoGeneratorLight] Loaded history:', urls.length, 'videos');
      setGenerationHistory(urls);
    } catch (error) {
      console.error('[VideoGeneratorLight] Failed to load history:', error);
    }
  };

  const { generate, isGenerating } = useVideoGeneration({
    onSuccess: (url) => {
      console.log('[VideoGeneratorLight] Generation success, URL:', url);
      setVideoUrl(url);
      // Small delay to ensure DB write completes
      setTimeout(() => loadHistory(), 1000);
    },
    onError: (error) => {
      toast.error(error);
    }
  });

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle generation from panel
  const handleGenerate = async (params: any) => {
    try {
      console.log('[VideoGeneratorLight] Starting generation with params:', {
        model: params.model,
        prompt: params.prompt,
        duration: params.duration,
        quality: params.quality,
        aspectRatio: params.aspectRatio,
        hasReferenceImage: !!params.referenceImage,
        hasStartFrame: !!params.startFrame,
        hasEndFrame: !!params.endFrame,
        hasMotionVideo: !!params.motionVideo,
      });

      // Validate model
      if (!params.model) {
        toast.error('Модель не выбрана');
        return;
      }

      // Determine mode based on inputs
      let mode: 'text' | 'image' | 'reference' | 'v2v' | 'motion' = 'text';
      if (params.referenceImage) mode = 'image';
      else if (params.startFrame && params.endFrame) mode = 'reference';
      else if (params.motionVideo) mode = 'motion';
      
      // Convert files to base64
      const referenceImageBase64 = params.referenceImage ? await fileToBase64(params.referenceImage) : undefined;
      const startFrameBase64 = params.startFrame ? await fileToBase64(params.startFrame) : undefined;
      const endFrameBase64 = params.endFrame ? await fileToBase64(params.endFrame) : undefined;
      const motionVideoBase64 = params.motionVideo ? await fileToBase64(params.motionVideo) : undefined;
      const characterImageBase64 = params.characterImage ? await fileToBase64(params.characterImage) : undefined;
      
      console.log('[VideoGeneratorLight] Calling generate with model:', params.model);
      
      await generate({
        selectedModel: params.model,
        prompt: params.prompt || '',
        mode,
        duration: params.duration,
        quality: params.quality || '720p',
        aspectRatio: params.aspectRatio,
        withSound: params.audioEnabled || false,
        referenceImage: referenceImageBase64,
        startFrame: startFrameBase64,
        endFrame: endFrameBase64,
        motionVideo: motionVideoBase64,
        characterImage: characterImageBase64,
      });
      
      onGenerate?.(params);
    } catch (error) {
      console.error('[VideoGeneratorLight] Generation failed:', error);
      toast.error('Ошибка: ' + (error instanceof Error ? error.message : 'неизвестная ошибка'));
    }
  };

  // Handle ratio change from panel
  const handleRatioChange = (newRatio: string) => {
    if (newRatio === '16:9' || newRatio === '9:16' || newRatio === '1:1' || newRatio === '4:3') {
      setCurrentRatio(newRatio);
      return;
    }
    setCurrentRatio('16:9');
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

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      {/* Hero Section */}
      <div className="max-w-[1600px] mx-auto px-6 pt-8 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Видео-генератор</h1>
        <p className="text-base text-gray-400">Создавайте профессиональные видео с помощью топовых нейросетей</p>
      </div>

      {/* Main Content - Sidebar Layout */}
      <div className="max-w-[1600px] mx-auto px-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Generator Panel - Fixed Width */}
          <div className="lg:w-[380px] lg:flex-shrink-0" style={{ zIndex: 10 }}>
            <div className="sticky top-24">
              <VideoGeneratorHiru 
                onGenerate={handleGenerate}
                onRatioChange={handleRatioChange}
                isGeneratingProp={isGenerating}
              />
            </div>
          </div>

          {/* Right Column: Player & History - Flexible */}
          <div className="flex-1 space-y-6">
            {/* Video Player */}
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <div className="bg-[#1A1A1C] rounded-2xl border border-white/10 overflow-hidden shadow-sm">
                  {isGenerating ? (
                    <div className={`relative ${getAspectClass()} bg-black/50 flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-[#CDFF00] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Генерация видео...</p>
                        <p className="text-gray-500 text-xs">Это может занять до 2 минут</p>
                      </div>
                    </div>
                  ) : videoUrl ? (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      autoPlay
                      className="w-full bg-black"
                    />
                  ) : (
                    <div className={`relative ${getAspectClass()} bg-black/50 flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                      <Play className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-sm">Результат появится здесь</p>
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
