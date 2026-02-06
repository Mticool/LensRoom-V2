'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import { UpscaleEmptyState, UpscaleSidebar, UpscaleImagePreview } from './upscale';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { computePrice } from '@/lib/pricing/pricing';
import './theme.css';

type TopazScale = '2k' | '4k' | '8k';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function TopazUpscaleGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  // State
  const [scale, setScale] = useState<TopazScale>('2k');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Polling ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // History
  const { 
    history, 
    isLoadingMore, 
    hasMore, 
    loadMore, 
    refresh: refreshHistory, 
    invalidateCache 
  } = useHistory('image', 'topaz-image-upscale');
  
  const credits = authCredits;
  const estimatedCost = computePrice('topaz-image-upscale', { quality: scale, variants: 1 }).stars;

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение (PNG, JPG, WEBP)');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Максимальный размер: 10МБ. Ваш файл: ${(file.size / 1024 / 1024).toFixed(1)}МБ`);
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSourceImage(base64);
      setResultImage(null);
      toast.success('Изображение загружено');
    };
    reader.onerror = () => {
      toast.error('Не удалось прочитать файл');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    setSourceImage(null);
    setResultImage(null);
    setScale('2k');
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        const results = Array.isArray(data?.results) ? data.results : [];
        const urls: string[] = results
          .map((r: unknown) => {
            if (!r || typeof r !== 'object') return '';
            const urlValue = (r as { url?: unknown }).url;
            return String(urlValue || '');
          })
          .filter((u: string) => !!u);
        if (data.status === 'completed' && urls[0]) {
          setResultImage(urls[0]);
          setIsProcessing(false);
          celebrateGeneration();
          toast.success('Апскейл завершён!');
          
          // Refresh credits and history asynchronously to avoid render loops
          setTimeout(async () => {
            await refreshCredits();
            invalidateCache();
            refreshHistory();
          }, 0);
          return;
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Обработка не удалась');
        }

        if (attempts < maxAttempts) {
          attempts++;
          pollingTimeoutRef.current = setTimeout(poll, 2000);
        } else {
          throw new Error('Превышено время ожидания');
        }
      } catch (error: unknown) {
        setIsProcessing(false);
        const message = error instanceof Error ? error.message : 'Ошибка получения результата';
        toast.error(message);
      }
    };

    poll();
  }, [refreshCredits, invalidateCache, refreshHistory]);

  // Handle upscale
  const handleUpscale = useCallback(async () => {
    if (!isAuthenticated) {
      showPopup();
      return;
    }

    if (!sourceImage) {
      toast.error('Загрузите изображение');
      return;
    }

    if (credits < estimatedCost) {
      toast.error(`Недостаточно звёзд. Нужно ${estimatedCost}⭐, у вас ${credits}⭐`);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'topaz-image-upscale',
          referenceImage: sourceImage,
          mode: 'i2i',
          scale: scale,
          upscaleFactor: scale === '8k' ? '8' : scale === '4k' ? '4' : '2',
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Слишком много запросов. Подождите минуту.');
          setIsProcessing(false);
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обработки');
      }

      const data = await response.json();

      // Check for immediate result
      if (data.status === 'completed' && data.results && data.results[0]) {
        setResultImage(data.results[0].url);
        setIsProcessing(false);
        celebrateGeneration();
        toast.success('Апскейл завершён!');
        
        // Refresh credits and history asynchronously to avoid render loops
        setTimeout(async () => {
          await refreshCredits();
          invalidateCache();
          refreshHistory();
        }, 0);
      } else if (data.jobId) {
        // Poll for results
        await pollJobStatus(data.jobId);
      } else {
        throw new Error('Неожиданный ответ сервера');
      }
    } catch (error: unknown) {
      setIsProcessing(false);
      const message = error instanceof Error ? error.message : 'Ошибка при обработке';
      toast.error(message);
    }
  }, [isAuthenticated, sourceImage, credits, estimatedCost, scale, showPopup, pollJobStatus, refreshCredits, invalidateCache, refreshHistory]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!resultImage) return;
    
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled-${scale}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Изображение скачано');
    } catch {
      toast.error('Не удалось скачать изображение');
    }
  }, [resultImage, scale]);

  // Handle new image
  const handleNewImage = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // Has uploaded image
  const hasImage = !!sourceImage;

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Notification Banner */}
        {isAuthenticated && <NotificationBannerCompact onConnect={showPopup} />}
        
        {/* Auth Required Banner */}
        {!authLoading && !isAuthenticated && (
          <div className="sticky top-0 z-40 bg-[#f59e0b] px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                <p className="text-sm font-medium text-black">
                  Войдите для обработки изображений • Получите 50⭐ в подарок
                </p>
              </div>
              <button
                onClick={showPopup}
                className="px-4 py-1.5 bg-black text-[#f59e0b] text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors whitespace-nowrap"
              >
                Войти через Telegram
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Left: Empty State or Image Preview */}
          {!hasImage ? (
            <UpscaleEmptyState 
              onFileSelect={handleFileSelect}
              disabled={authLoading}
            />
          ) : (
            <UpscaleImagePreview
              imageUrl={sourceImage!}
              resultUrl={resultImage || undefined}
              onRemove={handleReset}
              onUpscale={handleUpscale}
              onDownload={resultImage ? handleDownload : undefined}
              onNewImage={resultImage ? handleNewImage : undefined}
              isProcessing={isProcessing}
              disabled={!isAuthenticated || credits < estimatedCost}
            />
          )}

          {/* Right: Sidebar (only when image is loaded) */}
          {hasImage && (
            <UpscaleSidebar
              scale={scale}
              onScaleChange={setScale}
              onUpscale={handleUpscale}
              onReset={handleReset}
              isProcessing={isProcessing}
              disabled={!isAuthenticated}
              credits={credits}
              estimatedCost={estimatedCost}
            />
          )}
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="border-t border-[#27272A] bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto px-4 py-6">
              <h3 className="text-lg font-semibold text-white mb-4">История апскейла</h3>
              <ImageGalleryMasonry
                images={history}
                isGenerating={false}
                layout="grid"
                fullWidth
                autoScrollToBottom
                autoScrollBehavior="always"
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
            </div>
          </div>
        )}
      </div>

      <BotConnectPopup
        isOpen={popupIsOpen}
        onClose={hidePopup}
      />
    </>
  );
}
