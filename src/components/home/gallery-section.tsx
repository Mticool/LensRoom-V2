'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { GalleryItem } from './gallery-item';

// Галерея - витрина работ
// Для production: 
// - Изображения: WebP/AVIF, 400-600px width, quality 75-80
// - Видео: короткие превью 3-5 сек, WebM/MP4, 480p, без звука
const GALLERY_ITEMS = [
  { 
    id: 1, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80', 
    prompt: 'Портрет с драматическим светом', 
    model: 'Midjourney', 
    aspect: 'portrait' as const
  },
  { 
    id: 2, 
    type: 'video' as const,
    posterUrl: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=500&q=80',
    videoPreviewUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    prompt: 'Горы на закате, кинематографично', 
    model: 'Kling 2.6', 
    aspect: 'landscape' as const
  },
  { 
    id: 3, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&q=80', 
    prompt: 'Робот в городе будущего', 
    model: 'Seedream', 
    aspect: 'square' as const
  },
  { 
    id: 4, 
    type: 'video' as const,
    posterUrl: 'https://images.unsplash.com/photo-1559583109-3e7968136c99?w=500&q=80',
    videoPreviewUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    prompt: 'Собака на пляже, slow-mo', 
    model: 'Sora 2', 
    aspect: 'landscape' as const
  },
  { 
    id: 5, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=500&q=80', 
    prompt: 'Абстракция, неон', 
    model: 'Midjourney', 
    aspect: 'portrait' as const
  },
  { 
    id: 6, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', 
    prompt: 'Продуктовое фото парфюма', 
    model: 'Imagen 4', 
    aspect: 'square' as const
  },
  { 
    id: 7, 
    type: 'video' as const,
    posterUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80',
    videoPreviewUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    prompt: 'Полёт над Альпами, drone shot', 
    model: 'Veo 3', 
    aspect: 'landscape' as const
  },
  { 
    id: 8, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80', 
    prompt: 'Мужской портрет, студийный свет', 
    model: 'FLUX.2', 
    aspect: 'portrait' as const
  },
  { 
    id: 9, 
    type: 'image' as const,
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80', 
    prompt: 'Земля из космоса, sci-fi', 
    model: 'Ideogram', 
    aspect: 'landscape' as const
  },
];

export function GallerySection() {
  return (
    <section id="gallery" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#c8ff00] mb-2">ГАЛЕРЕЯ</h2>
          <p className="text-white/40">Примеры генераций наших пользователей</p>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {GALLERY_ITEMS.map((item) => (
            <GalleryItem key={item.id} item={item} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 bg-white/5 hover:bg-white/10">
            <Link href="/inspiration">
              Смотреть все работы
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

