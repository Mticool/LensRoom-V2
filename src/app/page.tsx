'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Play, Sparkles, ChevronDown,
  Image as ImageIcon, Video, Music, Zap, Star
} from 'lucide-react';
import { ReferralInvite } from '@/components/home/referral-invite';

// Showcase works - clickable to generator (5 in a row)
const showcaseWorks = [
  { 
    id: 1, 
    src: '/showcase/1.jpg', 
    type: 'image',
    prompt: 'cinematic portrait, soft lighting, professional photography',
    model: 'nano-banana-pro',
    label: 'Портрет',
    hot: true
  },
  { 
    id: 2, 
    src: '/showcase/3.mp4',
    poster: '/showcase/2.jpg',
    type: 'video',
    prompt: 'cinematic video, smooth motion',
    model: 'veo-3.1',
    label: 'Видео',
    duration: '8с'
  },
  { 
    id: 3, 
    src: '/showcase/2.jpg',
    type: 'image', 
    prompt: 'fashion photography, editorial style',
    model: 'flux-2-pro',
    label: 'Fashion'
  },
  { 
    id: 4, 
    src: '/showcase/4.jpg',
    type: 'image',
    prompt: 'product photography, studio lighting',
    model: 'gpt-image',
    label: 'Продукт'
  },
  { 
    id: 5, 
    src: '/showcase/5.jpg',
    type: 'image',
    prompt: 'commercial photography, vibrant colors',
    model: 'seedream-4.5',
    label: 'Реклама'
  },
];

