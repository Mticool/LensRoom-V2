'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Video, Image as ImageIcon, ArrowRight, 
  Play, Star, Users, Check, ChevronDown, 
  Gift, Rocket, Crown, Wand2, Camera, Film, Music2,
  Shield, Clock, Palette, Target, Heart, 
  MessageCircle, Globe, Award, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Примеры работ с реальными изображениями
const showcaseImages = [
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop', title: 'AI Portrait', model: 'Nano Banana Pro', category: 'portrait' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop', title: 'Cinematic Man', model: 'FLUX.2 Pro', category: 'cinematic' },
  { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop', title: 'Fashion Editorial', model: 'Midjourney', category: 'fashion' },
  { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop', title: 'Studio Portrait', model: 'Nano Banana Pro', category: 'portrait' },
  { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop', title: 'Editorial Light', model: 'GPT Image', category: 'editorial' },
  { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop', title: 'Beauty Close-up', model: 'Nano Banana Pro', category: 'beauty' },
  { url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=800&fit=crop', title: 'Street Style', model: 'FLUX.2 Pro', category: 'lifestyle' },
  { url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop', title: 'Natural Beauty', model: 'Seedream 4.5', category: 'beauty' },
];

// Видео превью
const videoShowcase = [
  { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=400&fit=crop', title: 'Cinematic Scene', model: 'Veo 3.1', duration: '8s' },
  { url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=400&fit=crop', title: 'Film Noir', model: 'Kling AI', duration: '10s' },
  { url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop', title: 'Documentary', model: 'Sora 2 Pro', duration: '15s' },
];

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Авто-переключение отзывов
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Отзывы
  const testimonials = [
    { name: 'Анна К.', role: 'Маркетолог', text: 'Генерирую 50+ фото в день для рекламы. LensRoom сэкономил мне 20 часов в неделю!', avatar: '👩‍💼' },
    { name: 'Максим П.', role: 'Блогер', text: 'Veo 3.1 создаёт видео со звуком за минуту. Мои reels набирают в 3 раза больше просмотров.', avatar: '🎬' },
    { name: 'Екатерина С.', role: 'Дизайнер', text: 'Nano Banana Pro — лучшее качество 4K фото. Клиенты в восторге от результатов.', avatar: '🎨' },
  ];

  // FAQ
  const faqs = [
    { q: 'Как начать работу?', a: 'Войдите через Telegram и получите 50⭐ бесплатно. Никакой карты не нужно!' },
    { q: 'Что такое звёзды (⭐)?', a: 'Звёзды — внутренняя валюта. 1⭐ ≈ 1₽. Используйте для генерации контента.' },
    { q: 'Почему Nano Banana Pro бесплатно?', a: 'В тарифах Creator+ и Business — безлимитные генерации без траты звёзд!' },
    { q: 'Какие модели доступны?', a: '25+ моделей: Veo 3.1, Kling 2.6, Sora 2, WAN, Midjourney, FLUX и другие.' },
    { q: 'Данные безопасны?', a: 'Да! Мы не храним промпты и генерации дольше 24 часов. Всё защищено.' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-[var(--bg)] to-cyan-900/30" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px]" />
        </div>

        {/* Floating Cards - Left */}
        <motion.div
          initial={{ opacity: 0, x: -100, rotate: -15 }}
          animate={{ opacity: 1, x: 0, rotate: -15 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="absolute top-[12%] left-[3%] w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10 hidden xl:block hover:scale-105 transition-transform cursor-pointer"
        >
          <Image src={showcaseImages[0].url} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-xs px-2 py-1 bg-cyan-500 rounded-full font-medium">AI Portrait</span>
            <p className="text-xs text-gray-300 mt-2">Nano Banana Pro</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -100, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 8 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute bottom-[15%] left-[5%] w-40 h-56 rounded-3xl overflow-hidden shadow-2xl border border-white/10 hidden xl:block hover:scale-105 transition-transform cursor-pointer"
        >
          <Image src={showcaseImages[2].url} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className="text-xs px-2 py-1 bg-purple-500 rounded-full font-medium flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-white" /> Video
            </span>
          </div>
        </motion.div>

        {/* Floating Cards - Right */}
        <motion.div
          initial={{ opacity: 0, x: 100, rotate: 15 }}
          animate={{ opacity: 1, x: 0, rotate: 15 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="absolute top-[15%] right-[3%] w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10 hidden xl:block hover:scale-105 transition-transform cursor-pointer"
        >
          <Image src={showcaseImages[1].url} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-xs px-2 py-1 bg-emerald-500 rounded-full font-medium">Cinematic</span>
            <p className="text-xs text-gray-300 mt-2">Veo 3.1</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 100, rotate: -10 }}
          animate={{ opacity: 1, x: 0, rotate: -10 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="absolute bottom-[18%] right-[5%] w-40 h-56 rounded-3xl overflow-hidden shadow-2xl border border-white/10 hidden xl:block hover:scale-105 transition-transform cursor-pointer"
        >
          <Image src={showcaseImages[3].url} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className="text-xs px-2 py-1 bg-pink-500 rounded-full font-medium">4K Quality</span>
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="container mx-auto px-6 relative z-10 text-center pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Live Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-8"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-300">25+ AI моделей • 5000+ генераций сегодня</span>
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.05] tracking-tight">
              <span className="text-[var(--text)]">Создавайте</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                невозможное
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Фото и видео студийного качества за секунды. 
              <br className="hidden sm:block" />
              Лучшие AI модели мира в одном месте.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/generator?section=image">
                <Button 
                  size="lg"
                  className="group relative bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-10 py-7 text-lg font-semibold rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Начать бесплатно
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
              <Link href="#showcase">
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-8 py-7 text-lg font-medium rounded-2xl bg-white/5 border border-white/20 hover:bg-white/10 text-white"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Смотреть примеры
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-yellow-300">50⭐ бесплатно</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Check className="w-5 h-5 text-green-400" />
                <span>Без привязки карты</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Результат за 10 сек</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Shield className="w-5 h-5 text-purple-400" />
                <span>100% приватность</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="py-16 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '25+', label: 'AI моделей', icon: Layers },
              { value: '50K+', label: 'Генераций', icon: Sparkles },
              { value: '2K+', label: 'Пользователей', icon: Users },
              { value: '99%', label: 'Довольных', icon: Heart },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MODELS SHOWCASE ===== */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Топовые{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI модели
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Выбирайте лучшее для каждой задачи
            </p>
          </motion.div>

          {/* Photo Models */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              Фото модели
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'nano-banana-pro', name: 'Nano Banana Pro', desc: '4K фото высшего качества', cost: 35, badge: 'Безлимит', gradient: 'from-yellow-500 to-orange-500' },
                { id: 'gpt-image', name: 'GPT Image', desc: 'Точная цветопередача OpenAI', cost: 42, badge: 'Новинка', gradient: 'from-emerald-500 to-cyan-500' },
                { id: 'flux-2-pro', name: 'FLUX.2 Pro', desc: 'Детализация и резкость', cost: 10, badge: 'Popular', gradient: 'from-purple-500 to-pink-500' },
                { id: 'midjourney', name: 'Midjourney V7', desc: 'Художественные стили', cost: 50, badge: 'Pro', gradient: 'from-orange-500 to-red-500' },
                { id: 'seedream-4.5', name: 'Seedream 4.5', desc: '4K нового поколения', cost: 11, badge: 'Fast', gradient: 'from-cyan-500 to-blue-500' },
                { id: 'z-image', name: 'Z-Image', desc: 'Самый быстрый и дешёвый', cost: 2, badge: 'Эконом', gradient: 'from-gray-500 to-gray-600' },
              ].map((model, i) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=image&model=${model.id}`}>
                    <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${model.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${model.gradient} text-white font-medium`}>
                          {model.badge}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[var(--text)] mb-1">{model.name}</h4>
                      <p className="text-sm text-gray-500 mb-3">{model.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-cyan-400 font-medium">{model.cost}⭐</span>
                        <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Video Models */}
          <div>
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Video className="w-5 h-5 text-cyan-400" />
              Видео модели
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 'veo-3.1', name: 'Veo 3.1', desc: 'Google видео со звуком', cost: 260, badge: 'Google', gradient: 'from-blue-500 to-indigo-500' },
                { id: 'kling', name: 'Kling AI', desc: 'Кинематографичные видео', cost: 105, badge: 'Trending', gradient: 'from-emerald-500 to-cyan-500' },
                { id: 'kling-o1', name: 'Kling O1', desc: 'First → Last Frame', cost: 56, badge: 'FAL.ai', gradient: 'from-pink-500 to-rose-500' },
                { id: 'sora-2', name: 'Sora 2', desc: 'OpenAI баланс качества', cost: 50, badge: 'OpenAI', gradient: 'from-purple-500 to-violet-500' },
                { id: 'sora-2-pro', name: 'Sora 2 Pro', desc: '1080p максимум качества', cost: 650, badge: 'Premium', gradient: 'from-amber-500 to-orange-500' },
                { id: 'wan', name: 'WAN AI', desc: 'До 15 секунд видео', cost: 217, badge: 'Новинка', gradient: 'from-teal-500 to-cyan-500' },
              ].map((model, i) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=video&model=${model.id}`}>
                    <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${model.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Video className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${model.gradient} text-white font-medium`}>
                          {model.badge}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[var(--text)] mb-1">{model.name}</h4>
                      <p className="text-sm text-gray-500 mb-3">{model.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-cyan-400 font-medium">{model.cost}⭐</span>
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

      {/* ===== GALLERY SHOWCASE ===== */}
      <section id="showcase" className="py-24 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Галерея{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                работ
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Вдохновитесь примерами наших пользователей
            </p>
          </motion.div>

          {/* Masonry Gallery */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {showcaseImages.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="mb-4 break-inside-avoid"
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="group relative rounded-2xl overflow-hidden cursor-pointer">
                  <Image 
                    src={item.url} 
                    alt={item.title} 
                    width={400} 
                    height={500} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${hoveredCard === i ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-xs text-gray-300">{item.model}</p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white font-medium">
                      AI Generated
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/generator?section=image">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-8 py-6 rounded-xl">
                Создать своё
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== NANO BANANA PRO PROMO ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent border border-yellow-500/30 p-8 md:p-12"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/20 rounded-full blur-[120px]" />
            
            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 mb-6">
                  <span className="text-2xl">🍌</span>
                  <span className="font-semibold text-yellow-300">ЭКСКЛЮЗИВ</span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text)]">
                  Nano Banana Pro — бесплатно!
                </h2>
                
                <p className="text-lg text-gray-400 mb-6">
                  В тарифах Creator+ и Business — безлимитные генерации 4K фото без траты звёзд!
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    'Безлимит генераций 1-2K фото',
                    'Премиум качество 4K',
                    'Без траты ⭐ звёзд',
                    'Приоритетная очередь',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-semibold px-8 py-6 rounded-xl">
                    Смотреть тарифы
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="relative hidden md:block">
                <div className="aspect-square max-w-sm mx-auto relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-3xl blur-xl" />
                  <div className="relative rounded-3xl overflow-hidden border border-white/10">
                    <Image 
                      src={showcaseImages[5].url}
                      alt="Nano Banana Pro Example"
                      width={400}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-24 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Отзывы{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                пользователей
              </span>
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="text-6xl mb-6">{testimonials[currentTestimonial].avatar}</div>
                <blockquote className="text-2xl md:text-3xl font-light text-[var(--text)] mb-6 leading-relaxed">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>
                <div>
                  <div className="font-semibold text-lg">{testimonials[currentTestimonial].name}</div>
                  <div className="text-gray-500">{testimonials[currentTestimonial].role}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentTestimonial ? 'w-8 bg-cyan-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Три шага до{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                результата
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Выберите', desc: 'Модель или готовый пример из галереи', icon: Target },
              { step: '02', title: 'Опишите', desc: 'Что хотите создать на русском или английском', icon: MessageCircle },
              { step: '03', title: 'Получите', desc: 'Результат студийного качества за секунды', icon: Sparkles },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-2xl" />
                  <div className="relative w-full h-full flex items-center justify-center">
                    <item.icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--text)]">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-24 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Частые{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                вопросы
              </span>
            </h2>
            <p className="text-gray-400">
              Не нашли ответ? <a href="https://t.me/lensroom_support" className="text-cyan-400 hover:underline">Напишите в Telegram</a>
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text)]">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFAQ === i ? 'rotate-180' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {openFAQ === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 text-gray-400 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/30 via-cyan-600/20 to-pink-600/30 border border-white/10 p-12 md:p-16 text-center"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px]" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Готовы создавать?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
                Получите 50⭐ бесплатно и начните генерировать прямо сейчас
              </p>
              
              <Link href="/generator">
                <Button 
                  size="lg"
                  className="bg-white text-black hover:bg-gray-100 px-12 py-7 text-lg font-semibold rounded-2xl shadow-2xl"
                >
                  Начать бесплатно
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Вход через Telegram
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  Без карты
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
