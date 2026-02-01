'use client';

import { useState, useCallback } from 'react';
import { Upload, Mic, X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VoiceRecorder } from './VoiceRecorder';

interface AudioInputProps {
  onAudioUploaded: (url: string, duration?: number) => void;
  maxDuration?: number;
  maxSize?: number;
  disabled?: boolean;
}

export function AudioInput({ 
  onAudioUploaded,
  maxDuration = 15,
  maxSize = 20971520, // 20MB
  disabled = false 
}: AudioInputProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    // Валидация
    if (file.size > maxSize) {
      const sizeMB = maxSize / 1024 / 1024;
      toast.error(`Аудио слишком большое. Максимум ${sizeMB}MB`);
      return;
    }

    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Поддерживаются только MP3, WAV, WEBM');
      return;
    }

    setUploading(true);

    try {
      // Получить длительность на клиенте
      const tempAudio = new Audio();
      const audioBlob = URL.createObjectURL(file);
      tempAudio.src = audioBlob;
      
      await new Promise<void>((resolve, reject) => {
        tempAudio.onloadedmetadata = () => {
          const dur = Math.ceil(tempAudio.duration);
          setDuration(dur);
          
          if (dur > maxDuration && maxDuration > 0) {
            reject(new Error(`Аудио слишком длинное. Максимум ${maxDuration} секунд`));
          } else {
            resolve();
          }
        };
        tempAudio.onerror = () => reject(new Error('Не удалось загрузить аудио'));
      });

      // Загрузить на сервер
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio');

      const response = await fetch('/api/upload/voice-assets', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка загрузки');
      }

      const { url } = await response.json();
      setAudioUrl(url);
      onAudioUploaded(url, duration);
      toast.success('Аудио загружено');
    } catch (err: any) {
      const message = err?.message || 'Не удалось загрузить аудио';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [maxSize, maxDuration, onAudioUploaded, duration]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleRecordingComplete = useCallback((url: string, dur: number) => {
    setAudioUrl(url);
    setDuration(dur);
    onAudioUploaded(url, dur);
  }, [onAudioUploaded]);

  const handleRemove = useCallback(() => {
    setAudioUrl(null);
    setDuration(0);
    onAudioUploaded('', 0);
    
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setIsPlaying(false);
  }, [onAudioUploaded, audioElement]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  }, [audioUrl, audioElement, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-[var(--text)]">
        Аудио для озвучки
      </label>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--surface2)]">
        <button
          onClick={() => setActiveTab('upload')}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'upload'
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          )}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Загрузить файл
        </button>
        <button
          onClick={() => setActiveTab('record')}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'record'
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          )}
        >
          <Mic className="w-4 h-4 inline-block mr-2" />
          Записать голос
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {audioUrl ? (
          <div className="p-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface2)]">
              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-[var(--gold)] hover:bg-[var(--gold)]/80 transition-colors flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text)]">
                  Аудио загружено
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Длительность: {formatTime(duration)}
                </p>
              </div>

              <button
                onClick={handleRemove}
                disabled={disabled}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'upload' ? (
              <div className="p-6">
                {uploading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin mb-4" />
                    <p className="text-sm text-[var(--muted)]">Загрузка...</p>
                  </div>
                ) : (
                  <label
                    htmlFor="audio-upload"
                    className={cn(
                      "flex flex-col items-center justify-center py-12 cursor-pointer",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp3,audio/webm"
                      onChange={handleFileInput}
                      disabled={disabled || uploading}
                      className="hidden"
                    />
                    
                    <div className="w-16 h-16 rounded-full bg-[var(--surface2)] flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-[var(--gold)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text)] mb-1">
                      Нажмите для выбора аудио файла
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      MP3, WAV до 20MB • Макс {maxDuration}сек
                    </p>
                  </label>
                )}
              </div>
            ) : (
              <VoiceRecorder
                maxDuration={maxDuration}
                onRecordingComplete={handleRecordingComplete}
                disabled={disabled}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
