'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Mic, X, Play, Pause, FileAudio } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    // Валидация размера
    if (file.size > maxSize) {
      const sizeMB = maxSize / 1024 / 1024;
      toast.error(`Аудио слишком большое. Максимум ${sizeMB}MB`);
      return;
    }

    // Валидация формата (проверяем и MIME-тип и расширение файла)
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm', 'audio/x-mpeg-3', 'audio/mpeg3'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.webm');
    const hasValidMimeType = allowedTypes.includes(file.type);

    console.log('[AudioInput] File validation:', {
      name: file.name,
      type: file.type,
      size: file.size,
      hasValidExtension,
      hasValidMimeType
    });

    if (!hasValidMimeType && !hasValidExtension) {
      toast.error(`Поддерживаются только MP3, WAV, WEBM (обнаружен тип: ${file.type})`);
      return;
    }

    setUploading(true);

    try {
      // Получить длительность на клиенте
      const tempAudio = new Audio();
      const audioBlob = URL.createObjectURL(file);
      tempAudio.src = audioBlob;
      let dur = 0;
      
      await new Promise<void>((resolve, reject) => {
        tempAudio.onloadedmetadata = () => {
          dur = Math.ceil(tempAudio.duration);
          setDuration(dur);
          
          if (dur > maxDuration && maxDuration > 0) {
            reject(new Error(`Аудио слишком длинное. Максимум ${maxDuration} секунд`));
          } else {
            resolve();
          }
        };
        tempAudio.onerror = () => reject(new Error('Не удалось загрузить аудио'));
      });
      URL.revokeObjectURL(audioBlob);

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
      onAudioUploaded(url, dur);
      toast.success('Аудио загружено');
    } catch (err: any) {
      const message = err?.message || 'Не удалось загрузить аудио';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [maxSize, maxDuration, onAudioUploaded]);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--gold)]/12 border border-[var(--gold)]/15 flex items-center justify-center">
              <FileAudio className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text)]">Аудио</div>
              <div className="text-sm text-[var(--muted)]">Загрузите файл или запишите голос прямо здесь</div>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs text-[var(--muted)]">
          {maxDuration > 0 ? `До ${maxDuration} сек` : 'Без лимита'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-[var(--surface2)] border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('upload')}
          className={cn(
            "relative flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          {activeTab === 'upload' && (
            <motion.div
              layoutId="audioTab"
              className="absolute inset-0 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm"
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            />
          )}
          <span className={cn("relative z-10 inline-flex items-center justify-center gap-2", activeTab === 'upload' ? "text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]")}>
            <Upload className="w-4 h-4" />
            Загрузить
          </span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={cn(
            "relative flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          {activeTab === 'record' && (
            <motion.div
              layoutId="audioTab"
              className="absolute inset-0 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm"
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            />
          )}
          <span className={cn("relative z-10 inline-flex items-center justify-center gap-2", activeTab === 'record' ? "text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]")}>
            <Mic className="w-4 h-4" />
            Записать
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/40 overflow-hidden">
        {audioUrl ? (
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface2)] border border-[var(--border)]">
              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-2xl bg-[var(--gold)] hover:bg-[var(--gold)]/90 transition-colors flex items-center justify-center shadow-sm"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black ml-0.5" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Аудио готово
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Длительность: {formatTime(duration)}
                </p>
              </div>

              <button
                onClick={handleRemove}
                disabled={disabled}
                className="p-2 rounded-xl hover:bg-[var(--error)]/10 text-[var(--error)] transition-colors disabled:opacity-50"
                title="Удалить аудио"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'upload' ? (
              <div className="p-5 sm:p-6">
                {uploading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-12 h-12 border-4 border-[var(--gold)]/25 border-t-[var(--gold)] rounded-full animate-spin mb-4" />
                    <p className="text-sm text-[var(--muted)]">Загрузка...</p>
                  </div>
                ) : (
                  <div className={cn("rounded-2xl border border-dashed border-[var(--border)] hover:border-[var(--gold)]/45 bg-[var(--surface)]/20 transition-colors", disabled && "opacity-50 cursor-not-allowed")}>
                    <input
                      ref={fileInputRef}
                      id="audio-upload"
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/mp3,audio/webm"
                      onChange={handleFileInput}
                      disabled={disabled || uploading}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || uploading}
                      className={cn("w-full flex flex-col items-center justify-center py-10 px-6 text-center", !disabled && "cursor-pointer")}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-[var(--gold)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--text)] mb-1">
                        Нажмите для выбора аудио
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        MP3, WAV, WEBM до 20MB {maxDuration > 0 ? `• Макс ${maxDuration} сек` : ''}
                      </p>
                    </button>
                  </div>
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
