'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, X, Zap, Sparkles, Image as ImageIcon, Video, Mic,
  Brain, Star, ChevronDown, Paperclip, Play, Download,
  RotateCcw, Settings2, Layers, Clock, Check
} from 'lucide-react';
import { DynamicSettings, getDefaultSettings, getDefaultVideoSettings } from '@/components/generator/DynamicSettings';
import { calculateDynamicPrice, getVideoModelWithPricing } from '@/config/kie-api-settings';

// ===== MODELS CONFIG =====
const MODELS_CONFIG = {
  image: {
    section: 'Дизайн',
    icon: ImageIcon,
    models: [
      { id: 'nano-banana', name: 'Nano Banana', icon: Sparkles, cost: 7, badge: 'Fast', description: 'Быстрая генерация' },
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', icon: Star, cost: 35, badge: 'Premium', description: '4K качество' },
      { id: 'gpt-image', name: 'GPT Image', icon: Brain, cost: 42, badge: 'Новинка', description: 'Точные цвета' },
      { id: 'flux-2-pro', name: 'FLUX.2 Pro', icon: Zap, cost: 10, badge: 'Popular', description: 'Детализация' },
      { id: 'flux-2-flex', name: 'FLUX.2 Flex', icon: ImageIcon, cost: 32, description: 'Гибкий стиль' },
      { id: 'seedream-4.5', name: 'Seedream 4.5', icon: Sparkles, cost: 11, badge: 'Новинка', description: '4K нового поколения' },
      { id: 'midjourney', name: 'Midjourney V7', icon: Star, cost: 50, badge: 'Pro', description: 'Художественные стили' },
    ],
  },
  video: {
    section: 'Видео',
    icon: Video,
    models: [
      { id: 'veo-3.1', name: 'Veo 3.1', icon: Video, cost: 260, badge: 'Google', description: 'Со звуком' },
      { id: 'kling', name: 'Kling AI', icon: Zap, cost: 105, badge: 'Trending', description: '3 версии' },
      { id: 'kling-o1', name: 'Kling O1', icon: Sparkles, cost: 56, badge: 'FAL.ai', description: 'First→Last', dynamicPrice: true },
      { id: 'sora-2', name: 'Sora 2', icon: Video, cost: 50, badge: 'OpenAI', description: 'Баланс' },
      { id: 'sora-2-pro', name: 'Sora 2 Pro', icon: Star, cost: 650, badge: 'Premium', description: '1080p' },
      { id: 'wan', name: 'WAN AI', icon: Video, cost: 217, badge: 'Новинка', description: 'До 15 сек' },
    ],
  },
  audio: {
    section: 'Аудио',
    icon: Mic,
    models: [
      { id: 'eleven-labs', name: 'ElevenLabs', icon: Mic, cost: 15, badge: 'Premium', description: 'Голоса' },
      { id: 'suno', name: 'Suno AI', icon: Sparkles, cost: 25, badge: 'Music', description: 'Музыка' },
    ],
  },
};

type SectionType = 'image' | 'video' | 'audio';

