'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Play, Heart } from 'lucide-react';

interface GalleryItemProps {
  item: {
    id: number;
    type: 'image' | 'video';
    // Для изображений
    imageUrl?: string;
    // Для видео - маленький превью как GIF
    videoPreviewUrl?: string;
    // Poster для видео (первый кадр)
    posterUrl?: string;
    prompt: string;
    model: string;
    aspect: 'portrait' | 'landscape' | 'square';
  };
}

export function GalleryItem({ item }: GalleryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const aspectClass = 
    item.aspect === 'portrait' ? 'aspect-[3/4]' : 
    item.aspect === 'landscape' ? 'aspect-[4/3]' : 
    'aspect-square';

  // При наведении запускаем видео
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div 
      className="break-inside-avoid"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`relative group rounded-2xl overflow-hidden cursor-pointer ${aspectClass}`}>
        {/* Skeleton loader */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}

        {item.type === 'video' ? (
          <>
            {/* Poster image (первый кадр) - показывается всегда */}
            <Image
              src={item.posterUrl || item.imageUrl || ''}
              alt={item.prompt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                isHovered ? 'opacity-0' : 'opacity-100'
              } ${imageLoaded ? '' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
              quality={75}
            />
            
            {/* Video preview (как GIF) - показывается при наведении */}
            {item.videoPreviewUrl && (
              <video
                ref={videoRef}
                src={item.videoPreviewUrl}
                muted
                loop
                playsInline
                preload="none"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {/* Video badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm z-10">
              <Play className="w-3 h-3 fill-white text-white" />
              <span className="text-xs text-white font-medium">Video</span>
            </div>
          </>
        ) : (
          /* Image */
          <Image
            src={item.imageUrl || ''}
            alt={item.prompt}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              imageLoaded ? '' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            quality={75}
          />
        )}

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-300 z-20 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute top-3 right-3 flex gap-2">
            <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
              <Heart className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-medium mb-2 text-sm line-clamp-2">{item.prompt}</p>
            <span className="text-xs px-2 py-1 rounded-full bg-[#c8ff00]/20 text-[#c8ff00]">
              {item.model}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

