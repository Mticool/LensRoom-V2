'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  Play,
  Zap,
  Image as ImageIcon,
  Video,
  Wand2,
  ChevronDown,
  Star,
  Users,
  Clock,
  Shield,
  Gift,
  X,
  ChevronRight,
  Check,
  HelpCircle,
  Plus,
  Minus,
  TrendingUp,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EffectsGallery } from '@/components/home/EffectsGallery';

// ===== ANIMATED SHOWCASE MEDIA =====
// Place your images/videos in /public/showcase/ folder
// Supported: .jpg, .png, .webp for images | .mp4, .webm for videos
const SHOWCASE_MEDIA = [
  { src: '/showcase/1.jpg', alt: 'AI Portrait - Cozy Vibes', type: 'image' as const },
  { src: '/showcase/2.jpg', alt: 'AI Art - Vintage Style', type: 'image' as const },
  { src: '/showcase/3.mp4', alt: 'AI Video - Effect', type: 'video' as const },
  { src: '/showcase/4.jpg', alt: 'AI Fashion - Retro', type: 'image' as const },
  { src: '/showcase/5.jpg', alt: 'AI Beauty - Editorial', type: 'image' as const },
  { src: '/showcase/6.mp4', alt: 'AI Video - Product', type: 'video' as const },
];

// ===== ANIMATED COUNTER HOOK =====
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
}

