'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Volume2, Play, Pause, Download } from 'lucide-react';
import { VoiceCloneCard } from './VoiceCloneCard';
import { AudioGenerateCard } from './AudioGenerateCard';
import { cn } from '@/lib/utils';
import { LoginDialog } from '@/components/auth/login-dialog';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';

interface ClonedVoice {
  id: string;
  name: string;
}

interface AudioResult {
  id: string;
  url: string;
  name: string;
  duration: number;
}

// Cost estimates (mock for now)
const COST_ESTIMATE = {
  clone: 15,
  speech: { 10: 5, 30: 10, 60: 18 },
  track: { 10: 20, 30: 40, 60: 70 },
};

export function AudioStudio() {
  const { isAuthenticated, isLoading: authLoading, credits } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  // Step 1: Voice Clone State
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<Blob | null>(null);
  const [cloneStatus, setCloneStatus] = useState<'idle' | 'cloning' | 'cloned'>('idle');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);

  // Step 2: Generation State
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [mode, setMode] = useState<'speech' | 'track'>('speech');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<10 | 30 | 60>(30);
  const [language, setLanguage] = useState<'ru' | 'en' | 'mix'>('ru');

  // Generation State
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [result, setResult] = useState<AudioResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Calculate estimated cost
  const estimatedCost = mode === 'speech' 
    ? COST_ESTIMATE.speech[duration] 
    : COST_ESTIMATE.track[duration];

  // Clone voice handler
  const handleCloneVoice = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!voiceFile && !voiceRecording) {
      toast.error('Загрузите или запишите голос');
      return;
    }

    setCloneStatus('cloning');

    // Mock cloning process
    await new Promise(resolve => setTimeout(resolve, 2500));

    const newVoice: ClonedVoice = {
      id: `voice-${Date.now()}`,
      name: `My Voice #${clonedVoices.length + 1}`,
    };

    setClonedVoices(prev => [...prev, newVoice]);
    setSelectedVoice(newVoice.id);
    setCloneStatus('cloned');
    toast.success('Голос успешно клонирован!');
  }, [isAuthenticated, voiceFile, voiceRecording, clonedVoices.length]);

  // Generate audio handler
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error(mode === 'speech' 
        ? 'Введите текст для озвучки' 
        : 'Опишите трек, который хотите создать');
      return;
    }

    if (credits < estimatedCost) {
      toast.error(`Недостаточно звёзд. Нужно: ${estimatedCost}⭐`);
      return;
    }

    setGenerationStatus('generating');
    setResult(null);

    // Mock generation process
    const generateTime = mode === 'speech' ? 3000 : 5000;
    await new Promise(resolve => setTimeout(resolve, generateTime));

    // Mock result
    const mockResult: AudioResult = {
      id: `audio-${Date.now()}`,
      url: '/audio/demo.mp3', // Placeholder
      name: mode === 'speech' ? 'Озвучка' : 'Трек',
      duration: duration,
    };

    setResult(mockResult);
    setGenerationStatus('done');
    toast.success('Аудио готово!');
  }, [isAuthenticated, prompt, mode, credits, estimatedCost, duration]);

  // Reset file/recording when clone status changes
  const handleFileSelect = (file: File | null) => {
    setVoiceFile(file);
    if (file) setCloneStatus('idle');
  };

  const handleRecordingComplete = (blob: Blob | null) => {
    setVoiceRecording(blob);
    if (blob) setCloneStatus('idle');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-2">
            Музыка и голос
          </h1>
          <p className="text-[var(--muted)] text-lg">
            Клонируй голос и создавай треки с помощью AI
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step 1: Voice Clone */}
          <VoiceCloneCard
            voiceFile={voiceFile}
            voiceRecording={voiceRecording}
            cloneStatus={cloneStatus}
            onFileSelect={handleFileSelect}
            onRecordingComplete={handleRecordingComplete}
            onCloneVoice={handleCloneVoice}
          />

          {/* Step 2: Generate */}
          <AudioGenerateCard
            clonedVoices={clonedVoices}
            selectedVoice={selectedVoice}
            mode={mode}
            prompt={prompt}
            duration={duration}
            language={language}
            onVoiceChange={setSelectedVoice}
            onModeChange={setMode}
            onPromptChange={setPrompt}
            onDurationChange={setDuration}
            onLanguageChange={setLanguage}
          />

          {/* Result Preview */}
          {result && (
            <div className="p-5 md:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Результат</h3>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-[var(--gold)] text-black flex items-center justify-center shrink-0 hover:bg-[var(--gold)]/90 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">
                    {result.name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {result.duration} сек • {mode === 'speech' ? 'Речь' : 'Трек'}
                  </p>
                </div>

                {/* Waveform placeholder */}
                <div className="hidden md:flex items-center gap-0.5 h-8">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[var(--gold)]/40 rounded-full"
                      style={{ 
                        height: `${Math.random() * 100}%`,
                        minHeight: '4px'
                      }}
                    />
                  ))}
                </div>

                {/* Download */}
                <button className="p-2.5 rounded-lg bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80 transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Generate Button */}
      <div className="hidden md:block max-w-4xl mx-auto px-4 pb-8">
        <button
          onClick={handleGenerate}
          disabled={generationStatus === 'generating' || !prompt.trim()}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-lg transition-all",
            generationStatus === 'generating' || !prompt.trim()
              ? "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
              : "bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 shadow-lg shadow-[var(--gold)]/20"
          )}
        >
          {generationStatus === 'generating' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Сгенерировать аудио
              <span className="ml-2 px-2 py-0.5 rounded-full bg-black/10 text-sm">
                {estimatedCost}⭐
              </span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Sticky Generate Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pt-8 z-40">
        <button
          onClick={handleGenerate}
          disabled={generationStatus === 'generating' || !prompt.trim()}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-lg transition-all",
            generationStatus === 'generating' || !prompt.trim()
              ? "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
              : "bg-[var(--gold)] text-black shadow-lg shadow-[var(--gold)]/20"
          )}
        >
          {generationStatus === 'generating' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Сгенерировать
              <span className="ml-2 px-2 py-0.5 rounded-full bg-black/10 text-sm">
                {estimatedCost}⭐
              </span>
            </>
          )}
        </button>
      </div>

      {/* Bottom padding for mobile sticky button */}
      <div className="md:hidden h-24" />

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
