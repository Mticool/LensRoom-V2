'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, Search, Plus, Settings, RotateCcw, ChevronDown,
  Paperclip, Send, X, Zap, Sparkles, Image as ImageIcon, Video, Mic,
  Brain, Bot, Star, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { DynamicSettings } from '@/components/generator/DynamicSettings';
import { getDefaultSettings } from '@/config/image-models-config';

// ===== MODELS CONFIG =====
const MODELS_CONFIG = {
  image: {
    section: 'Design',
    icon: ImageIcon,
    models: [
      { id: 'nano-banana', name: 'Nano Banana', icon: Sparkles, cost: 7, badge: 'Fast', description: 'Rapid photorealistic generation' },
      { id: 'nano-banana-pro', name: 'Nano Banana Pro', icon: Star, cost: 35, badge: 'Premium', description: 'High-fidelity rendering' },
      { id: 'gpt-image', name: 'GPT Image', icon: Brain, cost: 42, description: 'Precise prompt following' },
      { id: 'flux-2-pro', name: 'FLUX.2 Pro', icon: Zap, cost: 10, badge: 'Popular', description: 'Sharp, detailed outputs' },
      { id: 'flux-2-flex', name: 'FLUX.2 Flex', icon: ImageIcon, cost: 32, description: 'Flexible style control' },
      { id: 'seedream', name: 'Seedream 4.5', icon: Sparkles, cost: 11, badge: 'Balanced', description: 'Modern visual generation' },
      { id: 'z-image', name: 'Z-image', icon: ImageIcon, cost: 2, badge: 'Budget', description: 'Universal image generator' },
      { id: 'topaz-upscale', name: 'Topaz Upscale', icon: Zap, cost: 42, description: 'Upscale to 4K/8K resolution' },
    ],
    parameters: {
      quality: { label: 'Качество', type: 'select', options: ['Turbo', 'Balanced', 'Quality', 'HD', '2K', '4K'], default: '2K' },
      aspectRatio: { label: 'Соотношение сторон', type: 'select', options: ['1:1', '9:16', '16:9', '4:3', '3:4', '21:9'], default: '9:16' },
      style: { label: 'Style', type: 'select', options: ['Photorealistic', 'Illustration', 'Minimalist', '3D Render', 'Abstract'], default: 'Photorealistic' },
    },
    examples: [
      'Professional headshot with studio lighting and neutral background',
      'Modern minimalist office interior with floor-to-ceiling windows',
      'Abstract geometric composition with gradient mesh'
    ],
  },
  video: {
    section: 'Video',
    icon: Video,
    models: [
      { id: 'veo3', name: 'Veo 3.1', icon: Video, cost: 260, badge: 'TOP', description: 'Быстрая генерация видео' },
      { id: 'kling-2.5-turbo', name: 'Kling 2.5 Turbo', icon: Zap, cost: 105, badge: 'Fast', description: 'Rapid universal generation' },
      { id: 'kling-2.6', name: 'Kling 2.6', icon: Video, cost: 230, badge: 'Audio', description: 'Video with audio synthesis' },
      { id: 'kling-2.1-pro', name: 'Kling 2.1 Pro', icon: Star, cost: 402, badge: 'Premium', description: 'Maximum quality output' },
      { id: 'kling-o1', name: 'Kling O1', icon: Video, cost: 28, badge: 'V2V', description: 'Video-to-Video editing' },
      { id: 'sora-2', name: 'Sora 2', icon: Video, cost: 50, badge: 'Balanced', description: 'Speed/quality balance' },
      { id: 'sora-2-pro', name: 'Sora 2 Pro', icon: Star, cost: 650, badge: 'Premium', description: 'Cinematic quality' },
      { id: 'sora-storyboard', name: 'Sora Storyboard', icon: Video, cost: 310, description: 'Multi-scene storytelling' },
      { id: 'wan-2.5', name: 'WAN 2.5', icon: Video, cost: 217, description: 'Cinematic T2V/I2V' },
      { id: 'wan-2.6', name: 'WAN 2.6', icon: Star, cost: 389, badge: 'New', description: 'V2V, 15s, Multi-shot' },
      { id: 'grok-imagine', name: 'Grok Imagine', icon: Sparkles, cost: 100, description: 'Multimodal generation' },
      { id: 'hailuo-2.3', name: 'Hailuo 2.3', icon: Zap, cost: 150, description: 'Fast generation' },
      { id: 'seedance-pro', name: 'Seedance 1.5 Pro', icon: Video, cost: 80, description: 'Universal generation' },
    ],
    parameters: {
      duration: { label: 'Длительность', type: 'select', options: ['5', '6', '8', '10', '15', '20'], default: '10', unit: 'с' },
      aspectRatio: { label: 'Соотношение сторон', type: 'select', options: ['9:16', '16:9', '1:1', '4:3', '21:9'], default: '9:16' },
      quality: { label: 'Качество', type: 'select', options: ['720p', '1080p', '2K', '4K'], default: '1080p' },
      mode: { label: 'Режим', type: 'select', options: ['Текст в видео', 'Изображение в видео', 'Видео в видео'], default: 'Текст в видео' },
    },
    examples: [
      'Smooth camera dolly through modern architectural space with natural lighting',
      'Time-lapse of city skyline transitioning from day to night',
      'Product showcase with 360° rotation on gradient background'
    ],
  },
  audio: {
    section: 'Audio',
    icon: Mic,
    models: [
      { id: 'eleven-labs', name: 'ElevenLabs', icon: Mic, cost: 15, badge: 'Premium', description: 'Natural voice synthesis' },
      { id: 'google-tts', name: 'Google TTS', icon: Mic, cost: 5, badge: 'Budget', description: 'Cloud text-to-speech' },
      { id: 'azure-tts', name: 'Azure TTS', icon: Mic, cost: 8, description: 'Professional synthesis' },
      { id: 'suno', name: 'Suno AI', icon: Sparkles, cost: 25, badge: 'Music', description: 'Music generation' },
    ],
    parameters: {
      voice: { label: 'Voice', type: 'select', options: ['Female 1', 'Female 2', 'Male 1', 'Male 2', 'Neutral'], default: 'Female 1' },
      speed: { label: 'Speed', type: 'slider', min: 0.5, max: 2, step: 0.1, default: 1 },
      tone: { label: 'Tone', type: 'select', options: ['Neutral', 'Energetic', 'Calm', 'Professional'], default: 'Neutral' },
    },
    examples: [
      'Professional voiceover for corporate presentation',
      'Podcast intro with upbeat background music',
      'Ambient soundscape for meditation app'
    ],
  },
};

