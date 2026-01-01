'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Video, Image as ImageIcon, ArrowRight, 
  Play, Star, Users, Check, ChevronDown, ChevronUp, 
  Gift, Rocket, Crown, Wand2, Camera, Film, Music2,
  MousePointer, Layers, Paintbrush, Clapperboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Инструменты как на Higgsfield
  const tools = [
    { 
      name: 'Создать изображение', 
      description: 'AI генерация фото',
      icon: ImageIcon,
      href: '/generator?section=image',
      gradient: 'from-purple-500 to-pink-500',
      badge: 'Популярно'
    },
    { 
      name: 'Создать видео', 
      description: 'AI генерация видео',
      icon: Video,
      href: '/generator?section=video',
      gradient: 'from-cyan-500 to-blue-500',
      badge: 'Новинка'
    },
    { 
      name: 'Nano Banana Pro', 
      description: 'Лучшая 4K модель',
      icon: Sparkles,
      href: '/generator?section=image&model=nano-banana-pro',
      gradient: 'from-yellow-500 to-orange-500',
      badge: 'Безлимит'
    },
    { 
      name: 'Veo 3.1', 
      description: 'Google видео со звуком',
      icon: Film,
      href: '/generator?section=video&model=veo-3.1',
      gradient: 'from-blue-500 to-indigo-500',
      badge: 'Google'
    },
    { 
      name: 'Kling AI', 
      description: 'Кинематографичные видео',
      icon: Clapperboard,
      href: '/generator?section=video&model=kling',
      gradient: 'from-emerald-500 to-cyan-500',
      badge: 'Trending'
    },
    { 
      name: 'Sora 2', 
      description: 'OpenAI видео модель',
      icon: Wand2,
      href: '/generator?section=video&model=sora-2',
      gradient: 'from-rose-500 to-pink-500',
      badge: 'OpenAI'
    },
  ];

  // Модели изображений
  const imageModels = [
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', badge: 'Безлимит', badgeColor: 'bg-green-500', description: '4K фото высшего качества', cost: 35 },
    { id: 'gpt-image', name: 'GPT Image', badge: 'Новинка', badgeColor: 'bg-blue-500', description: 'Точная цветопередача', cost: 42 },
    { id: 'flux-2-pro', name: 'FLUX.2 Pro', badge: 'Быстро', badgeColor: 'bg-purple-500', description: 'Высокая детализация', cost: 10 },
    { id: 'midjourney', name: 'Midjourney V7', badge: 'Pro', badgeColor: 'bg-orange-500', description: 'Художественные стили', cost: 50 },
    { id: 'seedream-4.5', name: 'Seedream 4.5', badge: 'Новинка', badgeColor: 'bg-cyan-500', description: '4K нового поколения', cost: 11 },
  ];

  // Модели видео
  const videoModels = [
    { id: 'veo-3.1', name: 'Veo 3.1', badge: 'Google', badgeColor: 'bg-blue-500', description: 'Видео со звуком', cost: 260 },
    { id: 'kling', name: 'Kling AI', badge: 'Trending', badgeColor: 'bg-emerald-500', description: 'Кинематограф', cost: 105 },
    { id: 'sora-2-pro', name: 'Sora 2 Pro', badge: 'OpenAI', badgeColor: 'bg-rose-500', description: '1080p качество', cost: 650 },
    { id: 'wan', name: 'WAN AI', badge: 'Новинка', badgeColor: 'bg-purple-500', description: 'До 15 секунд', cost: 217 },
    { id: 'kling-o1', name: 'Kling O1', badge: 'FAL.ai', badgeColor: 'bg-pink-500', description: 'First → Last Frame', cost: 56 },
  ];

  // Примеры работ
  const showcaseItems = [
    { image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop', title: 'AI Portrait', model: 'Nano Banana Pro', type: 'image' },
    { image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop', title: 'Cinematic', model: 'Veo 3.1', type: 'video' },
    { image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop', title: 'Fashion', model: 'Midjourney', type: 'image' },
    { image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop', title: 'Editorial', model: 'FLUX.2 Pro', type: 'image' },
    { image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop', title: 'Beauty', model: 'Nano Banana Pro', type: 'image' },
    { image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop', title: 'Lifestyle', model: 'Kling AI', type: 'video' },
  ];

  // FAQ
  const faqs = [
    { question: 'Как начать работу?', answer: 'Войдите через Telegram и получите 50⭐ бесплатно. Никакой карты не нужно!' },
    { question: 'Что такое звёзды (⭐)?', answer: 'Звёзды — внутренняя валюта. 1⭐ ≈ 1₽. Используйте для генерации контента.' },
    { question: 'Почему Nano Banana Pro бесплатно?', answer: 'В тарифах Creator+ и Business — безлимитные генерации без траты звёзд!' },
    { question: 'Какие модели доступны?', answer: '25+ моделей: Veo 3.1, Kling 2.6, Sora 2, WAN, Midjourney, FLUX и другие.' },
    { question: 'Данные безопасны?', answer: 'Да! Мы не храним промпты и генерации. Всё защищено и принадлежит вам.' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
      
      {/* ===== HERO SECTION - Higgsfield Style ===== */}
      <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-[var(--bg)] to-cyan-900/20" />
        
        {/* Animated Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              x: [0, 100, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              x: [0, -100, 0], 
              y: [0, 50, 0],
              scale: [1, 1.3, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          />
        </div>

        {/* Floating Preview Cards - Like Higgsfield */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Left cards */}
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -12 }}
            animate={{ opacity: 1, x: 0, rotate: -12 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="absolute top-[15%] left-[5%] w-44 h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto hover:scale-105 transition-transform hidden lg:block"
          >
            <Image src={showcaseItems[0].image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500 rounded-full font-medium">AI Generated</span>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: 6 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute bottom-[20%] left-[8%] w-40 h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto hover:scale-105 transition-transform hidden lg:block"
          >
            <Image src={showcaseItems[2].image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-[10px] px-2 py-0.5 bg-pink-500 rounded-full font-medium flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-white" />AI Video
              </span>
            </div>
          </motion.div>

          {/* Right cards */}
          <motion.div
            initial={{ opacity: 0, x: 100, rotate: 12 }}
            animate={{ opacity: 1, x: 0, rotate: 12 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="absolute top-[18%] right-[5%] w-44 h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto hover:scale-105 transition-transform hidden lg:block"
          >
            <Image src={showcaseItems[1].image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-[10px] px-2 py-0.5 bg-purple-500 rounded-full font-medium">Cinematic</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 100, rotate: -8 }}
            animate={{ opacity: 1, x: 0, rotate: -8 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="absolute bottom-[22%] right-[8%] w-40 h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto hover:scale-105 transition-transform hidden lg:block"
          >
            <Image src={showcaseItems[3].image} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500 rounded-full font-medium">Editorial</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-6 relative z-10 text-center pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-8"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-300">25+ AI моделей • Работает сейчас</span>
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="text-[var(--text)]">Что создадите</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                сегодня?
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto font-light">
              Фото и видео студийного качества с лучшими AI моделями мира
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/generator?section=image">
                <Button 
                  size="lg"
                  className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-8 py-6 text-base font-semibold rounded-xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-all"
                >
                  Начать создавать
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/inspiration">
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-base font-medium rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Смотреть примеры
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="font-medium text-yellow-300">50⭐ бесплатно</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Без карты</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>1000+ создателей</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
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

      {/* ===== TOOLS SECTION - Like Higgsfield "What will you create" ===== */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Инструменты для{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                создателей
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Всё для создания контента в одном месте
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={tool.href}>
                  <div className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer h-full">
                    {/* Badge */}
                    {tool.badge && (
                      <span className={`absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${tool.gradient} text-white font-medium`}>
                        {tool.badge}
                      </span>
                    )}
                    
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <tool.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="font-semibold text-sm mb-1 text-[var(--text)]">{tool.name}</h3>
                    <p className="text-xs text-gray-500">{tool.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SHOWCASE GALLERY ===== */}
      <section className="py-24 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Создано в{' '}
              <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                LensRoom
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Вдохновляйтесь работами сообщества
            </p>
          </motion.div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {showcaseItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
              >
                <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="font-semibold text-sm text-white">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.model}</p>
                </div>
                {item.type === 'video' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/inspiration">
              <Button variant="outline" className="border-white/20 hover:bg-white/10">
                Смотреть все работы
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== MODELS SECTION ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          {/* Image Models */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-white" />
                  </div>
                  Фото модели
                </h3>
              </div>
              <Link href="/generator?section=image" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                Все модели <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {imageModels.map((model, i) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=image&model=${model.id}`}>
                    <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${model.badgeColor} text-white font-medium`}>
                          {model.badge}
                        </span>
                        <span className="text-xs text-gray-500">{model.cost}⭐</span>
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-[var(--text)] group-hover:text-purple-400 transition-colors">{model.name}</h4>
                      <p className="text-xs text-gray-500">{model.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Video Models */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  Видео модели
                </h3>
              </div>
              <Link href="/generator?section=video" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                Все модели <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {videoModels.map((model, i) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/generator?section=video&model=${model.id}`}>
                    <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${model.badgeColor} text-white font-medium`}>
                          {model.badge}
                        </span>
                        <span className="text-xs text-gray-500">{model.cost}⭐</span>
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-[var(--text)] group-hover:text-cyan-400 transition-colors">{model.name}</h4>
                      <p className="text-xs text-gray-500">{model.description}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== NANO BANANA PROMO ===== */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent border border-yellow-500/20 p-8 md:p-12"
          >
            <div className="absolute top-0 right-0 text-[200px] leading-none opacity-10 select-none pointer-events-none">
              🍌
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold mb-4">
                ЭКСКЛЮЗИВ
              </span>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Nano Banana Pro{' '}
                <span className="text-yellow-400">бесплатно</span>
              </h2>
              
              <p className="text-lg text-gray-300 mb-6">
                В тарифах Creator+ и Business — безлимитные генерации 4K фото без траты звёзд
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                {['Безлимит 4K', 'Премиум качество', 'Без траты ⭐'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>
              
              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold px-6 py-5">
                  Смотреть тарифы
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-24 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Почему{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                LensRoom
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Sparkles, title: '25+ моделей', description: 'Лучшие AI модели мира в одном месте', color: 'from-purple-500 to-pink-500' },
              { icon: Zap, title: 'Быстро', description: 'Результат за секунды, а не минуты', color: 'from-yellow-500 to-orange-500' },
              { icon: Crown, title: 'Безлимит', description: 'Nano Banana Pro бесплатно в подписках', color: 'from-cyan-500 to-blue-500' },
              { icon: Rocket, title: 'Простота', description: 'Вход через Telegram, без карты', color: 'from-emerald-500 to-cyan-500' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-[var(--text)]">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-16">
            {[
              { value: '1,000+', label: 'создателей' },
              { value: '5,000+', label: 'генераций' },
              { value: '25+', label: 'моделей' },
              { value: '98%', label: 'довольных' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6"
              >
                <div className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Частые вопросы
            </h2>
            <p className="text-gray-400">
              Не нашли ответ?{' '}
              <a href="https://t.me/lensroom" target="_blank" className="text-cyan-400 hover:underline">
                Напишите нам
              </a>
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-[var(--text)]">{faq.question}</span>
                  {openFAQ === i ? (
                    <ChevronUp className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <AnimatePresence>
                  {openFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-gray-400">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-purple-900/30 to-pink-900/30" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Готовы{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                создавать
              </span>
              ?
            </h2>
            
            <p className="text-xl text-gray-300 mb-8">
              Получите 50⭐ бесплатно при регистрации
            </p>
            
            <Link href="/generator?section=image">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-10 py-7 text-lg font-semibold rounded-xl shadow-2xl shadow-purple-500/30"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Начать бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <p className="text-sm text-gray-500 mt-6">
              Вход через Telegram • Без карты • Коммерческое использование
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