// ===== WELCOME POPUP =====
function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the popup before
    const hasSeenPopup = localStorage.getItem('lensroom_welcome_popup');
    if (!hasSeenPopup) {
      // Show popup after 3 seconds
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('lensroom_welcome_popup', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-up"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1A1A1A] to-[#0F0F0F] border border-white/10 p-8 shadow-2xl animate-scale-in">
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Gift icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#00D9FF] to-[#A78BFA] p-[2px]">
          <div className="w-full h-full rounded-2xl bg-[#0F0F0F] flex items-center justify-center">
            <Gift className="w-10 h-10 text-[#00D9FF]" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-2xl font-bold text-white text-center mb-3">
          Добро пожаловать! 🎉
        </h3>
        <p className="text-white/60 text-center mb-6">
          Получите <span className="text-[#00D9FF] font-bold">50 бесплатных звёзд</span> при регистрации и создайте свой первый AI контент!
        </p>

        {/* Features list */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-[#00D9FF]/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-[#00D9FF]" />
            </div>
            <span className="text-white/80">Nano Banana — бесплатно в тарифах</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-[#00D9FF]/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-[#00D9FF]" />
            </div>
            <span className="text-white/80">10+ топовых AI моделей</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-[#00D9FF]/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-[#00D9FF]" />
            </div>
            <span className="text-white/80">Вход за 5 секунд через Telegram</span>
          </div>
        </div>

        {/* CTA */}
        <Button 
          asChild
          className="w-full bg-gradient-to-r from-[#00D9FF] to-[#A78BFA] hover:opacity-90 text-black font-bold h-14 rounded-xl text-base"
        >
          <Link href="/create" onClick={handleClose}>
            <Sparkles className="w-5 h-5 mr-2" />
            Получить 50⭐ бесплатно
          </Link>
        </Button>

        <p className="text-xs text-white/30 text-center mt-4">
          Без карты • Без спама • Отписка в 1 клик
        </p>
      </div>
    </div>
  );
}

// ===== FLOATING CARD COMPONENT =====
function FloatingCard({ 
  src, 
  alt, 
  delay, 
  position,
  type = 'image'
}: { 
  src: string; 
  alt: string; 
  delay: number;
  position: { x: string; y: string; rotate: number; scale: number };
  type?: 'image' | 'video';
}) {
  return (
    <div 
      className="absolute rounded-2xl overflow-hidden shadow-2xl opacity-0 animate-float-in"
      style={{
        left: position.x,
        top: position.y,
        transform: `rotate(${position.rotate}deg) scale(${position.scale})`,
        animationDelay: `${delay}ms`,
        width: 'clamp(120px, 15vw, 200px)',
      }}
    >
      <div className="relative aspect-[3/4] bg-[#1a1a1a]">
        {type === 'video' ? (
          <video 
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={src} 
            alt={alt}
            className="w-full h-full object-cover"
            loading="eager"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center gap-1.5">
            {type === 'video' ? (
              <Play className="w-3 h-3 text-[#00D9FF]" />
            ) : (
              <Sparkles className="w-3 h-3 text-[#00D9FF]" />
            )}
            <span className="text-[10px] text-white/80 font-medium">
              {type === 'video' ? 'AI Video' : 'AI Generated'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== HERO SECTION =====
function Hero() {
  const [mounted, setMounted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const cardPositions = [
    { x: '5%', y: '15%', rotate: -12, scale: 0.9 },
    { x: '75%', y: '10%', rotate: 8, scale: 0.85 },
    { x: '-5%', y: '55%', rotate: -6, scale: 0.75 },
    { x: '80%', y: '50%', rotate: 12, scale: 0.8 },
    { x: '15%', y: '75%', rotate: -4, scale: 0.7 },
    { x: '70%', y: '80%', rotate: 6, scale: 0.75 },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 bg-[#0A0A0A]">
        {/* Video element - add your video file to /public/hero-video.mp4 */}
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-60' : 'opacity-0'}`}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          <source src="/hero-video.webm" type="video/webm" />
        </video>
        
        {/* Fallback gradient (shows while video loads or if no video) */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.08),transparent_50%)]" />
        </div>
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/70 via-[#0A0A0A]/50 to-[#0A0A0A]/90" />
        
        {/* Color tint overlay */}
        <div className="absolute inset-0 bg-[#0A0A0A]/30 mix-blend-multiply" />
        
        {/* Animated gradient accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.08),transparent_60%)]" />
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#0A0A0A_100%)]" />
      </div>

      {/* Floating showcase cards */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {mounted && SHOWCASE_MEDIA.map((media, i) => (
          <FloatingCard 
            key={i}
            src={media.src}
            alt={media.alt}
            type={media.type}
            delay={i * 150}
            position={cardPositions[i]}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 text-center pt-20 pb-32">
        {/* Badge */}
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 opacity-0 animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D9FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D9FF]"></span>
          </span>
          <span className="text-sm text-white/80">Топовые AI модели в одном месте</span>
        </div>

        {/* Main headline */}
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6 opacity-0 animate-fade-up px-2"
          style={{ animationDelay: '400ms' }}
        >
          <span className="text-white">Создавайте </span>
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-[#00D9FF] via-[#A78BFA] to-[#EC4899] bg-clip-text text-transparent">
              невероятный
            </span>
            <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full" height="6" viewBox="0 0 200 8" fill="none">
              <path d="M1 5.5C47.6667 2.16667 152.333 2.16667 199 5.5" stroke="url(#underline-gradient)" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="underline-gradient" x1="1" y1="4" x2="199" y2="4">
                  <stop stopColor="#00D9FF"/>
                  <stop offset="0.5" stopColor="#A78BFA"/>
                  <stop offset="1" stopColor="#EC4899"/>
                </linearGradient>
              </defs>
            </svg>
          </span>
          <br />
          <span className="text-white">контент с AI</span>
        </h1>

        {/* Subtitle */}
        <p 
          className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed opacity-0 animate-fade-up px-4"
          style={{ animationDelay: '600ms' }}
        >
          Фото и видео студийного качества за секунды.
          <span className="hidden sm:inline"><br /></span>
          <span className="sm:hidden"> </span>
          Nano Banana Pro • Veo 3.1 • Kling • Sora
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 opacity-0 animate-fade-up px-4"
          style={{ animationDelay: '800ms' }}
        >
          <Button 
            asChild
            size="lg" 
            className="relative group bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-bold text-base h-12 sm:h-14 px-8 sm:px-10 rounded-xl overflow-hidden w-full sm:w-auto"
          >
            <Link href="/create">
              <span className="relative z-10 flex items-center justify-center gap-2">
                Начать создавать
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#00D9FF] to-[#00B4D8] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>
          
          <Button 
            asChild
            size="lg" 
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 h-12 sm:h-14 px-8 sm:px-10 rounded-xl backdrop-blur-sm w-full sm:w-auto"
          >
            <Link href="/inspiration" className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Смотреть примеры
            </Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div 
          className="flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/40 opacity-0 animate-fade-up px-4"
          style={{ animationDelay: '1000ms' }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
            <span>50⭐ бесплатно</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
            <span>Telegram</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
            <span>Без карты</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/30" />
      </div>
    </section>
  );
}

// ===== FREE NANO BANANA HIGHLIGHT =====
function FreeBananaHighlight() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/10 via-transparent to-[#22C55E]/10" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-[#22C55E]/10 to-[#00D9FF]/10 border border-[#22C55E]/20 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#22C55E]/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00D9FF]/10 rounded-full blur-[60px]" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg shadow-[#22C55E]/30">
                  <Crown className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/20 text-[#22C55E] text-xs font-bold mb-3">
                  <Gift className="w-3 h-3" />
                  ЭКСКЛЮЗИВ
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Nano Banana Pro — бесплатно! 🍌
                </h3>
                <p className="text-white/60 mb-4 max-w-xl">
                  В тарифах Creator+ и Business — безлимитные генерации на Nano Banana Pro без траты звёзд. 
                  Премиум качество фото включено в подписку!
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-[#22C55E]" />
                    <span>Безлимит 1-2K фото</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-[#22C55E]" />
                    <span>Премиум качество</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-[#22C55E]" />
                    <span>Без траты ⭐</span>
                  </div>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex-shrink-0">
                <Button 
                  asChild
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold px-6 h-12 rounded-xl"
                >
                  <Link href="/pricing">
                    Смотреть тарифы
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== FEATURES SECTION =====
function Features() {
  const features = [
    {
      icon: ImageIcon,
      title: 'Фото',
      description: 'Портреты, продукты, арт — студийное качество',
      gradient: 'from-[#00D9FF] to-[#0EA5E9]',
    },
    {
      icon: Video,
      title: 'Видео',
      description: 'Reels, промо — кинематографичный результат',
      gradient: 'from-[#A78BFA] to-[#8B5CF6]',
    },
    {
      icon: Wand2,
      title: 'Эффекты',
      description: 'Трансформации, переходы, магия',
      gradient: 'from-[#EC4899] to-[#DB2777]',
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A] to-[#0A0A0A]" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Всё для контента
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto">
            Один инструмент вместо десятка сервисов
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="group relative p-5 sm:p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-300 active:scale-[0.98] sm:hover:translate-y-[-4px]"
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-[1px] mb-4 sm:mb-6`}>
                <div className="w-full h-full rounded-xl bg-[#0A0A0A] flex items-center justify-center">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">
                {feature.title}
              </h3>
              <p className="text-white/50 text-xs sm:text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== ANIMATED STATS SECTION =====
function AnimatedStats() {
  const users = useAnimatedCounter(1000, 2000);
  const generations = useAnimatedCounter(5000, 2500);
  const models = useAnimatedCounter(10, 1500);
  const satisfaction = useAnimatedCounter(98, 2000);

  return (
    <section className="py-12 sm:py-16 md:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#00D9FF]/5 via-transparent to-[#A78BFA]/5" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
          <div className="text-center p-3 sm:p-4 rounded-xl bg-white/[0.02]" ref={users.ref}>
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D9FF] mx-auto mb-2 sm:mb-3" />
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1">
              {users.count.toLocaleString()}+
            </div>
            <div className="text-xs sm:text-sm text-white/40">пользователей</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 rounded-xl bg-white/[0.02]" ref={generations.ref}>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#A78BFA] mx-auto mb-2 sm:mb-3" />
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1">
              {generations.count.toLocaleString()}+
            </div>
            <div className="text-xs sm:text-sm text-white/40">генераций</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 rounded-xl bg-white/[0.02]" ref={models.ref}>
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#EC4899] mx-auto mb-2 sm:mb-3" />
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1">
              {models.count}+
            </div>
            <div className="text-xs sm:text-sm text-white/40">AI моделей</div>
          </div>
          
          <div className="text-center p-3 sm:p-4 rounded-xl bg-white/[0.02]" ref={satisfaction.ref}>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#22C55E] mx-auto mb-2 sm:mb-3" />
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-0.5 sm:mb-1">
              {satisfaction.count}%
            </div>
            <div className="text-xs sm:text-sm text-white/40">довольных</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== MODELS SHOWCASE =====
function ModelsShowcase() {
  const models = [
    { name: 'Nano Banana Pro', type: 'Фото', badge: 'Бесплатно', color: '#22C55E', free: true },
    { name: 'Veo 3.1', type: 'Видео', badge: 'Google', color: '#A78BFA', free: false },
    { name: 'Kling 2.6', type: 'Видео', badge: 'Trending', color: '#EC4899', free: false },
    { name: 'Sora Pro', type: 'Видео', badge: 'OpenAI', color: '#00D9FF', free: false },
    { name: 'Seedance', type: 'Видео', badge: 'Fast', color: '#F59E0B', free: false },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.08),transparent_70%)]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Топовые модели мира
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto">
            Выбирайте лучшее для каждой задачи
          </p>
        </div>

        {/* Scrolling models */}
        <div className="relative -mx-4 sm:mx-0">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory px-4 sm:px-0">
            {models.map((model, i) => (
              <div 
                key={i}
                className={`flex-shrink-0 w-44 sm:w-56 md:w-64 p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl snap-start transition-all group ${
                  model.free 
                    ? 'bg-gradient-to-br from-[#22C55E]/10 to-[#22C55E]/5 border-2 border-[#22C55E]/30 active:border-[#22C55E]/50' 
                    : 'bg-white/[0.03] border border-white/[0.06] active:border-white/20'
                }`}
              >
                <div 
                  className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full inline-block mb-2 sm:mb-4"
                  style={{ backgroundColor: `${model.color}20`, color: model.color }}
                >
                  {model.badge}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 sm:mb-1">{model.name}</h3>
                <p className="text-white/40 text-xs sm:text-sm">{model.type}</p>
                {model.free && (
                  <div className="mt-2 sm:mt-3 flex items-center gap-1 text-[#22C55E] text-[10px] sm:text-xs font-medium">
                    <Gift className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>В подписке</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== REFERRAL BANNER =====
function ReferralBanner() {
  return (
    <section className="py-12 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-r from-[#A78BFA]/10 to-[#EC4899]/10 border border-[#A78BFA]/20 overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A78BFA]/20 rounded-full blur-[40px]" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#EC4899] flex items-center justify-center">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Приглашай друзей — получай звёзды!
                  </h3>
                  <p className="text-white/60 text-sm">
                    50⭐ за каждого друга, который зарегистрируется по вашей ссылке
                  </p>
                </div>
              </div>
              
              <Button 
                asChild
                className="bg-gradient-to-r from-[#A78BFA] to-[#EC4899] hover:opacity-90 text-white font-bold px-6 h-12 rounded-xl flex-shrink-0"
              >
                <Link href="/profile">
                  Моя реферальная ссылка
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== GALLERY SECTION =====
function GallerySection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Галерея работ
          </h2>
          <p className="text-white/50 max-w-lg mx-auto">
            Нажмите на любой пример — откроется генератор с теми же настройками
          </p>
        </div>
      </div>
      <EffectsGallery />
    </section>
  );
}

// ===== HOW IT WORKS =====
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Выберите', desc: 'Модель или пример' },
    { num: '02', title: 'Опишите', desc: 'Что хотите создать' },
    { num: '03', title: 'Получите', desc: 'Результат за секунды' },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Три шага до результата
          </h2>
        </div>

        <div className="flex flex-row items-start justify-center gap-2 sm:gap-4 md:gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2 sm:gap-4 flex-1">
              {i > 0 && (
                <div className="hidden md:block absolute w-16 h-px bg-gradient-to-r from-white/20 to-white/5" />
              )}
              <div className="text-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-br from-white/20 to-white/5 bg-clip-text text-transparent mb-1 sm:mb-2">
                  {step.num}
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-0.5 sm:mb-1">{step.title}</h3>
                <p className="text-white/40 text-[10px] sm:text-xs md:text-sm">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== FAQ SECTION =====
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Как начать пользоваться LensRoom?',
      answer: 'Зарегистрируйтесь через Telegram за 5 секунд и получите 50 бесплатных звёзд. После этого можете сразу создавать фото и видео.',
    },
    {
      question: 'Что такое звёзды (⭐)?',
      answer: 'Звёзды — это внутренняя валюта LensRoom. Каждая генерация стоит определённое количество звёзд. Вы видите цену до генерации.',
    },
    {
      question: 'Nano Banana Pro бесплатно?',
      answer: 'Да! В тарифах Creator+ и Business — безлимитные генерации 1-2K фото без траты звёзд.',
    },
    {
      question: 'Какие видео-модели есть?',
      answer: 'Veo 3.1 (Google), Kling 2.6, Sora Pro (OpenAI), Seedance — от кинематографичности до скорости.',
    },
    {
      question: 'Мои генерации приватны?',
      answer: 'Да! Все результаты видны только вам. Мы не используем ваши работы для обучения.',
    },
    {
      question: 'Можно использовать коммерчески?',
      answer: 'Да, все сгенерированные изображения и видео принадлежат вам — для e-commerce, рекламы и соцсетей.',
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
            <span className="text-xs sm:text-sm text-white/80">FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
            Частые вопросы
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto">
            Не нашли ответ? Напишите в Telegram
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3 md:space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left active:bg-white/[0.04] sm:hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-semibold text-white text-sm sm:text-base pr-3 sm:pr-4">{faq.question}</span>
                <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}>
                  {openIndex === i ? (
                    <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00D9FF]" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                  )}
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === i ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 text-white/60 text-sm sm:text-base leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== FINAL CTA =====
function FinalCTA() {
  return (
    <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.15),transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-[#00D9FF]/10 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
            Готовы создавать?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/50 mb-6 sm:mb-8 md:mb-10 px-4">
            Получите 50⭐ бесплатно и создайте первый контент
          </p>
          
          <Button 
            asChild
            size="lg" 
            className="relative group bg-white hover:bg-white/90 text-black font-bold text-base sm:text-lg h-12 sm:h-14 md:h-16 px-8 sm:px-10 md:px-14 rounded-xl sm:rounded-2xl w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
          >
            <Link href="/create">
              <span className="flex items-center justify-center gap-2 sm:gap-3">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                Начать бесплатно
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </Button>

          <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-white/30">
            Вход через Telegram • Без карты
          </p>
        </div>
      </div>
    </section>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  return (
    <main className="bg-[#0A0A0A] text-white min-h-screen overflow-x-hidden">
      <WelcomePopup />
      <Hero />
      <FreeBananaHighlight />
      <Features />
      <AnimatedStats />
      <ModelsShowcase />
      <ReferralBanner />
      <GallerySection />
      <HowItWorks />
      <FAQSection />
      <FinalCTA />
    </main>
  );
}
