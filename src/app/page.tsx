'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Video, Image as ImageIcon, Mic, ArrowRight, 
  Brain, Palette, Music, Star, Users, TrendingUp, Check,
  ChevronDown, ChevronUp, Send, Gift, Rocket, Target, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // AI Examples для галереи
  const aiExamples = [
    { 
      title: 'AI Portrait', 
      subtitle: 'Cozy Vibes', 
      type: 'AI Generated', 
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop',
      gradient: 'from-purple-500 to-pink-500',
    },
    { 
      title: 'AI Family', 
      subtitle: 'Winter Joy', 
      type: 'AI Generated', 
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=500&fit=crop',
      gradient: 'from-cyan-500 to-blue-500',
    },
    { 
      title: 'AI Video', 
      subtitle: 'Motion', 
      type: 'AI Video', 
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=500&fit=crop',
      gradient: 'from-pink-500 to-red-500',
    },
    { 
      title: 'AI Beauty', 
      subtitle: 'Editorial', 
      type: 'AI Generated', 
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop',
      gradient: 'from-orange-500 to-pink-500',
    },
  ];

  // Топовые модели
  const topModels = [
    { name: 'Nano Banana Pro', type: 'Фото', badge: 'Бесплатно', badgeColor: 'bg-green-500', icon: ImageIcon },
    { name: 'Veo 3.1', type: 'Видео', badge: 'Google', badgeColor: 'bg-blue-500', icon: Video },
    { name: 'Kling 2.6', type: 'Видео', badge: 'Trending', badgeColor: 'bg-purple-500', icon: TrendingUp },
    { name: 'Sora Pro', type: 'Видео', badge: 'OpenAI', badgeColor: 'bg-cyan-500', icon: Sparkles },
    { name: 'Seedance', type: 'Видео', badge: 'Fast', badgeColor: 'bg-pink-500', icon: Zap },
  ];

  // FAQ
  const faqs = [
    {
      question: 'Как начать работу?',
      answer: 'Зарегистрируйтесь через Telegram, получите 50⭐ бесплатно и начните создавать контент прямо сейчас. Карта не требуется!'
    },
    {
      question: 'Что такое звёзды (⭐)?',
      answer: 'Звёзды — внутренняя валюта LensRoom. 1⭐ = 1 рубль. Используйте звёзды для генерации контента любыми AI моделями.'
    },
    {
      question: 'Почему Nano Banana Pro бесплатно?',
      answer: 'В тарифах Creator+ и Business вы получаете безлимитные генерации Nano Banana Pro без траты звёзд. Это наш эксклюзив!'
    },
    {
      question: 'Какие видео-модели доступны?',
      answer: 'У нас 10+ моделей: Veo 3.1, Kling 2.6, Sora 2 Pro, WAN 2.6, Seedance и другие топовые модели со всего мира.'
    },
    {
      question: 'Безопасны ли мои данные?',
      answer: 'Да! Мы не храним ваши промпты и генерации дольше необходимого. Все данные защищены и доступны только вам.'
    },
    {
      question: 'Можно использовать для коммерции?',
      answer: 'Да! Весь контент, созданный в LensRoom, принадлежит вам и может использоваться в коммерческих целях без ограничений.'
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      
      {/* Hero Section - Freepik Style Dark */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-24 pb-20 bg-[var(--bg)]">
        
        <div className="container mx-auto px-6 relative z-10">
          
          {/* Floating Images */}
          <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden">
            {/* Top Left */}
            <motion.div
              initial={{ opacity: 0, x: -100, y: -50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="absolute top-10 left-10 w-56 h-72 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto hover:scale-105 transition-transform cursor-pointer border border-[var(--border)]/10"
            >
              <Image 
                src={aiExamples[0].image} 
                alt={aiExamples[0].title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/90 text-[var(--text)] font-medium w-fit mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {aiExamples[0].type}
                </div>
                <h4 className="font-semibold text-[var(--text)] text-sm">{aiExamples[0].title}</h4>
              </div>
            </motion.div>

            {/* Top Right */}
            <motion.div
              initial={{ opacity: 0, x: 100, y: -50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="absolute top-10 right-10 w-56 h-72 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto hover:scale-105 transition-transform cursor-pointer border border-[var(--border)]/10"
            >
              <Image 
                src={aiExamples[1].image} 
                alt={aiExamples[1].title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/90 text-[var(--text)] font-medium w-fit mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {aiExamples[1].type}
                </div>
                <h4 className="font-semibold text-[var(--text)] text-sm">{aiExamples[1].title}</h4>
              </div>
            </motion.div>

            {/* Bottom Left */}
            <motion.div
              initial={{ opacity: 0, x: -100, y: 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="absolute bottom-32 left-10 w-56 h-72 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto hover:scale-105 transition-transform cursor-pointer border border-[var(--border)]/10"
            >
              <Image 
                src={aiExamples[2].image} 
                alt={aiExamples[2].title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <div className="text-xs px-2.5 py-1 rounded-full bg-pink-500 text-[var(--text)] font-medium w-fit flex items-center gap-1.5">
                  <Play className="w-3 h-3 fill-white" />
                  {aiExamples[2].type}
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <h4 className="font-semibold text-[var(--text)] text-sm">{aiExamples[2].title}</h4>
              </div>
            </motion.div>

            {/* Bottom Right */}
            <motion.div
              initial={{ opacity: 0, x: 100, y: 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute bottom-32 right-10 w-56 h-72 rounded-3xl overflow-hidden shadow-2xl pointer-events-auto hover:scale-105 transition-transform cursor-pointer border border-[var(--border)]/10"
            >
              <Image 
                src={aiExamples[3].image} 
                alt={aiExamples[3].title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/90 text-[var(--text)] font-medium w-fit mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {aiExamples[3].type}
                </div>
                <h4 className="font-semibold text-[var(--text)] text-sm">{aiExamples[3].title}</h4>
              </div>
            </motion.div>
          </div>

          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center max-w-5xl mx-auto relative z-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)]/10 backdrop-blur-xl border border-[var(--border)]/20 text-[var(--text)] text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Топовые AI модели в одном месте
            </motion.div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-[var(--text)]">
              Создавайте невероятный
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                контент с AI
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-4 max-w-3xl mx-auto font-normal">
              Фото и видео студийного качества за секунды
            </p>

            {/* Model Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-sm">
              <div className="px-3 py-1.5 rounded-full bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 text-gray-300 font-medium">
                Nano Banana Pro
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 text-gray-300 font-medium">
                Veo 3.1
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 text-gray-300 font-medium">
                Kling
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 text-gray-300 font-medium">
                Sora
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link href="/generator?section=image">
                <Button 
                  size="lg"
                  className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-[var(--text)] px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 transition-all"
                >
                  Начать создавать
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/inspiration">
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-base font-medium rounded-xl bg-[var(--surface)]/5 backdrop-blur-xl border-2 border-[var(--border)]/10 hover:border-[var(--border)]/20 hover:bg-[var(--surface)]/10 text-[var(--text)] transition-all"
                >
                  Смотреть примеры
                </Button>
              </Link>
            </div>

            {/* Info Line */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="font-medium text-yellow-300">50⭐ бесплатно</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Telegram</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-600" />
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-400" />
                <span>Без карты</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Nano Banana Pro Promo */}
      <section className="py-16 bg-gradient-to-br from-yellow-900/10 to-orange-900/10">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto p-8 md:p-10 rounded-3xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10"
          >
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div className="flex-1 min-w-[280px]">
                <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold mb-4">
                  ЭКСКЛЮЗИВ
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text)]">
                  Nano Banana Pro — бесплатно! 🍌
                </h2>
                <p className="text-lg text-gray-300 mb-6 font-normal">
                  В тарифах <span className="text-purple-600 font-semibold">Creator+</span> и{' '}
                  <span className="text-blue-600 font-semibold">Business</span> безлимитные генерации без траты звёзд
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-gray-200">Безлимит 1–2K фото</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-gray-200">Премиум качество</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-gray-200">Без траты ⭐</span>
                  </div>
                </div>

                <Link href="/pricing">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-[var(--text)] px-6 py-5 text-base font-medium rounded-xl shadow-lg"
                  >
                    Смотреть тарифы
                  </Button>
                </Link>
              </div>
              
              <div className="text-8xl opacity-20 select-none">🍌</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-20 bg-[var(--bg)]">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
              Всё для контента
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-normal">
              Один инструмент вместо десятка сервисов
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-6xl mx-auto">
            {[
              {
                icon: Palette,
                title: 'Фото',
                description: '15+ моделей для создания изображений любого стиля',
                color: 'text-purple-600'
              },
              {
                icon: Video,
                title: 'Видео',
                description: '10+ моделей для генерации профессиональных видео',
                color: 'text-blue-600'
              },
              {
                icon: Sparkles,
                title: 'Эффекты',
                description: 'Апскейл, замена фона, стилизация и многое другое',
                color: 'text-pink-600'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-[var(--surface)]/10 backdrop-blur-xl border border-[var(--border)]/20 flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-[var(--text)]">{item.title}</h3>
                <p className="text-gray-400 font-normal">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {[
              { value: '1 000+', label: 'пользователей' },
              { value: '5 000+', label: 'генераций' },
              { value: '10+', label: 'AI моделей' },
              { value: '98%', label: 'довольных' }
            ].map((metric, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10"
              >
                <div className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-400 font-normal">{metric.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Top Models Section */}
      <section className="py-20 bg-gray-950">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
              Топовые модели мира
            </h2>
            <p className="text-xl text-gray-400 font-normal">
              Выбирайте лучшее для каждой задачи
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {topModels.map((model, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-5 rounded-2xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <model.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="font-bold text-base mb-1 text-[var(--text)]">{model.name}</h3>
                <p className="text-sm text-gray-400 mb-3 font-normal">{model.type}</p>
                <div className={`inline-block px-2.5 py-1 rounded-full ${model.badgeColor} text-[var(--text)] text-xs font-semibold`}>
                  {model.badge}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Section */}
      <section className="py-16 bg-[var(--bg)]">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto p-8 md:p-10 rounded-3xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-[var(--border)]/10 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface)]/10 backdrop-blur-xl border border-[var(--border)]/20 flex items-center justify-center mx-auto mb-6">
              <Rocket className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text)]">
              Приглашай друзей — получай звёзды!
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto font-normal">
              50⭐ за каждого друга + 10% от его пополнений навсегда
            </p>
            <Link href="/profile">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-[var(--text)] px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
              >
                Моя реферальная ссылка
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 bg-gray-950">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
              Галерея работ
            </h2>
            <p className="text-xl text-gray-400 mb-6 font-normal">
              Кликните по примеру, чтобы открыть генератор
            </p>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Все', 'Фото', 'Видео', 'Nano Banana', 'Veo', 'Kling'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter.toLowerCase())}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeFilter === filter.toLowerCase()
                      ? 'bg-cyan-500 text-[var(--text)] shadow-md shadow-cyan-500/25'
                      : 'bg-[var(--surface)]/5 backdrop-blur-xl text-gray-300 border border-[var(--border)]/10 hover:border-[var(--border)]/20'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 px-6 rounded-2xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--surface)]/5 border border-[var(--border)]/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-lg text-gray-400 mb-3 font-normal">
              Галерея эффектов пуста
            </p>
            <Link href="/generator?section=image" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Создайте контент в разделе Генератор →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20 bg-[var(--bg)]">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
              Три шага до результата
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                number: '01',
                title: 'Выберите',
                description: 'Модель или пример из галереи',
                icon: Target,
                color: 'from-blue-500 to-cyan-500'
              },
              {
                number: '02',
                title: 'Опишите',
                description: 'Что хотите создать в промпте',
                icon: Sparkles,
                color: 'from-purple-500 to-pink-500'
              },
              {
                number: '03',
                title: 'Получите',
                description: 'Результат за секунды',
                icon: Zap,
                color: 'from-orange-500 to-red-500'
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 flex items-center justify-center">
                    <step.icon className="w-10 h-10 text-cyan-400" />
                  </div>
                  <div className={`absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center font-bold text-[var(--text)] text-sm shadow-lg`}>
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-[var(--text)]">{step.title}</h3>
                <p className="text-gray-400 font-normal">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-950">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
              Частые вопросы
            </h2>
            <p className="text-xl text-gray-400 font-normal">
              Не нашли ответ?{' '}
              <a href="https://t.me/lensroom" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Напишите в Telegram
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
                className="rounded-xl bg-[var(--surface)]/5 backdrop-blur-xl border border-[var(--border)]/10 overflow-hidden hover:border-[var(--border)]/20 transition-all"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-[var(--surface)]/5 transition-colors"
                >
                  <span className="font-semibold text-base text-[var(--text)] pr-4">{faq.question}</span>
                  {openFAQ === i ? (
                    <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-gray-400 leading-relaxed font-normal">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-cyan-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center text-[var(--text)]"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Готовы создавать?
            </h2>

            <p className="text-xl mb-8 opacity-90 font-normal">
              Получите 50⭐ бесплатно при регистрации
            </p>

            <Link href="/generator?section=image">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  className="bg-[var(--btn-primary-bg)] hover:opacity-90 text-[var(--btn-primary-text)] px-10 py-7 text-lg font-semibold rounded-xl shadow-2xl"
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  Начать бесплатно
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
              </motion.div>
            </Link>

            <p className="text-sm mt-6 opacity-75">
              Вход через Telegram • Без карты
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
