'use client';

import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Shield, 
  Clock,
  Star,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { PHOTO_MODELS, VIDEO_MODELS } from '@/lib/models-config';
import { SUBSCRIPTIONS, REGISTRATION_BONUS } from '@/lib/pricing-config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GallerySection } from '@/components/home/gallery-section';

const HOW_IT_WORKS = [
  { step: '01', title: 'Выберите модель', desc: 'Подберите AI под задачу', icon: Sparkles },
  { step: '02', title: 'Опишите идею', desc: 'Напишите промпт', icon: Zap },
  { step: '03', title: 'Получите результат', desc: 'Скачайте за секунды', icon: ArrowRight },
];

const STATS = [
  { value: '14', label: 'AI моделей', icon: Sparkles },
  { value: '10K+', label: 'генераций', icon: ImageIcon },
  { value: '~30с', label: 'на результат', icon: Clock },
  { value: '99%', label: 'uptime', icon: Shield },
];

const TESTIMONIALS = [
  { name: 'Алексей М.', role: 'Маркетолог', text: 'Генерирую креативы за минуты. ROI вырос в 3 раза.', initials: 'АМ' },
  { name: 'Мария К.', role: 'Дизайнер', text: 'Идеальный инструмент для мудбордов!', initials: 'МК' },
  { name: 'Дмитрий С.', role: 'Контент-мейкер', text: 'Видео для TikTok делаю пачками.', initials: 'ДС' },
];

const FAQ = [
  { q: 'Какие модели доступны?', a: '14 топовых моделей: Midjourney, FLUX, Sora, Veo 3, Kling.' },
  { q: 'Сколько стоит генерация?', a: 'От 3 до 70 кредитов. Есть бесплатный тариф.' },
  { q: 'Коммерческое использование?', a: 'Да, все генерации можно использовать коммерчески.' },
];

const PROMPT_EXAMPLES = [
  'Портрет девушки в неоновом свете',
  'Котик-астронавт на Луне',
  'Минималистичный логотип кофейни',
  'Горный пейзаж на закате',
];

