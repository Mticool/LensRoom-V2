'use client';

import { Upload, X, Volume2, Music, Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';

interface AudioSyncProps {
  onAudioChange: (file: File | null) => void;
}

export function AudioSync({ onAudioChange }: AudioSyncProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      onAudioChange(file);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(file);
      }
    }
  };

  const handleRemove = () => {
    setAudioFile(null);
    onAudioChange(null);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-white/70 flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-[#c8ff00]" />
        Аудио для синхронизации
      </label>
      <p className="text-xs text-white/40">
        Загрузите аудио для синхронизации губ и звука
      </p>

      {audioFile ? (
        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-[#c8ff00]/10 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{audioFile.name}</p>
            <p className="text-xs text-white/40">
              {(audioFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button 
            type="button"
            onClick={togglePlay} 
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button 
            type="button"
            onClick={handleRemove} 
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
        </div>
      ) : (
        <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/20 cursor-pointer hover:border-[#c8ff00]/50 hover:bg-white/5 transition-all">
          <Upload className="w-5 h-5 text-white/40" />
          <div>
            <span className="text-sm text-white/50">Загрузить аудио</span>
            <span className="text-xs text-white/30 block">MP3, WAV до 50MB</span>
          </div>
          <input type="file" className="hidden" accept="audio/*" onChange={handleUpload} />
        </label>
      )}
    </div>
  );
}