// Quick style presets
const stylePresets = [
  { id: 'portrait', emoji: '👩', title: 'Портрет', prompt: 'cinematic portrait, perfect skin, soft lighting, 8k', color: '#a78bfa' },
  { id: 'product', emoji: '💎', title: 'Продукт', prompt: 'luxury product photography, studio lighting, minimalist', color: '#22d3ee' },
  { id: 'landscape', emoji: '🏔️', title: 'Пейзаж', prompt: 'breathtaking landscape, golden hour, dramatic clouds', color: '#34d399' },
  { id: 'anime', emoji: '🌸', title: 'Аниме', prompt: 'beautiful anime art, vibrant colors, detailed', color: '#f472b6' },
  { id: 'cyber', emoji: '🌃', title: 'Киберпанк', prompt: 'cyberpunk city, neon lights, futuristic', color: '#fbbf24' },
  { id: 'fantasy', emoji: '✨', title: 'Фэнтези', prompt: 'magical fantasy scene, ethereal lighting', color: '#ec4899' },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWork, setHoveredWork] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden">
      
      {/* ===== HERO - Full Screen Impact ===== */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Main gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0b]" />
          
          {/* Animated glow orbs */}
          <motion.div 
            animate={{ 
              x: [0, 50, 0],
              y: [0, -30, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#CDFF00]/10 rounded-full blur-[150px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-[#00D9FF]/10 rounded-full blur-[120px]" 
          />
          
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Floating Images/Videos Around Hero */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Left - Portrait */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0, y: [0, -15, 0] }}
            transition={{ 
              opacity: { delay: 0.5, duration: 0.8 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute top-[15%] left-[3%] md:left-[8%] w-24 md:w-36 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <img src="/showcase/1.jpg" alt="" className="w-full h-full object-cover" />
          </motion.div>

          {/* Top Right - Square */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0, y: [0, 12, 0] }}
            transition={{ 
              opacity: { delay: 0.6, duration: 0.8 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }
            }}
            className="absolute top-[12%] right-[3%] md:right-[10%] w-20 md:w-28 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <img src="/showcase/4.jpg" alt="" className="w-full h-full object-cover" />
          </motion.div>

          {/* Left Middle - Video */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0, y: [0, 10, 0] }}
            transition={{ 
              opacity: { delay: 0.7, duration: 0.8 },
              y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            }}
            className="absolute top-[45%] left-[2%] md:left-[5%] w-28 md:w-40 aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <video src="/showcase/3.mp4" poster="/showcase/2.jpg" muted loop autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white ml-0.5" />
              </div>
            </div>
          </motion.div>

          {/* Right Middle */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0, y: [0, -12, 0] }}
            transition={{ 
              opacity: { delay: 0.8, duration: 0.8 },
              y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }
            }}
            className="absolute top-[50%] right-[2%] md:right-[6%] w-24 md:w-32 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <img src="/showcase/5.jpg" alt="" className="w-full h-full object-cover" />
          </motion.div>

          {/* Bottom Left */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ 
              opacity: { delay: 0.9, duration: 0.8 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
            }}
            className="absolute bottom-[15%] left-[8%] md:left-[12%] w-20 md:w-28 aspect-square rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <img src="/showcase/6.jpg" alt="" className="w-full h-full object-cover" />
          </motion.div>

          {/* Bottom Right */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{ 
              opacity: { delay: 1, duration: 0.8 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute bottom-[18%] right-[10%] md:right-[15%] w-24 md:w-32 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
          >
            <img src="/showcase/2.jpg" alt="" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        {/* Hero Content */}
        <motion.div 
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-6xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#CDFF00] opacity-75"></span>
              <span className="relative rounded-full h-2.5 w-2.5 bg-[#CDFF00]"></span>
            </span>
            <span className="text-sm md:text-base text-white/70">25+ нейросетей • Без карты • 50⭐ бесплатно</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[clamp(3rem,12vw,7rem)] font-black leading-[0.9] tracking-tight mb-6"
          >
            <span className="text-white">Создай свой</span>
            <br />
            <span className="bg-gradient-to-r from-[#CDFF00] via-[#00D9FF] to-[#CDFF00] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              AI шедевр
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-5 leading-relaxed"
          >
            Профессиональные фото, кинематографичное видео и музыка —
            <br className="hidden md:block" />
            всё создаётся за секунды с помощью лучших нейросетей мира
          </motion.p>

          {/* Features line */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-10 text-sm md:text-base text-white/40"
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#CDFF00]" />
              Фото до 4K
            </span>
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4 text-[#00D9FF]" />
              Видео со звуком
            </span>
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#f472b6]" />
              Музыка любого жанра
            </span>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/create">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative px-10 py-5 rounded-2xl bg-[#CDFF00] text-black font-bold text-lg overflow-hidden shadow-[0_0_60px_rgba(205,255,0,0.3)]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Начать создавать
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </motion.button>
            </Link>
            <Link href="#gallery">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 font-medium text-lg transition-all"
              >
                <Play className="w-5 h-5" />
                Смотреть примеры
              </motion.button>
            </Link>
          </motion.div>

          {/* Trust text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-sm text-white/30"
          >
            Вход через Telegram • Мгновенный старт • Поддержка 24/7
          </motion.p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== PROMO BANNER - Nano Banana Pro Unlimited ===== */}
      <section className="py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <Link href="/pricing">
            <motion.div
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.99 }}
              className="relative overflow-hidden rounded-3xl border-2 border-[#CDFF00]/50 bg-gradient-to-br from-[#CDFF00]/15 via-[#0d0d0e] to-[#CDFF00]/10 p-8 md:p-10 cursor-pointer group shadow-[0_0_60px_rgba(205,255,0,0.15)]"
            >
              {/* Animated glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CDFF00]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Pulse effect */}
              <div className="absolute top-4 right-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CDFF00] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#CDFF00]"></span>
                </span>
              </div>
              
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  {/* Infinity Icon */}
                  <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#CDFF00]/30 to-[#CDFF00]/10 border border-[#CDFF00]/40 shadow-lg shadow-[#CDFF00]/20"
                  >
                    <span className="text-5xl text-[#CDFF00]">∞</span>
                  </motion.div>
                  <div className="text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                      <span className="px-3 py-1 text-xs font-black rounded-full bg-[#CDFF00] text-black uppercase tracking-wide animate-pulse">Новинка</span>
                      <span className="text-2xl md:text-3xl font-black text-white">Nano Banana Pro</span>
                    </div>
                    <p className="text-lg md:text-xl text-[#CDFF00] font-bold mb-1">
                      БЕЗЛИМИТ в тарифах Creator+ и Business
                    </p>
                    <p className="text-sm md:text-base text-white/50">
                      Генерируй Pro 1–2K сколько хочешь • Без списания звёзд • Уже доступно
                    </p>
                  </div>
                </div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#CDFF00] text-black font-bold text-base shadow-lg shadow-[#CDFF00]/30 group-hover:shadow-[#CDFF00]/50 transition-all"
                >
                  Смотреть тарифы
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </section>

      {/* ===== GALLERY - Showcase Works ===== */}
      <section id="gallery" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Создано с <span className="text-[#CDFF00]">LensRoom</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              Нажми на любую работу — откроется генератор с похожими настройками
            </p>
          </motion.div>

          {/* Gallery Grid - 5 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {showcaseWorks.map((work, index) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.08 }}
              >
                <Link
                  href={work.type === 'video' 
                    ? `/create/studio?section=video&model=${work.model}&prompt=${encodeURIComponent(work.prompt)}`
                    : `/create/studio?section=photo&model=${work.model}&prompt=${encodeURIComponent(work.prompt)}`
                  }
                >
                  <motion.div
                    whileHover={{ scale: 1.03, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setHoveredWork(work.id)}
                    onHoverEnd={() => setHoveredWork(null)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group"
                  >
                    {/* Image/Video */}
                    {work.type === 'video' ? (
                      <video 
                        src={work.src}
                        poster={work.poster}
                        muted 
                        loop 
                        playsInline
                        autoPlay={hoveredWork === work.id}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={work.src} 
                        alt={work.label}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                    
                    {/* Labels */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium">
                          {work.label}
                        </span>
                        {work.hot && (
                          <span className="px-2 py-1 rounded-full bg-[#CDFF00] text-black text-xs font-bold">
                            HOT
                          </span>
                        )}
                        {work.duration && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs">
                            <Play className="w-3 h-3 fill-white" />
                            {work.duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: hoveredWork === work.id ? 1 : 0, y: hoveredWork === work.id ? 0 : 20 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="px-6 py-3 rounded-2xl bg-[#CDFF00] text-black font-bold flex items-center gap-2 shadow-2xl">
                        <Sparkles className="w-5 h-5" />
                        Создать похожее
                      </div>
                    </motion.div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MOTION CONTROL - Feature Section ===== */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#a78bfa]/10 to-transparent blur-[100px]" />
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left - Content */}
            <div className="order-2 lg:order-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#a78bfa]/20 to-[#22d3ee]/20 border border-[#a78bfa]/30 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="text-[11px] font-semibold text-[#a78bfa] uppercase tracking-wider">Новинка</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Kling 2.6 Motion Control
              </h2>
              
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                Перенос реальных движений, жестов и мимики из референс-видео на персонажа.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8">
                {[
                  'Реалистичные эмоции и жесты',
                  'Стабильный тайминг без артефактов',
                  'Длительность 3–30 сек, оплата по секундам',
                ].map((text, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee]" />
                    <span className="text-white/70">{text}</span>
                  </motion.div>
                ))}
              </div>
              
              <p className="text-sm text-white/40 mb-8">
                Стоимость рассчитывается автоматически после загрузки motion-референса.
              </p>
              
              {/* CTA */}
              <Link href="/create/studio?section=motion&model=kling-motion-control">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] text-white font-semibold shadow-lg shadow-[#a78bfa]/25"
                >
                  Попробовать
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </div>
            
            {/* Right - Banner */}
            <div className="order-1 lg:order-2 relative">
              <div className="relative aspect-video rounded-[20px] overflow-hidden border border-white/10 bg-[#0a0a0b] shadow-2xl">
                <img
                  src="/motion-control/poster.jpg"
                  alt="Kling Motion Control"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <span className="text-xs font-semibold text-white">Kling AI</span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                  <span className="text-xs font-medium text-white">от 80⭐</span>
                </div>
              </div>
              <div className="absolute -inset-6 bg-gradient-to-r from-[#a78bfa]/15 via-transparent to-[#22d3ee]/15 blur-2xl -z-10 opacity-60" />
            </div>
          </motion.div>
          
          {/* Video Examples Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            <p className="text-sm text-white/40 mb-6 text-center">
              Примеры результатов
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <video
                    src={`/motion-control/demo-${i}.mp4`}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== QUICK STYLES - One Click Start ===== */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#CDFF00]/5 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Выбери стиль — создай за секунды
            </h2>
            <p className="text-lg text-white/50">
              Один клик — и ты в генераторе с готовым промптом
            </p>
          </motion.div>

          {/* Style Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stylePresets.map((style, index) => (
              <motion.div
                key={style.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/create/studio?section=photo&model=nano-banana-pro&prompt=${encodeURIComponent(style.prompt)}`}>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-center cursor-pointer transition-all"
                    style={{ 
                      boxShadow: `0 0 0 0 ${style.color}00`,
                    }}
                  >
                    <div className="text-4xl mb-3">{style.emoji}</div>
                    <div className="text-sm font-medium text-white">{style.title}</div>
                    
                    {/* Hover glow */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"
                      style={{ 
                        boxShadow: `0 0 40px ${style.color}40`,
                        background: `radial-gradient(circle at center, ${style.color}10 0%, transparent 70%)`
                      }}
                    />
                    
                    {/* Arrow indicator */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-[#CDFF00]" />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES - Why LensRoom ===== */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Почему LensRoom?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: '25+ нейросетей',
                desc: 'GPT, Sora, Kling, Veo, FLUX и другие топовые модели в одном месте',
                color: '#CDFF00'
              },
              {
                icon: Star,
                title: '50⭐ бесплатно',
                desc: 'Начни прямо сейчас без карты. Достаточно для 5-7 качественных генераций',
                color: '#00D9FF'
              },
              {
                icon: ImageIcon,
                title: 'Pro качество',
                desc: 'Фото до 4K, видео со звуком до 15 секунд, музыка любого жанра',
                color: '#f472b6'
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${feature.color}20` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REFERRAL ===== */}
      <ReferralInvite />

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#CDFF00]/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#CDFF00]/20 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Готов создавать?
          </h2>
          <p className="text-xl text-white/50 mb-10">
            Присоединяйся к тысячам креаторов. Первые 50⭐ — в подарок.
          </p>
          
          <Link href="/create">
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-12 py-6 rounded-2xl bg-[#CDFF00] text-black font-bold text-xl overflow-hidden shadow-[0_0_80px_rgba(205,255,0,0.4)]"
            >
              <span className="relative z-10 flex items-center gap-3">
                Начать бесплатно
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </motion.button>
          </Link>
          
          <p className="mt-6 text-sm text-white/40">
            Вход через Telegram • Без карты • Моментальный старт
          </p>
        </motion.div>
      </section>
    </div>
  );
}