// Gradient cursor component - only renders after hydration
function GradientCursor() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay activation for performance
    const timer = setTimeout(() => setIsVisible(true), 1000);
    
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        setMousePos({ x: e.clientX, y: e.clientY });
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed pointer-events-none z-50 w-[400px] h-[400px] rounded-full opacity-15 blur-[80px] will-change-transform"
      style={{
        background: 'radial-gradient(circle, rgba(200,255,0,0.4) 0%, transparent 70%)',
        transform: `translate(${mousePos.x - 200}px, ${mousePos.y - 200}px)`,
      }}
    />
  );
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [promptPlaceholder, setPromptPlaceholder] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Parallax scroll
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Mount check for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sticky CTA on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Rotating placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptPlaceholder((prev) => (prev + 1) % PROMPT_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Quick generate handler
  const handleQuickGenerate = () => {
    if (quickPrompt.trim()) {
      router.push(`/create?prompt=${encodeURIComponent(quickPrompt)}`);
    } else {
      router.push('/create');
    }
  };

  return (
    <main className="bg-[#0a0a0a] text-white overflow-hidden relative">
      {/* Gradient cursor - loaded after mount */}
      {mounted && <GradientCursor />}

      {/* Sticky CTA */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <Button 
              asChild 
              size="lg" 
              className="text-base px-6 h-12 bg-[#c8ff00] text-black hover:bg-[#b8ef00] rounded-full font-semibold shadow-2xl shadow-[#c8ff00]/20"
            >
              <Link href="/create">
                <Sparkles className="w-4 h-4 mr-2" />
                Начать создавать
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Static grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Gradient orbs - CSS only */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#c8ff00]/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#c8ff00]/5 rounded-full blur-[120px]" />
        
        <motion.div 
          style={{ opacity: mounted ? heroOpacity : 1 }}
          className="container mx-auto px-6 relative z-10 pt-20"
        >
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 mb-10 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8ff00] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c8ff00]" />
              </span>
              <span className="text-sm text-[#c8ff00]">14 AI моделей • Flux, Sora, Midjourney</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.9] animate-fade-in-up">
              <span className="text-white">Создавайте</span>
              <br />
              <span className="text-[#c8ff00]">магию с AI</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-white/40 max-w-2xl mx-auto mb-10 font-light animate-fade-in-up animation-delay-100">
              Фото и видео с помощью лучших нейросетей мира.
              <br className="hidden sm:block" />
              Всё в одном месте.
            </p>

            {/* Quick Start Input */}
            <div className="max-w-2xl mx-auto mb-8 animate-fade-in-up animation-delay-200">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#c8ff00]/20 via-[#c8ff00]/10 to-[#c8ff00]/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-[#c8ff00]/50 transition-colors">
                  <input
                    type="text"
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickGenerate()}
                    placeholder={PROMPT_EXAMPLES[promptPlaceholder]}
                    className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-white/30 focus:outline-none text-lg"
                  />
                  <Button 
                    onClick={handleQuickGenerate}
                    size="lg"
                    className="bg-[#c8ff00] text-black hover:bg-[#b8ef00] rounded-xl px-6 font-semibold"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Создать
                  </Button>
                </div>
              </div>
              <p className="text-xs text-white/20 mt-3">
                Нажмите Enter или кнопку для перехода в генератор
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/30 animate-fade-in animation-delay-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c8ff00]" /> 
                🎁 {REGISTRATION_BONUS} бесплатных кредитов
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c8ff00]" /> 
                Без карты
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#c8ff00]" /> 
                Коммерческое использование
              </span>
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in animation-delay-500">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-bounce" />
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      <GallerySection />

      {/* ===== PHOTO MODELS ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 border border-[#c8ff00]/30 flex items-center justify-center shadow-lg shadow-[#c8ff00]/10">
              <ImageIcon className="w-6 h-6 text-[#c8ff00]" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white">ФОТО МОДЕЛИ</h2>
              <p className="text-white/40">{PHOTO_MODELS.length} моделей для генерации изображений</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PHOTO_MODELS.slice(0, 8).map((model) => (
              <Link key={model.id} href={`/create?model=${model.id}`}>
                <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-[#c8ff00]/50 transition-all duration-300 h-full cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#c8ff00]/0 to-[#c8ff00]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-white text-lg group-hover:text-[#c8ff00] transition-colors">{model.name}</h3>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/20">
                        <span className="text-[#c8ff00] font-bold text-sm">{model.credits}</span>
                        <Sparkles className="w-3 h-3 text-[#c8ff00]" />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {model.quality === 'ultra' && (
                        <span className="text-[10px] px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full font-bold border border-amber-500/20 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />ULTRA
                        </span>
                      )}
                      {model.speed === 'fast' && (
                        <span className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                          <Zap className="w-2.5 h-2.5" />FAST
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-white/40 line-clamp-2 mb-4">{model.description}</p>
                    
                    <div className="flex items-center gap-2 text-[#c8ff00] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">Попробовать</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VIDEO MODELS ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <Video className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white">ВИДЕО МОДЕЛИ</h2>
              <p className="text-white/40">{VIDEO_MODELS.length} моделей для генерации видео</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VIDEO_MODELS.slice(0, 8).map((model) => (
              <Link key={model.id} href={`/create/video?model=${model.id}`}>
                <div className="group relative p-5 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 hover:border-violet-500/50 transition-all duration-300 h-full cursor-pointer overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-violet-500/0 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-white text-lg group-hover:text-violet-400 transition-colors">{model.name}</h3>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                        <span className="text-violet-400 font-bold text-sm">{model.credits}</span>
                        <Sparkles className="w-3 h-3 text-violet-400" />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {model.quality === 'ultra' && (
                        <span className="text-[10px] px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full font-bold border border-amber-500/20 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />ULTRA
                        </span>
                      )}
                      {model.speed === 'fast' && (
                        <span className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                          <Zap className="w-2.5 h-2.5" />FAST
                        </span>
                      )}
                      {model.speed === 'slow' && (
                        <span className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-0.5 border border-blue-500/20">
                          <Clock className="w-2.5 h-2.5" />PRO
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-white/40 line-clamp-2 mb-4">{model.description}</p>
                    
                    <div className="flex items-center gap-2 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">Попробовать</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="rounded-full bg-[#c8ff00] text-black hover:bg-[#b8ef00] font-semibold">
              <Link href="/create">
                Попробовать все модели
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#c8ff00] mb-2">КАК ЭТО РАБОТАЕТ</h2>
            <p className="text-white/40">3 простых шага</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="text-center relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 border border-[#c8ff00]/20 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-[#c8ff00]" />
                </div>
                <div className="text-xs text-[#c8ff00] font-bold mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-white/30 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#c8ff00]/10 flex items-center justify-center mx-auto mb-4 border border-[#c8ff00]/20">
                  <stat.icon className="w-6 h-6 text-[#c8ff00]" />
                </div>
                <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-white/30 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#c8ff00] mb-2">ОТЗЫВЫ</h2>
            <p className="text-white/40">Что говорят пользователи</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#c8ff00] text-[#c8ff00]" />
                  ))}
                </div>
                <p className="text-white/50 mb-4 text-sm">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 border border-[#c8ff00]/20 flex items-center justify-center text-sm font-bold text-[#c8ff00]">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{t.name}</div>
                    <div className="text-xs text-white/30">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#c8ff00] mb-2">ТАРИФЫ</h2>
            <p className="text-white/40">Простые цены</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SUBSCRIPTIONS.map((plan) => (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl relative ${
                  plan.popular 
                    ? 'bg-[#c8ff00]/10 border-2 border-[#c8ff00]/50 scale-105' 
                    : 'bg-white/[0.02] border border-white/10'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#c8ff00] to-yellow-400 text-black text-xs font-bold rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="text-center mb-4 pt-2">
                  <h3 className="font-bold text-white text-xl mb-3">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price.toLocaleString()}</span>
                    <span className="text-white/30">₽/мес</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Sparkles className="w-4 h-4 text-[#c8ff00]" />
                    <span className="text-sm font-semibold text-[#c8ff00]">{plan.credits} ⭐</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 4).map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-[#c8ff00] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild 
                  className={`w-full rounded-full ${
                    plan.popular 
                      ? 'bg-[#c8ff00] text-black hover:bg-[#b8ef00]' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Link href="/pricing">Выбрать {plan.name}</Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/pricing" className="text-[#c8ff00] hover:underline inline-flex items-center gap-1 text-sm font-medium">
              Сравнить все тарифы <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#c8ff00] mb-2">ВОПРОСЫ</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{item.q}</span>
                  <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </div>
                {openFaq === i && (
                  <p className="mt-3 text-white/40 text-sm">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[300px] bg-[#c8ff00]/20 rounded-full blur-[150px]" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl lg:text-7xl font-bold mb-6">
              <span className="text-white">Готовы</span>
              <span className="text-[#c8ff00]"> создавать?</span>
            </h2>
            <p className="text-lg text-white/40 mb-10">
              Присоединяйтесь к тысячам креаторов
            </p>
            <Button asChild size="lg" className="text-lg px-10 h-14 bg-[#c8ff00] text-black hover:bg-[#b8ef00] rounded-full font-semibold">
              <Link href="/create">
                <Sparkles className="w-5 h-5 mr-2" />
                Начать бесплатно
              </Link>
            </Button>
            <p className="text-sm text-white/20 mt-6">
              🎁 {REGISTRATION_BONUS} бесплатных кредитов • Без карты
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
