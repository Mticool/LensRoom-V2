'use client';

import { cn } from '@/lib/utils';
import { Zap, Download, Copy, RotateCcw } from 'lucide-react';

// Type for section
type SectionType = 'text' | 'design' | 'video' | 'audio';

interface GenerationResult {
  type: 'image' | 'video' | 'audio' | 'text';
  url?: string;
  content?: string;
  prompt: string;
  model: string;
  duration?: number;
}

interface CanvasProps {
  section: SectionType;
  model: string;
  chatHistory: Array<{
    id: number;
    role: 'user' | 'assistant';
    content: string | Record<string, unknown>;
    files?: File[];
    model?: string;
    timestamp: Date;
    isError?: boolean;
  }>;
  currentResult: GenerationResult | null;
  isGenerating: boolean;
  progress: number;
}

// Model descriptions
const modelDescriptions: Record<string, { title: string; subtitle: string; description: string }> = {
  'banana-pro': {
    title: 'Nano Banana Pro',
    subtitle: 'Нашумевшая нейросеть от Google: Gemini Flash 3.0 Banana.',
    description: 'Отправьте текстовой запрос или загрузите до 4 изображений вместе с запросом, чтобы использовать режим Remix',
  },
  'flux-pro': {
    title: 'Flux Pro',
    subtitle: 'Высокопроизводительная генерация изображений',
    description: 'Создавайте уникальные изображения с помощью продвинутого ИИ',
  },
  'dall-e': {
    title: 'DALL-E 3',
    subtitle: 'OpenAI модель генерации изображений',
    description: 'Фотореалистичные и художественные изображения',
  },
  'chatgpt': {
    title: 'ChatGPT',
    subtitle: 'Общий текстовой ИИ ассистент от OpenAI',
    description: 'Помощь в написании, анализе и создании контента любой сложности',
  },
  'claude': {
    title: 'Claude 3',
    subtitle: 'Продвинутый ИИ ассистент от Anthropic',
    description: 'Глубокий анализ, исследования и творческие задачи',
  },
  'gemini': {
    title: 'Gemini',
    subtitle: 'Мультимодальная модель от Google',
    description: 'Работа с текстом, изображениями и кодом',
  },
  'grok': {
    title: 'Grok',
    subtitle: 'ИИ от xAI с актуальной информацией',
    description: 'Доступ к реальному времени и юмор',
  },
  'veo3': {
    title: 'Veo 3.1',
    subtitle: 'Флагманская модель Google для видео',
    description: 'Создавайте видео из текстового описания с реалистичной физикой',
  },
  'sora': {
    title: 'Sora 2',
    subtitle: 'Революционная модель от OpenAI',
    description: 'Кинематографичное качество видео до 60 секунд',
  },
  'kling': {
    title: 'Kling 2.6',
    subtitle: 'Быстрая генерация с детализацией',
    description: 'Оптимальный баланс скорости и качества',
  },
  'eleven-labs': {
    title: 'ElevenLabs',
    subtitle: 'Реалистичная озвучка и клонирование голоса',
    description: 'Создавайте профессиональную озвучку на любом языке',
  },
  'murf': {
    title: 'Murf AI',
    subtitle: 'Студийное качество озвучки',
    description: 'Более 120 голосов на 20+ языках',
  },
};

export function Canvas({ section, model, chatHistory, currentResult, isGenerating, progress }: CanvasProps) {
  const modelInfo = modelDescriptions[model] || {
    title: 'Модель',
    subtitle: 'Описание',
    description: 'Информация',
  };

  // Show generating state
  if (isGenerating) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
        <GeneratingState progress={progress} />
      </main>
    );
  }

  // Show current result
  if (currentResult) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        <ResultView result={currentResult} />
      </main>
    );
  }

  // Show chat history if exists
  if (chatHistory.length > 0) {
    return (
      <main className="flex-1 flex flex-col p-6 overflow-auto">
        <ChatView messages={chatHistory} />
      </main>
    );
  }

  // Empty state with model info
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
          <Zap className="w-10 h-10 text-foreground/70" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{modelInfo.title}</h1>
        <p className="text-muted-foreground mb-4">{modelInfo.subtitle}</p>
        <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
          {modelInfo.description}
        </p>
      </div>
    </main>
  );
}

// Generating State
function GeneratingState({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative w-32 h-32 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" className="fill-none stroke-muted stroke-[6]" />
          <circle
            cx="50" cy="50" r="45"
            className="fill-none stroke-primary stroke-[6]"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.83} 283`}
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(progress)}%</span>
        </div>
      </div>
      <h3 className="text-lg font-medium mb-2">Генерация...</h3>
      <p className="text-sm text-muted-foreground">Это может занять несколько секунд</p>
    </div>
  );
}

// Result View
function ResultView({ result }: { result: GenerationResult }) {
  const handleDownload = () => {
    if (result.url) {
      window.open(result.url, '_blank');
    }
  };

  const handleCopy = () => {
    if (result.content) {
      navigator.clipboard.writeText(result.content);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Image Result */}
      {result.type === 'image' && result.url && (
        <div className="space-y-4">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black shadow-2xl">
            <img src={result.url} alt={result.prompt} className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Скачать
            </button>
            <button className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Video Result */}
      {result.type === 'video' && result.url && (
        <div className="space-y-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
            <video src={result.url} controls className="w-full h-full object-contain" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать видео
          </button>
        </div>
      )}

      {/* Text Result */}
      {result.type === 'text' && result.content && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-card border border-border">
            <p className="whitespace-pre-wrap">{result.content}</p>
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Копировать
          </button>
        </div>
      )}

      {/* Audio Result */}
      {result.type === 'audio' && result.url && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-card border border-border">
            <audio src={result.url} controls className="w-full" />
          </div>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Скачать аудио
          </button>
        </div>
      )}

      {/* Prompt */}
      <div className="mt-4 p-4 rounded-lg bg-muted/50">
        <p className="text-xs text-muted-foreground mb-1">Промпт:</p>
        <p className="text-sm">{result.prompt}</p>
      </div>
    </div>
  );
}

// Chat View
function ChatView({ messages }: { messages: CanvasProps['chatHistory'] }) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'p-4 rounded-xl max-w-[80%]',
            message.role === 'user'
              ? 'ml-auto bg-primary text-primary-foreground'
              : message.isError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted'
          )}
        >
          {typeof message.content === 'string' ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ResultView result={message.content as unknown as GenerationResult} />
          )}
        </div>
      ))}
    </div>
  );
}
