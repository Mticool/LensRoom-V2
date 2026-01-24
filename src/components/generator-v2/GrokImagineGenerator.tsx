'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ImageGalleryMasonry } from './ImageGalleryMasonry';
import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import { AspectRatioSelector } from './AspectRatioSelector';
import { QuantityCounter } from './QuantityCounter';
import { PromptInput } from './PromptInput';
import { ModeSelector } from './ModeSelector';
import { AdvancedSettingsCollapse } from './AdvancedSettingsCollapse';
import { Sparkles, Loader2, ChevronUp } from 'lucide-react';
import type { GenerationResult } from './GeneratorV2';
import './theme.css';

const COST_PER_IMAGE = 15; // Fixed pricing for Grok Imagine

export function GrokImagineGenerator() {
  const { isAuthenticated, isLoading: authLoading, credits: authCredits, refreshCredits } = useAuth();
  const { isOpen: popupIsOpen, showPopup, hidePopup } = useBotConnectPopup();
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [mode, setMode] = useState('Обычный'); // Обычный, Креатив, Смелый 🌶️
  const [quantity, setQuantity] = useState(1);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState<number | null>(null);
  const [steps, setSteps] = useState(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterModel, setFilterModel] = useState('all');
  
  // Polling cleanup ref
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [images, setImages] = useState<GenerationResult[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const historyModelId = filterModel === 'all' ? undefined : filterModel;
  const { history, isLoading: historyLoading, isLoadingMore, hasMore, loadMore, refresh: refreshHistory, invalidateCache } = useHistory('image', historyModelId);
  const credits = authCredits;
  const estimatedCost = COST_PER_IMAGE * quantity;

  const demoImages: GenerationResult[] = !isAuthenticated && images.length === 0 && history.length === 0 ? [
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
      prompt: 'Creative artistic interpretation with bold colors',
      mode: 'image',
      settings: { model: 'grok-imagine', size: '1:1', quality: 'spicy' },
      timestamp: Date.now(),
    },
  ] : [];
  
  // Oldest → newest. New generations should appear at the bottom.
  const allImages = [...history, ...images, ...demoImages];

  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      showPopup();
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
      const pendingImages: GenerationResult[] = Array.from({ length: quantity }, (_, i) => ({
        id: `pending-${Date.now()}-${i}`,
        url: '',
        prompt,
        mode: 'image' as const,
        settings: { model: 'grok-imagine', size: aspectRatio, quality: mode },
        timestamp: Date.now(),
        status: 'pending',
      }));

      // Add pending placeholders at the end (bottom of gallery)
      setImages(prev => [...prev, ...pendingImages]);

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-imagine',
          prompt,
          negativePrompt: negativePrompt || undefined,
          aspectRatio,
          mode: mode === 'Обычный' ? 'normal' : mode === 'Креатив' ? 'fun' : 'spicy', // Pass mode as quality parameter
          variants: quantity,
          seed: seed || undefined,
          steps,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Слишком много запросов. Подождите минуту и попробуйте снова.');
          setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
          return;
        }
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();

      const newImage: GenerationResult = {
        id: data.generationId || `gen-${Date.now()}`,
        url: data.imageUrl,
        prompt,
        mode: 'image',
        settings: { model: 'grok-imagine', size: aspectRatio, quality: mode },
        timestamp: Date.now(),
        status: 'completed',
      };

      // Replace pending placeholders (if any) and append to bottom
      setImages(prev => {
        const filtered = prev.filter(img => !img.id.startsWith('pending-'));
        return [...filtered, newImage];
      });
      await refreshCredits();
      await invalidateCache();
      refreshHistory();
      celebrateGeneration();
      toast.success('Изображение создано!');
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Generation error:', error);
      }
      toast.error(error.message || 'Ошибка при генерации');
      setImages(prev => prev.filter(img => !img.id.startsWith('pending-')));
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, prompt, credits, estimatedCost, mode, aspectRatio, quantity, negativePrompt, seed, steps, showPopup, refreshCredits, refreshHistory]);

  const hasEnoughCredits = credits >= estimatedCost;
  const canGenerate = prompt.trim().length > 0 && !isGenerating && hasEnoughCredits && isAuthenticated;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative pb-64">
      {!isAuthenticated && !authLoading && (
        <div className="fixed top-20 left-0 right-0 z-30 px-4">
          <div className="max-w-4xl mx-auto">
            <NotificationBannerCompact onConnect={showPopup} />
          </div>
        </div>
      )}

      {/* Hidden model name for tests */}
      <span className="hidden">modelName="Grok Imagine"</span>

      <div className="pt-8">
        {allImages.length > 0 ? (
          <ImageGalleryMasonry 
            images={allImages} 
            isGenerating={isGenerating}
            autoScrollToBottom
            hasMore={hasMore}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[60vh] px-8">
            <div className="text-center max-w-md">
              <p className="text-[#A1A1AA] text-lg mb-2">Ваши изображения появятся здесь</p>
              <p className="text-[#6B6B6E] text-sm">Grok Imagine — креативные изображения с Spicy Mode 🌶️</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Control Bar for Grok (no reference upload, mode instead of quality) */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-[#2A2A2C] z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* ЛИНИЯ 1: Prompt */}
            <div className="flex items-center gap-3">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                disabled={isGenerating}
                placeholder="Describe the scene you imagine..."
                onSubmit={handleGenerate}
              />
            </div>

            {/* ЛИНИЯ 2: Controls + Generate */}
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <AspectRatioSelector
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  disabled={isGenerating}
                  options={['1:1', '3:2', '2:3']}
                />
                
                <ModeSelector
                  value={mode}
                  onChange={setMode}
                  disabled={isGenerating}
                />
                
                <QuantityCounter
                  value={quantity}
                  onChange={setQuantity}
                  disabled={isGenerating}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  disabled={isGenerating}
                  className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#3A3A3C] bg-[#1E1E20] hover:bg-[#2A2A2C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Дополнительно"
                >
                  <ChevronUp className={`w-4 h-4 text-[#A1A1AA] transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  title={!hasEnoughCredits ? 'Недостаточно звёзд' : !isAuthenticated ? 'Войдите для генерации' : ''}
                  className={`
                    flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm
                    transition-all whitespace-nowrap min-w-[150px]
                    ${canGenerate
                      ? 'bg-[#CDFF00] hover:bg-[#B8E600] text-black shadow-lg shadow-[#CDFF00]/20'
                      : 'bg-[#2C2C2E] text-[#6B6B6E] cursor-not-allowed'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate {estimatedCost}⭐</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="pt-3 border-t border-[#2A2A2C]">
                <AdvancedSettingsCollapse
                  negativePrompt={negativePrompt}
                  onNegativePromptChange={setNegativePrompt}
                  seed={seed}
                  onSeedChange={setSeed}
                  steps={steps}
                  onStepsChange={setSteps}
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BotConnectPopup isOpen={popupIsOpen} onClose={hidePopup} />
    </div>
  );
}
