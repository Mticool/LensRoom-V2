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
  compact?: boolean;
}

export function AudioInput({ 
  onAudioUploaded,
  maxDuration = 15,
  maxSize = 20971520, // 20MB
  disabled = false,
  compact = false,
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
    <div className={cn("rounded-3xl border border-[#242b37] bg-[#141821] shadow-[0_20px_60px_rgba(0,0,0,0.24)]", compact ? "p-4" : "p-5 sm:p-7")}>
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-3" : "mb-5")}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className={cn("flex items-center justify-center rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10", compact ? "h-9 w-9" : "h-11 w-11")}>
              <FileAudio className={cn("text-[var(--gold)]", compact ? "h-4 w-4" : "h-5 w-5")} />
            </div>
            <div className="min-w-0">
              <div className={cn("font-semibold text-[#f4f6f8]", compact ? "text-sm" : "text-lg")}>Аудио</div>
              <div className={cn("text-[#9ea8b8]", compact ? "text-xs" : "text-sm")}>Файл или запись с микрофона</div>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-xs text-[#9ea8b8]">
          {maxDuration > 0 ? `До ${maxDuration} сек` : 'Без лимита'}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-[#2a3341] bg-[#0f1219] p-1.5">
        <button
          onClick={() => setActiveTab('upload')}
          className={cn(
            "relative flex-1 rounded-xl font-medium transition-colors outline-none",
            compact ? "px-2 py-2 text-xs" : "px-4 py-2.5 text-sm",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          {activeTab === 'upload' && (
            <motion.div
              layoutId="audioTab"
              className="absolute inset-0 rounded-xl bg-[var(--btn-primary-bg)] shadow-sm"
              transition={{ duration: 0.16, ease: 'easeOut' }}
            />
          )}
          <span className={cn("relative z-10 inline-flex items-center justify-center gap-2", activeTab === 'upload' ? "text-[var(--btn-primary-text)]" : "text-[#9ea8b8] hover:text-[#f4f6f8]")}>
            <Upload className="w-4 h-4" />
            Загрузить
          </span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={cn(
            "relative flex-1 rounded-xl font-medium transition-colors outline-none",
            compact ? "px-2 py-2 text-xs" : "px-4 py-2.5 text-sm",
            disabled && "cursor-not-allowed opacity-70"
          )}
        >
          {activeTab === 'record' && (
            <motion.div
              layoutId="audioTab"
              className="absolute inset-0 rounded-xl bg-[var(--btn-primary-bg)] shadow-sm"
              transition={{ duration: 0.16, ease: 'easeOut' }}
            />
          )}
          <span className={cn("relative z-10 inline-flex items-center justify-center gap-2", activeTab === 'record' ? "text-[var(--btn-primary-text)]" : "text-[#9ea8b8] hover:text-[#f4f6f8]")}>
            <Mic className="w-4 h-4" />
            Записать
          </span>
        </button>
      </div>

      {/* Content */}
      <div className={cn("overflow-hidden rounded-2xl border border-[#2a3341] bg-[#0f1219]/70", compact ? "mt-3" : "mt-4")}>
        {audioUrl ? (
          <div className={cn(compact ? "p-3" : "p-5 sm:p-6")}>
            <div className={cn("flex items-center rounded-2xl border border-[#2a3341] bg-[#121722]", compact ? "gap-2 p-2.5" : "gap-4 p-4")}>
              <button
                onClick={togglePlayback}
                className={cn("flex items-center justify-center rounded-2xl bg-[var(--btn-primary-bg)] shadow-sm transition-colors hover:bg-[var(--btn-primary-bg-hover)]", compact ? "h-9 w-9" : "h-12 w-12")}
              >
                {isPlaying ? (
                  <Pause className={cn("text-[var(--btn-primary-text)]", compact ? "h-4 w-4" : "w-5 h-5")} />
                ) : (
                  <Play className={cn("ml-0.5 text-[var(--btn-primary-text)]", compact ? "h-4 w-4" : "w-5 h-5")} />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-[#f4f6f8]", compact ? "text-xs" : "text-sm")}>
                  Аудио готово
                </p>
                <p className={cn("text-[#9ea8b8]", compact ? "text-[10px]" : "text-xs")}>
                  Длительность: {formatTime(duration)}
                </p>
              </div>

              <button
                onClick={handleRemove}
                disabled={disabled}
                className="rounded-xl p-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                title="Удалить аудио"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'upload' ? (
              <div className={cn(compact ? "p-3" : "p-5 sm:p-6")}>
                {uploading ? (
                  <div className={cn("flex flex-col items-center justify-center", compact ? "py-6" : "py-12")}>
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--gold)]/25 border-t-[var(--gold)]" />
                    <p className="text-sm text-[#9ea8b8]">Загрузка...</p>
                  </div>
                ) : (
                  <div className={cn("rounded-2xl border border-dashed border-[#2a3341] bg-[#121722]/40 transition-colors hover:border-[var(--gold)]/45", disabled && "opacity-50 cursor-not-allowed")}>
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
                      className={cn("w-full flex flex-col items-center justify-center text-center", compact ? "py-6 px-3" : "py-10 px-6", !disabled && "cursor-pointer")}
                    >
                      <div className={cn("flex items-center justify-center rounded-2xl border border-[#2a3341] bg-[#10141d]", compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4")}>
                        <Upload className={cn("text-[var(--gold)]", compact ? "h-4 w-4" : "h-6 w-6")} />
                      </div>
                      <p className={cn("mb-1 font-semibold text-[#f4f6f8]", compact ? "text-xs" : "text-sm")}>
                        Нажмите для выбора аудио
                      </p>
                      <p className={cn("text-[#9ea8b8]", compact ? "text-[10px]" : "text-xs")}>
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
