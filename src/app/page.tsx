'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, Play, Star, Check, Sparkles,
  Image as ImageIcon, Video, Zap, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Примеры Nano Banana Pro - профессиональные AI генерации
const nanaExamples = [
  // Студийные портреты
  { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=1000&fit=crop&q=90', prompt: 'Professional studio portrait, soft lighting, 4K', model: 'Nano Banana Pro', badge: 'Portrait' },
  { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=1000&fit=crop&q=90', prompt: 'Beauty close-up, perfect skin, editorial', model: 'Nano Banana Pro', badge: 'Beauty' },
  // Fashion & Editorial
  { url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=1000&fit=crop&q=90', prompt: 'High fashion editorial, dramatic lighting', model: 'FLUX.2 Pro', badge: 'Fashion' },
  { url: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&h=1000&fit=crop&q=90', prompt: 'Vogue style, cinematic portrait', model: 'Midjourney', badge: 'Editorial' },
  // Cinematic
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop&q=90', prompt: 'Cinematic male portrait, film grain', model: 'Nano Banana Pro', badge: 'Cinematic' },
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop&q=90', prompt: 'Natural light portrait, warm tones', model: 'Nano Banana Pro', badge: '4K' },
  // Artistic
  { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1000&fit=crop&q=90', prompt: 'Artistic portrait, soft focus', model: 'GPT Image', badge: 'Art' },
  { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=1000&fit=crop&q=90', prompt: 'Street fashion, urban style', model: 'Seedream 4.5', badge: 'Street' },
];

// Видео примеры - кинематографичные превью
const videoExamples = [
  { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=675&fit=crop&q=90', title: 'Cinematic Scene', desc: 'Со звуком и музыкой', model: 'Veo 3.1', duration: '8s', badge: 'Google' },
  { url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=675&fit=crop&q=90', title: 'Film Production', desc: 'Профессиональное качество', model: 'Kling AI', duration: '10s', badge: 'Trending' },
  { url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=675&fit=crop&q=90', title: 'Documentary', desc: 'Реалистичная съёмка', model: 'Sora 2', duration: '15s', badge: 'OpenAI' },
  { url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1200&h=675&fit=crop&q=90', title: 'Fashion Film', desc: 'Стильная презентация', model: 'WAN AI', duration: '10s', badge: 'New' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      
      {/* ===== HERO - Apple/Higgsfield Style ===== */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="min-h-[100vh] flex flex-col items-center justify-center px-6 relative overflow-hidden"
      >
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-cyan-500/5" />
        
        {/* Floating Cards - Left Side */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block">
          {/* Top Left */}
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -12 }}
            animate={{ opacity: 1, x: 0, rotate: -12 }}
            transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            className="absolute top-[15%] left-[5%] w-44 h-56 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 hover:scale-105 transition-transform cursor-pointer"
            >
              <img src={nanaExamples[0].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="text-[10px] px-2 py-1 bg-cyan-500/90 rounded-full font-medium text-white">AI Portrait</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom Left */}
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: 8 }}
            animate={{ opacity: 1, x: 0, rotate: 8 }}
            transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
            className="absolute bottom-[18%] left-[8%] w-36 h-48 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 hover:scale-105 transition-transform cursor-pointer"
            >
              <img src={nanaExamples[2].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-white text-white" />
                <span className="text-[10px] text-white font-medium">Video</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Top Right */}
          <motion.div
            initial={{ opacity: 0, x: 100, rotate: 12 }}
            animate={{ opacity: 1, x: 0, rotate: 12 }}
            transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
            className="absolute top-[12%] right-[5%] w-44 h-56 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 hover:scale-105 transition-transform cursor-pointer"
            >
              <img src={nanaExamples[1].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="text-[10px] px-2 py-1 bg-purple-500/90 rounded-full font-medium text-white">Fashion</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom Right */}
          <motion.div
            initial={{ opacity: 0, x: 100, rotate: -8 }}
            animate={{ opacity: 1, x: 0, rotate: -8 }}
            transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
            className="absolute bottom-[20%] right-[8%] w-36 h-48 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 hover:scale-105 transition-transform cursor-pointer"
            >
              <img src={nanaExamples[3].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="text-[10px] px-2 py-1 bg-yellow-500/90 rounded-full font-medium text-black">4K</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Extra floating cards for more depth */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute top-[35%] left-[2%] w-24 h-32 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, -8, 0], rotate: [15, 18, 15] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-xl overflow-hidden shadow-xl border border-white/5 opacity-60"
            >
              <img src={nanaExamples[4].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ delay: 1.1, duration: 1 }}
            className="absolute top-[38%] right-[2%] w-24 h-32 pointer-events-auto"
          >
            <motion.div 
              animate={{ y: [0, 8, 0], rotate: [-15, -12, -15] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-full rounded-xl overflow-hidden shadow-xl border border-white/5 opacity-60"
            >
              <img src={nanaExamples[5].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Nano Banana Pro • Безлимит в тарифах</span>
          </motion.div>

          {/* Main Title - Large & Bold */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl lg:text-[120px] font-bold tracking-tight leading-[0.9] mb-8"
          >
            <span className="text-[var(--text)]">Создавайте</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              невероятное
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-light"
          >
            AI фото и видео студийного качества за секунды
          </motion.p>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/generator?section=image">
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-base font-medium rounded-full"
              >
                Начать бесплатно
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#examples">
              <Button 
                size="lg"
                variant="ghost"
                className="text-gray-400 hover:text-white px-8 py-6 text-base font-medium rounded-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Смотреть примеры
              </Button>
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500"
          >
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              50⭐ бесплатно
            </span>
            <span>•</span>
            <span>Без карты</span>
            <span>•</span>
            <span>25+ моделей</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border border-white/20 rounded-full flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-white/30 rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ===== TOOLS SECTION - Higgsfield Style ===== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Что создадите сегодня?
            </h2>
            <p className="text-xl text-gray-400">
              Выберите инструмент и начните создавать
            </p>
          </motion.div>

          {/* Tool Cards - Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { 
                title: 'Создать изображение', 
                desc: 'AI генерация фото 4K качества',
                icon: ImageIcon,
                href: '/generator?section=image',
                gradient: 'from-purple-500/20 to-pink-500/20',
                iconGradient: 'from-purple-500 to-pink-500'
              },
              { 
                title: 'Создать видео', 
                desc: 'Кинематографичные AI видео со звуком',
                icon: Video,
                href: '/generator?section=video',
                gradient: 'from-cyan-500/20 to-blue-500/20',
                iconGradient: 'from-cyan-500 to-blue-500'
              },
              { 
                title: 'Nano Banana Pro', 
                desc: 'Лучшая 4K модель • Безлимит',
                icon: Sparkles,
                href: '/generator?section=image&model=nano-banana-pro',
                gradient: 'from-yellow-500/20 to-orange-500/20',
                iconGradient: 'from-yellow-500 to-orange-500',
                badge: 'Безлимит'
              },
              { 
                title: 'Veo 3.1', 
                desc: 'Google видео со звуком',
                icon: Video,
                href: '/generator?section=video&model=veo-3.1',
                gradient: 'from-blue-500/20 to-indigo-500/20',
                iconGradient: 'from-blue-500 to-indigo-500',
                badge: 'Google'
              },
              { 
                title: 'Kling AI', 
                desc: 'Кинематограф до 10 секунд',
                icon: Zap,
                href: '/generator?section=video&model=kling',
                gradient: 'from-emerald-500/20 to-cyan-500/20',
                iconGradient: 'from-emerald-500 to-cyan-500',
                badge: 'Trending'
              },
              { 
                title: 'Sora 2', 
                desc: 'OpenAI видео модель',
                icon: Crown,
                href: '/generator?section=video&model=sora-2',
                gradient: 'from-rose-500/20 to-pink-500/20',
                iconGradient: 'from-rose-500 to-pink-500',
                badge: 'OpenAI'
              },
            ].map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={tool.href}>
                  <div className={`group relative p-8 rounded-3xl bg-gradient-to-br ${tool.gradient} border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer h-full`}>
                    {tool.badge && (
                      <span className={`absolute top-6 right-6 text-xs px-3 py-1 rounded-full bg-gradient-to-r ${tool.iconGradient} text-white font-medium`}>
                        {tool.badge}
                      </span>
                    )}
                    
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.iconGradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <tool.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">{tool.title}</h3>
                    <p className="text-gray-500">{tool.desc}</p>
                    
                    <div className="mt-6 flex items-center text-sm text-gray-400 group-hover:text-white transition-colors">
                      <span>Открыть</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALLERY - Nano Banana Pro Examples ===== */}
      <section id="examples" className="py-32 px-6 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
              <span className="text-lg">🍌</span>
              <span className="text-sm text-yellow-400 font-medium">Nano Banana Pro</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Примеры работ
            </h2>
            <p className="text-xl text-gray-400 max-w-xl mx-auto">
              Сгенерировано с помощью Nano Banana Pro — лучшей 4K модели
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1 rounded-full bg-white/5 border border-white/10">
              {[
                { id: 'image', label: 'Фото', icon: ImageIcon },
                { id: 'video', label: 'Видео', icon: Video },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'image' | 'video')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Gallery - Masonry Style */}
          {activeTab === 'image' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {nanaExamples.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`group relative rounded-3xl overflow-hidden cursor-pointer ${
                    i === 0 || i === 3 ? 'aspect-[3/4] md:row-span-2' : 'aspect-square'
                  }`}
                >
                  <Image 
                    src={item.url} 
                    alt={item.prompt} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                  
                  {/* Badge - always visible */}
                  <div className="absolute top-4 left-4">
                    <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white font-medium border border-white/20">
                      {item.badge}
                    </span>
                  </div>
                  
                  {/* AI Generated badge */}
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] px-2 py-1 bg-cyan-500/80 backdrop-blur-sm rounded-full text-white font-medium">
                      AI
                    </span>
                  </div>
                  
                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-sm text-white/90 mb-1 line-clamp-2">{item.prompt}</p>
                    <span className="text-xs text-yellow-400 font-medium">{item.model}</span>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Video Gallery */}
          {activeTab === 'video' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {videoExamples.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-video rounded-3xl overflow-hidden cursor-pointer"
                >
                  <Image 
                    src={item.url} 
                    alt={item.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-white font-medium border border-white/20">
                      {item.badge}
                    </span>
                  </div>
                  
                  {/* Duration */}
                  <div className="absolute top-4 right-4">
                    <span className="text-xs px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white font-medium">
                      {item.duration}
                    </span>
                  </div>
                  
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/20 transition-all">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h4 className="text-xl font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-white/70 mb-2">{item.desc}</p>
                    <div className="flex items-center gap-3 text-sm text-white/70">
                      <span>{item.model}</span>
                      <span>•</span>
                      <span>{item.duration}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* CTA */}
          <div className="text-center mt-16">
            <Link href="/generator">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-medium px-8 py-6 rounded-full"
              >
                Создать своё
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MODELS SECTION ===== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              25+ AI моделей
            </h2>
            <p className="text-xl text-gray-400">
              Выбирайте лучшее для каждой задачи
            </p>
          </motion.div>

          {/* Models Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Photo Models */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 px-2">Фото</h3>
              {[
                { name: 'Nano Banana Pro', desc: '4K высшего качества', cost: 35, badge: 'Безлимит', color: 'text-yellow-400' },
                { name: 'GPT Image', desc: 'Точная цветопередача', cost: 42, badge: 'OpenAI', color: 'text-emerald-400' },
                { name: 'FLUX.2 Pro', desc: 'Детализация и резкость', cost: 10, badge: 'Fast', color: 'text-purple-400' },
                { name: 'Seedream 4.5', desc: '4K нового поколения', cost: 11, badge: 'New', color: 'text-cyan-400' },
              ].map((model, i) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=image`}>
                    <div className="group flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                          <ImageIcon className={`w-5 h-5 ${model.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[var(--text)]">{model.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${model.color}`}>
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{model.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">{model.cost}⭐</span>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Video Models */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 px-2">Видео</h3>
              {[
                { name: 'Veo 3.1', desc: 'Google видео со звуком', cost: 260, badge: 'Google', color: 'text-blue-400' },
                { name: 'Kling AI', desc: 'Кинематограф до 10с', cost: 105, badge: 'Trending', color: 'text-emerald-400' },
                { name: 'Sora 2 Pro', desc: '1080p максимум', cost: 650, badge: 'OpenAI', color: 'text-rose-400' },
                { name: 'WAN AI', desc: 'До 15 секунд', cost: 217, badge: 'New', color: 'text-purple-400' },
              ].map((model, i) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=video`}>
                    <div className="group flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                          <Video className={`w-5 h-5 ${model.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[var(--text)]">{model.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${model.color}`}>
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{model.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">{model.cost}⭐</span>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== NANO BANANA PRO PROMO ===== */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent border border-yellow-500/20 p-12 md:p-16"
          >
            {/* Glow */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-6">
                  <span className="text-2xl">🍌</span>
                  <span className="font-semibold text-yellow-300">Эксклюзив</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[var(--text)]">
                  Nano Banana Pro
                  <br />
                  <span className="text-yellow-400">бесплатно</span>
                </h2>
                
                <p className="text-lg text-gray-400 mb-8">
                  В тарифах Creator+ и Business — безлимитные генерации 4K фото без траты звёзд
                </p>

                <ul className="space-y-4 mb-10">
                  {[
                    'Безлимит генераций',
                    'Премиум 4K качество',
                    'Без траты ⭐ звёзд',
                    'Приоритетная очередь',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-medium px-8 py-6 rounded-full">
                    Смотреть тарифы
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Preview Image */}
              <div className="relative hidden md:block">
                <div className="aspect-[3/4] max-w-sm mx-auto relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-3xl blur-2xl" />
                  <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <Image 
                      src={nanaExamples[0].url}
                      alt="Nano Banana Pro Example"
                      width={400}
                      height={533}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              Готовы создавать?
            </h2>
            <p className="text-xl text-gray-400 mb-12">
              50⭐ бесплатно при регистрации
            </p>
            
            <Link href="/generator">
              <Button 
                size="lg"
                className="bg-white text-black hover:bg-gray-100 px-12 py-7 text-lg font-medium rounded-full"
              >
                Начать бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-500">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Вход через Telegram
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Без карты
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
