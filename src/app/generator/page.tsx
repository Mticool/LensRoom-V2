'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateDynamicPrice } from '@/config/kie-api-settings';

// Local components
import { 
  ChatSidebar, 
  ChatMessages, 
  PromptInput, 
  ModelBar, 
  SettingsSidebar 
} from './components';
import { 
  MODELS_CONFIG, 
  SectionType, 
  ChatMessage, 
  ChatSession 
} from './config';

// ===== HOOKS =====

function useGeneratorState(initialSection: SectionType, initialModel: string | null) {
  const [activeSection, setActiveSection] = useState<SectionType>(initialSection);
  const [currentModel, setCurrentModel] = useState(initialModel || MODELS_CONFIG[initialSection].models[0]?.id || 'nano-banana');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isSettingsValid, setIsSettingsValid] = useState(true);

  const sectionConfig = MODELS_CONFIG[activeSection];
  const modelInfo = sectionConfig?.models.find(m => m.id === currentModel);

  const calculateCost = useCallback(() => {
    if (!modelInfo) return 0;
    if ('dynamicPrice' in modelInfo && modelInfo.dynamicPrice && activeSection === 'video') {
      return calculateDynamicPrice(currentModel, settings, 'video');
    }
    return modelInfo.cost;
  }, [modelInfo, currentModel, settings, activeSection]);

  return {
    activeSection,
    setActiveSection,
    currentModel,
    setCurrentModel,
    settings,
    setSettings,
    isSettingsValid,
    setIsSettingsValid,
    sectionConfig,
    modelInfo,
    currentCost: calculateCost(),
  };
}

function useChatSessions() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lensroom_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sessions = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setChatSessions(sessions);
        
        const lastActiveId = localStorage.getItem('lensroom_active_chat');
        if (lastActiveId && sessions.find((s: ChatSession) => s.id === lastActiveId)) {
          const chat = sessions.find((s: ChatSession) => s.id === lastActiveId);
          setActiveChatId(lastActiveId);
          setMessages(chat.messages);
          return chat;
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
    return null;
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('lensroom_chat_sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('lensroom_active_chat', activeChatId);
    }
  }, [activeChatId]);

  // Update current session when messages change
  useEffect(() => {
    if (activeChatId && messages.length > 0) {
      setChatSessions(prev => prev.map(s => 
        s.id === activeChatId 
          ? { ...s, messages, updatedAt: new Date(), title: messages[0]?.content.slice(0, 30) || s.title }
          : s
      ));
    }
  }, [messages, activeChatId]);

  const createNewChat = useCallback((model: string, section: SectionType) => {
    const modelName = MODELS_CONFIG[section]?.models.find(m => m.id === model)?.name || model;
    const newChat: ChatSession = {
      id: `chat_${Date.now()}`,
      title: `Новый чат • ${modelName}`,
      model,
      section,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setMessages([]);
    return newChat;
  }, []);

  const switchToChat = useCallback((chatId: string) => {
    const chat = chatSessions.find(s => s.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages);
      return chat;
    }
    return null;
  }, [chatSessions]);

  const deleteChat = useCallback((chatId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== chatId));
    if (activeChatId === chatId) {
      const remaining = chatSessions.filter(s => s.id !== chatId);
      if (remaining.length > 0) {
        switchToChat(remaining[0].id);
      } else {
        setActiveChatId(null);
        setMessages([]);
      }
    }
  }, [activeChatId, chatSessions, switchToChat]);

  return {
    chatSessions,
    activeChatId,
    messages,
    setMessages,
    createNewChat,
    switchToChat,
    deleteChat,
  };
}

