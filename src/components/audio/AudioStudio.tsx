'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Music, RefreshCw, Trash2, Mic, Upload, FileAudio, Plus, Play, Square, Volume2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoginDialog } from '@/components/auth/login-dialog';
import { useAuth } from '@/components/generator-v2/hooks/useAuth';

interface ClonedVoice {
  id: string;
  name: string;
  minimax_voice_id?: string;
  is_cloned?: boolean;
  created_at?: string;
  language?: 'ru' | 'en';
}

interface AudioHistoryItem {
  id: string;
  audio_url: string | null;
  text: string;
  voice_id?: string | null;
  language?: string | null;
  status?: string | null;
  created_at: string;
}

export function AudioStudio() {
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  // Step 1: Voice Clone State
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cloneStatus, setCloneStatus] = useState<'idle' | 'cloning' | 'cloned'>('idle');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);

  // Simple in-browser recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Step 2: Generation State
  const [selectedVoice, setSelectedVoice] = useState('');
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav'>('mp3');

  // Generation State
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating'>('idle');
  const [addingSystemVoices, setAddingSystemVoices] = useState(false);
  
  // Voice preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Voice deletion state
  const [deletingVoice, setDeletingVoice] = useState<string | null>(null);

  // Project-scoped history (audio)
  const [audioHistory, setAudioHistory] = useState<AudioHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Load user voices on mount
  const loadVoices = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/tts/voices', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.voices)) {
        setClonedVoices(data.voices);
        // Auto-select first voice only if nothing is selected
        setSelectedVoice(prev => {
          if (!prev && data.voices.length > 0) {
            return data.voices[0].id;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  }, [isAuthenticated]);

  // Load voices on mount and after authentication
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated) {
        setAudioHistory([]);
        return;
      }
      setIsHistoryLoading(true);
      try {
        const response = await fetch('/api/tts/history', { credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const items: AudioHistoryItem[] = Array.isArray(data?.history) ? data.history : [];
        if (!cancelled) setAudioHistory(items);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Clone voice handler
  const handleCloneVoice = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    const sourceBlob = voiceFile || recordedBlob;

    if (!sourceBlob) {
      toast.error('Загрузите или запишите голос');
      return;
    }

    setCloneStatus('cloning');

    try {
      const audioBlob = sourceBlob;
      if (!audioBlob) {
        throw new Error('No audio file');
      }

      const formData = new FormData();
      formData.append('file', audioBlob, voiceFile?.name || 'voice.webm');

      const uploadResponse = await fetch('/api/tts/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Ошибка загрузки файла');
      }

      const response = await fetch('/api/tts/clone-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          file_id: uploadData.file_id,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ошибка клонирования');
      }

      console.log('[AudioStudio] Voice cloned:', data);

      const newVoice: ClonedVoice = {
        id: data.voice_id,
        name: `🧬 Голос #${String(data.voice_id).slice(0, 6)}`,
        minimax_voice_id: data.minimax_voice_id,
        is_cloned: true,
        language,
      };

      setClonedVoices((prev) => [newVoice, ...prev]);
      setSelectedVoice(newVoice.id);
      setCloneStatus('cloned');
      toast.success('Голос успешно клонирован!');

      // Reload voices list to sync
      await loadVoices();
    } catch (error) {
      console.error('Voice cloning error:', error);
      setCloneStatus('idle');
      toast.error(error instanceof Error ? error.message : 'Ошибка клонирования');
    }
  }, [isAuthenticated, voiceFile, recordedBlob, loadVoices]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      setRecordedBlob(null);
      setRecordingSeconds(0);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);

      const timer = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);

      // store timer id on recorder instance for cleanup
      (recorder as any)._timer = timer;
    } catch (e) {
      console.error('Recording error:', e);
      toast.error('Не удалось начать запись. Проверьте доступ к микрофону.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    try {
      const timer = (recorder as any)._timer;
      if (timer) window.clearInterval(timer);
      recorder.stop();
    } finally {
      setIsRecording(false);
    }
  }, []);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        try {
          const timer = (recorder as any)._timer;
          if (timer) window.clearInterval(timer);
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Add system voices handler
  const handleAddSystemVoices = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    setAddingSystemVoices(true);
    try {
      const response = await fetch('/api/tts/system-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Add all voices
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка добавления голосов');
      }

      if (data.added > 0) {
        toast.success(`Добавлено ${data.added} голосов`);
        loadVoices(); // Reload voices list
      } else {
        toast.info('Все системные голоса уже добавлены');
      }
    } catch (error) {
      console.error('Add system voices error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка добавления голосов');
    } finally {
      setAddingSystemVoices(false);
    }
  }, [isAuthenticated, loadVoices]);

  // Preview voice handler
  const handlePreviewVoice = useCallback(async (voice: ClonedVoice) => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    // If already previewing this voice, stop it
    if (previewingVoice === voice.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewingVoice(null);
      return;
    }

    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setPreviewingVoice(voice.id);

    try {
      const sampleText = voice.language === 'en' 
        ? 'Hello! This is a voice preview sample.'
        : 'Привет! Это пример звучания голоса.';

      const response = await fetch('/api/tts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice_id: voice.minimax_voice_id,
          voice_db_id: voice.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации');
      }

      if (data?.audio_url) {
        const audio = new Audio(data.audio_url);
        previewAudioRef.current = audio;
        
        audio.onended = () => {
          setPreviewingVoice(null);
          previewAudioRef.current = null;
        };
        
        audio.onerror = () => {
          toast.error('Ошибка воспроизведения');
          setPreviewingVoice(null);
          previewAudioRef.current = null;
        };

        await audio.play();
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка прослушивания');
      setPreviewingVoice(null);
    }
  }, [isAuthenticated, previewingVoice]);

  // Delete voice handler
  const handleDeleteVoice = useCallback(async (voiceId: string) => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!confirm('Удалить этот голос?')) {
      return;
    }

    setDeletingVoice(voiceId);
    try {
      const response = await fetch(`/api/tts/voices/${voiceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }

      toast.success('Голос удален');
      
      // If deleted voice was selected, clear selection
      if (selectedVoice === voiceId) {
        setSelectedVoice('');
      }
      
      // Reload voices
      loadVoices();
    } catch (error) {
      console.error('Delete voice error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления');
    } finally {
      setDeletingVoice(null);
    }
  }, [isAuthenticated, selectedVoice, loadVoices]);

  // Generate audio handler
  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    if (!prompt.trim()) {
      toast.error('Введите текст для озвучки');
      return;
    }

    setGenerationStatus('generating');

    try {
      const selected = clonedVoices.find((voice) => voice.id === selectedVoice);
      if (!selected?.minimax_voice_id) {
        toast.error('Сначала выберите голос');
        setGenerationStatus('idle');
        return;
      }

      const response = await fetch('/api/tts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          voice_id: selected?.minimax_voice_id,
          voice_db_id: selected?.id,
          // DO NOT send language or output_format - causes MiniMax to return no audio
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ошибка генерации');
      }

      if (data?.audio_url) {
        setAudioHistory((prev) => [
          {
            id: data.job_id,
            audio_url: data.audio_url,
            text: prompt,
            voice_id: selected?.id || null,
            language,
            status: 'success',
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        toast.success('Аудио готово!');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      setGenerationStatus('idle');
      toast.error(error instanceof Error ? error.message : 'Ошибка генерации');
    } finally {
      setGenerationStatus('idle');
    }
  }, [isAuthenticated, prompt, language, outputFormat, clonedVoices, selectedVoice]);

  const handleRegenerate = async (historyId: string) => {
    try {
      const response = await fetch('/api/tts/regenerate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_id: historyId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка перегенерации');
      }
      setAudioHistory((prev) =>
        prev.map((item) =>
          item.id === historyId ? { ...item, audio_url: data.audio_url } : item
        )
      );
      toast.success('Аудио перегенерировано');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка перегенерации');
    }
  };

  const handleDelete = async (historyId: string) => {
    try {
      const response = await fetch('/api/tts/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history_id: historyId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления');
      }
      setAudioHistory((prev) => prev.filter((item) => item.id !== historyId));
      toast.success('Запись удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка удаления');
    }
  };

  // Reset file when clone status changes
  const handleFileSelect = (file: File | null) => {
    setVoiceFile(file);
    if (file) setRecordedBlob(null);
    if (file) setCloneStatus('idle');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/15">
              <Music className="w-6 h-6 text-[var(--gold)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text)]">
              Музыка и голос
            </h1>
          </div>
          <p className="text-[var(--muted)] text-base sm:text-lg">
            Клонируй голос и создавай треки с помощью AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="space-y-6">
            <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/15 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-[var(--gold)]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Клонируй голос</h3>
                  <p className="text-sm text-[var(--muted)]">Загрузи образец или запиши прямо здесь</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium border transition active:scale-[0.99]",
                      isRecording
                        ? "bg-red-500 text-white border-red-500/40"
                        : "bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface2)]"
                    )}
                  >
                    <Mic className={cn('w-4 h-4', isRecording && 'animate-pulse')} />
                    {isRecording ? `Остановить (${recordingSeconds}с)` : 'Записать голос'}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--surface2)] transition active:scale-[0.99]"
                  >
                    <Upload className="w-4 h-4" />
                    Загрузить файл
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>

                {(voiceFile || recordedBlob) && (
                  <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 flex items-center justify-center border border-[var(--gold)]/15">
                        <FileAudio className="w-5 h-5 text-[var(--gold)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text)] truncate">
                          {voiceFile ? voiceFile.name : `Запись (${recordingSeconds}с)`}
                        </div>
                        <div className="text-xs text-[var(--muted)]">Рекомендуем 10–60 сек чистой речи</div>
                      </div>
                      <div className="ml-auto">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium border',
                            cloneStatus === 'idle' && 'bg-[var(--surface2)] text-[var(--muted)] border-[var(--border)]',
                            cloneStatus === 'cloning' && 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                            cloneStatus === 'cloned' && 'bg-green-500/15 text-green-400 border-green-500/20'
                          )}
                        >
                          {cloneStatus === 'idle' && 'Готово'}
                          {cloneStatus === 'cloning' && 'Клонирование…'}
                          {cloneStatus === 'cloned' && 'Склонировано'}
                        </span>
                      </div>
                    </div>

                    {recordedBlob && (
                      <div className="mt-3">
                        <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCloneVoice}
                  disabled={cloneStatus === 'cloning' || (!voiceFile && !recordedBlob)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.99]",
                    cloneStatus === 'cloning' || (!voiceFile && !recordedBlob)
                      ? "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
                      : "bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 shadow-lg shadow-[var(--gold)]/20"
                  )}
                >
                  {cloneStatus === 'cloning' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Клонирование...
                    </>
                  ) : (
                    'Клонировать голос'
                  )}
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Озвучка</h3>
                <button
                  onClick={handleAddSystemVoices}
                  disabled={addingSystemVoices}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] hover:bg-[var(--gold)]/25 transition-all disabled:opacity-50 border border-[var(--gold)]/20"
                >
                  {addingSystemVoices ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Загрузка...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Готовые голоса</span>
                    </>
                  )}
                </button>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-3">Выберите голос</label>
                  
                  {clonedVoices.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-[var(--bg)] border border-dashed border-[var(--border)] text-center">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/15 flex items-center justify-center mb-3">
                        <Volume2 className="w-6 h-6 text-[var(--gold)]" />
                      </div>
                      <p className="text-sm font-medium text-[var(--text)] mb-1">
                        Голоса не найдены
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        Нажмите «Готовые голоса» или клонируйте свой
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                      {clonedVoices.map((voice) => (
                        <div
                          key={voice.id}
                          className={cn(
                            "relative p-3.5 rounded-2xl border cursor-pointer transition-all group",
                            selectedVoice === voice.id
                              ? "bg-[var(--gold)]/8 border-[var(--gold)]/40 ring-1 ring-[var(--gold)]/30 shadow-[0_0_20px_-5px_rgba(140,244,37,0.2)]"
                              : "bg-[var(--bg)] border-[var(--border)] hover:border-[var(--gold)]/20 hover:bg-[var(--surface2)]"
                          )}
                          onClick={() => setSelectedVoice(voice.id)}
                        >
                          {/* Delete button - absolute positioned */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVoice(voice.id);
                            }}
                            disabled={deletingVoice === voice.id}
                            className={cn(
                              "absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50",
                              deletingVoice === voice.id && "opacity-100"
                            )}
                            title="Удалить голос"
                          >
                            {deletingVoice === voice.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </button>

                          <div className="flex items-start gap-2">
                            <span className="text-lg">{voice.is_cloned !== false ? '🧬' : '🎙️'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[var(--text)] truncate">
                                {voice.name}
                              </div>
                              <div className="text-[10px] text-[var(--muted)]">
                                {voice.language === 'en' ? 'English' : 'Русский'}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewVoice(voice);
                              }}
                              disabled={previewingVoice !== null && previewingVoice !== voice.id}
                              className={cn(
                                "p-1.5 rounded-lg transition-colors",
                                previewingVoice === voice.id
                                  ? "bg-[var(--gold)] text-black"
                                  : "bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--gold)]",
                                previewingVoice !== null && previewingVoice !== voice.id && "opacity-50"
                              )}
                              title="Прослушать"
                            >
                              {previewingVoice === voice.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Введите текст для озвучки (русский)"
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Язык</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLanguage('ru')}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs rounded-lg border transition",
                          language === 'ru'
                            ? "bg-[var(--gold)] text-black"
                            : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]"
                        )}
                      >
                        Русский
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs rounded-lg border transition",
                          language === 'en'
                            ? "bg-[var(--gold)] text-black"
                            : "bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]"
                        )}
                      >
                        English
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1.5">Формат</label>
                    <div className="flex gap-1.5 p-1 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                      {(['mp3', 'wav'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setOutputFormat(fmt)}
                          className={cn(
                            'flex-1 py-1.5 rounded-md text-xs font-semibold uppercase transition-all',
                            outputFormat === fmt
                              ? 'bg-[var(--gold)] text-black'
                              : 'text-[var(--muted)] hover:text-[var(--text)]'
                          )}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generationStatus === 'generating' || !prompt.trim()}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.99]",
                    generationStatus === 'generating' || !prompt.trim()
                      ? "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
                      : "bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 shadow-lg shadow-[var(--gold)]/20"
                  )}
                >
                  {generationStatus === 'generating' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Сгенерировать
                    </>
                  )}
                </button>
                <div className="text-xs text-[var(--muted)]">
                  Демо-прослушивание доступно только через статические аудио файлы.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-[var(--text)]">Галерея</h3>
                <span className="text-xs text-[var(--muted)]">{audioHistory.length} файлов</span>
              </div>
              {isHistoryLoading ? (
                <div className="text-sm text-[var(--muted)]">Загрузка…</div>
              ) : audioHistory.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">Пока нет генераций.</div>
              ) : (
                <div className="space-y-4">
                  {audioHistory.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)]">
                      <div className="text-sm font-medium text-[var(--text)] mb-2 line-clamp-2">
                        {item.text}
                      </div>
                      {item.audio_url ? (
                        <audio controls src={item.audio_url} className="w-full" />
                      ) : (
                        <div className="text-xs text-[var(--muted)]">Аудио ещё не готово</div>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRegenerate(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Перегенерировать
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
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
