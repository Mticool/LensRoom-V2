'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Image as ImageIcon, Video, Music, Send, Loader2, 
  ChevronDown, ChevronUp, Star, Zap, Settings, X, Download,
  RefreshCw, Copy, Heart, Check
} from 'lucide-react';

// Types
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
  };
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Models config
const MODELS = {
  photo: [
    { id: 'nano-banana', name: 'Nano Banana', cost: 7, icon: '🍌', badge: 'Fast' },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', cost: 30, icon: '⭐', badge: 'Premium' },
    { id: 'flux-2-pro', name: 'FLUX.2 Pro', cost: 9, icon: '⚡', badge: 'Popular' },
    { id: 'gpt-image', name: 'GPT Image 1.5', cost: 17, icon: '🧠', badge: 'v1.5' },
    { id: 'grok-imagine', name: 'Grok Imagine', cost: 15, icon: '🌶️', badge: 'Spicy' },
    { id: 'seedream-4.5', name: 'Seedream 4.5', cost: 11, icon: '✨', badge: '4K' },
  ],
  video: [
    { id: 'veo-3.1', name: 'Veo 3.1', cost: 99, icon: '🎬', badge: 'Cinema' },
    { id: 'kling', name: 'Kling AI', cost: 105, icon: '⚡', badge: 'Trending' },
    { id: 'sora-2', name: 'Sora 2', cost: 50, icon: '🎥', badge: 'Pro' },
    { id: 'grok-video', name: 'Grok Video', cost: 25, icon: '🌶️', badge: 'Audio' },
  ],
  audio: [
    { id: 'suno', name: 'Suno AI', cost: 12, icon: '🎵', badge: 'Music' },
  ],
};

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

// Loading fallback for Suspense
function TelegramMiniAppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F10]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D9FF]" />
        <span className="text-white/60">Загрузка...</span>
      </div>
    </div>
  );
}

// Main component wrapped in Suspense
export default function TelegramMiniAppPage() {
  return (
    <Suspense fallback={<TelegramMiniAppLoading />}>
      <TelegramMiniAppContent />
    </Suspense>
  );
}

function TelegramMiniAppContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  // Telegram WebApp
  const [tgApp, setTgApp] = useState<TelegramWebApp | null>(null);
  const [isDark, setIsDark] = useState(true);

  // State
  const [activeTab, setActiveTab] = useState<'photo' | 'video' | 'audio'>('photo');
  const [selectedModel, setSelectedModel] = useState(MODELS.photo[0]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ url: string; type: 'photo' | 'video' } | null>(null);
  const [balance, setBalance] = useState({ total: 0, subscription: 0, package: 0 });
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webapp = window.Telegram.WebApp;
      setTgApp(webapp);
      setIsDark(webapp.colorScheme === 'dark');
      
      // Ready and expand
      webapp.ready();
      webapp.expand();

      // Setup back button
      webapp.BackButton.onClick(() => {
        if (result) {
          setResult(null);
        } else if (showSettings) {
          setShowSettings(false);
        }
      });

      // Authenticate via Telegram initData
      authenticateWithTelegram(webapp.initData);
    } else {
      // Not in Telegram - try regular session
      fetchBalance();
    }
  }, []);

  // Authenticate via Telegram Mini App
  const authenticateWithTelegram = async (initData: string) => {
    setIsAuthLoading(true);
    try {
      const response = await fetch('/api/telegram/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });
      const data = await response.json();
      
      if (data.success && data.session) {
        setBalance({
          total: data.session.balance || 0,
          subscription: data.session.subscriptionStars || 0,
          package: data.session.packageStars || 0,
        });
        setNeedsAuth(data.session.needsAuth || false);
      }
    } catch (error) {
      console.error('Failed to authenticate:', error);
      setNeedsAuth(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Update back button visibility
  useEffect(() => {
    if (tgApp) {
      if (result || showSettings) {
        tgApp.BackButton.show();
      } else {
        tgApp.BackButton.hide();
      }
    }
  }, [tgApp, result, showSettings]);

  // Fetch user balance (fallback for non-Telegram)
  const fetchBalance = async () => {
    setIsAuthLoading(true);
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await response.json();
      if (data.balance !== undefined) {
        setBalance({
          total: data.balance,
          subscription: data.subscriptionStars || 0,
          package: data.packageStars || 0,
        });
        setNeedsAuth(!data.user);
      } else {
        setNeedsAuth(true);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setNeedsAuth(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: 'photo' | 'video' | 'audio') => {
    setActiveTab(tab);
    setSelectedModel(MODELS[tab][0]);
    tgApp?.HapticFeedback.selectionChanged();
  };

  // Handle model selection
  const handleModelSelect = (model: typeof MODELS.photo[0]) => {
    setSelectedModel(model);
    tgApp?.HapticFeedback.impactOccurred('light');
  };

  // Handle generate
  const handleGenerate = async () => {
    if (needsAuth) {
      tgApp?.showAlert('Для генерации нужно авторизоваться на сайте');
      return;
    }

    if (!prompt.trim()) {
      tgApp?.showAlert('Введите описание для генерации');
      return;
    }

    if (balance.total < selectedModel.cost) {
      tgApp?.showAlert(`Недостаточно звёзд. Нужно ${selectedModel.cost}⭐`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    tgApp?.HapticFeedback.impactOccurred('medium');

    try {
      const endpoint = activeTab === 'video' ? '/api/generate/video' : '/api/generate/photo';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: selectedModel.id,
          prompt,
          aspectRatio,
          variants: 1,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.url) {
        setResult({ url: data.data.url, type: activeTab as 'photo' | 'video' });
        setBalance(prev => ({ ...prev, total: prev.total - selectedModel.cost }));
        tgApp?.HapticFeedback.notificationOccurred('success');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(errorMessage);
      tgApp?.HapticFeedback.notificationOccurred('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (result?.url) {
      tgApp?.openLink(result.url);
    }
  };

  // Handle copy prompt
  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    tgApp?.HapticFeedback.notificationOccurred('success');
  };

  // Theme colors
  const theme = {
    bg: isDark ? '#0F0F10' : '#FFFFFF',
    surface: isDark ? '#1A1A1C' : '#F5F5F7',
    surface2: isDark ? '#27272A' : '#E5E5E7',
    text: isDark ? '#FFFFFF' : '#1D1D1F',
    textMuted: isDark ? '#A1A1AA' : '#86868B',
    accent: '#00D9FF',
    accentGlow: 'rgba(0, 217, 255, 0.2)',
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        backgroundColor: theme.bg, 
        color: theme.text,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: theme.bg }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
               style={{ background: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)` }}>
            ✨
          </div>
          <span className="font-bold">LensRoom</span>
        </div>
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: theme.surface }}
        >
          <Star className="w-4 h-4" style={{ color: theme.accent }} />
          <span>{balance.total}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-2">
        <div 
          className="flex gap-1 p-1 rounded-2xl"
          style={{ backgroundColor: theme.surface }}
        >
          {(['photo', 'video', 'audio'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab ? theme.accent : 'transparent',
                color: activeTab === tab ? '#0F0F10' : theme.textMuted,
              }}
            >
              {tab === 'photo' && <ImageIcon className="w-4 h-4" />}
              {tab === 'video' && <Video className="w-4 h-4" />}
              {tab === 'audio' && <Music className="w-4 h-4" />}
              <span className="capitalize">{tab === 'photo' ? 'Фото' : tab === 'video' ? 'Видео' : 'Музыка'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Auth Prompt */}
      {needsAuth && !isAuthLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 p-4 rounded-2xl"
          style={{ backgroundColor: theme.surface }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                 style={{ background: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)` }}>
              🔐
            </div>
            <div>
              <div className="font-semibold">Авторизация</div>
              <div className="text-sm" style={{ color: theme.textMuted }}>
                Войдите для генерации
              </div>
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
            Авторизуйтесь через Telegram на сайте, чтобы получить 50⭐ бонус и начать создавать!
          </p>
          <button
            onClick={() => tgApp?.openLink('https://lensroom.ru')}
            className="w-full py-3 rounded-xl font-medium"
            style={{ backgroundColor: theme.accent, color: '#0F0F10' }}
          >
            Войти на сайт
          </button>
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {/* Result or Input */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Result display */}
              <div 
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: theme.surface }}
              >
                {result.type === 'video' ? (
                  <video 
                    src={result.url} 
                    controls 
                    autoPlay 
                    loop 
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <img 
                    src={result.url} 
                    alt="Generated"
                    className="w-full aspect-square object-cover"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: theme.accent, color: '#0F0F10' }}
                >
                  <Download className="w-5 h-5" />
                  Скачать
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: theme.surface }}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {/* Prompt used */}
              <div 
                className="p-3 rounded-xl text-sm"
                style={{ backgroundColor: theme.surface }}
              >
                <p style={{ color: theme.textMuted }}>{prompt}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Model selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: theme.textMuted }}>
                    Модель
                  </span>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: theme.surface }}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {MODELS[activeTab].slice(0, 4).map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: selectedModel.id === model.id 
                          ? theme.accentGlow 
                          : theme.surface,
                        border: selectedModel.id === model.id 
                          ? `1px solid ${theme.accent}` 
                          : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{model.icon}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" 
                              style={{ backgroundColor: theme.surface2, color: theme.textMuted }}>
                          {model.badge}
                        </span>
                      </div>
                      <div className="text-sm font-medium truncate">{model.name}</div>
                      <div className="text-xs" style={{ color: theme.accent }}>{model.cost}⭐</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div 
                      className="p-4 rounded-xl space-y-3"
                      style={{ backgroundColor: theme.surface }}
                    >
                      <div>
                        <label className="text-sm mb-2 block" style={{ color: theme.textMuted }}>
                          Соотношение сторон
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {ASPECT_RATIOS.map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className="px-3 py-1.5 rounded-lg text-sm"
                              style={{
                                backgroundColor: aspectRatio === ratio ? theme.accent : theme.surface2,
                                color: aspectRatio === ratio ? '#0F0F10' : theme.text,
                              }}
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt input */}
              <div 
                className="rounded-2xl p-1"
                style={{ backgroundColor: theme.surface }}
              >
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите что хотите создать..."
                  className="w-full bg-transparent p-3 text-base resize-none outline-none"
                  style={{ color: theme.text, minHeight: '100px' }}
                  rows={4}
                />
                
                {/* Error message */}
                {error && (
                  <div className="px-3 pb-2 text-sm text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      {!result && (
        <div className="sticky bottom-0 px-4 py-4" style={{ backgroundColor: theme.bg }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-base transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: theme.accent, 
              color: '#0F0F10',
              boxShadow: `0 0 30px ${theme.accentGlow}`,
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Генерирую...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Создать ({selectedModel.cost}⭐)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

