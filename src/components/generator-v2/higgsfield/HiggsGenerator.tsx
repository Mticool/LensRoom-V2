'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { HiggsGallery } from './HiggsGallery';
import { HiggsPromptBar } from './HiggsPromptBar';
import { HiggsSettingsModal } from './HiggsSettingsModal';
import { useAuth } from '../hooks/useAuth';
import { celebrateGeneration } from '@/lib/confetti';
import { LoginDialog } from '@/components/auth/login-dialog';
import type { GenerationResult } from '../GeneratorV2';
import './higgsfield.css';

// Quality mapping: UI labels → API values
const QUALITY_MAPPING: Record<string, string> = {
  '1K': 'balanced',
  '2K': 'balanced',
  '4K': 'quality',
};

// Cost per image based on quality
const COST_PER_IMAGE: Record<string, number> = {
  '1K': 30,
  '2K': 30,
  '4K': 40,
};

// Aspect ratio options
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

// Quality options
const QUALITY_OPTIONS = ['1K', '2K', '4K'];

export function HiggsGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits, refreshCredits } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Core state
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [quality, setQuality] = useState('2K');
  const [quantity, setQuantity] = useState(1);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpg'>('png');

  // Reference image for i2i
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_referenceFile, setReferenceFile] = useState<File | null>(null);

  // Advanced settings
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GenerationResult[]>([]);

  // Use credits from auth hook
  const estimatedCost = COST_PER_IMAGE[quality] * quantity;

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    if (credits < estimatedCost) {
      toast.error('Недостаточно звёзд');
      return;
    }

    setIsGenerating(true);

    try {
      // Clear previous and set pending
      const pendingImages: GenerationResult[] = Array.from({ length: quantity }, (_, i) => ({
        id: `pending-${Date.now()}-${i}`,
        url: '',
        prompt,
        mode: 'image' as const,
        settings: {
          model: 'nano-banana-pro',
          size: aspectRatio,
          quality: QUALITY_MAPPING[quality],
        },
        timestamp: Date.now(),
        status: 'pending',
      }));

      // Replace all images with pending (Higgsfield style - overwrites previous)
      setImages(pendingImages);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          quality: QUALITY_MAPPING[quality],
          outputFormat,
          variants: quantity,
          seed: seed || undefined,
          mode: referenceImage ? 'i2i' : 't2i',
          referenceImage: referenceImage || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Слишком много запросов. Подождите минуту.');
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Ошибка генерации');
      }

      const data = await response.json();

      // Check if results are immediately available
      if (data.status === 'completed' && data.results && data.results.length > 0) {
        const newImages: GenerationResult[] = data.results.map(
          (result: { url: string }, i: number) => ({
            id: `${Date.now()}-${i}`,
            url: result.url,
            prompt,
            mode: 'image' as const,
            settings: {
              model: 'nano-banana-pro',
              size: aspectRatio,
              quality: QUALITY_MAPPING[quality],
            },
            timestamp: Date.now(),
          })
        );

        // Replace with new images (Higgsfield style)
        setImages(newImages);

        celebrateGeneration();
        toast.success(`Готово! ${newImages.length} изображений`);
      } else if (data.jobId) {
        // Poll for results
        await pollJobStatus(data.jobId, pendingImages.map((img) => img.id));
      }

      await refreshCredits();
    } catch (error: unknown) {
      console.error('Generation error:', error);
      const message = error instanceof Error ? error.message : 'Ошибка генерации';
      toast.error(message);
      setImages((prev) => prev.filter((img) => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    prompt,
    aspectRatio,
    quality,
    quantity,
    negativePrompt,
    seed,
    outputFormat,
    referenceImage,
    credits,
    estimatedCost,
    refreshCredits,
  ]);

  // Poll job status
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pollJobStatus = async (jobId: string, pendingIds: string[]) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed' && data.urls) {
          const newImages: GenerationResult[] = data.urls.map((url: string, i: number) => ({
            id: `${Date.now()}-${i}`,
            url,
            prompt,
            mode: 'image' as const,
            settings: {
              model: 'nano-banana-pro',
              size: aspectRatio,
              quality: QUALITY_MAPPING[quality],
            },
            timestamp: Date.now(),
          }));

          // Replace with new images (Higgsfield style)
          setImages(newImages);

          celebrateGeneration();
          toast.success(`Готово! ${newImages.length} изображений`);
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Генерация не удалась');
        }

        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          throw new Error('Превышено время ожидания');
        }
      } catch (error: unknown) {
        console.error('Polling error:', error);
        const message = error instanceof Error ? error.message : 'Ошибка получения результата';
        toast.error(message);
        setImages([]);
      }
    };

    poll();
  };

  // Handle image click for full view
  const handleImageClick = useCallback((image: GenerationResult) => {
    window.open(image.url, '_blank');
  }, []);

  return (
    <div className="higgs-container">
      {/* Auth Banner */}
      {!authLoading && !isAuthenticated && (
        <div className="higgs-auth-banner">
          <div className="higgs-auth-banner-content">
            <div className="higgs-auth-banner-dot" />
            <p>Войдите для генерации изображений • Получите 50⭐ в подарок</p>
          </div>
          <button onClick={() => setLoginOpen(true)} className="higgs-auth-banner-btn">
            Войти через Telegram
          </button>
        </div>
      )}

      {/* Gallery - tight grid */}
      <HiggsGallery
        images={images}
        isGenerating={isGenerating}
        aspectRatio={aspectRatio}
        onImageClick={handleImageClick}
      />

      {/* Bottom Prompt Bar */}
      <HiggsPromptBar
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        disabled={authLoading || !isAuthenticated}
        credits={credits}
        estimatedCost={estimatedCost}
        aspectRatio={aspectRatio}
        quality={quality}
        quantity={quantity}
        onSettingsOpen={() => setSettingsOpen(true)}
        referenceImage={referenceImage}
        onReferenceImageChange={setReferenceImage}
        onReferenceFileChange={setReferenceFile}
      />

      {/* Settings Modal */}
      <HiggsSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        quality={quality}
        onQualityChange={setQuality}
        quantity={quantity}
        onQuantityChange={setQuantity}
        outputFormat={outputFormat}
        onOutputFormatChange={setOutputFormat}
        negativePrompt={negativePrompt}
        onNegativePromptChange={setNegativePrompt}
        seed={seed}
        onSeedChange={setSeed}
        aspectRatioOptions={ASPECT_RATIOS}
        qualityOptions={QUALITY_OPTIONS}
        estimatedCost={estimatedCost}
      />

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
