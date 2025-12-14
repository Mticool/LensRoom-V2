'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Heart, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Категории/теги
const TAGS = [
  'Все',
  'Портреты',
  'Пейзажи', 
  'Продукты',
  'Фэнтези',
  'Sci-Fi',
  'Архитектура',
  'Животные',
  'Абстракция',
  'Кино',
  'Аниме',
  'Реклама',
];

// Галерея работ
const GALLERY_ITEMS = [
  // Row 1
  { id: 1, url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600', type: 'image', tag: 'Портреты', prompt: 'Портрет девушки с драматическим освещением', model: 'Midjourney', aspect: 'portrait' },
  { id: 2, url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=600', type: 'image', tag: 'Пейзажи', prompt: 'Горы на закате, кинематографично', model: 'FLUX.2', aspect: 'landscape' },
  { id: 3, url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600', type: 'image', tag: 'Sci-Fi', prompt: 'Робот в футуристическом городе', model: 'Seedream', aspect: 'square' },
  { id: 4, url: 'https://images.unsplash.com/photo-1559583109-3e7968136c99?w=600', type: 'video', tag: 'Животные', prompt: 'Собака бежит по пляжу, slow motion', model: 'Kling 2.6', aspect: 'landscape' },
  { id: 5, url: 'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=600', type: 'image', tag: 'Абстракция', prompt: 'Абстрактные формы, неон', model: 'Midjourney', aspect: 'portrait' },
  
  // Row 2
  { id: 6, url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600', type: 'image', tag: 'Продукты', prompt: 'Парфюм на мраморе с цветами', model: 'Imagen 4', aspect: 'square' },
  { id: 7, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', type: 'image', tag: 'Пейзажи', prompt: 'Швейцарские Альпы, туман', model: 'FLUX.2', aspect: 'landscape' },
  { id: 8, url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600', type: 'image', tag: 'Фэнтези', prompt: 'Маг в тёмном лесу с посохом', model: 'Midjourney', aspect: 'portrait' },
  { id: 9, url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600', type: 'image', tag: 'Архитектура', prompt: 'Небоскрёбы снизу, стекло', model: 'Seedream', aspect: 'portrait' },
  { id: 10, url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600', type: 'video', tag: 'Кино', prompt: 'Кинематографичный полёт над городом', model: 'Sora 2 Pro', aspect: 'landscape' },
  
  // Row 3
  { id: 11, url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600', type: 'image', tag: 'Животные', prompt: 'Кот в солнечном луче', model: 'Nano Banana', aspect: 'square' },
  { id: 12, url: 'https://images.unsplash.com/photo-1614851099511-773084f6911d?w=600', type: 'image', tag: 'Абстракция', prompt: 'Градиент волны, 3D', model: 'Ideogram', aspect: 'landscape' },
  { id: 13, url: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=600', type: 'image', tag: 'Аниме', prompt: 'Аниме девушка, cherry blossom', model: 'Qwen Image', aspect: 'portrait' },
  { id: 14, url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600', type: 'image', tag: 'Продукты', prompt: 'Часы на тёмном фоне, драматично', model: 'Imagen 4', aspect: 'square' },
  { id: 15, url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600', type: 'image', tag: 'Sci-Fi', prompt: 'Планета из космоса, атмосфера', model: 'FLUX.2', aspect: 'landscape' },
  
  // Row 4
  { id: 16, url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600', type: 'video', tag: 'Пейзажи', prompt: 'Водопад в тумане, timelapse', model: 'Veo 3.1', aspect: 'portrait' },
  { id: 17, url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', type: 'image', tag: 'Портреты', prompt: 'Мужской портрет, чёрно-белое', model: 'Midjourney', aspect: 'square' },
  { id: 18, url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600', type: 'image', tag: 'Пейзажи', prompt: 'Звёздное небо над горами', model: 'FLUX.2', aspect: 'landscape' },
  { id: 19, url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600', type: 'image', tag: 'Реклама', prompt: 'Кроссовки Nike на бетоне', model: 'Seedream', aspect: 'square' },
  { id: 20, url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600', type: 'image', tag: 'Фэнтези', prompt: 'Дракон над замком, эпично', model: 'Midjourney', aspect: 'portrait' },
];

export default function InspirationPage() {
  const [selectedTag, setSelectedTag] = useState('Все');
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const filteredItems = selectedTag === 'Все' 
    ? GALLERY_ITEMS 
    : GALLERY_ITEMS.filter(item => item.tag === selectedTag);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20">
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-[#c8ff00] mb-4">
            ГАЛЕРЕЯ ВДОХНОВЕНИЯ
          </h1>
          <p className="text-white/50 text-lg">
            Исследуйте работы созданные с помощью LensRoom. Кликните на изображение для деталей.
          </p>
        </motion.div>
      </div>

      {/* Tags Filter */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-[#c8ff00] text-black'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry Gallery */}
      <div className="container mx-auto px-4 pb-20">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="break-inside-avoid"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`relative group rounded-2xl overflow-hidden cursor-pointer ${
                item.aspect === 'portrait' ? 'aspect-[3/4]' : 
                item.aspect === 'landscape' ? 'aspect-[4/3]' : 
                'aspect-square'
              }`}>
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Video indicator */}
                {item.type === 'video' && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                    <Play className="w-3 h-3 fill-white text-white" />
                    <span className="text-xs text-white font-medium">Video</span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${
                  hoveredItem === item.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  {/* Top actions */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                      <Heart className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                      <Download className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-medium mb-2 line-clamp-2">{item.prompt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#c8ff00]/20 text-[#c8ff00]">
                        {item.model}
                      </span>
                      <span className="text-xs text-white/50">{item.tag}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 pb-20">
        <div className="text-center py-16 rounded-3xl bg-gradient-to-r from-[#c8ff00]/10 via-[#c8ff00]/5 to-[#c8ff00]/10 border border-[#c8ff00]/20">
          <h2 className="text-3xl font-bold text-white mb-4">Хотите создать своё?</h2>
          <p className="text-white/50 mb-8">Начните генерировать контент прямо сейчас</p>
          <Button asChild size="lg" className="bg-[#c8ff00] text-black hover:bg-[#b8ef00] rounded-full px-8 font-semibold">
            <Link href="/create">
              <Sparkles className="w-4 h-4 mr-2" />
              Начать создавать
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
