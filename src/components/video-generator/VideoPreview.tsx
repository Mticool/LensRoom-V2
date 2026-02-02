'use client';

import { useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import type { VideoStatus } from '@/types/video-generator';

interface VideoPreviewProps {
  videoUrl: string | null;
  status: VideoStatus;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export function VideoPreview({
  videoUrl,
  status,
  isPlaying = false,
  onPlayPause,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Download video
  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `video-${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="w-full h-full bg-[var(--surface2)] rounded-[var(--radius)] relative overflow-hidden group"
    >
      {videoUrl ? (
        <>
          {/* Video Element */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            loop
            playsInline
          />

          {/* Play/Pause Overlay */}
          <button
            onClick={onPlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-black" fill="currentColor" />
              ) : (
                <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
              )}
            </div>
          </button>

          {/* Download Button - Top Right */}
          <button
            onClick={handleDownload}
            className="absolute top-4 right-4 px-4 py-2 bg-[var(--accent-primary)] text-black text-sm font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105 flex items-center gap-2"
            aria-label="Скачать видео"
          >
            <Download className="w-4 h-4" />
            Скачать
          </button>
        </>
      ) : (
        /* Empty State */
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            {/* Play Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--surface3)] flex items-center justify-center">
              <Play className="w-8 h-8 text-[var(--accent-primary)] ml-1" fill="currentColor" />
            </div>

            {/* Status Text */}
            <p className="text-[var(--muted)] text-sm">
              {status === 'processing' || status === 'queued'
                ? 'Генерация видео...'
                : status === 'error'
                  ? 'Ошибка генерации'
                  : 'Превью видео появится здесь'}
            </p>

            {/* Loading Indicator */}
            {(status === 'processing' || status === 'queued') && (
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