interface GenerationResult {
  id: number;
  type: SectionType;
  content: string;
  prompt: string;
  model: string;
  timestamp: Date;
  url?: string;
}

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const sectionFromUrl = (searchParams.get('section') || 'image') as SectionType;
  const modelFromUrl = searchParams.get('model');
  
  const [activeSection, setActiveSection] = useState<SectionType>(sectionFromUrl);
  const [currentModel, setCurrentModel] = useState(modelFromUrl || MODELS_CONFIG[sectionFromUrl].models[0]?.id || 'nano-banana');
  const [showModelModal, setShowModelModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [isSettingsValid, setIsSettingsValid] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const telegramAuth = useTelegramAuth();
  const supabaseAuth = useAuth();
  const { balance, fetchBalance } = useCreditsStore();

  const telegramUser = telegramAuth.user;
  const supabaseUser = supabaseAuth.user;
  const user = telegramUser || supabaseUser;

  // Update section and model from URL
  useEffect(() => {
    const section = searchParams.get('section') as SectionType;
    const model = searchParams.get('model');
    
    if (section && ['image', 'video', 'audio'].includes(section)) {
      setActiveSection(section);
      if (model) {
        const modelExists = MODELS_CONFIG[section]?.models.find(m => m.id === model);
        if (modelExists) {
          setCurrentModel(model);
        } else {
          setCurrentModel(MODELS_CONFIG[section].models[0]?.id);
        }
      } else {
        setCurrentModel(MODELS_CONFIG[section].models[0]?.id);
      }
    }
  }, [searchParams]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lensroom_generation_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResults(parsed.map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) })));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (results.length > 0) {
      localStorage.setItem('lensroom_generation_history', JSON.stringify(results));
    }
  }, [results]);

  const sectionConfig = MODELS_CONFIG[activeSection];
  const modelInfo = sectionConfig?.models.find(m => m.id === currentModel);

  // Calculate cost
  const calculateCost = useCallback(() => {
    if (!modelInfo) return 0;
    if ('dynamicPrice' in modelInfo && modelInfo.dynamicPrice && activeSection === 'video') {
      return calculateDynamicPrice(currentModel, settings, 'video');
    }
    return modelInfo.cost;
  }, [modelInfo, currentModel, settings, activeSection]);

  const currentCost = calculateCost();

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = activeSection === 'video' ? 2 : 4;
    if (uploadedFiles.length + files.length <= maxFiles) {
      setUploadedFiles([...uploadedFiles, ...files]);
    }
  }, [uploadedFiles, activeSection]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  }, [uploadedFiles]);

  // Generation
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (!user) {
      setLoginOpen(true);
      return;
    }

    if (balance < currentCost) {
      alert('Недостаточно звёзд');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 500);

    try {
      const endpoint = activeSection === 'image' ? '/api/generate/photo' : '/api/generate/video';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: currentModel,
          settings,
          ...(uploadedFiles.length > 0 && { files: uploadedFiles.map(f => f.name) })
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      
      setGenerationProgress(100);
      
      const newResult: GenerationResult = {
        id: Date.now(),
        type: activeSection,
        content: data.result || 'Генерация завершена',
        prompt,
        model: modelInfo?.name || currentModel,
        timestamp: new Date(),
        url: data.url,
      };

      setResults(prev => [newResult, ...prev]);
      setCurrentResult(newResult);
      fetchBalance();
      setPrompt('');
      setUploadedFiles([]);

    } catch (error) {
      console.error('Generation error:', error);
      alert('Ошибка генерации');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [prompt, user, balance, currentCost, activeSection, currentModel, settings, uploadedFiles, modelInfo, fetchBalance]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-14">
      {/* Top Section Tabs */}
      <div className="border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-14 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {(['image', 'video', 'audio'] as const).map((section) => {
              const config = MODELS_CONFIG[section];
              const Icon = config.icon;
              return (
                <button
                  key={section}
                  onClick={() => {
                    setActiveSection(section);
                    setCurrentModel(config.models[0]?.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeSection === section
                      ? "bg-white/10 text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {config.section}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT - Models */}
          <div className="lg:col-span-2 space-y-2">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1 mb-3">Модели</h3>
            {sectionConfig.models.map((model) => (
              <button
                key={model.id}
                onClick={() => setCurrentModel(model.id)}
                className={cn(
                  "w-full p-3 rounded-xl text-left transition-all group",
                  currentModel === model.id
                    ? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30"
                    : "bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-[var(--text)]">{model.name}</span>
                  {model.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                      {model.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{model.description}</span>
                  <span className="text-xs text-cyan-400">{model.cost}⭐</span>
                </div>
              </button>
            ))}
          </div>

          {/* CENTER - Canvas */}
          <div className="lg:col-span-7">
            {/* Canvas Area */}
            <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden mb-4">
              
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  /* Generating State */
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-cyan-500 border-b-transparent border-l-transparent"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-purple-400" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">Генерация...</h3>
                    <p className="text-sm text-gray-500 mb-6">{modelInfo?.name}</p>
                    
                    <div className="w-64 bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </motion.div>
                ) : currentResult ? (
                  /* Result State */
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-8"
                  >
                    {currentResult.url ? (
                      currentResult.type === 'video' ? (
                        <video 
                          src={currentResult.url} 
                          controls 
                          className="max-w-full max-h-full rounded-xl shadow-2xl"
                        />
                      ) : (
                        <img 
                          src={currentResult.url} 
                          alt={currentResult.prompt}
                          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
                        />
                      )
                    ) : (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">Готово!</h3>
                        <p className="text-sm text-gray-400 max-w-md">{currentResult.content}</p>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      {currentResult.url && (
                        <a 
                          href={currentResult.url} 
                          download 
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      )}
                      <button 
                        onClick={() => setCurrentResult(null)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  /* Empty State */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
                      {activeSection === 'image' ? (
                        <ImageIcon className="w-10 h-10 text-purple-400" />
                      ) : activeSection === 'video' ? (
                        <Video className="w-10 h-10 text-cyan-400" />
                      ) : (
                        <Mic className="w-10 h-10 text-pink-400" />
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-[var(--text)]">{modelInfo?.name}</h2>
                    <p className="text-sm text-gray-500 mb-6">{modelInfo?.description}</p>
                    <p className="text-xs text-gray-600">Введите промпт для начала</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Prompt Bar */}
            <div className="relative">
              {/* File Previews */}
              <AnimatePresence>
                {uploadedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 mb-3 overflow-hidden"
                  >
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="relative group">
                        <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-gray-500 text-center px-1">{file.name.slice(0, 10)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 transition-all">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple={activeSection !== 'video'}
                  className="hidden"
                  accept={activeSection === 'image' ? 'image/*' : activeSection === 'video' ? 'video/*,image/*' : 'audio/*'}
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder={`Опишите ${activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}...`}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-600"
                />
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{currentCost}⭐</span>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      prompt.trim() && !isGenerating
                        ? "bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90 shadow-lg shadow-purple-500/25"
                        : "bg-white/10 text-gray-600 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Недавние</h3>
                <div className="grid grid-cols-4 gap-2">
                  {results.slice(0, 4).map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setCurrentResult(result)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border transition-all hover:scale-105",
                        currentResult?.id === result.id
                          ? "border-purple-500 ring-2 ring-purple-500/20"
                          : "border-white/10 hover:border-white/20"
                      )}
                    >
                      {result.url ? (
                        result.type === 'video' ? (
                          <div className="w-full h-full bg-white/5 flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-400" />
                          </div>
                        ) : (
                          <img src={result.url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT - Settings */}
          <div className="lg:col-span-3">
            <div className="sticky top-32 space-y-4">
              {/* Model Info Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    {modelInfo?.icon && <modelInfo.icon className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{modelInfo?.name}</h3>
                    <p className="text-xs text-gray-500">{modelInfo?.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className="text-sm text-gray-400">Стоимость</span>
                  <span className="text-lg font-bold text-cyan-400">{currentCost}⭐</span>
                </div>
              </div>

              {/* Dynamic Settings */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Настройки
                </h3>
                <DynamicSettings
                  modelId={currentModel}
                  type={activeSection}
                  values={settings}
                  onChange={handleSettingChange}
                  onValidationChange={setIsSettingsValid}
                />
              </div>

              {/* Balance */}
              {user && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Баланс</span>
                    <span className="text-lg font-bold text-[var(--text)]">{balance}⭐</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GeneratorPageContent />
    </Suspense>
  );
}
