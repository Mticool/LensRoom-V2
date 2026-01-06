'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  ArrowRight, Play, Sparkles, MousePointer2,
  Image as ImageIcon, Video, Music, Wand2, Layers, Zap
} from 'lucide-react';
import { QuickStart } from '@/components/home/QuickStart';

// Featured works - реальные примеры из /public/showcase/
const featuredWorks = [
  { id: 1, type: 'image', src: '/showcase/1.jpg', model: 'Nano Banana Pro', category: 'Portrait' },
  { id: 2, type: 'video', src: '/showcase/3.mp4', poster: '/showcase/2.jpg', model: 'Veo 3.1', category: 'Cinematic', duration: '8s' },
  { id: 3, type: 'image', src: '/showcase/2.jpg', model: 'FLUX.2 Pro', category: 'Fashion' },
  { id: 4, type: 'image', src: '/showcase/4.jpg', model: 'GPT Image', category: 'Editorial' },
  { id: 5, type: 'image', src: '/showcase/5.jpg', model: 'Kling AI', category: 'Commercial' },
  { id: 6, type: 'image', src: '/showcase/6.jpg', model: 'Seedream 4.5', category: '4K' },
];

// Tools/Features
const tools = [
  { 
    icon: ImageIcon, 
    title: 'Создать фото', 
    desc: 'От портретов до fashion, 4K качество',
    href: '/generator?section=image',
    color: '#a78bfa'
  },
  { 
    icon: Video, 
    title: 'Создать видео', 
    desc: 'Кинематограф со звуком до 15с',
    href: '/generator?section=video',
    color: '#22d3ee'
  },
  { 
    icon: Music, 
    title: 'Создать музыку', 
    desc: 'AI треки любого жанра',
    href: '/generator?section=audio',
    color: '#f472b6'
  },
  { 
    icon: Wand2, 
    title: 'Редактировать', 
    desc: 'Inpaint, upscale, стилизация',
    href: '/generator?section=image&model=nano-banana-pro',
    color: '#fbbf24'
  },
];

// Models showcase
const models = [
  { name: 'Nano Banana Pro', type: 'Фото', stars: '7-40⭐', badge: 'Безлимит', hot: true },
  { name: 'Veo 3.1', type: 'Видео', stars: '99-490⭐', badge: 'Google' },
  { name: 'Kling AI', type: 'Видео', stars: '105-400⭐', badge: 'Trending' },
  { name: 'GPT Image 1.5', type: 'Фото', stars: '17-67⭐', badge: 'OpenAI' },
  { name: 'Sora 2', type: 'Видео', stars: '50-1050⭐', badge: 'OpenAI' },
  { name: 'Grok Imagine', type: 'Фото', stars: '15⭐', badge: 'xAI', hot: true },
];

