'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from './Canvas';
import { PromptBar } from './PromptBar';
import { SettingsPanel } from './SettingsPanel';
import { HistorySidebar } from './HistorySidebar';
import { StyleGallery } from './StyleGallery';
import { BatchImageUploader, type UploadedImage } from './BatchImageUploader';
import { HistoryImagePicker } from './HistoryImagePicker';
import { BatchProgressBar, type BatchProgress } from './BatchProgressBar';
import { useAuth } from './hooks/useAuth';
import { useGeneration } from './hooks/useGeneration';
import { useHistory } from './hooks/useHistory';
import { useCostCalculation } from './hooks/useCostCalculation';
import { 
  Sparkles, Image as ImageIcon, Video, PanelLeft, Palette, 
  LogIn, Loader2, ArrowUpCircle, Settings2, X, Menu, Wand2, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { celebrateGeneration } from '@/lib/confetti';
import { BotConnectPopup, useBotConnectPopup, NotificationBannerCompact } from '@/components/notifications';
import './theme.css';

export type GeneratorMode = 'image' | 'video';

export interface GenerationSettings {
  model: string;
  size: string;
  style?: string;
  quality?: string;
  steps?: number;
  negativePrompt?: string;
  seed?: number;
  batchSize?: number;
  // Video specific
  duration?: number;
  audio?: boolean;
  modelVariant?: string;
  resolution?: string;
  // Midjourney specific
  mjSettings?: {
    stylization?: number;
    chaos?: number;
    weirdness?: number;
    variety?: number;
  };
}

export interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  mode: GeneratorMode;
  settings: GenerationSettings;
  timestamp: number;
  previewUrl?: string;
  status?: string;
}

interface GeneratorV2Props {
  defaultMode?: GeneratorMode;
}

