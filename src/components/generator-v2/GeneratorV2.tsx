'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from './Canvas';
import { PromptBar } from './PromptBar';
import { SettingsPanel } from './SettingsPanel';
import { HistorySidebar } from './HistorySidebar';
import { StyleGallery } from './StyleGallery';
import { useAuth } from './hooks/useAuth';
import { useGeneration } from './hooks/useGeneration';
import { useHistory } from './hooks/useHistory';
import { useCostCalculation } from './hooks/useCostCalculation';
import { 
  Sparkles, Image as ImageIcon, Video, PanelLeft, Palette, 
  LogIn, Loader2, ArrowUpCircle, Home, Settings2, X, Menu
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

  // Check if mobile
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
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
  const { generate, isGenerating, progress, error, clearError } = useGeneration({
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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lensroom-generator-v2-settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return {
      model: mode === 'video' ? 'veo-3.1' : 'nano-banana',
      size: '1:1',
      quality: mode === 'video' ? 'fast' : 'turbo',
      duration: 5,
    };
  });

  // Cost calculation (must be after settings)
  const { stars: estimatedCost } = useCostCalculation(mode, settings);

  // Update default model when mode changes
  useEffect(() => {
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
  }, [mode]);

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lensroom-generator-v2-settings', JSON.stringify(settings));
    }
  }, [settings]);

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
    await generate(prompt, mode, settings, referenceImage);
  }, [mode, settings, isGenerating, isAuthenticated, generate, clearError, referenceImage]);

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

  const handleLogin = () => {
    router.push('/login');
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#00D9FF] animate-spin mx-auto" />
          <p className="mt-4 text-[#A1A1AA]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-generator-v2="true"
      className="h-screen w-screen overflow-hidden bg-[#0F0F10] flex font-[Inter,system-ui,sans-serif]"
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
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-[#18181B] animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
              <span className="text-sm font-medium text-white">Настройки</span>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#71717A]"
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
      <div className="flex-1 flex flex-col relative bg-[#0F0F10]">
        {/* Header - Responsive */}
        <div className="h-12 md:h-12 border-b border-[#27272A] bg-[#18181B] flex items-center justify-between px-3 md:px-4">
          {/* Left: Menu (mobile) + Logo & Home */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#52525B] hover:text-white transition-colors hidden md:block"
              title="На главную"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-sm font-semibold text-white hidden sm:block">LensRoom</span>
              <span className="px-1.5 py-0.5 rounded bg-[#27272A] text-[#71717A] text-[10px] font-medium hidden sm:block">
                2.0
              </span>
            </div>
          </div>

          {/* Center: Mode Switcher & Styles */}
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center bg-[#27272A] rounded-lg p-0.5">
              <button
                onClick={() => setMode('image')}
                className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 md:gap-1.5 ${
                  mode === 'image'
                    ? 'bg-[#00D9FF] text-[#0F0F10] shadow-lg shadow-[#00D9FF]/20'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Фото</span>
              </button>
              <button
                onClick={() => setMode('video')}
                className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1 md:gap-1.5 ${
                  mode === 'video'
                    ? 'bg-[#00D9FF] text-[#0F0F10] shadow-lg shadow-[#00D9FF]/20'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Видео</span>
              </button>
            </div>

            <button
              onClick={() => setShowStyleGallery(true)}
              className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white transition-all flex items-center gap-1.5 text-xs"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Стили</span>
            </button>

            <button
              onClick={() => {
                setSettings(prev => ({ ...prev, model: 'topaz-image-upscale' }));
                setMode('image');
                toast.info('Выберите изображение для апскейла');
              }}
              className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white transition-all flex items-center gap-1.5 text-xs hidden sm:flex"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Upscale</span>
            </button>
          </div>

          {/* Right: Credits & Auth */}
          <div className="flex items-center gap-2 md:gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#27272A]">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-medium text-white">
                    {credits.toLocaleString()} ⭐
                  </span>
                </div>
                {username && !isMobile && (
                  <span className="text-[11px] text-[#71717A]">@{username}</span>
                )}
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-2 md:px-3 py-1.5 rounded-lg bg-[#00D9FF] hover:bg-[#22D3EE] text-[#0F0F10] text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Войти</span>
              </button>
            )}
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-lg hover:bg-[#27272A] transition-colors text-[#52525B] hover:text-white hidden md:block"
              title={showHistory ? "Скрыть историю" : "Показать историю"}
            >
              <PanelLeft className={`w-4 h-4 transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden bg-[#0F0F10]">
          <Canvas
            result={currentResult}
            isGenerating={isGenerating}
            mode={mode}
            onExampleClick={handleExampleClick}
            progress={progress}
          />
        </div>

        {/* Prompt Bar */}
        <div className="px-3 md:px-6 pt-3 md:pt-4 pb-4 md:pb-8 bg-[#0F0F10]">
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
          
          {/* Mobile: History button below prompt */}
          {isMobile && history.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="mt-3 w-full py-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-[#A1A1AA] hover:text-white transition-all flex items-center justify-center gap-2 text-xs"
            >
              <PanelLeft className="w-3.5 h-3.5" />
              История ({history.length})
            </button>
          )}
        </div>
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
          <div className="bg-[#18181B] rounded-2xl border border-[#27272A] p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">⌨️ Горячие клавиши</h3>
            <div className="space-y-3">
              {[
                { keys: ['⌘/Ctrl', 'Enter'], desc: 'Создать' },
                { keys: ['⌘/Ctrl', 'K'], desc: 'Фокус на промпт' },
                { keys: ['Escape'], desc: 'Закрыть модалки' },
                { keys: ['?'], desc: 'Показать подсказки' },
              ].map((hotkey, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#A1A1AA]">{hotkey.desc}</span>
                  <div className="flex gap-1">
                    {hotkey.keys.map((key, j) => (
                      <kbd key={j} className="px-2 py-1 rounded bg-[#27272A] text-white text-xs font-mono border border-[#3F3F46]">
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
    </div>
  );
}
