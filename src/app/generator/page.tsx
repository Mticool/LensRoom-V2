'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Layers, X, MessageSquare, SlidersHorizontal, Plus, Grid3x3 } from 'lucide-react';
import { computePrice, type PriceOptions } from '@/lib/pricing/compute-price';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Local components
import { 
  ChatSidebar, 
  ChatMessages, 
  PromptInput, 
  SettingsSidebar,
  GalleryView,
  CompactSettings
} from './components';
import { 
  MODELS_CONFIG, 
  SectionType, 
  ChatMessage, 
  ChatSession 
} from './config';

// Batch components
import { BatchImageUploader, type UploadedImage } from '@/components/generator-v2/BatchImageUploader';
import { BatchProgressBar, type BatchProgress } from '@/components/generator-v2/BatchProgressBar';

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
    
    // Преобразование версии Kling в modelVariant ID
    const getModelVariant = () => {
      const version = settings.version || settings.model_variant;
      if (!version) return undefined;
      
      // Kling версии в ID
      const versionMap: Record<string, string> = {
        '2.5-turbo': 'kling-2.5-turbo',
        '2.6': 'kling-2.6',
        '2.1-pro': 'kling-2.1',
        '2.1': 'kling-2.1',
        // WAN версии
        '2.5': 'wan-2.5',
        '2.6-turbo': 'wan-2.6',
        // Avatar версии
        'standard': 'kling-ai-avatar-standard',
        'pro': 'kling-ai-avatar-pro',
      };
      
      return versionMap[version] || version;
    };
    
    // Маппинг настроек генератора в PriceOptions
    const priceOptions: PriceOptions = {
      // Photo options
      quality: settings.quality || settings.output_quality,
      resolution: settings.resolution || settings.output_resolution,
      
      // Video options  
      mode: currentModel === 'sora-storyboard' ? 'storyboard' : (settings.generation_type || settings.mode),
      duration: settings.duration ? parseInt(String(settings.duration)) : (currentModel === 'kling-motion-control' ? 5 : undefined),
      videoQuality: settings.video_quality || settings.quality,
      audio: settings.audio === true || settings.sound === true || settings.with_audio === true,
      modelVariant: getModelVariant(),
      
      // Common
      variants: 1,
    };
    
    // Используем единую функцию расчёта цен
    const computed = computePrice(currentModel, priceOptions);
    
    // Если computePrice вернул 0 (модель не найдена в конфиге), fallback на базовую цену
    if (computed.stars === 0) {
      return modelInfo.cost;
    }
    
    return computed.stars;
  }, [modelInfo, currentModel, settings]);

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
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('lensroom_chat_sessions');
      console.log('[Chat] Loading from localStorage:', saved ? 'found' : 'empty');
      
      if (saved && saved !== '[]') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sessions = parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            messages: (s.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
          }));
          setChatSessions(sessions);
          console.log('[Chat] Loaded sessions:', sessions.length);
          
          const lastActiveId = localStorage.getItem('lensroom_active_chat');
          if (lastActiveId) {
            const chat = sessions.find((s: ChatSession) => s.id === lastActiveId);
            if (chat) {
              setActiveChatId(lastActiveId);
              setMessages(chat.messages || []);
              console.log('[Chat] Restored active chat:', chat.title);
            }
          }
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load history:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage (only after initial load completes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoaded) return;
    
    try {
      localStorage.setItem('lensroom_chat_sessions', JSON.stringify(chatSessions));
      console.log('[Chat] Saved sessions:', chatSessions.length);
    } catch (e) {
      console.error('[Chat] Failed to save:', e);
    }
  }, [chatSessions, isLoaded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  const router = useRouter();
  const sectionFromUrl = (searchParams.get('section') || 'image') as SectionType;
  const modelFromUrl = searchParams.get('model');
  const variantFromUrl = searchParams.get('variant'); // e.g. "2.6", "2.5-turbo", "2.1-pro", "2.5" (WAN), "2.6" (WAN)
  const qualityFromUrl = searchParams.get('quality'); // e.g. "fast" | "quality" for Veo
  
  // State
  const generatorState = useGeneratorState(sectionFromUrl, modelFromUrl);
  const chatState = useChatSessions();
  
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  // Desktop: keep panels open (like before). Mobile: closed by default (like syntax.ai).
  const [showSettings, setShowSettings] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  // Chat/history: hidden by default on desktop; user can open via visible buttons.
  const [showHistory, setShowHistory] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  
  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [batchImages, setBatchImages] = useState<UploadedImage[]>([]);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  
  // View mode state (Chat or Gallery) - only for Nano Banana Pro
  const [viewMode, setViewMode] = useState<'chat' | 'gallery'>('chat');
  
  // Test mode - persist in state so it doesn't reset on re-render
  const [isTestMode, setIsTestMode] = useState(false);
  
  // Initialize test mode from URL on mount
  useEffect(() => {
    if (searchParams.get('test') === '1') {
      setIsTestMode(true);
    }
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const telegramAuth = useTelegramAuth();
  const supabaseAuth = useAuth();
  const { balance, fetchBalance } = useCreditsStore();

  // Test mode: create fake user
  const testUser = isTestMode ? { id: 'test-user', name: 'Test User' } : null;
  
  const user = telegramAuth.user || supabaseAuth.user || testUser;

  // Add test images in test mode for Gallery View testing
  const testImagesAddedRef = useRef(false);
  useEffect(() => {
    if (isTestMode && !testImagesAddedRef.current) {
      testImagesAddedRef.current = true;
      
      const testImages: ChatMessage[] = [
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Красивый закат над океаном',
          timestamp: new Date(),
          url: 'https://picsum.photos/seed/sunset1/512/512',
          type: 'image',
          model: 'Nano Banana Pro',
        },
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Горный пейзаж с озером',
          timestamp: new Date(),
          url: 'https://picsum.photos/seed/mountain1/512/512',
          type: 'image',
          model: 'Nano Banana Pro',
        },
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: 'Городская архитектура',
          timestamp: new Date(),
          url: 'https://picsum.photos/seed/city1/512/512',
          type: 'image',
          model: 'Nano Banana Pro',
        },
        {
          id: Date.now() + 3,
          role: 'assistant',
          content: 'Природа и цветы',
          timestamp: new Date(),
          url: 'https://picsum.photos/seed/flowers1/512/512',
          type: 'image',
          model: 'Nano Banana Pro',
        },
      ];
      
      // Add test images to existing messages
      chatState.setMessages(prev => [...prev, ...testImages]);
      // Also set model to nano-banana-pro for Gallery View testing
      generatorState.setCurrentModel('nano-banana-pro');
      // Switch to gallery view automatically
      setViewMode('gallery');
    }
  }, [isTestMode]);

  // Track previous model to detect changes
  const prevModelRef = useRef<string | null>(null);
  
  // Update from URL - just change model/section, don't create chat
  useEffect(() => {
    const section = searchParams.get('section') as SectionType;
    const model = searchParams.get('model');
    const variant = searchParams.get('variant');
    const quality = searchParams.get('quality');
    
    if (section && ['image', 'video', 'audio'].includes(section)) {
      generatorState.setActiveSection(section);
      
      let newModel = model;
      if (model) {
        const modelExists = MODELS_CONFIG[section]?.models.find(m => m.id === model);
        if (!modelExists) {
          newModel = MODELS_CONFIG[section].models[0]?.id;
        }
      } else {
        newModel = MODELS_CONFIG[section].models[0]?.id;
      }
      
      if (newModel) {
        generatorState.setCurrentModel(newModel);
        prevModelRef.current = newModel;
      }

      // Apply variant for unified models (Kling/WAN) via URL
      // - Kling uses: "2.5-turbo" | "2.6" | "2.1-pro" | "o1"
      // - WAN uses: "2.5" | "2.6"
      if (variant && typeof variant === 'string') {
        const shouldApply =
          section === 'video' && (newModel === 'kling' || newModel === 'wan');
        if (shouldApply) {
          generatorState.setSettings(prev => ({ ...prev, version: variant }));
        }
      }

      // Apply Veo quality via URL: /generator?model=veo-3.1&quality=quality
      if (quality && typeof quality === 'string') {
        if (section === 'video' && newModel === 'veo-3.1') {
          generatorState.setSettings(prev => ({ ...prev, quality }));
        }
      }
    }
  }, [searchParams, generatorState]);

  const pushGeneratorParams = useCallback(
    (next: { section?: SectionType; model?: string; variant?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.section) params.set('section', next.section);
      if (next.model) params.set('model', next.model);
      if (next.variant === null) params.delete('variant');
      if (typeof next.variant === 'string' && next.variant.length > 0) params.set('variant', next.variant);
      router.replace(`/generator?${params.toString()}`);
    },
    [router, searchParams]
  );

  const selectSection = useCallback(
    (section: SectionType) => {
      const firstModel = MODELS_CONFIG[section]?.models?.[0]?.id;
      generatorState.setActiveSection(section);
      if (firstModel) generatorState.setCurrentModel(firstModel);
      pushGeneratorParams({ section, model: firstModel || undefined });
    },
    [generatorState, pushGeneratorParams]
  );

  const selectModel = useCallback(
    (modelId: string) => {
      generatorState.setCurrentModel(modelId);
      pushGeneratorParams({ model: modelId });
    },
    [generatorState, pushGeneratorParams]
  );

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  // Check for prefilled prompt from inspiration gallery
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const prefillPrompt = localStorage.getItem('lensroom_prefill_prompt');
    const prefillModel = localStorage.getItem('lensroom_prefill_model');
    
    if (prefillPrompt) {
      // Set the prompt
      setPrompt(prefillPrompt);
      
      // Clear from localStorage
      localStorage.removeItem('lensroom_prefill_prompt');
      localStorage.removeItem('lensroom_prefill_model');
      
      console.log('[Generator] Prefilled prompt from inspiration:', prefillPrompt.slice(0, 50));
    }
  }, []);

  // Handle model change - just switch model, don't create chat
  const handleModelChange = useCallback((newModel: string) => {
    generatorState.setCurrentModel(newModel);
    
    // Disable batch mode if new model doesn't support i2i
    const newModelInfo = MODELS_CONFIG[generatorState.activeSection]?.models.find(m => m.id === newModel);
    if (!newModelInfo?.supportsI2i && batchMode) {
      setBatchMode(false);
      setBatchImages([]);
    }
  }, [generatorState, batchMode]);

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

    // Get variants count (only for nano-banana-pro, default 1)
    const variantsCount = generatorState.currentModel === 'nano-banana-pro' 
      ? Number(generatorState.settings?.variants) || 1 
      : 1;
    
    // Calculate total cost for all variants
    const totalCost = generatorState.currentCost * variantsCount;

    // Skip balance check in test mode
    if (!isTestMode && balance < totalCost) {
      alert(`Недостаточно звёзд. Нужно ${totalCost}⭐ для ${variantsCount} фото`);
      return;
    }

    // Create new chat if no active chat exists
    if (!chatState.activeChatId) {
      chatState.createNewChat(generatorState.currentModel, generatorState.activeSection);
    }

    // For UI display - show variants count
    const displayPrompt = prompt + (variantsCount > 1 ? ` (${variantsCount} варианта)` : '');
    // For API - clean prompt without variants text (model handles n parameter)
    const apiPrompt = prompt;
    
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: displayPrompt,
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
      variantsCount: variantsCount, // Store variants count for grid display
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
        prompt: apiPrompt, // Use clean prompt without "(X варианта)" text
        model: generatorState.currentModel,
      };
      
      // Flatten settings
      const { settings, activeSection } = generatorState;
      console.log('[Generator] Current settings:', settings);
      console.log('[Generator] aspect_ratio from settings:', settings?.aspect_ratio);
      
      if (settings) {
        if (settings.aspect_ratio) {
          requestBody.aspectRatio = settings.aspect_ratio;
          console.log('[Generator] Setting aspectRatio in requestBody:', settings.aspect_ratio);
        } else {
          console.warn('[Generator] aspect_ratio not found in settings! Using default 9:16');
          requestBody.aspectRatio = '9:16'; // Fallback для Nano Banana Pro
        }
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

      // Model-specific mapping
      if (generatorState.currentModel === 'sora-storyboard' && generatorState.activeSection === 'video') {
        requestBody.mode = 'storyboard';
        if (settings?.num_shots != null) requestBody.shots = Number(settings.num_shots);
        // Map orientation to aspect ratio for backend
        if (settings?.aspect_ratio === 'landscape') requestBody.aspectRatio = '16:9';
        if (settings?.aspect_ratio === 'portrait') requestBody.aspectRatio = '9:16';
      }
      
      // Handle files
      if (filesToUpload.length > 0) {
        // Motion Control: needs character image + motion reference video
        if (generatorState.currentModel === 'kling-motion-control') {
          const imageFile = filesToUpload.find(f => f.type.startsWith('image/'));
          const videoFile = filesToUpload.find(f => f.type.startsWith('video/'));
          
          if (imageFile) {
            const imageBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(imageFile);
            });
            requestBody.referenceImage = imageBase64;
          }
          
          if (videoFile) {
            const videoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(videoFile);
            });
            requestBody.referenceVideo = videoBase64;
            
            // Get video duration for pricing
            const videoDuration = await new Promise<number>((resolve) => {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.onloadedmetadata = () => {
                resolve(video.duration);
                URL.revokeObjectURL(video.src);
              };
              video.onerror = () => resolve(0);
              video.src = URL.createObjectURL(videoFile);
            });
            requestBody.videoDuration = videoDuration;
            requestBody.autoTrim = true; // Always auto-trim
          }
          
          requestBody.mode = 'i2v'; // Motion Control is I2V mode
        } else {
          // Standard file handling
          const file = filesToUpload[0];
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          // IMPORTANT:
          // - Photo i2i endpoint expects `referenceImage`
          // - Video modes expect `startImage`/`endImage`
          if (generatorState.activeSection === 'image' && requestBody.mode === 'i2i') {
            requestBody.referenceImage = base64;
          } else if (requestBody.mode === 'i2v' || requestBody.mode === 'start_end') {
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
      }
      
      // Debug log before sending request
      console.log('[Generator] Final requestBody before send:', {
        model: requestBody.model,
        mode: requestBody.mode,
        hasReferenceImage: !!requestBody.referenceImage,
        referenceImageLength: requestBody.referenceImage?.length || 0,
        aspectRatio: requestBody.aspectRatio,
        quality: requestBody.quality,
      });

      // Handle multiple variants with parallel requests
      if (variantsCount > 1 && generatorState.activeSection === 'image') {
        // Generate random seeds for each variant
        const seeds = Array.from({ length: variantsCount }, () => Math.floor(Math.random() * 2147483647));
        
        // Create parallel requests
        const requests = seeds.map(seed => 
          fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...requestBody, seed }),
          })
        );
        
        const responses = await Promise.all(requests);
        const results: string[] = [];
        
        // Process each response
        for (const response of responses) {
          if (!response.ok) {
            console.error('Variant generation failed:', response.status);
            continue;
          }
          
          const data = await response.json();
          let resultUrl = data.url || data.results?.[0]?.url;
          
          if (!resultUrl && data.jobId) {
            const pollResult = await pollForResult(data.jobId, data.provider || 'kie');
            resultUrl = pollResult?.url || pollResult?.results?.[0]?.url;
          }
          
          if (resultUrl) {
            results.push(resultUrl);
          }
        }
        
        // Update message with multiple URLs
        chatState.setMessages(prev => prev.map(m => 
          m.id === assistantMessage.id 
            ? { 
                ...m, 
                content: results.length > 0 ? `Готово! (${results.length} фото)` : 'Ошибка генерации', 
                urls: results, // Array of URLs for grid display
                url: results[0], // Backwards compatibility
                isGenerating: false 
              }
            : m
        ));
      } else {
        // Single variant - original logic
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          let msg = 'Generation failed';
          try {
            const err = await response.json();
            msg = err?.error || err?.message || msg;
          } catch {}
          throw new Error(msg);
        }

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
      }

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

  // Batch Generate
  const handleBatchGenerate = useCallback(async () => {
    if (!prompt.trim() || isBatchGenerating || batchImages.length === 0) return;
    
    if (!user) {
      setLoginOpen(true);
      return;
    }

    const pricePerImage = generatorState.currentCost;
    const totalCost = pricePerImage * batchImages.length;

    // Skip balance check in test mode
    if (!isTestMode && balance < totalCost) {
      toast.error(`Недостаточно звёзд. Нужно ${totalCost}⭐, у вас ${balance}⭐`);
      return;
    }

    // Create new chat if no active chat exists
    if (!chatState.activeChatId) {
      chatState.createNewChat(generatorState.currentModel, generatorState.activeSection);
    }

    setIsBatchGenerating(true);
    setBatchProgress({
      total: batchImages.length,
      completed: 0,
      failed: 0,
      current: 0,
      status: 'processing',
    });

    try {
      // Send batch request
      const response = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: generatorState.currentModel,
          quality: generatorState.settings.quality,
          aspectRatio: generatorState.settings.aspect_ratio,
          negativePrompt: generatorState.settings.negative_prompt,
          images: batchImages.map(img => ({
            id: img.id,
            data: img.preview,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch generation failed');
      }

      const { batchId, jobs, totalCost: serverCost } = data;
      const jobIds = jobs.map((j: { generationId: string }) => j.generationId).join(',');

      toast.success(`Batch запущен: ${batchImages.length} изображений`);

      // Poll for status
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 300;

      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        try {
          const statusRes = await fetch(`/api/generate/batch?batchId=${batchId}&jobIds=${jobIds}`);
          const statusData = await statusRes.json();

          if (statusRes.ok) {
            const { summary, isComplete: done, results } = statusData;
            
            setBatchProgress({
              total: summary.total,
              completed: summary.completed,
              failed: summary.failed,
              current: summary.pending,
              status: done ? 'completed' : 'processing',
            });

            isComplete = done;

            if (done) {
              // Add results to chat
              const successResults = results.filter((r: any) => r.status === 'success' && r.imageUrl);
              
              if (successResults.length > 0) {
                const batchMessage: ChatMessage = {
                  id: Date.now(),
                  role: 'assistant',
                  content: `Batch завершён: ${summary.completed} из ${summary.total} изображений`,
                  timestamp: new Date(),
                  type: 'image',
                  model: generatorState.modelInfo?.name,
                  batchResults: successResults.map((r: any) => ({
                    url: r.imageUrl,
                    clientId: r.clientId,
                  })),
                };
                
                chatState.setMessages(prev => [...prev, batchMessage]);
              }

              if (summary.failed > 0) {
                toast.error(`${summary.failed} изображений не удалось обработать`);
              } else {
                toast.success(`Все ${summary.completed} изображений готовы!`);
              }
            }
          }
        } catch (e) {
          console.error('Batch poll error:', e);
        }
      }

      if (!isComplete) {
        toast.error('Timeout: batch обработка занимает слишком долго');
      }

      fetchBalance();
      setBatchImages([]);
      setPrompt('');
      setBatchMode(false);

    } catch (error) {
      console.error('Batch generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка batch генерации');
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
    }
  }, [prompt, user, balance, generatorState, batchImages, chatState, fetchBalance]);

  // Handlers
  const handleSettingChange = useCallback((key: string, value: any) => {
    console.log('[Generator] Setting changed:', { key, value, currentSettings: generatorState.settings });
    generatorState.setSettings(prev => {
      const updated = { ...prev, [key]: value };
      console.log('[Generator] Updated settings:', updated);
      return updated;
    });
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

  // Quick Actions handler
  const handleQuickAction = useCallback(async (action: string, originalPrompt: string, imageUrl: string) => {
    let newPrompt = originalPrompt;
    
    switch (action) {
      case 'variations':
        // Generate variations with slightly modified prompt
        newPrompt = `${originalPrompt}, different variation, alternative composition`;
        break;
      case 'enhance':
        // Enhance quality
        newPrompt = `${originalPrompt}, enhanced quality, highly detailed, 8K resolution, professional`;
        break;
      case 'style':
        // Open style selector (for now just add artistic style)
        const styles = ['digital art style', 'oil painting style', 'watercolor style', 'anime style', 'photorealistic style'];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];
        newPrompt = `${originalPrompt}, ${randomStyle}`;
        break;
      case 'resize':
        // Change aspect ratio (toggle between common ratios)
        const currentRatio = generatorState.settings.aspect_ratio || '1:1';
        const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
        const currentIndex = ratios.indexOf(currentRatio);
        const nextRatio = ratios[(currentIndex + 1) % ratios.length];
        generatorState.setSettings(prev => ({ ...prev, aspect_ratio: nextRatio }));
        newPrompt = originalPrompt;
        break;
    }
    
    // For variations/enhance/style - use the image as reference if supported
    if ((action === 'variations' || action === 'enhance' || action === 'style') && imageUrl) {
      try {
        // Fetch image and convert to File for upload
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'reference.png', { type: 'image/png' });
        setUploadedFiles([file]);
        
        // Set mode to i2i for image reference
        if (generatorState.activeSection === 'image') {
          generatorState.setSettings(prev => ({ ...prev, generation_type: 'i2i' }));
        }
      } catch (e) {
        console.error('Failed to use image as reference:', e);
      }
    }
    
    setPrompt(newPrompt);
    
    // Auto-generate after short delay
    setTimeout(() => handleGenerate(), 300);
  }, [generatorState, handleGenerate]);

  const clearChat = useCallback(() => {
    chatState.setMessages([]);
  }, [chatState]);

  return (
    // Header is fixed and the layout already adds a 56px spacer.
    // Make generator fit exactly into remaining viewport height to avoid page scroll in small windows.
    // On mobile, we have an additional ~52px top bar for category tabs, so we use pt-[52px] on mobile.
    <div className="h-[calc(100vh-56px)] bg-[var(--bg)] flex flex-col relative overflow-hidden pt-[52px] md:pt-0">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-2 text-sm font-medium">
          🧪 ТЕСТОВЫЙ РЕЖИМ — авторизация отключена, показаны демо-изображения
        </div>
      )}
      {/* Premium gradient background - syntx.ai style */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-40" />
        {/* Gradient blobs for visual interest */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[var(--accent-primary)]/5 rounded-full blur-[80px]" />
      </div>

      {/* Mobile: Model picker - organized by sections */}
      <Sheet open={showModelPicker} onOpenChange={setShowModelPicker}>
        <SheetContent
          side="bottom"
          className="md:hidden max-h-[85vh] overflow-hidden bg-[var(--surface)]/98 backdrop-blur-2xl text-[var(--text)] border-t border-white/10 rounded-t-[28px]"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3">
            <h2 className="text-lg font-semibold">Выберите нейросеть</h2>
            <button
              onClick={() => setShowModelPicker(false)}
              className="p-2 -mr-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* All sections with models - scrollable */}
          <div className="overflow-y-auto max-h-[70vh] pb-8">
            {(['image', 'video', 'audio'] as const).map((section) => {
              const config = MODELS_CONFIG[section];
              const Icon = config.icon;
              const models = config.models || [];
              
              return (
                <div key={section} className="px-5 mb-5">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      section === 'image' ? 'bg-[var(--accent-primary)]/15' :
                      section === 'video' ? 'bg-cyan-500/15' : 'bg-pink-500/15'
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        section === 'image' ? 'text-[var(--accent-primary)]' :
                        section === 'video' ? 'text-cyan-400' : 'text-pink-400'
                      )} />
                    </div>
                    <span className="text-sm font-semibold text-white">{config.section}</span>
                    <span className="text-xs text-[var(--muted)]">({models.length})</span>
                  </div>
                  
                  {/* Models grid - 2 columns */}
                  <div className="grid grid-cols-2 gap-2">
                    {models.map((m: any) => {
                      const isActive = m.id === generatorState.currentModel && section === generatorState.activeSection;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (section !== generatorState.activeSection) {
                              selectSection(section);
                            }
                            selectModel(m.id);
                            setShowModelPicker(false);
                          }}
                          className={cn(
                            'flex flex-col items-start p-3 rounded-xl border text-left transition-all touch-manipulation active:scale-[0.98]',
                            isActive
                              ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40'
                              : 'bg-white/5 border-white/8 hover:bg-white/10'
                          )}
                        >
                          <div className={cn('text-[12px] font-medium leading-tight', isActive ? 'text-[var(--accent-primary)]' : 'text-white')}>
                            {m.name}
                          </div>
                          {m.badge && (
                            <div className="text-[9px] text-[var(--muted)] mt-0.5">
                              {m.badge}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">
        {/* Desktop: always-visible controls */}
        <div className="hidden md:flex absolute left-3 top-3 z-40 items-center gap-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all touch-manipulation"
            title={showHistory ? 'Скрыть чаты' : 'Открыть чаты'}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">{showHistory ? 'Скрыть чат' : 'Чаты'}</span>
          </button>
          <button
            onClick={() => {
              chatState.createNewChat(generatorState.currentModel, generatorState.activeSection);
              setShowHistory(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-white hover:bg-[var(--accent-primary)]/25 transition-all touch-manipulation"
            title="Новый чат"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-semibold">Новый чат</span>
          </button>
        </div>

        <div className="hidden md:flex absolute right-3 top-3 z-40 items-center gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all touch-manipulation",
              showSettings
                ? "bg-white/10 border-white/15 text-white hover:bg-white/15"
                : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
            )}
            title={showSettings ? 'Скрыть настройки' : 'Открыть настройки'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="text-xs font-medium">{showSettings ? 'Скрыть настройки' : 'Настройки'}</span>
          </button>
        </div>

        {/* History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <ChatSidebar
              chatSessions={chatState.chatSessions}
              activeChatId={chatState.activeChatId}
              onNewChat={() => chatState.createNewChat(generatorState.currentModel, generatorState.activeSection)}
              onSelectChat={handleSwitchChat}
              onDeleteChat={chatState.deleteChat}
              onClose={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>

        {/* Desktop Toggle History Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 z-40 p-1.5 rounded-r-lg bg-white/5 border border-l-0 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          style={{ left: showHistory ? 280 : 0 }}
        >
          {showHistory ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Desktop Toggle Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 z-40 p-1.5 rounded-l-lg bg-white/5 border border-r-0 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          style={{ right: showSettings ? 320 : 0 }}
        >
          {showSettings ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* View Mode Toggle (Chat/Gallery) - Only for Nano Banana Pro - OUTSIDE Chat Area for visibility */}
        {generatorState.currentModel === 'nano-banana-pro' && !batchMode && (
          <div className="absolute top-[72px] md:top-16 left-1/2 -translate-x-1/2 z-[100]">
            <div className="flex items-center gap-1 p-1.5 rounded-xl bg-[#1a1a2e] backdrop-blur-xl border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/20">
              <button
                onClick={() => setViewMode('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'chat'
                    ? 'bg-[var(--accent-primary)] text-black shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Чат
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'gallery'
                    ? 'bg-[var(--accent-primary)] text-black shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                Галерея
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative min-h-0">

          {/* Batch Mode Toggle - Only show for models that support i2i */}
          {generatorState.activeSection === 'image' && generatorState.modelInfo?.supportsI2i && (
            <div className="absolute top-4 right-4 z-30">
              <button
                onClick={() => {
                  setBatchMode(!batchMode);
                  if (!batchMode) {
                    setBatchImages([]);
                    setBatchProgress(null);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  batchMode
                    ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <Layers className="w-4 h-4" />
                Batch
                {batchMode && batchImages.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[var(--accent-primary)] text-black text-xs rounded-full">
                    {batchImages.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Batch Progress Bar */}
          <AnimatePresence>
            {batchProgress && isBatchGenerating && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-4 py-3 border-b border-white/5"
              >
                <BatchProgressBar 
                  progress={batchProgress} 
                  onCancel={() => {
                    setIsBatchGenerating(false);
                    setBatchProgress(null);
                    toast.info('Batch отменён');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages or Batch Uploader */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {batchMode && !isBatchGenerating ? (
              // Batch Mode UI
              <div className="max-w-3xl mx-auto px-4 py-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-4">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">Batch режим</span>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Массовая обработка изображений
                    </h2>
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                      Загрузите до 10 изображений и примените один промпт ко всем.
                      Стоимость: {generatorState.currentCost}⭐ × {batchImages.length || 1} = {generatorState.currentCost * (batchImages.length || 1)}⭐
                    </p>
                  </div>

                  {/* Uploader */}
                  <BatchImageUploader
                    images={batchImages}
                    onImagesChange={setBatchImages}
                    maxImages={10}
                    disabled={isBatchGenerating}
                    showHistoryButton={false}
                  />

                  {/* Example prompts */}
                  {batchImages.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                        Примеры промптов
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Add white background',
                          'Add neon lighting cyberpunk style',
                          'Convert to anime style',
                          'Enhance quality and colors',
                          'Add flowers and nature',
                        ].map((example) => (
                          <button
                            key={example}
                            onClick={() => setPrompt(example)}
                            className="px-3 py-1.5 text-xs rounded-full bg-white/5 text-gray-400 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] transition-all border border-white/5 hover:border-[var(--accent-primary)]/20"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Close batch mode */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setBatchMode(false);
                        setBatchImages([]);
                      }}
                      className="text-sm text-gray-500 hover:text-white transition flex items-center gap-1 mx-auto"
                    >
                      <X className="w-4 h-4" />
                      Выйти из batch режима
                    </button>
                  </div>
                </motion.div>
              </div>
            ) : viewMode === 'gallery' && generatorState.currentModel === 'nano-banana-pro' ? (
              // Gallery View - Only for Nano Banana Pro
              <GalleryView
                messages={chatState.messages}
                onDownload={handleDownload}
                onCopy={handleCopy}
                modelFilter="Nano Banana Pro"
              />
            ) : (
              // Normal chat messages
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
                  onQuickAction={handleQuickAction}
                  uploadedFiles={uploadedFiles}
                  onFileUpload={setUploadedFiles}
                />
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <PromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            uploadedFiles={batchMode ? [] : uploadedFiles}
            onFilesChange={setUploadedFiles}
            isGenerating={isGenerating || isBatchGenerating}
            onGenerate={batchMode ? handleBatchGenerate : handleGenerate}
            activeSection={generatorState.activeSection}
            modelInfo={generatorState.modelInfo}
            currentCost={batchMode ? generatorState.currentCost * batchImages.length : generatorState.currentCost}
            hasMessages={chatState.messages.length > 0}
            onClearChat={clearChat}
          />

          {/* Compact Settings - Only for Nano Banana Pro */}
          {generatorState.currentModel === 'nano-banana-pro' && !batchMode && (
            <div className="px-4 pb-3">
              <CompactSettings
                modelName="Nano Banana"
                aspectRatio={generatorState.settings?.aspect_ratio || '1:1'}
                quality={generatorState.settings?.quality || '2K'}
                variantsCount={Number(generatorState.settings?.variants) || 1}
                hasReferenceImage={uploadedFiles.length > 0}
                onAspectRatioChange={(value) => handleSettingChange('aspect_ratio', value)}
                onQualityChange={(value) => handleSettingChange('quality', value)}
                onVariantsChange={(value) => handleSettingChange('variants', value)}
                onDrawClick={() => {
                  // Trigger file upload
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      setUploadedFiles(Array.from(files));
                    }
                  };
                  input.click();
                }}
              />
            </div>
          )}
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
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: Floating side buttons - positioned below the top header bar */}
      <div className="md:hidden fixed left-3 top-[115px] z-40">
        <button
          onClick={() => setShowHistory(true)}
          className="p-2.5 rounded-xl bg-[var(--surface)]/95 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white active:bg-white/10 transition touch-manipulation shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>
      <div className="md:hidden fixed right-3 top-[115px] z-40">
        <button
          onClick={() => setShowSettings(true)}
          className="p-2.5 rounded-xl bg-[var(--surface)]/95 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white active:bg-white/10 transition touch-manipulation shadow-lg"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile: Top header bar with model selector */}
      <div className="md:hidden fixed top-14 inset-x-0 z-30 bg-[var(--bg)]/98 backdrop-blur-xl border-b border-white/5">
        {/* Category tabs + Model picker button */}
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(['image', 'video', 'audio'] as const).map((s) => {
              const active = generatorState.activeSection === s;
              const Icon = MODELS_CONFIG[s].icon;
              return (
                <button
                  key={s}
                  onClick={() => selectSection(s)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition touch-manipulation whitespace-nowrap',
                    active
                      ? 'bg-[var(--accent-primary)] text-[var(--btn-primary-text)] shadow-md shadow-[var(--accent-primary)]/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {MODELS_CONFIG[s].section}
                </button>
              );
            })}
          </div>

          {/* Model picker button */}
          <button
            onClick={() => setShowModelPicker(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface2)] border border-white/10 text-[var(--text)] active:scale-[0.97] transition touch-manipulation ml-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-xs font-medium truncate max-w-[90px]">{generatorState.modelInfo?.name}</span>
          </button>
        </div>
      </div>

      <LoginDialog isOpen={loginOpen && !isTestMode} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GeneratorPageContent />
    </Suspense>
  );
}