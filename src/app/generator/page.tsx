'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  Send, X, Zap, Sparkles, Image as ImageIcon, Video, Mic,
  Brain, Star, Paperclip, Play, Download, Copy, ThumbsUp,
  RotateCcw, Settings2, User, Bot
} from 'lucide-react';
import { DynamicSettings, getDefaultSettings, getDefaultVideoSettings } from '@/components/generator/DynamicSettings';
import { calculateDynamicPrice } from '@/config/kie-api-settings';

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

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: SectionType;
  model?: string;
  url?: string;
  isGenerating?: boolean;
}

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const sectionFromUrl = (searchParams.get('section') || 'image') as SectionType;
  const modelFromUrl = searchParams.get('model');
  
  const [activeSection, setActiveSection] = useState<SectionType>(sectionFromUrl);
  const [currentModel, setCurrentModel] = useState(modelFromUrl || MODELS_CONFIG[sectionFromUrl].models[0]?.id || 'nano-banana');
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [isSettingsValid, setIsSettingsValid] = useState(true);
  const [showSettings, setShowSettings] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lensroom_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('lensroom_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Poll for generation result
  const pollForResult = async (jobId: string, provider: string): Promise<any> => {
    const maxAttempts = 60;
    const interval = 3000;
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));
      
      try {
        const res = await fetch(`/api/jobs/${jobId}?provider=${provider}`);
        if (!res.ok) continue;
        
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'success') {
          return data;
        }
        if (data.status === 'failed' || data.status === 'error') {
          throw new Error(data.error || 'Generation failed');
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    }
    throw new Error('Generation timeout');
  };

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

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    
    // Add generating placeholder
    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: activeSection,
      model: modelInfo?.name,
      isGenerating: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);
    setPrompt('');
    setUploadedFiles([]);

    try {
      const endpoint = activeSection === 'image' ? '/api/generate/photo' : '/api/generate/video';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          model: currentModel,
          settings,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      
      // Handle different response formats
      let resultUrl = data.url || data.results?.[0]?.url;
      
      // If we have a jobId but no immediate result, poll for completion
      if (!resultUrl && data.jobId) {
        const pollResult = await pollForResult(data.jobId, data.provider || 'kie');
        resultUrl = pollResult?.url || pollResult?.results?.[0]?.url;
      }
      
      // Update assistant message with result
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { 
              ...m, 
              content: resultUrl ? 'Готово!' : 'Генерация завершена',
              url: resultUrl,
              isGenerating: false 
            }
          : m
      ));

      fetchBalance();

    } catch (error) {
      console.error('Generation error:', error);
      // Update with error
      setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: 'Ошибка генерации. Попробуйте снова.', isGenerating: false }
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, user, balance, currentCost, activeSection, currentModel, settings, modelInfo, fetchBalance]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('lensroom_chat_history');
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-14 flex flex-col">
      {/* Top Section Tabs */}
      <div className="border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl sticky top-14 z-30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1">
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
            
            {/* Model Selector */}
            <div className="flex items-center gap-3">
              <select
                value={currentModel}
                onChange={(e) => setCurrentModel(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-purple-500/50"
              >
                {sectionConfig.models.map((model) => (
                  <option key={model.id} value={model.id} className="bg-[#1a1a1a]">
                    {model.name} • {model.cost}⭐
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-2 rounded-lg transition",
                  showSettings ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:text-white"
                )}
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.length === 0 ? (
                /* Welcome State */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
                    <Sparkles className="w-10 h-10 text-purple-400" />
                  </div>
                  <h1 className="text-3xl font-bold mb-3 text-[var(--text)]">
                    Привет! Я {modelInfo?.name}
                  </h1>
                  <p className="text-gray-500 mb-8 max-w-md">
                    Опишите что хотите создать, и я сгенерирую для вас {activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}
                  </p>
                  
                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {[
                      activeSection === 'image' ? 'Портрет девушки в студии' : 'Закат на пляже',
                      activeSection === 'image' ? 'Футуристичный город' : 'Кинематографичный полёт',
                      activeSection === 'image' ? 'Минималистичный интерьер' : 'Таймлапс природы',
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(suggestion)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <div className="space-y-6">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4",
                        message.role === 'user' ? "flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
                        message.role === 'user' 
                          ? "bg-purple-500" 
                          : "bg-gradient-to-br from-cyan-500 to-purple-500"
                      )}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={cn(
                        "flex-1 max-w-[80%]",
                        message.role === 'user' ? "text-right" : ""
                      )}>
                        {message.role === 'user' ? (
                          <div className="inline-block px-4 py-3 rounded-2xl rounded-tr-sm bg-purple-500/20 text-[var(--text)]">
                            {message.content}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {message.isGenerating ? (
                              /* Generating */
                              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-sm text-gray-400">
                                  Генерирую с {message.model}...
                                </span>
                              </div>
                            ) : (
                              <>
                                {/* Result Media */}
                                {message.url && (
                                  <div className="rounded-2xl rounded-tl-sm overflow-hidden bg-white/5 border border-white/10">
                                    {message.type === 'video' ? (
                                      <video 
                                        src={message.url} 
                                        controls 
                                        className="w-full max-h-[400px] object-contain"
                                      />
                                    ) : (
                                      <img 
                                        src={message.url} 
                                        alt=""
                                        className="w-full max-h-[400px] object-contain"
                                      />
                                    )}
                                  </div>
                                )}
                                
                                {/* Text content */}
                                {message.content && !message.url && (
                                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 text-[var(--text)]">
                                    {message.content}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-1">
                                  {message.url && (
                                    <a
                                      href={message.url}
                                      download
                                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
                                      title="Скачать"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button 
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
                                    title="Копировать"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
                                    title="Нравится"
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
                                    title="Повторить"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                  <span className="text-xs text-gray-600 ml-2">
                                    {message.model}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Prompt Bar - Fixed at bottom */}
          <div className="border-t border-white/5 bg-[var(--bg)]/80 backdrop-blur-xl p-4">
            <div className="max-w-3xl mx-auto">
              {/* File Previews */}
              <AnimatePresence>
                {uploadedFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 mb-3"
                  >
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="relative group">
                        <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] text-gray-500 text-center px-1">{file.name.slice(0, 8)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="flex items-end gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 transition-all">
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
                  className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white flex-shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={`Опишите ${activeSection === 'image' ? 'изображение' : activeSection === 'video' ? 'видео' : 'аудио'}...`}
                  rows={1}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-600 resize-none max-h-[150px] py-2"
                />
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-500 hidden sm:block">{currentCost}⭐</span>
                  
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
              
              {/* Bottom info */}
              <div className="flex items-center justify-between mt-2 px-2">
                <span className="text-xs text-gray-600">
                  {modelInfo?.name} • {currentCost}⭐ за генерацию
                </span>
                {messages.length > 0 && (
                  <button 
                    onClick={clearChat}
                    className="text-xs text-gray-600 hover:text-red-400 transition"
                  >
                    Очистить чат
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/5 bg-[var(--bg)] overflow-hidden flex-shrink-0"
            >
              <div className="w-[320px] h-full overflow-y-auto p-4 space-y-4">
                {/* Model Info */}
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

                {/* Settings */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-medium text-gray-400 mb-4">Настройки</h3>
                  <DynamicSettings
                    modelId={currentModel}
                    type={activeSection === 'audio' ? 'image' : activeSection}
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
            </motion.div>
          )}
        </AnimatePresence>
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