type SectionType = 'image' | 'video' | 'audio';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GenerationResult {
  id: number;
  type: SectionType;
  content: string;
  prompt: string;
  model: string;
  timestamp: Date;
}

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const sectionFromUrl = (searchParams.get('section') || 'image') as SectionType;
  
  const [activeSection, setActiveSection] = useState<SectionType>(sectionFromUrl);
  const [currentModel, setCurrentModel] = useState('chatgpt');
  const [showModelModal, setShowModelModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [currentResult, setCurrentResult] = useState<GenerationResult | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isSettingsValid, setIsSettingsValid] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const telegramAuth = useTelegramAuth();
  
  // Update section from URL
  useEffect(() => {
    const section = searchParams.get('section') as SectionType;
    if (section && ['image', 'video', 'audio'].includes(section)) {
      setActiveSection(section);
      // Set default model for section
      const firstModel = MODELS_CONFIG[section]?.models[0]?.id;
      if (firstModel) setCurrentModel(firstModel);
    }
  }, [searchParams]);
  const supabaseAuth = useAuth();
  const { balance } = useCreditsStore();

  const telegramUser = telegramAuth.user;
  const supabaseUser = supabaseAuth.user;
  const user = telegramUser || supabaseUser;

  const sectionConfig = MODELS_CONFIG[activeSection];

  // Initialize settings when section changes
  useEffect(() => {
    if (sectionConfig) {
      // For image section, use dynamic settings from model config
      if (activeSection === 'image' && currentModel) {
        const defaults = getDefaultSettings(currentModel);
        setSettings(defaults);
      } else {
        // For video/audio, use old static config
        const newSettings: Record<string, any> = {};
        Object.entries(sectionConfig.parameters).forEach(([key, param]) => {
          newSettings[key] = param.default;
        });
        setSettings(newSettings);
      }
      setCurrentModel(sectionConfig.models[0].id);
      setChatHistory([]);
      setCurrentResult(null);
    }
  }, [activeSection, sectionConfig]);

  // Update settings when model changes (for image section)
  useEffect(() => {
    if (activeSection === 'image' && currentModel) {
      const defaults = getDefaultSettings(currentModel);
      setSettings(defaults);
    }
  }, [currentModel, activeSection]);

  // Load generation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get user ID
        let userId: string | null = null;
        if ('id' in user) {
          userId = String(user.id);
        }

        if (!userId) return;

        // Load generations from Supabase
        const { data: generations, error } = await supabase
          .from('generations')
          .select('*')
          .eq('user_id', userId)
          .eq('type', activeSection)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Failed to load history:', error);
          return;
        }

        if (generations && generations.length > 0) {
          // Convert to GenerationResult format
          const loadedResults: GenerationResult[] = generations.map((gen: any) => ({
            id: gen.id,
            type: activeSection,
            content: gen.result_urls?.[0] || `Генерация ${gen.model_name}`,
            prompt: gen.prompt || '',
            model: gen.model_id || '',
            timestamp: new Date(gen.created_at),
          }));

          setResults(loadedResults);
          
          // Set most recent as current if exists
          if (loadedResults[0]) {
            setCurrentResult(loadedResults[0]);
          }
        }
      } catch (error) {
        console.error('Error loading history:', error);
      }
    };

    loadHistory();
  }, [user, activeSection]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = activeSection === 'video' ? 1 : 4;
    if (uploadedFiles.length + files.length <= maxFiles) {
      setUploadedFiles([...uploadedFiles, ...files]);
    } else {
      alert(`Максимум ${maxFiles} ${maxFiles === 1 ? 'файл' : 'файлов'}!`);
    }
  }, [uploadedFiles, activeSection]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  }, [uploadedFiles]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Пожалуйста, введите промпт');
      return;
    }
    
    if (!user) {
      setLoginOpen(true);
      return;
    }

    // Валидация настроек (только для image section)
    if (activeSection === 'image' && !isSettingsValid) {
      alert('Пожалуйста, заполните все обязательные поля в настройках');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const userMessage: ChatMessage = {
        id: Date.now(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, userMessage]);

      // Подготовка параметров для API
      const apiParams = {
        prompt,
        model: currentModel,
        ...settings,
        // Добавляем файлы если есть
        ...(uploadedFiles.length > 0 && { files: uploadedFiles.map(f => f.name) })
      };

      console.log('[Generator] API Request:', apiParams);

      // Simulate generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGenerationProgress(50);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGenerationProgress(100);

      const result: GenerationResult = {
        id: Date.now() + 1,
        type: activeSection,
        content: `Результат генерации для: "${prompt}"`,
        prompt,
        model: currentModel,
        timestamp: new Date(),
      };

      setResults((prev) => [...prev, result]);
      setCurrentResult(result);

      const assistantMessage: ChatMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, assistantMessage]);
      setPrompt('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('[Generator] Error:', error);
      alert('Произошла ошибка при генерации. Попробуйте еще раз.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [prompt, currentModel, activeSection, user, isSettingsValid, settings, uploadedFiles]);

  const handleReset = useCallback(() => {
    setPrompt('');
    setUploadedFiles([]);
    setChatHistory([]);
    setCurrentResult(null);
  }, []);

  const modelInfo = sectionConfig?.models.find(m => m.id === currentModel);

  // Group results by date
  const groupedResults = results.reduce((acc: [string, GenerationResult[]][], result) => {
    const date = new Date(result.timestamp).toLocaleDateString('ru-RU');
    const existingGroup = acc.find(([d]) => d === date);
    if (existingGroup) {
      existingGroup[1].push(result);
    } else {
      acc.push([date, [result]]);
    }
    return acc;
  }, []).reverse();

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)] pt-16">
      {/* SYNTX Style 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT COLUMN - History (240px for SYNTX) */}
        {showLeftSidebar && (
        <aside className="w-60 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
          {/* Header with collapse button */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--text)]">История</h3>
            <button
              onClick={() => setShowLeftSidebar(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--surface2)] transition"
              title="Скрыть историю"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
            </button>
          </div>
          
          {/* Search */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Поиск в истории..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent-primary)] transition"
              />
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {groupedResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                {/* 3D коробка (SYNTX style) */}
                <div className="text-6xl mb-4 opacity-50">📦</div>
                <p className="text-gray-400 text-sm">Нет данных</p>
              </div>
            ) : (
              groupedResults.map(([date, dayResults]) => (
                <div key={date} className="mb-3">
                  <div className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide mb-2 px-3">{date}</div>
                  <div className="space-y-0.5">
                    {dayResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => setCurrentResult(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                          currentResult?.id === result.id
                            ? "bg-[var(--gold)]/10 border border-[var(--gold)]/30"
                            : "hover:bg-[var(--surface2)]"
                        )}
                      >
                        {result.type === 'image' ? <ImageIcon className="w-5 h-5" /> : result.type === 'video' ? <Video className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text)] truncate">{result.prompt.substring(0, 30)}...</div>
                          <div className="text-xs text-[var(--muted)] truncate">{result.model}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-[var(--border)]">
            {user && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface2)]">
              <span className="text-sm text-[var(--muted)]">Баланс</span>
              <span className="text-sm font-bold text-[var(--accent-primary)]">{balance} ⭐</span>
            </div>
          )}
        </div>
      </aside>
        )}

      {/* Show Left Sidebar Button (when hidden) */}
      {!showLeftSidebar && (
        <button
          onClick={() => setShowLeftSidebar(true)}
          className="fixed left-4 top-20 z-40 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface2)] transition shadow-lg"
          title="Показать историю"
        >
          <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
        </button>
      )}

      {/* CENTER COLUMN - Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        {/* Canvas Content - Centered */}
        <div className="flex-1 flex items-center justify-center p-8">
          {isGenerating ? (
            /* Генерация в процессе */
            <div className="text-center max-w-md w-full">
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Анимированное кольцо */}
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                <div 
                  className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-cyan-500 border-b-transparent border-l-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                {/* Иконка в центре */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold mb-3 text-white">Генерация...</h3>
              <p className="text-sm text-gray-400 mb-6">{modelInfo?.name || 'ChatGPT 4.5'}</p>
              
              {/* Прогресс бар */}
              <div className="w-full bg-[#1a1a1a] rounded-full h-2 mb-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-500">
                {generationProgress < 30 && 'Отправка запроса...'}
                {generationProgress >= 30 && generationProgress < 70 && 'Обработка промпта...'}
                {generationProgress >= 70 && 'Финализация...'}
              </p>
            </div>
          ) : currentResult ? (
            /* Показываем результат */
            <div className="text-center max-w-2xl">
              <div className="mb-6 p-6 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]">
                <div className="text-green-400 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Готово!</h3>
                  <p className="text-sm text-gray-400">{currentResult.content}</p>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  Модель: {currentResult.model} • {new Date(currentResult.timestamp).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          ) : (
            /* Пустое состояние */
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-white opacity-90 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-2">{modelInfo?.name || 'ChatGPT 4.5'}</h2>
              <p className="text-xs text-gray-500">{modelInfo?.description || 'Продвинутая языковая модель для сложных задач'}</p>
            </div>
          )}
        </div>

        {/* PROMPT BAR - Centered in Canvas */}
        <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] p-4">
          {/* File Previews */}
          {uploadedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                    <span className="text-xs text-gray-500 text-center px-2 leading-tight">{file.name.slice(0, 12)}</span>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple={activeSection !== 'video'}
              className="hidden"
              accept={activeSection === 'image' ? 'image/*' : activeSection === 'video' ? 'video/*,image/*' : activeSection === 'audio' ? 'audio/*' : ''}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-[#1a1a1a] rounded transition flex-shrink-0"
              title="Прикрепить файл"
            >
              <Paperclip className="w-5 h-5 text-cyan-400" />
            </button>
            
            <span className="text-xs text-gray-500 flex-shrink-0">{uploadedFiles.length}/4</span>
            
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Напишите ваш промпт..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
            />
            
            <button className="p-2 hover:bg-[#1a1a1a] rounded transition flex-shrink-0">
              <Mic className="w-5 h-5 text-cyan-400" />
            </button>
            
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || (activeSection === 'image' && !isSettingsValid)}
              className={cn(
                "p-2.5 rounded-lg transition flex-shrink-0 relative group",
                prompt.trim() && !isGenerating && (activeSection !== 'image' || isSettingsValid)
                  ? "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"
                  : "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
              )}
              title={!isSettingsValid ? 'Заполните все обязательные поля' : 'Генерировать'}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          
          {/* Cost Display */}
          <div className="flex justify-end mt-2">
            <span className="text-xs text-gray-400">
              Стоимость: <span className="text-purple-400">⚡ {modelInfo?.cost || 0}</span>
            </span>
          </div>
        </div>
      </main>

      {/* Show Right Sidebar Button (when hidden) */}
      {!showRightSidebar && (
        <button
          onClick={() => setShowRightSidebar(true)}
          className="fixed right-4 top-20 z-40 p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface2)] transition shadow-lg"
          title="Показать настройки"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
        </button>
      )}

      {/* RIGHT COLUMN - Settings (280px for SYNTX) */}
      {showRightSidebar && (
        <aside className="w-70 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col">
          {/* Header with collapse button */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-[var(--text)]">
              <Settings className="w-4 h-4" />
              Настройки
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReset} 
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface2)] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сбросить
              </button>
              <button
                onClick={() => setShowRightSidebar(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--surface2)] transition"
                title="Скрыть настройки"
              >
                <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">МОДЕЛЬ</label>
              <button
                onClick={() => setShowModelModal(true)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--accent-primary)] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                    {modelInfo?.icon && (
                      <modelInfo.icon className="w-5 h-5 text-[var(--accent-primary)]" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-[var(--text)]">{modelInfo?.name}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
              </button>
            </div>

            {/* Dynamic Settings */}
            {activeSection === 'image' ? (
              <DynamicSettings
                modelId={currentModel}
                values={settings}
                onChange={(key, value) => setSettings({ ...settings, [key]: value })}
                onValidationChange={setIsSettingsValid}
              />
            ) : (
              /* Old static parameters for video/audio */
              Object.entries(sectionConfig?.parameters || {}).map(([key, param]: [string, any]) => (
                <div key={key} className="space-y-2">
                  <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
                    {param.label} {param.unit && `(${param.unit})`}
                  </label>
                  {param.type === 'select' && (
                    <select
                      value={settings[key] || param.default}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--gold)] transition"
                    >
                      {param.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {param.type === 'slider' && (
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={settings[key] || param.default}
                        onChange={(e) => setSettings({ ...settings, [key]: parseFloat(e.target.value) })}
                        className="flex-1 accent-[var(--gold)]"
                      />
                      <span className="text-sm font-semibold w-12 text-right">{settings[key] || param.default}</span>
                  </div>
                )}
              </div>
            ))
            )}
        </div>
      </aside>
      )}
    </div>

      {/* Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModelModal(false)}>
          <div className="w-full max-w-3xl max-h-[85vh] bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-xl font-bold">Выбор модели</h2>
              <button onClick={() => setShowModelModal(false)} className="p-2 rounded-xl hover:bg-[var(--surface2)] transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              <div className="grid grid-cols-2 gap-3">
                {sectionConfig?.models.map(model => {
                  const ModelIcon = model.icon;
                  return (
                    <button
                      key={model.id}
                      onClick={() => { setCurrentModel(model.id); setShowModelModal(false); }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                        currentModel === model.id
                          ? "border-[var(--accent-primary)] bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 shadow-md"
                          : "border-transparent bg-[var(--surface2)] hover:border-[var(--border)] hover:shadow"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center flex-shrink-0">
                        <ModelIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{model.name}</span>
                          {'badge' in model && model.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-full">
                              {model.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-[var(--accent-primary)]">{model.cost} ⭐</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="text-[var(--muted)]">Загрузка...</div></div>}>
      <GeneratorPageContent />
    </Suspense>
  );
}