// Animated Counter
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <span ref={ref}>
      {isInView ? value : 0}{suffix}
    </span>
  );
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredWork, setHoveredWork] = useState<number | null>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      
      {/* ===== HERO - Editorial Style ===== */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#a78bfa]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-[#22d3ee]/10 rounded-full blur-[120px]" />
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left - Text */}
          <div className="space-y-8">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[13px] text-[var(--muted-light)]">25+ AI моделей онлайн</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[0.95] tracking-tight">
                <span className="text-[var(--text)]">Твоя</span>
                <br />
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#f472b6] to-[#22d3ee] bg-clip-text text-transparent">
                  AI студия
                </span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[18px] md:text-[20px] text-[var(--muted)] max-w-lg leading-relaxed"
            >
              Фото, видео и музыка профессионального качества. 
              Одна платформа — все лучшие нейросети.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-4"
            >
              <Link href="/generator">
                <button className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] text-white font-medium text-[15px] shadow-lg shadow-[#a78bfa]/25 hover:shadow-[#a78bfa]/40 hover:-translate-y-0.5 transition-all duration-300">
                  Начать бесплатно
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="#showcase">
                <button className="flex items-center gap-2 px-6 py-4 rounded-full text-[var(--muted-light)] hover:text-[var(--text)] text-[15px] transition-colors">
                  <Play className="w-4 h-4" />
                  Смотреть примеры
                </button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-8 pt-6"
            >
              {[
                { value: 50, label: 'звёзд', suffix: '⭐' },
                { value: 25, label: 'моделей', suffix: '+' },
                { value: 0, label: 'карта', suffix: '₽' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-[24px] font-bold text-[var(--text)]">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[12px] text-[var(--muted)] uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right - Featured Work Collage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-square max-w-[500px] mx-auto">
              {/* Main featured image */}
              <div className="absolute inset-[10%] rounded-[28px] overflow-hidden border border-[var(--border)] shadow-2xl shadow-black/30 z-20">
                <img 
                  src="/showcase/1.jpg" 
                  alt="AI Generated Portrait" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[11px] px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white font-medium">
                    Nano Banana Pro
                  </span>
                </div>
              </div>

              {/* Floating smaller cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-32 aspect-[3/4] rounded-[18px] overflow-hidden border border-[var(--border)] shadow-xl z-10"
              >
                <img src="/showcase/4.jpg" alt="" className="w-full h-full object-cover" />
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-[5%] right-0 w-28 aspect-square rounded-[16px] overflow-hidden border border-[var(--border)] shadow-xl z-10"
              >
                <img src="/showcase/5.jpg" alt="" className="w-full h-full object-cover" />
              </motion.div>

              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-[5%] right-[5%] w-36 aspect-video rounded-[14px] overflow-hidden border border-[var(--border)] shadow-xl z-30"
              >
                <video 
                  src="/showcase/3.mp4" 
                  poster="/showcase/2.jpg"
                  muted 
                  loop 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-[#a78bfa]/30 to-transparent blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-gradient-to-br from-[#22d3ee]/30 to-transparent blur-2xl" />
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div 
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <MousePointer2 className="w-4 h-4 text-[var(--muted)] rotate-180" />
            <span className="text-[11px] text-[var(--muted)] uppercase tracking-widest">Scroll</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== QUICK START - Try Now ===== */}
      <QuickStart />

      {/* ===== MOTION CONTROL - New Feature ===== */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#a78bfa]/8 to-transparent blur-[100px]" />
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
              
              {/* Title */}
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight mb-4 leading-tight">
                Kling 2.6 Motion Control
              </h2>
              
              {/* Subtitle */}
              <p className="text-[16px] text-[var(--muted-light)] mb-8 leading-relaxed max-w-md">
                Перенос реальных движений, жестов и мимики из референс-видео на персонажа.
              </p>
              
              {/* Features */}
              <div className="space-y-4 mb-8">
                {[
                  { icon: '✨', text: 'Реалистичные эмоции и жесты' },
                  { icon: '🎯', text: 'Стабильный тайминг без "дрожания"' },
                  { icon: '⭐', text: 'Длительность 3–30 сек, цена по секундам' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[15px] text-[var(--text)]">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              
              {/* Caption */}
              <p className="text-[13px] text-[var(--muted)] mb-8">
                Максимум 30 сек. Стоимость рассчитывается автоматически после загрузки motion-референса.
              </p>
              
              {/* CTA */}
              <Link href="/generator?section=video&model=kling-motion-control">
                <button className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] text-[14px] font-semibold text-white shadow-lg shadow-[#a78bfa]/25 hover:shadow-xl hover:shadow-[#a78bfa]/30 hover:scale-[1.02] transition-all duration-300">
                  Попробовать
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
            
            {/* Right - Banner (horizontal 16:9) */}
            <div className="order-1 lg:order-2 relative">
              <div className="relative aspect-video rounded-[20px] overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/20">
                {/* Banner Image */}
                <img
                  src="/motion-control/poster.jpg"
                  alt="Kling Motion Control"
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                
                {/* Logo badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                  <span className="text-[11px] font-semibold text-white">Kling AI</span>
                </div>
                
                {/* Price badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/10">
                  <span className="text-[11px] font-medium text-white">от 80⭐</span>
                </div>
              </div>
              
              {/* Decorative glow */}
              <div className="absolute -inset-6 bg-gradient-to-r from-[#a78bfa]/15 via-transparent to-[#22d3ee]/15 blur-2xl -z-10 opacity-60" />
            </div>
          </motion.div>
          
          {/* Video Examples - 3 columns, smaller */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <p className="text-[13px] text-[var(--muted)] mb-6 text-center">
              Примеры результатов
            </p>
            <div className="grid grid-cols-4 gap-5 max-w-4xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-video rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] hover:scale-[1.02] transition-all duration-300 cursor-pointer"
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

      {/* ===== TOOLS SECTION ===== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-20"
          >
            <span className="text-[13px] font-medium text-[var(--accent-primary)] uppercase tracking-widest mb-4 block">
              Инструменты
            </span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight">
              Что создадите сегодня?
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={tool.href}>
                  <div className="group relative p-6 h-full rounded-[24px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-300 cursor-pointer overflow-hidden">
                    {/* Glow on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}15, transparent 70%)` }}
                    />
                    
                    <div className="relative z-10">
                      <div 
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${tool.color}15` }}
                      >
                        <tool.icon className="w-6 h-6" style={{ color: tool.color }} />
                      </div>
                      
                      <h3 className="text-[16px] font-semibold text-[var(--text)] mb-2">{tool.title}</h3>
                      <p className="text-[14px] text-[var(--muted)] leading-relaxed">{tool.desc}</p>
                      
                      <div className="mt-5 flex items-center text-[13px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">
                        <span>Открыть</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE SECTION ===== */}
      <section id="showcase" className="py-32 px-6 bg-gradient-to-b from-transparent via-[var(--surface)]/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <span className="text-[13px] font-medium text-[var(--accent-secondary)] uppercase tracking-widest mb-4 block">
              Галерея
            </span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight mb-4">
              Создано с LensRoom
            </h2>
            <p className="text-[16px] text-[var(--muted)] max-w-md mx-auto">
              Примеры работ наших пользователей
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {featuredWorks.map((work, i) => {
              const isLarge = i === 0 || i === 4;
              const isTall = i === 1 || i === 5;
              
              return (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onMouseEnter={() => setHoveredWork(work.id)}
                  onMouseLeave={() => setHoveredWork(null)}
                  className={`
                    group relative rounded-[20px] overflow-hidden cursor-pointer
                    ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}
                    ${isTall ? 'row-span-2' : ''}
                  `}
                >
                  {work.type === 'video' ? (
                    <video 
                      src={work.src}
                      poster={(work as any).poster}
                      muted 
                      loop 
                      autoPlay 
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <img 
                      src={work.src} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  
                  {/* Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 transition-opacity duration-300 ${
                    hoveredWork === work.id ? 'opacity-100' : 'opacity-60'
                  }`} />
                  
                  {/* Video indicator */}
                  {work.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  
                  {/* Labels */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="text-[11px] px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white font-medium border border-white/10">
                      {work.category}
                    </span>
                  </div>
                  
                  {work.duration && (
                    <div className="absolute top-4 right-4">
                      <span className="text-[11px] px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white font-medium">
                        {work.duration}
                      </span>
                    </div>
                  )}
                  
                  {/* Bottom info */}
                  <div className={`absolute bottom-0 left-0 right-0 p-5 transform transition-all duration-300 ${
                    hoveredWork === work.id ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  }`}>
                    <span className="text-[13px] font-medium text-white">{work.model}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link href="/inspiration">
              <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[14px] font-medium text-[var(--text)] hover:border-[var(--border-hover)] transition-all">
                Смотреть всё
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MODELS SECTION ===== */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <span className="text-[13px] font-medium text-[#f472b6] uppercase tracking-widest mb-4 block">
              Модели
            </span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-tight mb-4">
              Лучшие нейросети
            </h2>
            <p className="text-[16px] text-[var(--muted)] max-w-md mx-auto">
              От быстрых до профессиональных — выбирайте под задачу
            </p>
          </motion.div>

          <div className="space-y-3">
            {models.map((model, i) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href="/generator">
                  <div className="group flex items-center justify-between p-5 rounded-[18px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-lg hover:shadow-black/5 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center ${
                        model.type === 'Фото' ? 'bg-[#a78bfa]/15' : 'bg-[#22d3ee]/15'
                      }`}>
                        {model.type === 'Фото' ? (
                          <ImageIcon className="w-5 h-5 text-[#a78bfa]" />
                        ) : (
                          <Video className="w-5 h-5 text-[#22d3ee]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-[15px] font-semibold text-[var(--text)]">{model.name}</h4>
                          {model.hot && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold">
                              HOT
                            </span>
                          )}
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--surface2)] text-[var(--muted-light)] font-medium">
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-[13px] text-[var(--muted)]">{model.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[14px] font-medium text-[var(--accent-primary)]">{model.stars}</span>
                      <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--text)] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/generator">
              <button className="text-[14px] text-[var(--muted-light)] hover:text-[var(--text)] transition-colors">
                Смотреть все модели →
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-[13px] font-medium text-[#fbbf24] uppercase tracking-widest mb-4 block">
                🍌 Эксклюзив
              </span>
              <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight mb-6">
                Nano Banana Pro
                <br />
                <span className="text-[#fbbf24]">безлимитно</span>
              </h2>
              <p className="text-[16px] text-[var(--muted)] mb-8 leading-relaxed">
                В тарифах Creator+ и Business — неограниченные генерации 4K изображений 
                без траты звёзд. Лучшее качество для профессионалов.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: Sparkles, text: 'Безлимит генераций' },
                  { icon: Layers, text: '4K разрешение' },
                  { icon: Zap, text: 'Приоритетная очередь' },
                  { icon: Wand2, text: 'T2I, I2I, Inpaint' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--surface)]">
                    <item.icon className="w-4 h-4 text-[#fbbf24]" />
                    <span className="text-[13px] text-[var(--text)]">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/pricing">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f97316] text-black font-medium text-[14px] hover:shadow-lg hover:shadow-[#fbbf24]/25 transition-all">
                  Смотреть тарифы
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative"
            >
              <div className="relative aspect-[4/5] max-w-sm mx-auto">
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#fbbf24]/20 to-[#f97316]/20 rounded-[32px] blur-3xl" />
                
                {/* Image */}
                <div className="relative rounded-[28px] overflow-hidden border border-[var(--border)] shadow-2xl">
                  <img 
                    src="/showcase/1.jpg"
                    alt="Nano Banana Pro Example"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white font-medium border border-white/20">
                        🍌 Nano Banana Pro
                      </span>
                      <span className="text-[13px] px-3 py-2 rounded-full bg-[#fbbf24] text-black font-semibold">
                        4K
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative text-center p-12 md:p-20 rounded-[32px] overflow-hidden"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#a78bfa]/10 via-[var(--surface)] to-[#22d3ee]/10" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
            
            <div className="relative z-10">
              <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold tracking-tight mb-6">
                Начните создавать
              </h2>
              <p className="text-[18px] text-[var(--muted)] mb-10 max-w-md mx-auto">
                50⭐ бесплатно при регистрации. Без карты.
              </p>
              
              <Link href="/generator">
                <button className="group inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] text-white font-semibold text-[16px] shadow-lg shadow-[#a78bfa]/30 hover:shadow-[#a78bfa]/50 hover:-translate-y-0.5 transition-all duration-300">
                  Попробовать бесплатно
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              
              <p className="mt-8 text-[13px] text-[var(--muted)]">
                Вход через Telegram • Моментальный старт
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