export function GeneratorV2({ defaultMode = 'image' }: GeneratorV2Props) {
  const router = useRouter();
  const [mode, setMode] = useState<GeneratorMode>(defaultMode);
  const [showHistory, setShowHistory] = useState(false);
  const [showStyleGallery, setShowStyleGallery] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchImages, setBatchImages] = useState<UploadedImage[]>([]);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    current: 0,
    status: 'idle',
  });

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Hide history on mobile by default
      if (window.innerWidth < 768) {
        setShowHistory(false);
      } else {
        setShowHistory(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync mode with defaultMode on mount (fixes refresh issue)
  useEffect(() => {
    if (defaultMode !== mode) {
      setMode(defaultMode);
    }
  }, [defaultMode]);
  
  // Auth hook
  const { isAuthenticated, isLoading: authLoading, credits, username, refreshCredits } = useAuth();
  
  // Bot connect popup
  const botPopup = useBotConnectPopup();
  const [hasNotifications, setHasNotifications] = useState(false);
  
  // Check notifications status on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notifications/check', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setHasNotifications(data.enabled))
        .catch(() => {});
    }
  }, [isAuthenticated]);
  
  // History hook
  const { history, addToHistory, refresh: refreshHistory, isLoading: historyLoading } = useHistory(mode);

  // Generation hook
  const { generate, isGenerating, error, clearError } = useGeneration({
    onSuccess: (result) => {
      setCurrentResult(result);
      addToHistory(result);
      refreshCredits();
      toast.success('Генерация завершена!');
      // 🎉 Confetti celebration
      celebrateGeneration();
      // Show bot connect popup after first generation (if no notifications)
      botPopup.showAfterGeneration(hasNotifications);
    },
    onError: (err) => {
      toast.error(err);
    },
    onCreditsUsed: (amount) => {
      toast.info(`Списано ${amount} ⭐`);
    },
  });

  // Load settings from localStorage
  const [settings, setSettings] = useState<GenerationSettings>(() => {
    return {
      model: defaultMode === 'video' ? 'veo-3.1' : 'nano-banana',
      size: '1:1',
      quality: defaultMode === 'video' ? 'fast' : 'turbo',
      duration: 5,
    };
  });

  // Hydrate settings from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const saved = localStorage.getItem('lensroom-generator-v2-settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        } catch {
          // ignore
        }
      }
    }
  }, [mounted]);

  // Cost calculation (must be after settings)
  const { stars: estimatedCost } = useCostCalculation(mode, settings);

  // Update default model when mode changes
  useEffect(() => {
    if (!mounted) return;
    
    if (mode === 'video' && !settings.model.includes('kling') && !settings.model.includes('veo') && !settings.model.includes('wan') && !settings.model.includes('sora')) {
      setSettings(prev => ({
        ...prev,
        model: 'veo-3.1',
        quality: 'fast',
        duration: 5,
      }));
    } else if (mode === 'image' && (settings.model.includes('kling') || settings.model.includes('veo') || settings.model.includes('wan') || settings.model.includes('sora'))) {
      setSettings(prev => ({
        ...prev,
        model: 'nano-banana',
        quality: 'turbo',
      }));
    }
  }, [mode, mounted, settings.model]);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('lensroom-generator-v2-settings', JSON.stringify(settings));
    }
  }, [settings, mounted]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('textarea')?.focus();
      }
      if (e.key === 'Escape') {
        setShowStyleGallery(false);
        setShowHotkeys(false);
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShowHotkeys(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;
    
    if (!isAuthenticated) {
      toast.error('Войдите для генерации');
      return;
    }

    clearError();

    // Batch режим - обрабатываем несколько изображений
    if (batchMode && batchImages.length > 0) {
      const totalCost = estimatedCost * batchImages.length;
      
      // Проверяем баланс
      if (credits < totalCost) {
        toast.error(`Недостаточно кредитов. Нужно: ${totalCost}⭐, у вас: ${credits}⭐`);
        return;
      }

      // Подтверждение
      const confirmed = window.confirm(
        `Обработать ${batchImages.length} изображений?\n` +
        `Стоимость: ${totalCost}⭐\n` +
        `У вас: ${credits}⭐`
      );

      if (!confirmed) return;

      // Инициализируем прогресс
      setBatchProgress({
        total: batchImages.length,
        completed: 0,
        failed: 0,
        current: 0,
        status: 'processing',
        currentPrompt: prompt,
      });

      let successCount = 0;
      let failCount = 0;

      // Обрабатываем последовательно
      for (let i = 0; i < batchImages.length; i++) {
        const image = batchImages[i];
        
        // Обновляем текущий индекс
        setBatchProgress(prev => ({
          ...prev,
          current: i + 1,
        }));
        
        try {
          await generate(prompt, mode, settings, image.preview);
          
          successCount++;
          
          // Обновляем прогресс
          setBatchProgress(prev => ({
            ...prev,
            completed: successCount,
          }));

          // Небольшая пауза между запросами
          if (i < batchImages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          failCount++;
          
          // Обновляем прогресс с ошибкой
          setBatchProgress(prev => ({
            ...prev,
            failed: failCount,
          }));
          
          console.error(`Batch image ${i} failed:`, error);
        }
      }

      // Завершаем прогресс
      setBatchProgress(prev => ({
        ...prev,
        status: successCount > 0 ? 'completed' : 'error',
      }));

      // Итоговое уведомление
      if (successCount > 0) {
        toast.success(
          `Готово! Обработано: ${successCount}/${batchImages.length}`,
          { duration: 5000 }
        );
        celebrateGeneration();
      }

      if (failCount > 0) {
        toast.error(`Не удалось обработать: ${failCount}`);
      }

      // Сбрасываем прогресс через 3 секунды
      setTimeout(() => {
        setBatchProgress({
          total: 0,
          completed: 0,
          failed: 0,
          current: 0,
          status: 'idle',
        });
      }, 3000);

      // Обновляем кредиты
      refreshCredits();
      refreshHistory();

      return;
    }

    // Обычная генерация (single image или без референса)
    await generate(prompt, mode, settings, referenceImage);
  }, [mode, settings, isGenerating, isAuthenticated, generate, clearError, referenceImage, batchMode, batchImages, estimatedCost, credits, refreshCredits, refreshHistory]);

  const handleSelectFromHistory = useCallback((result: GenerationResult) => {
    setCurrentResult(result);
  }, []);

  const handleExampleClick = useCallback((prompt: string) => {
    setCurrentPrompt(prompt);
  }, []);

  const handleStyleSelect = useCallback((stylePrompt: string) => {
    setCurrentPrompt(prev => {
      if (!prev.trim()) return stylePrompt;
      return `${prev}, ${stylePrompt}`;
    });
  }, []);

  const handleCopyPrompt = useCallback((prompt: string) => {
    setCurrentPrompt(prompt);
    navigator.clipboard.writeText(prompt);
    toast.success('Промпт скопирован');
  }, []);

  const handleRepeatGeneration = useCallback((result: GenerationResult) => {
    setCurrentPrompt(result.prompt);
    setSettings(result.settings);
    setMode(result.mode);
  }, []);

  const handleEditFromHistory = useCallback(async (result: GenerationResult) => {
    try {
      // Загружаем изображение как blob
      const imageUrl = result.previewUrl || result.url;
      if (!imageUrl) {
        toast.error('Изображение недоступно');
        return;
      }

      toast.loading('Загрузка изображения...', { id: 'edit-load' });

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Конвертируем в base64 dataURL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        
        if (batchMode) {
          // Добавляем в batch режим
          const newImage: UploadedImage = {
            id: crypto.randomUUID(),
            preview: dataUrl,
            status: 'ready',
            source: 'history',
          };
          setBatchImages(prev => [...prev, newImage]);
          toast.success('Изображение добавлено в Batch', { id: 'edit-load' });
        } else {
          // Включаем Remix режим
          setReferenceImage(dataUrl);
          toast.success('Изображение загружено для редактирования', { id: 'edit-load' });
        }

        // Заполняем промпт
        setCurrentPrompt(result.prompt);

        // Скроллим к промпт-бару
        setTimeout(() => {
          const textarea = document.querySelector('textarea');
          if (textarea) {
            textarea.scrollIntoView({ 
              behavior: 'smooth',
              block: 'center'
            });
            textarea.focus();
          }
        }, 100);
      };

      reader.onerror = () => {
        toast.error('Ошибка загрузки изображения', { id: 'edit-load' });
      };

      reader.readAsDataURL(blob);

    } catch (error) {
      console.error('Edit from history error:', error);
      toast.error('Не удалось загрузить изображение', { id: 'edit-load' });
    }
  }, [batchMode]);

  const handleLogin = () => {
    router.push('/login');
  };

  // Show minimal loading state during hydration
  if (!mounted) {
    return (
      <div 
        data-generator-v2="true"
        className="h-screen w-screen overflow-hidden bg-[var(--gen-bg)] flex items-center justify-center font-[Inter,system-ui,sans-serif]"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gen-primary)]" />
          <span className="text-sm text-[var(--gen-muted)]">Загрузка...</span>
        </div>
      </div>
    );
  }

  // Always render full UI - no loading screen
  return (
    <div 
      data-generator-v2="true"
      className="h-[calc(100vh-64px)] w-screen overflow-hidden bg-[var(--gen-bg)] flex font-[Inter,system-ui,sans-serif] mt-16"
    >
      {/* Settings Panel - Left (hidden on mobile, shown via overlay) */}
      {!isMobile && (
        <SettingsPanel
          mode={mode}
          settings={settings}
          onSettingsChange={setSettings}
          referenceImage={referenceImage}
          onReferenceImageChange={setReferenceImage}
        />
      )}

      {/* Mobile Settings Overlay */}
      {isMobile && showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSettings(false)}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-[var(--gen-surface)] animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--gen-border)]">
              <span className="text-sm font-medium text-[var(--gen-text)]">Настройки</span>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--gen-surface2)] text-[var(--gen-muted2)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-60px)]">
              <SettingsPanel
                mode={mode}
                settings={settings}
                onSettingsChange={setSettings}
                referenceImage={referenceImage}
                onReferenceImageChange={setReferenceImage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-[var(--gen-bg)]">
        {/* Header - Responsive */}
        <div className="h-12 md:h-12 border-b border-[var(--gen-border)] bg-[var(--gen-surface)] flex items-center justify-between px-3 md:px-4">
          {/* Left: Menu (mobile) + Mode Indicator */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 rounded-lg hover:bg-[var(--gen-surface2)] text-[var(--gen-muted)] hover:text-[var(--gen-text)] transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

          {/* Center: Mode Switcher & Styles */}
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center bg-[var(--gen-surface2)] rounded-lg p-0.5">
              <button
                onClick={() => setMode('image')}
                className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 md:gap-1.5 ${
                  mode === 'image'
                    ? 'bg-[var(--gen-primary)] text-[#0F0F10] shadow-lg shadow-[var(--gen-primary)]/20'
                    : 'text-[var(--gen-muted)] hover:text-[var(--gen-text)]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Фото</span>
              </button>
              <button
                onClick={() => setMode('video')}
                className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 md:gap-1.5 ${
                  mode === 'video'
                    ? 'bg-[var(--gen-primary)] text-[#0F0F10] shadow-lg shadow-[var(--gen-primary)]/20'
                    : 'text-[var(--gen-muted)] hover:text-[var(--gen-text)]'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Видео</span>
              </button>
              <button
                onClick={() => router.push('/create/products')}
                className="px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 md:gap-1.5 text-[var(--gen-muted)] hover:text-[var(--gen-text)]"
              >
                <span className="text-sm">🛍️</span>
                <span className="hidden xs:inline">E-com</span>
              </button>
            </div>

            <button
              onClick={() => setShowStyleGallery(true)}
              className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-[var(--gen-surface2)] hover:bg-[var(--gen-surface3)] text-[var(--gen-muted)] hover:text-[var(--gen-text)] transition-all flex items-center gap-1.5 text-xs"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Стили</span>
            </button>

            {/* Remix button - включает режим редактирования */}
            {mode === 'image' && !batchMode && (
              <button
                onClick={() => {
                  if (!referenceImage) {
                    // Если нет референса - показываем подсказку
                    toast.info('Загрузите изображение в настройках для редактирования');
                    // Можно открыть input для загрузки
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReferenceImage(reader.result as string);
                          toast.success('Изображение загружено. Опишите изменения!');
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  } else {
                    // Если есть референс - очищаем (toggle)
                    setReferenceImage(null);
                    toast.info('Режим Remix выключен');
                  }
                }}
                className={`p-1.5 md:px-3 md:py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  referenceImage
                    ? 'bg-[var(--gen-primary)] text-[#0F0F10] shadow-lg shadow-[var(--gen-primary)]/20'
                    : 'bg-[var(--gen-surface2)] hover:bg-[var(--gen-surface3)] text-[var(--gen-muted)] hover:text-[var(--gen-text)]'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{referenceImage ? 'Remix ON' : 'Remix'}</span>
              </button>
            )}

            {/* Batch button - включает пакетный режим */}
            {mode === 'image' && (
              <button
                onClick={() => {
                  const newBatchMode = !batchMode;
                  setBatchMode(newBatchMode);
                  if (newBatchMode) {
                    // Переходим в batch режим
                    if (referenceImage) {
                      // Конвертируем текущий референс в batch
                      setBatchImages([{
                        id: crypto.randomUUID(),
                        preview: referenceImage,
                        status: 'ready',
                      }]);
                      setReferenceImage(null);
                    }
                    toast.info('Batch режим включен - загрузите несколько изображений');
                  } else {
                    // Выключаем batch режим
                    setBatchImages([]);
                    toast.info('Batch режим выключен');
                  }
                }}
                className={`p-1.5 md:px-3 md:py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  batchMode
                    ? 'bg-[var(--gen-primary)] text-[#0F0F10] shadow-lg shadow-[var(--gen-primary)]/20'
                    : 'bg-[var(--gen-surface2)] hover:bg-[var(--gen-surface3)] text-[var(--gen-muted)] hover:text-[var(--gen-text)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {batchMode ? `Batch (${batchImages.length})` : 'Batch'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setSettings(prev => ({ ...prev, model: 'topaz-image-upscale' }));
                setMode('image');
                toast.info('Выберите изображение для апскейла');
              }}
              className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-[var(--gen-surface2)] hover:bg-[var(--gen-surface3)] text-[var(--gen-muted)] hover:text-[var(--gen-text)] transition-all flex items-center gap-1.5 text-xs hidden sm:flex"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Upscale</span>
            </button>
          </div>

          {/* Right: Credits & Auth */}
          <div className="flex items-center gap-2 md:gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--gen-surface2)]">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-medium text-[var(--gen-text)]">
                    {credits.toLocaleString()} ⭐
                  </span>
                </div>
                {username && !isMobile && (
                  <span className="text-[11px] text-[var(--gen-muted2)]">@{username}</span>
                )}
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-2 md:px-3 py-1.5 rounded-lg bg-[var(--gen-primary)] hover:bg-[#22D3EE] text-[#0F0F10] text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Войти</span>
              </button>
            )}
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-lg hover:bg-[var(--gen-surface2)] transition-colors text-[var(--gen-muted2)] hover:text-[var(--gen-text)] hidden md:block"
              title={showHistory ? "Скрыть историю" : "Показать историю"}
            >
              <PanelLeft className={`w-4 h-4 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden bg-[var(--gen-bg)]">
          <Canvas
            result={currentResult}
            isGenerating={isGenerating}
            mode={mode}
            onExampleClick={handleExampleClick}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            batchMode={batchMode}
            batchImages={batchImages}
            onBatchImagesChange={setBatchImages}
          />
        </div>

        {/* Prompt Bar */}
        <div className="px-3 md:px-6 pt-3 md:pt-4 pb-4 md:pb-8 bg-[var(--gen-bg)]">
          <PromptBar
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            mode={mode}
            value={currentPrompt}
            onChange={setCurrentPrompt}
            disabled={!isAuthenticated}
            credits={credits}
            estimatedCost={estimatedCost}
          />

          {/* Batch Image Uploader - под промптом */}
          {batchMode && mode === 'image' && (
            <div className="mt-4 max-w-3xl mx-auto">
              <BatchImageUploader
                images={batchImages}
                onImagesChange={setBatchImages}
                maxImages={10}
                showHistoryButton
                onSelectFromHistory={() => setShowHistoryPicker(true)}
              />
            </div>
          )}
          
          {/* Mobile: History button below prompt */}
          {isMobile && history.length > 0 && !batchMode && (
            <button
              onClick={() => setShowHistory(true)}
              className="mt-3 w-full py-2 rounded-lg bg-[var(--gen-surface2)] hover:bg-[var(--gen-surface3)] text-[var(--gen-muted)] hover:text-[var(--gen-text)] transition-all flex items-center justify-center gap-2 text-xs"
            >
              <PanelLeft className="w-3.5 h-3.5" />
              История ({history.length})
            </button>
          )}
        </div>

        {/* History Image Picker Modal */}
        {batchMode && (
          <HistoryImagePicker
            isOpen={showHistoryPicker}
            onClose={() => setShowHistoryPicker(false)}
            onSelect={(selected) => {
              const historyImages: UploadedImage[] = selected.map(img => ({
                id: img.id,
                preview: img.preview,
                status: 'ready',
                source: 'history',
              }));
              setBatchImages(prev => [...prev, ...historyImages]);
              toast.success(`Добавлено ${selected.length} изображений из истории`);
            }}
            maxSelect={10 - batchImages.length}
            mode="image"
          />
        )}
      </div>

      {/* History Sidebar - Right (Desktop) */}
      {showHistory && !isMobile && (
        <div className="animate-in slide-in-from-right duration-300">
            <HistorySidebar
              isOpen={showHistory}
              history={history}
              onSelect={handleSelectFromHistory}
              onClose={() => setShowHistory(false)}
              onCopyPrompt={handleCopyPrompt}
              onRepeat={handleRepeatGeneration}
              onEdit={handleEditFromHistory}
              isLoading={historyLoading}
              onRefresh={refreshHistory}
              onConnectBot={botPopup.showPopup}
            />
        </div>
      )}

      {/* History Sidebar - Mobile Overlay */}
      {showHistory && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHistory(false)}>
          <div 
            className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <HistorySidebar
              isOpen={showHistory}
              history={history}
              onSelect={(result) => {
                handleSelectFromHistory(result);
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
              onCopyPrompt={handleCopyPrompt}
              onRepeat={handleRepeatGeneration}
              onEdit={handleEditFromHistory}
              isLoading={historyLoading}
              onRefresh={refreshHistory}
              onConnectBot={botPopup.showPopup}
            />
          </div>
        </div>
      )}

      {/* Style Gallery Modal */}
      <StyleGallery
        isOpen={showStyleGallery}
        onClose={() => setShowStyleGallery(false)}
        onSelectStyle={handleStyleSelect}
      />

      {/* Hotkeys Modal */}
      {showHotkeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowHotkeys(false)}>
          <div className="bg-[var(--gen-surface)] rounded-2xl border border-[var(--gen-border)] p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--gen-text)] mb-4">⌨️ Горячие клавиши</h3>
            <div className="space-y-3">
              {[
                { keys: ['⌘/Ctrl', 'Enter'], desc: 'Создать' },
                { keys: ['⌘/Ctrl', 'K'], desc: 'Фокус на промпт' },
                { keys: ['Escape'], desc: 'Закрыть модалки' },
                { keys: ['?'], desc: 'Показать подсказки' },
              ].map((hotkey, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--gen-muted)]">{hotkey.desc}</span>
                  <div className="flex gap-1">
                    {hotkey.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 rounded bg-[var(--gen-surface2)] text-[var(--gen-text)] text-xs font-mono border border-[#3F3F46]">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Toast handled by sonner */}
      
      {/* Bot Connect Popup */}
      <BotConnectPopup
        isOpen={botPopup.isOpen}
        onClose={botPopup.hidePopup}
        hasNotifications={hasNotifications}
        onSuccess={() => {
          setHasNotifications(true);
          refreshCredits();
        }}
      />

      {/* Batch Progress Bar */}
      <BatchProgressBar
        progress={batchProgress}
        onCancel={() => {
          setBatchProgress({
            total: 0,
            completed: 0,
            failed: 0,
            current: 0,
            status: 'idle',
          });
          toast.info('Обработка отменена');
        }}
      />
    </div>
  );
}