// ===== MAIN COMPONENT =====

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const sectionFromUrl = (searchParams.get('section') || 'image') as SectionType;
  const modelFromUrl = searchParams.get('model');
  
  // State
  const generatorState = useGeneratorState(sectionFromUrl, modelFromUrl);
  const chatState = useChatSessions();
  
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const telegramAuth = useTelegramAuth();
  const supabaseAuth = useAuth();
  const { balance, fetchBalance } = useCreditsStore();

  const user = telegramAuth.user || supabaseAuth.user;

  // Update from URL
  useEffect(() => {
    const section = searchParams.get('section') as SectionType;
    const model = searchParams.get('model');
    
    if (section && ['image', 'video', 'audio'].includes(section)) {
      generatorState.setActiveSection(section);
      if (model) {
        const modelExists = MODELS_CONFIG[section]?.models.find(m => m.id === model);
        if (modelExists) {
          generatorState.setCurrentModel(model);
        } else {
          generatorState.setCurrentModel(MODELS_CONFIG[section].models[0]?.id);
        }
      } else {
        generatorState.setCurrentModel(MODELS_CONFIG[section].models[0]?.id);
      }
    }
  }, [searchParams]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  // Handle model change
  const handleModelChange = useCallback((newModel: string) => {
    if (chatState.messages.length > 0 && chatState.activeChatId) {
      // Save current chat before switching
    }
    generatorState.setCurrentModel(newModel);
    chatState.createNewChat(newModel, generatorState.activeSection);
  }, [chatState, generatorState]);

  // Handle chat switch
  const handleSwitchChat = useCallback((chatId: string) => {
    const chat = chatState.switchToChat(chatId);
    if (chat) {
      generatorState.setCurrentModel(chat.model);
      generatorState.setActiveSection(chat.section);
    }
  }, [chatState, generatorState]);

  // Poll for result
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

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (!user) {
      setLoginOpen(true);
      return;
    }

    if (balance < generatorState.currentCost) {
      alert('Недостаточно звёзд');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    
    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: generatorState.activeSection,
      model: generatorState.modelInfo?.name,
      isGenerating: true,
    };

    const filesToUpload = [...uploadedFiles];
    
    chatState.setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);
    setPrompt('');
    setUploadedFiles([]);

    try {
      const endpoint = generatorState.activeSection === 'image' 
        ? '/api/generate/photo' 
        : generatorState.activeSection === 'video' 
        ? '/api/generate/video'
        : '/api/generate/audio';
      
      const requestBody: Record<string, any> = {
        prompt: userMessage.content,
        model: generatorState.currentModel,
      };
      
      // Flatten settings
      const { settings, activeSection } = generatorState;
      if (settings) {
        if (settings.aspect_ratio) requestBody.aspectRatio = settings.aspect_ratio;
        if (settings.quality) requestBody.quality = settings.quality;
        if (settings.resolution) requestBody.resolution = settings.resolution;
        if (settings.duration) requestBody.duration = Number(settings.duration);
        if (settings.generation_type) {
          if (activeSection === 'video') {
            const genType = settings.generation_type;
            if (genType === 'text-to-video') requestBody.mode = 't2v';
            else if (genType === 'image-to-video') requestBody.mode = 'i2v';
            else if (genType === 'video-to-video') requestBody.mode = 'v2v';
            else if (genType === 'reference-to-video') requestBody.mode = 'ref';
          } else if (activeSection === 'image') {
            // For image i2i mode
            if (settings.generation_type === 'i2i') requestBody.mode = 'i2i';
          } else if (activeSection === 'audio') {
            requestBody.generation_type = settings.generation_type;
          }
        }
        if (settings.version) requestBody.modelVariant = settings.version;
        if (settings.negative_prompt) requestBody.negativePrompt = settings.negative_prompt;
        if (settings.sound !== undefined) requestBody.audio = settings.sound;
        if (settings.seed) requestBody.seed = Number(settings.seed);
        if (settings.mode) {
          if (settings.mode === 'start-end') requestBody.mode = 'start_end';
          else if (settings.mode === 'start-only') requestBody.mode = 'i2v';
        }
        
        // Audio settings
        if (activeSection === 'audio') {
          if (settings.model) requestBody.suno_model = settings.model;
          if (settings.custom_mode !== undefined) requestBody.custom_mode = settings.custom_mode;
          if (settings.title) requestBody.title = settings.title;
          if (settings.style) requestBody.style = settings.style;
          if (settings.instrumental !== undefined) requestBody.instrumental = settings.instrumental;
          if (settings.lyrics) requestBody.lyrics = settings.lyrics;
          if (settings.vocal_gender) requestBody.vocal_gender = settings.vocal_gender;
          if (settings.negative_tags) requestBody.negative_tags = settings.negative_tags;
          if (settings.style_weight) requestBody.style_weight = settings.style_weight;
          if (settings.weirdness) requestBody.weirdness = settings.weirdness;
        }
      }
      
      // Handle files
      if (filesToUpload.length > 0) {
        const file = filesToUpload[0];
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        if (requestBody.mode === 'i2v' || requestBody.mode === 'start_end' || requestBody.mode === 'i2i') {
          requestBody.startImage = base64;
          if (filesToUpload.length > 1) {
            const base64_2 = await new Promise<string>((resolve) => {
              const reader2 = new FileReader();
              reader2.onload = () => resolve(reader2.result as string);
              reader2.readAsDataURL(filesToUpload[1]);
            });
            requestBody.endImage = base64_2;
          }
        } else {
          requestBody.referenceImage = base64;
        }
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      let resultUrl = data.url || data.results?.[0]?.url;
      
      if (!resultUrl && data.jobId) {
        const pollResult = await pollForResult(data.jobId, data.provider || 'kie');
        resultUrl = pollResult?.url || pollResult?.results?.[0]?.url;
      }
      
      chatState.setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: resultUrl ? 'Готово!' : 'Генерация завершена', url: resultUrl, isGenerating: false }
          : m
      ));

      fetchBalance();

    } catch (error) {
      console.error('Generation error:', error);
      chatState.setMessages(prev => prev.map(m => 
        m.id === assistantMessage.id 
          ? { ...m, content: 'Ошибка генерации. Попробуйте снова.', isGenerating: false }
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, user, balance, generatorState, chatState, uploadedFiles, fetchBalance]);

  // Handlers
  const handleSettingChange = useCallback((key: string, value: any) => {
    generatorState.setSettings(prev => ({ ...prev, [key]: value }));
  }, [generatorState]);

  const handleDownload = useCallback(async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `lensroom-${Date.now()}.${type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  }, []);

  const handleCopy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована!');
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, []);

  const handleRegenerate = useCallback((originalPrompt: string) => {
    setPrompt(originalPrompt);
    setTimeout(() => handleGenerate(), 100);
  }, [handleGenerate]);

  const clearChat = useCallback(() => {
    chatState.setMessages([]);
  }, [chatState]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-14 flex flex-col">
      {/* Model Bar */}
      <ModelBar
        sectionConfig={generatorState.sectionConfig}
        currentModel={generatorState.currentModel}
        onModelChange={handleModelChange}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <ChatSidebar
              chatSessions={chatState.chatSessions}
              activeChatId={chatState.activeChatId}
              onNewChat={() => chatState.createNewChat(generatorState.currentModel, generatorState.activeSection)}
              onSelectChat={handleSwitchChat}
              onDeleteChat={chatState.deleteChat}
            />
          )}
        </AnimatePresence>

        {/* Toggle History Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 p-1.5 rounded-r-lg bg-white/5 border border-l-0 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          style={{ left: showHistory ? 280 : 0 }}
        >
          {showHistory ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              <ChatMessages
                ref={chatEndRef}
                messages={chatState.messages}
                activeSection={generatorState.activeSection}
                modelInfo={generatorState.modelInfo}
                onSetPrompt={setPrompt}
                onDownload={handleDownload}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
              />
            </div>
          </div>

          {/* Prompt Input */}
          <PromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            uploadedFiles={uploadedFiles}
            onFilesChange={setUploadedFiles}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            activeSection={generatorState.activeSection}
            modelInfo={generatorState.modelInfo}
            currentCost={generatorState.currentCost}
            hasMessages={chatState.messages.length > 0}
            onClearChat={clearChat}
          />
        </div>

        {/* Settings Sidebar */}
        <AnimatePresence>
          {showSettings && (
            <SettingsSidebar
              currentModel={generatorState.currentModel}
              activeSection={generatorState.activeSection}
              modelInfo={generatorState.modelInfo}
              currentCost={generatorState.currentCost}
              settings={generatorState.settings}
              onSettingChange={handleSettingChange}
              onValidationChange={generatorState.setIsSettingsValid}
              balance={balance}
              isLoggedIn={!!user}
            />
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
