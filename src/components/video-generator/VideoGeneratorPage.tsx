'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { computePrice } from '@/lib/pricing/compute-price';
import { getModelCapabilities } from '@/lib/video-model-capabilities';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { LoginDialog } from '@/components/auth/login-dialog';
import type { VideoMode, VideoQuality, TabType, VideoJob } from '@/types/video-generator';
import {
  VideoPreview,
  TimelineSlider,
  StatusBar,
  SettingsTabs,
  VideoSourceSelector,
  ModelSelector,
  VideoParamsControls,
  AdvancedSettings,
  CostEstimator,
  GenerateButton,
  JobQueue,
} from './index';
import { MotionTabContent } from './MotionTabContent';

export function VideoGeneratorPage() {
  // URL params for restoring generation settings
  const searchParams = useSearchParams();

  // Auth
  const { isAuthenticated, credits, refreshCredits } = useAuth();

  // Form state
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<VideoMode>('text');
  const [selectedModel, setSelectedModel] = useState('veo-3.1');
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [withSound, setWithSound] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // File uploads
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null);

  // Start/End Frame mode
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);

  // V2V mode
  const [v2vInputVideo, setV2vInputVideo] = useState<string | null>(null);

  // Video Edit mode
  const [editVideo, setEditVideo] = useState<string | null>(null);
  const [editRefImage, setEditRefImage] = useState<string | null>(null);
  const [keepAudio, setKeepAudio] = useState(true);

  // Advanced settings (Phase 2)
  const [negativePrompt, setNegativePrompt] = useState('');
  const [modelVariant, setModelVariant] = useState<string>('');
  const [resolution, setResolution] = useState<string>('');
  const [soundPreset, setSoundPreset] = useState<string>('');

  // UI state
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('video');

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Phase 3: Job Queue
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Video generation hook
  const {
    generate,
    isGenerating,
    progress,
    status,
    resultUrl,
    error,
    jobId,
  } = useVideoGeneration({
    onSuccess: (videoUrl) => {
      setVideoDuration(duration); // Set expected duration
      refreshCredits(); // Update credits after successful generation
    },
    onError: (error) => {
      console.error('[VideoGenerator] Generation error:', error);
    },
  });

  // Get model capabilities
  const modelCapabilities = useMemo(
    () => getModelCapabilities(selectedModel),
    [selectedModel]
  );

  // Update available options when model changes
  useEffect(() => {
    if (!modelCapabilities) return;

    // Check if current mode is supported, if not - switch to first available
    if (!modelCapabilities.availableModes.includes(mode)) {
      setMode(modelCapabilities.availableModes[0] || 'text');
    }

    // Check if current duration is supported, if not - switch to first available or closest
    if (!modelCapabilities.durationOptions.includes(duration)) {
      // Find closest duration
      const closest = modelCapabilities.durationOptions.reduce((prev, curr) =>
        Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
      );
      setDuration(closest);
    }

    // Check if current quality is supported, if not - switch to first available
    if (!modelCapabilities.qualityOptions.includes(quality)) {
      setQuality(modelCapabilities.qualityOptions[0] || '1080p');
    }

    // Check if current aspect ratio is supported, if not - switch to first available
    if (!modelCapabilities.aspectRatios.includes(aspectRatio)) {
      setAspectRatio(modelCapabilities.aspectRatios[0] || '16:9');
    }

    // Update audio support
    if (!modelCapabilities.supportsAudio) {
      setWithSound(false);
    }
  }, [selectedModel, modelCapabilities]); // Intentionally don't include current values to avoid loops

  // Calculate cost
  const estimatedCost = computePrice(selectedModel, {
    mode: mode === 'text' ? 't2v' : 'i2v',
    duration,
    videoQuality: quality,
    audio: withSound,
    variants: 1,
  }).stars;

  // Load parameters from URL (history integration)
  useEffect(() => {
    const generationId = searchParams.get('generationId');

    if (generationId) {
      // Load full generation data from API
      loadGenerationParams(generationId);
    } else {
      // Fallback: load from individual query params (backwards compatibility)
      const urlPrompt = searchParams.get('prompt');
      const urlModel = searchParams.get('model');
      const urlDuration = searchParams.get('duration');
      const urlQuality = searchParams.get('quality');
      const urlAspectRatio = searchParams.get('aspectRatio');
      const urlAudio = searchParams.get('audio');

      if (urlPrompt) setPrompt(urlPrompt);
      if (urlModel) setSelectedModel(urlModel);
      if (urlDuration) setDuration(parseInt(urlDuration));
      if (urlQuality) setQuality(urlQuality as VideoQuality);
      if (urlAspectRatio) setAspectRatio(urlAspectRatio);
      if (urlAudio !== null) setWithSound(urlAudio === 'true');
    }
  }, [searchParams]);

  // Load generation parameters from API
  const loadGenerationParams = async (id: string) => {
    try {
      const res = await fetch(`/api/generations/${id}`);
      if (!res.ok) throw new Error('Failed to load generation');

      const { generation } = await res.json();

      // Restore basic fields
      if (generation.prompt) setPrompt(generation.prompt);
      if (generation.model_id) setSelectedModel(generation.model_id);
      if (generation.aspect_ratio) setAspectRatio(generation.aspect_ratio);

      // Restore from params JSONB
      if (generation.params) {
        const { mode: apiMode, duration: genDuration, quality: genQuality, audio } = generation.params;

        // Map API mode to UI mode
        if (apiMode === 't2v') setMode('text');
        else if (apiMode === 'i2v') setMode('image');
        else if (apiMode === 'v2v' || apiMode === 'start_end') setMode('reference');

        if (genDuration) setDuration(genDuration);
        if (genQuality) setQuality(genQuality);
        if (typeof audio === 'boolean') setWithSound(audio);
      }

      toast.success('Настройки восстановлены');
    } catch (error) {
      console.error('Failed to load generation params:', error);
      toast.error('Не удалось загрузить настройки');
    }
  };

  // File upload handler
  const handleFileUpload = (file: File, field: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      // Set the appropriate state based on field
      switch (field) {
        case 'referenceImage':
          setReferenceImage(dataUrl);
          break;
        case 'referenceVideo':
          setReferenceVideo(dataUrl);
          setStartFrame(null); // Clear start frame when video uploaded
          break;
        case 'startFrame':
          setStartFrame(dataUrl);
          setReferenceVideo(null); // Clear reference video when start frame uploaded
          break;
        case 'endFrame':
          setEndFrame(dataUrl);
          break;
        case 'v2vInputVideo':
          setV2vInputVideo(dataUrl);
          break;
        case 'editVideo':
          setEditVideo(dataUrl);
          break;
        case 'editRefImage':
          setEditRefImage(dataUrl);
          break;
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate handler with full API integration
  const handleGenerate = async () => {
    // Check authentication
    if (!isAuthenticated) {
      setLoginOpen(true);
      toast.error('Требуется авторизация');
      return;
    }

    // Check credits
    if (credits < estimatedCost) {
      toast.error('Недостаточно звёзд для генерации');
      return;
    }

    // Validate prompt
    if (!prompt.trim()) {
      toast.error('Введите описание сцены');
      return;
    }

    // Validate reference files for non-text modes
    if (mode === 'image' && !referenceImage) {
      toast.error('Загрузите изображение для этого режима');
      return;
    }

    if (mode === 'reference' && !referenceVideo && !startFrame) {
      toast.error('Загрузите видео или start frame для этого режима');
      return;
    }

    if (mode === 'v2v' && !v2vInputVideo) {
      toast.error('Загрузите исходное видео для Video-to-Video режима');
      return;
    }

    if (mode === 'edit' && !editVideo) {
      toast.error('Загрузите видео для редактирования');
      return;
    }

    // Start generation
    await generate({
      prompt,
      mode,
      selectedModel,
      duration,
      quality,
      withSound,
      aspectRatio,
      referenceImage,
      referenceVideo,
      startFrame,
      endFrame,
      v2vInputVideo,
      editVideo,
      editRefImage,
      keepAudio,
      // Phase 2: Advanced settings
      negativePrompt,
      modelVariant,
      resolution,
      soundPreset,
    });
  };

  // Phase 3: Job Queue functions

  // Load recent jobs from library
  const loadRecentJobs = async () => {
    if (!isAuthenticated) return;

    setIsLoadingJobs(true);
    try {
      const response = await fetch('/api/library?type=video&limit=10');
      if (!response.ok) throw new Error('Failed to load jobs');

      const data = await response.json();

      // Map library items to VideoJob format
      const mappedJobs: VideoJob[] = (data.generations || []).map((gen: any) => ({
        jobId: gen.id,
        generationId: gen.id,
        status: gen.status === 'completed' ? 'completed' : gen.status === 'failed' ? 'failed' : 'processing',
        progress: gen.status === 'completed' ? 100 : gen.progress || 0,
        prompt: gen.params?.prompt || '',
        modelId: gen.params?.model || gen.model_id || 'unknown',
        modelName: gen.model_name,
        mode: gen.params?.mode || 'text',
        duration: gen.params?.duration || 5,
        quality: gen.params?.quality || '1080p',
        aspectRatio: gen.params?.aspectRatio || '16:9',
        resultUrl: gen.output_url,
        thumbnailUrl: gen.thumbnail_url,
        error: gen.error,
        createdAt: gen.created_at,
        updatedAt: gen.updated_at,
      }));

      setJobs(mappedJobs);
    } catch (error) {
      console.error('[VideoGenerator] Failed to load recent jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Add new job to queue
  const addJobToQueue = (newJob: VideoJob) => {
    setJobs((prevJobs) => [newJob, ...prevJobs]);
  };

  // Update job status
  const updateJobStatus = (jobId: string, updates: Partial<VideoJob>) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) => (job.jobId === jobId ? { ...job, ...updates } : job))
    );
  };

  // Retry failed job
  const handleRetry = async (jobId: string) => {
    const job = jobs.find((j) => j.jobId === jobId);
    if (!job) return;

    // Restore parameters and trigger new generation
    setPrompt(job.prompt);
    setMode(job.mode);
    setSelectedModel(job.modelId);
    setDuration(job.duration);
    setQuality(job.quality);
    setAspectRatio(job.aspectRatio);

    toast.info('Параметры восстановлены. Нажмите "Сгенерировать" для повтора.');
  };

  // Cancel active job
  const handleCancel = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        updateJobStatus(jobId, { status: 'failed', error: 'Отменено пользователем' });
        toast.success('Генерация отменена');
      } else {
        throw new Error('Failed to cancel job');
      }
    } catch (error) {
      console.error('[VideoGenerator] Failed to cancel job:', error);
      toast.error('Не удалось отменить генерацию');
    }
  };

  // Download result
  const handleDownload = async (jobId: string, url: string) => {
    try {
      // Create temporary anchor to trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `lensroom-video-${jobId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Скачивание началось');
    } catch (error) {
      console.error('[VideoGenerator] Failed to download:', error);
      toast.error('Не удалось скачать видео');
    }
  };

  // Load recent jobs on mount
  useEffect(() => {
    loadRecentJobs();
  }, [isAuthenticated]);

  // Watch for new generations and add to queue
  useEffect(() => {
    if (jobId && status !== 'idle') {
      // Check if job already exists in queue
      const existingJob = jobs.find((j) => j.jobId === jobId);

      if (!existingJob) {
        // Add new job to queue
        const newJob: VideoJob = {
          jobId,
          status: status === 'queued' ? 'queued' : status === 'processing' ? 'processing' : status === 'success' ? 'completed' : 'failed',
          progress,
          prompt,
          modelId: selectedModel,
          mode,
          duration,
          quality,
          aspectRatio,
          resultUrl: resultUrl || undefined,
          error: error || undefined,
          createdAt: new Date().toISOString(),
        };
        addJobToQueue(newJob);
      } else {
        // Update existing job
        updateJobStatus(jobId, {
          status: status === 'queued' ? 'queued' : status === 'processing' ? 'processing' : status === 'success' ? 'completed' : 'failed',
          progress,
          resultUrl: resultUrl || undefined,
          error: error || undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [jobId, status, progress, resultUrl, error]);

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-2xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3">
            Видео-генератор
          </h1>
          <p className="text-[var(--muted)] text-base md:text-lg">
            Создавай видео из текста, картинок и motion-референсов
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop Layout: 2 columns */}
        <div className="hidden md:grid md:grid-cols-[2fr_1fr] gap-6 lg:gap-8">
          {/* Left Column: Video Preview Panel */}
          <div className="space-y-6">
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-6">
              {/* Video Preview */}
              <VideoPreview
                videoUrl={resultUrl}
                status={status}
                aspectRatio={aspectRatio}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
              />

              {/* Timeline Slider */}
              <div className="mt-6">
                <TimelineSlider
                  currentTime={currentTime}
                  duration={videoDuration || duration}
                  onChange={setCurrentTime}
                  disabled={!resultUrl}
                />
              </div>

              {/* Status Bar */}
              <div className="mt-4">
                <StatusBar status={status} progress={progress} error={error} />
              </div>
            </div>

            {/* Job Queue (Phase 3) */}
            <JobQueue
              jobs={jobs}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onDownload={handleDownload}
              defaultExpanded={true}
            />
          </div>

          {/* Right Column: Settings Sidebar */}
          <div className="space-y-6">
            <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-6">
              {/* Settings Tabs */}
              <SettingsTabs 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                motionContent={
                  <MotionTabContent
                    isAuthenticated={isAuthenticated}
                    credits={credits}
                    refreshCredits={refreshCredits}
                    onLoginRequired={() => setLoginOpen(true)}
                  />
                }
              >
                {/* Video Tab Content */}
                <div className="space-y-6">
                  {/* Source Selector */}
                  <VideoSourceSelector
                    value={mode}
                    onChange={setMode}
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    onFileUpload={handleFileUpload}
                    referenceImage={referenceImage}
                    referenceVideo={referenceVideo}
                    startFrame={startFrame}
                    endFrame={endFrame}
                    v2vInputVideo={v2vInputVideo}
                    editVideo={editVideo}
                    editRefImage={editRefImage}
                    availableModes={modelCapabilities?.availableModes || ['text', 'image', 'reference']}
                  />

                  {/* Model Selector */}
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />

                  {/* Video Parameters */}
                  <VideoParamsControls
                    duration={duration}
                    onDurationChange={setDuration}
                    quality={quality}
                    onQualityChange={setQuality}
                    withSound={withSound}
                    onSoundChange={setWithSound}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                    durationOptions={modelCapabilities?.durationOptions || [3, 5, 10, 15]}
                    qualityOptions={modelCapabilities?.qualityOptions || ['720p', '1080p', '4K']}
                    aspectRatioOptions={modelCapabilities?.aspectRatios || ['16:9', '9:16', '1:1']}
                    supportsAudio={modelCapabilities?.supportsAudio ?? true}
                  />

                  {/* Advanced Settings (Phase 2) */}
                  <AdvancedSettings
                    negativePrompt={negativePrompt}
                    onNegativePromptChange={setNegativePrompt}
                    supportsNegativePrompt={modelCapabilities?.supportsNegativePrompt ?? false}
                    modelVariant={modelVariant}
                    onModelVariantChange={setModelVariant}
                    availableVariants={modelCapabilities?.availableVariants || []}
                    resolution={resolution}
                    onResolutionChange={setResolution}
                    availableResolutions={modelCapabilities?.availableResolutions || []}
                    soundPreset={soundPreset}
                    onSoundPresetChange={setSoundPreset}
                    availableSoundPresets={modelCapabilities?.availableSoundPresets || []}
                  />

                  {/* Cost Estimator */}
                  <CostEstimator
                    modelId={selectedModel}
                    mode={mode}
                    duration={duration}
                    quality={quality}
                    withSound={withSound}
                  />
                </div>
              </SettingsTabs>

              {/* Generate Button */}
              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <GenerateButton
                  onClick={handleGenerate}
                  isGenerating={isGenerating}
                  cost={estimatedCost}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout: Single column */}
        <div className="md:hidden space-y-6">
          {/* Video Preview */}
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-4">
            <VideoPreview
              videoUrl={resultUrl}
              status={status}
              aspectRatio={aspectRatio}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />

            {/* Timeline */}
            <div className="mt-4">
              <TimelineSlider
                currentTime={currentTime}
                duration={videoDuration || duration}
                onChange={setCurrentTime}
                disabled={!resultUrl}
              />
            </div>

            {/* Status */}
            <div className="mt-3">
              <StatusBar status={status} progress={progress} error={error} />
            </div>
          </div>

          {/* Job Queue (Phase 3 - Mobile) */}
          <JobQueue
            jobs={jobs}
            onRetry={handleRetry}
            onCancel={handleCancel}
            onDownload={handleDownload}
            defaultExpanded={false}
          />

          {/* Settings */}
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-4">
            {/* Settings Tabs (Mobile) */}
            <SettingsTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              motionContent={
                <MotionTabContent
                  isAuthenticated={isAuthenticated}
                  credits={credits}
                  refreshCredits={refreshCredits}
                  onLoginRequired={() => setLoginOpen(true)}
                />
              }
            >
              <div className="space-y-4">
                <VideoSourceSelector
                  value={mode}
                  onChange={setMode}
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onFileUpload={handleFileUpload}
                  referenceImage={referenceImage}
                  referenceVideo={referenceVideo}
                  startFrame={startFrame}
                  endFrame={endFrame}
                  v2vInputVideo={v2vInputVideo}
                  editVideo={editVideo}
                  editRefImage={editRefImage}
                  availableModes={modelCapabilities?.availableModes || ['text', 'image', 'reference']}
                />

                <ModelSelector value={selectedModel} onChange={setSelectedModel} />

                <VideoParamsControls
                  duration={duration}
                  onDurationChange={setDuration}
                  quality={quality}
                  onQualityChange={setQuality}
                  withSound={withSound}
                  onSoundChange={setWithSound}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  durationOptions={modelCapabilities?.durationOptions || [3, 5, 10, 15]}
                  qualityOptions={modelCapabilities?.qualityOptions || ['720p', '1080p', '4K']}
                  aspectRatioOptions={modelCapabilities?.aspectRatios || ['16:9', '9:16', '1:1']}
                  supportsAudio={modelCapabilities?.supportsAudio ?? true}
                />

                <AdvancedSettings
                  negativePrompt={negativePrompt}
                  onNegativePromptChange={setNegativePrompt}
                  supportsNegativePrompt={modelCapabilities?.supportsNegativePrompt ?? false}
                  modelVariant={modelVariant}
                  onModelVariantChange={setModelVariant}
                  availableVariants={modelCapabilities?.availableVariants || []}
                  resolution={resolution}
                  onResolutionChange={setResolution}
                  availableResolutions={modelCapabilities?.availableResolutions || []}
                  soundPreset={soundPreset}
                  onSoundPresetChange={setSoundPreset}
                  availableSoundPresets={modelCapabilities?.availableSoundPresets || []}
                />

                <CostEstimator
                  modelId={selectedModel}
                  mode={mode}
                  duration={duration}
                  quality={quality}
                  withSound={withSound}
                />
              </div>
            </SettingsTabs>
          </div>

          {/* Sticky Generate Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface-glass)] backdrop-blur-2xl border-t border-[var(--border)] z-50">
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              cost={estimatedCost}
            />
          </div>

          {/* Bottom padding to prevent content being hidden by sticky button */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </main>
  );
}
