'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, Upload, X, Check, Loader2, FileAudio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCloneCardProps {
  voiceFile: File | null;
  voiceRecording: Blob | null;
  cloneStatus: 'idle' | 'cloning' | 'cloned';
  onFileSelect: (file: File | null) => void;
  onRecordingComplete: (blob: Blob | null) => void;
  onCloneVoice: () => void;
}

export function VoiceCloneCard({
  voiceFile,
  voiceRecording,
  cloneStatus,
  onFileSelect,
  onRecordingComplete,
  onCloneVoice,
}: VoiceCloneCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear any recording
      onRecordingComplete(null);
      onFileSelect(file);
    }
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onFileSelect(null); // Clear file
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onFileSelect, onRecordingComplete]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  }, [isRecording, recordingInterval]);

  // Clear voice
  const clearVoice = () => {
    onFileSelect(null);
    onRecordingComplete(null);
    setRecordingDuration(0);
  };

  const hasVoice = voiceFile || voiceRecording;
  const voiceName = voiceFile?.name || (voiceRecording ? `Запись (${recordingDuration}с)` : null);
  const voiceDuration = voiceFile 
    ? 'Загружено' 
    : voiceRecording 
      ? `${recordingDuration} сек` 
      : null;

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-xs font-bold">
            1
          </span>
          <h3 className="text-lg font-semibold text-[var(--text)]">Клонируй голос</h3>
        </div>
        <p className="text-sm text-[var(--muted)] ml-8">
          Загрузи образец голоса или запиши прямо здесь
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
            isRecording
              ? "bg-red-500 text-white"
              : "bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80 border border-[var(--border)]"
          )}
        >
          <Mic className={cn("w-5 h-5", isRecording && "animate-pulse")} />
          {isRecording ? `Остановить (${recordingDuration}с)` : 'Записать голос'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface2)]/80 border border-[var(--border)] font-medium transition-all disabled:opacity-50"
        >
          <Upload className="w-5 h-5" />
          Загрузить файл
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Voice Preview */}
      {hasVoice && (
        <div className="p-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/20 flex items-center justify-center">
                <FileAudio className="w-5 h-5 text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)] truncate max-w-[180px]">
                  {voiceName}
                </p>
                <p className="text-xs text-[var(--muted)]">{voiceDuration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                cloneStatus === 'idle' && "bg-[var(--surface2)] text-[var(--muted)]",
                cloneStatus === 'cloning' && "bg-amber-500/20 text-amber-400",
                cloneStatus === 'cloned' && "bg-green-500/20 text-green-400"
              )}>
                {cloneStatus === 'idle' && 'Не клонирован'}
                {cloneStatus === 'cloning' && 'Клонируется...'}
                {cloneStatus === 'cloned' && 'Клонирован'}
              </span>
              <button
                onClick={clearVoice}
                className="p-1.5 rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Button */}
      <button
        onClick={onCloneVoice}
        disabled={!hasVoice || cloneStatus === 'cloning' || cloneStatus === 'cloned'}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all",
          hasVoice && cloneStatus === 'idle'
            ? "bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
            : "bg-[var(--surface2)] text-[var(--muted)] cursor-not-allowed"
        )}
      >
        {cloneStatus === 'cloning' && <Loader2 className="w-5 h-5 animate-spin" />}
        {cloneStatus === 'cloned' && <Check className="w-5 h-5" />}
        {cloneStatus === 'idle' && 'Клонировать голос'}
        {cloneStatus === 'cloning' && 'Клонирование...'}
        {cloneStatus === 'cloned' && 'Голос клонирован'}
      </button>

      {/* Help text */}
      <p className="mt-3 text-xs text-[var(--muted)] text-center">
        Рекомендуемая длительность: 5–30 секунд чистой речи
      </p>
    </div>
  );
}
