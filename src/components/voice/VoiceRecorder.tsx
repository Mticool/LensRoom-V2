'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  maxDuration?: number; // в секундах
  onRecordingComplete: (url: string, duration: number) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ 
  maxDuration = 15, 
  onRecordingComplete,
  disabled = false 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Остановить stream
        stream.getTracks().forEach(track => track.stop());

        // Загрузить на сервер
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');
          formData.append('type', 'audio');

          const response = await fetch('/api/upload/voice-assets', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка загрузки');
          }

          const { url: uploadedUrl } = await response.json();
          onRecordingComplete(uploadedUrl, recordingTime);
          toast.success('Запись загружена');
        } catch (err: any) {
          const message = err?.message || 'Не удалось загрузить запись';
          toast.error(message);
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Таймер
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (maxDuration > 0 && next >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return next;
        });
      }, 1000);

      toast.success('Запись началась');
    } catch (err) {
      console.error('Microphone access denied', err);
      toast.error('Не удалось получить доступ к микрофону');
    }
  }, [maxDuration, onRecordingComplete, stopRecording]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const reset = useCallback(() => {
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-12 h-12 border-4 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[var(--muted)]">Загрузка записи...</p>
      </div>
    );
  }

  if (audioUrl && !isRecording) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <div className="w-full max-w-xs">
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
                Запись готова
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatTime(recordingTime)}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={reset}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          Записать заново
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-6">
      {isRecording ? (
        <>
          {/* Recording animation */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-red-500/20 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
                <Mic className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text)] mb-1">
              {formatTime(recordingTime)}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {maxDuration > 0 ? `Максимум ${formatTime(maxDuration)}` : 'Без лимита'}
            </p>
          </div>

          <button
            onClick={stopRecording}
            className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Остановить запись
          </button>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-[var(--surface2)] flex items-center justify-center">
            <Mic className="w-8 h-8 text-[var(--gold)]" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text)] mb-1">
              Запись с микрофона
            </p>
            <p className="text-xs text-[var(--muted)]">
              До {maxDuration} секунд
            </p>
          </div>

          <button
            onClick={startRecording}
            disabled={disabled}
            className={cn(
              "px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2",
              disabled
                ? "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
                : "bg-[var(--gold)] hover:bg-[var(--gold)]/80 text-white"
            )}
          >
            <Mic className="w-4 h-4" />
            Начать запись
          </button>
        </>
      )}
    </div>
  );
}
