'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Download } from 'lucide-react';
import { VideoGeneratorHiru } from './VideoGeneratorHiru';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { toast } from 'sonner';
import { extractVideoUrl, extractPosterUrl, fileToBase64 } from './utils';
import { uploadAsset } from '@/lib/client/upload-assets';
import { useCreditsStore } from '@/stores/credits-store';
import { MobileGenerationProgressOverlay } from './MobileGenerationProgressOverlay';

type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

interface HistoryItem {
  url: string;
  posterUrl: string | null;
  id: string | null;
}

interface VideoGeneratorLightProps {
  onGenerate?: (params: any) => void;
  /** Model id from URL (e.g. from header dropdown) — opens generator with this model selected */
  initialModel?: string;
}

export function VideoGeneratorLight({ onGenerate, initialModel }: VideoGeneratorLightProps) {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [currentRatio, setCurrentRatio] = useState<AspectRatio>('16:9');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { balance, fetchBalance } = useCreditsStore();

  // Load history on mount
  useEffect(() => {
    loadHistory();
    fetchBalance();
  }, [fetchBalance]);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/generations?type=video&limit=20&ensure_posters=1', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const generations = Array.isArray(data?.generations) ? data.generations : [];

      const items: HistoryItem[] = generations
        .filter((g: any) => ['success', 'completed'].includes(String(g.status || '').toLowerCase()))
        .map((g: any) => {
          const url = extractVideoUrl(g);
          if (!url) return null;
          return {
            url,
            posterUrl: extractPosterUrl(g),
            id: g.id ? String(g.id) : null,
          };
        })
        .filter(Boolean) as HistoryItem[];

      setGenerationHistory(items.slice(0, 8));
    } catch (error) {
      console.error('[VideoGeneratorLight] Failed to load history:', error);
    }
  };

  const { generate, isGenerating, progress, status, cancel } = useVideoGeneration({
    onSuccess: (url) => {
      console.log('[VideoGeneratorLight] Generation success, URL:', url);
      setVideoUrl(url);
      try {
        window.dispatchEvent(new Event('generations:refresh'));
      } catch {}
      // Small delay to ensure DB write completes
      setTimeout(() => loadHistory(), 1000);
    },
    onError: (error) => {
      toast.error(error);
    }
  });

  // Download video handler
  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `video-${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        multiPromptCount: params.multiPrompt?.length || 0,
        shotType: params.shotType,
      });

      // Validate model
      if (!params.model) {
        toast.error('Модель не выбрана');
        return;
      }

      // Determine mode based on inputs and params.mode
      let mode: 'text' | 'image' | 'reference' | 'v2v' | 'motion' | 'extend' = 'text';
      
      // Use mode from params if provided (from UI selector)
      if (params.mode === 'extend') mode = 'extend';
      else if (params.mode === 'i2v') mode = 'image';
      else if (params.mode === 'start_end') mode = 'reference'; // Start/end frames
      else if (params.mode === 'ref2v') mode = 'reference';
      else if (params.mode === 'v2v') mode = 'v2v';
      else if (params.mode === 't2v') mode = 'text';
      else if (params.mode === 'motion_control') mode = 'motion';
      // Auto-detect from inputs if mode not explicitly set
      else if (params.motionVideo) mode = 'motion';
      else if (params.startFrame && params.endFrame) mode = 'reference';
      else if (params.referenceImages && params.referenceImages.length > 0) mode = 'reference';
      else if (params.referenceImage) mode = 'image';
      
      console.log('[VideoGeneratorLight] Mode determined:', mode, {
        paramsMode: params.mode,
        hasReferenceImages: params.referenceImages?.length || 0,
        hasReferenceImage: !!params.referenceImage,
        hasStartFrame: !!params.startFrame,
        hasEndFrame: !!params.endFrame,
        hasMotionVideo: !!params.motionVideo,
      });
      
      // Convert files to payload: motion path uses upload->URL (mobile-safe), others keep current base64 flow.
      const referenceImageBase64 = params.referenceImage ? await fileToBase64(params.referenceImage) : undefined;
      const startFrameBase64 = params.startFrame ? await fileToBase64(params.startFrame) : undefined;
      const endFrameBase64 = params.endFrame ? await fileToBase64(params.endFrame) : undefined;
      const motionVideoUrl = mode === 'motion' && params.motionVideo ? await uploadAsset(params.motionVideo, 'video') : undefined;
      const characterImageUrl = mode === 'motion' && params.characterImage ? await uploadAsset(params.characterImage, 'image') : undefined;
      
      // Convert reference images array to base64
      const referenceImagesBase64 = params.referenceImages && params.referenceImages.length > 0
        ? await Promise.all(params.referenceImages.map((file: File) => fileToBase64(file)))
        : undefined;
      
      console.log('[VideoGeneratorLight] Converted files:', {
        referenceImagesCount: referenceImagesBase64?.length || 0,
        hasReferenceImage: !!referenceImageBase64,
        hasStartFrame: !!startFrameBase64,
        hasEndFrame: !!endFrameBase64,
        hasMotionVideoUrl: !!motionVideoUrl,
        hasCharacterImageUrl: !!characterImageUrl,
      });
      
      console.log('[VideoGeneratorLight] Calling generate with model:', params.model);
      
      const effectiveQuality = params.qualityTier ? undefined : (params.quality || '720p');

      console.log('[VideoGeneratorLight] Motion submit audit:', {
        selectedModel: params.model,
        hasCharacterImage: !!characterImageUrl,
        hasMotionVideo: !!motionVideoUrl,
        motionSeconds: params.motionSeconds ?? params.videoDuration ?? null,
        resolution: params.quality ?? null,
      });

      await generate({
        selectedModel: params.model,
        prompt: params.prompt || '',
        mode,
        duration: params.duration,
        quality: effectiveQuality,
        aspectRatio: params.aspectRatio,
        withSound: params.audioEnabled || false,
        style: params.style,
        cameraMotion: params.cameraMotion,
        stylePreset: params.stylePreset,
        motionStrength: params.motionStrength,
        referenceImage: referenceImageBase64,
        referenceImages: referenceImagesBase64, // Veo multiple refs
        startFrame: startFrameBase64,
        endFrame: endFrameBase64,
        motionVideo: motionVideoUrl,
        characterImage: characterImageUrl,
        characterOrientation: params.characterOrientation ?? params.sceneControlMode,
        videoDuration: params.videoDuration,
        motionSeconds: params.motionSeconds,
        sourceGenerationId: params.sourceGenerationId || null, // For extend mode
        qualityTier: params.qualityTier,
        negativePrompt: params.negativePrompt,
        cfgScale: params.cfgScale,
        cameraControl: params.cameraControl,
        multiPrompt: params.multiPrompt,
        shotType: params.shotType,
        generateAudio: params.generateAudio,
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

  // Get max width based on aspect ratio
  const getMaxWidth = () => {
    switch (currentRatio) {
      case '9:16':
        return 'max-w-sm max-h-[70vh]'; // ~384px ширина + ограничение по высоте для вертикального видео
      case '1:1':
        return 'max-w-xl'; // ~576px для квадрата
      case '4:3':
      case '16:9':
      default:
        return 'max-w-2xl'; // ~672px для горизонтального
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white relative">
      {isGenerating ? (
        <MobileGenerationProgressOverlay
          progress={progress}
          status={status}
          onCancel={cancel}
        />
      ) : null}

      {/* Mobile redesign shell */}
      <div className="lg:hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-35">
          <div className="absolute top-[-12%] left-[-10%] w-[55%] h-[35%] bg-[#8cf425]/12 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[35%] bg-purple-900/20 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 px-4 pt-4 pb-4">
          <header className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-full text-white/80 hover:bg-white/5"
              aria-label="Назад"
            >
              <span className="text-xl leading-none">‹</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs font-bold tracking-widest text-[#8cf425]">{balance}</span>
              <span className="text-[11px] text-yellow-300">⭐</span>
            </div>
            <button type="button" className="p-2 rounded-full text-white/80 hover:bg-white/5" aria-label="Меню">
              <span className="text-xl leading-none">⋯</span>
            </button>
          </header>

          <div className="rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl p-2 mb-4">
            <VideoGeneratorHiru
              initialModel={initialModel}
              onGenerate={handleGenerate}
              onRatioChange={handleRatioChange}
              isGeneratingProp={isGenerating}
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl p-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">Мои работы</h3>
            {generationHistory.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {generationHistory.slice(0, 6).map((item, i) => (
                  <button
                    key={item.id || i}
                    onClick={() => setVideoUrl(item.url)}
                    className="relative aspect-video bg-black/50 rounded-xl border border-white/10 overflow-hidden"
                  >
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-black/60 flex items-center justify-center">
                        <Play className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/50 py-6 text-center">Здесь появятся ваши видео</p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 pt-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Left Column: Generator Panel - Fixed Width */}
          <div className="lg:w-[380px] lg:flex-shrink-0" style={{ zIndex: 10 }}>
            <div className="lg:sticky lg:top-24">
              <VideoGeneratorHiru 
                initialModel={initialModel}
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
              <div className={`w-full ${getMaxWidth()}`}>
                <div className={`bg-[#1A1A1C] rounded-2xl border border-white/10 overflow-hidden shadow-sm ${currentRatio === '9:16' ? 'max-h-[70vh]' : ''}`}>
                  {isGenerating ? (
                    <div className={`relative ${getAspectClass()} bg-black/50 flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-[#8cf425] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Генерация видео...</p>
                        <p className="text-gray-500 text-xs">Это может занять до 2 минут</p>
                      </div>
                    </div>
                  ) : videoUrl ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className={`w-full bg-black ${currentRatio === '9:16' ? 'max-h-[70vh] object-contain' : ''}`}
                      />
                      <button
                        onClick={handleDownload}
                        className="absolute top-4 right-4 px-4 py-2 bg-[#8cf425] text-black text-sm font-medium rounded-lg shadow-lg hover:bg-[#d97706] transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Скачать
                      </button>
                    </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {generationHistory.map((item, i) => (
                    <button
                      key={item.id || i}
                      onClick={() => setVideoUrl(item.url)}
                      className="relative aspect-video bg-black/50 rounded-lg border border-white/10 overflow-hidden hover:border-[#8cf425] transition-colors group"
                    >
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-black/60 flex items-center justify-center">
                          <Play className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      {/* Play icon overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                      </div>
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
