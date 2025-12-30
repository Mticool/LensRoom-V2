'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Video, Image as ImageIcon, Mic, ArrowRight, 
  Brain, Palette, Music, Star, Users, TrendingUp, Check,
  ChevronDown, ChevronUp, Send, Gift, Rocket, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // AI Examples для карусели
  const aiExamples = [
    { title: 'AI Portrait', subtitle: 'Cozy Vibes', type: 'AI Generated', gradient: 'from-purple-500 to-pink-500' },
    { title: 'AI Art', subtitle: 'Vintage Style', type: 'AI Generated', gradient: 'from-cyan-500 to-blue-500' },
    { title: 'AI Video', subtitle: 'Motion', type: 'AI Video', gradient: 'from-pink-500 to-red-500' },
    { title: 'AI Fashion', subtitle: 'Retro', type: 'AI Generated', gradient: 'from-yellow-500 to-orange-500' },
    { title: 'AI Beauty', subtitle: 'Editorial', type: 'AI Generated', gradient: 'from-green-500 to-teal-500' },
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
    <div className="min-h-screen bg-black text-white overflow-hidden">
      
      {/* Hero Section with Gallery */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-32">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 -left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-0 -right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px]"
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* AI Examples Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide justify-center flex-wrap"
          >
            {aiExamples.map((example, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="flex-shrink-0 w-48 h-64 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 p-4 hover:border-white/30 transition-all cursor-pointer overflow-hidden relative group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${example.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="text-xs px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 w-fit mb-2">
                    {example.type}
                  </div>
                  <h4 className="font-bold text-lg">{example.title}</h4>
                  <p className="text-sm text-gray-400">{example.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center max-w-6xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              Топовые AI модели
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                в одном месте
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-4xl mx-auto">
              Создавайте невероятный контент с AI
            </p>
            
            <p className="text-lg text-gray-400 mb-6">
              Фото и видео студийного качества • Без навыков дизайна
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm">
              <div className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                Nano Banana Pro
              </div>
              <div className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
                Veo 3.1
              </div>
              <div className="px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300">
                Kling
              </div>
              <div className="px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                Sora
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/generator?section=image">
                <Button 
                  size="lg"
                  className="group bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-purple-500/30 hover:scale-105 transition-all"
                >
                  Начать создавать
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <Link href="/inspiration">
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-10 py-7 text-lg rounded-2xl bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10"
                >
                  Смотреть примеры
                </Button>
              </Link>
            </div>

            {/* Info Line */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-yellow-300">50⭐ бесплатно</span>
              </div>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Telegram</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Без карты</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 font-bold text-xs uppercase tracking-wider">
                Эксклюзив
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Nano Banana Pro Promo */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto p-10 md:p-12 rounded-3xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-600/10 border border-yellow-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative z-10">
              <div className="flex items-start justify-between flex-wrap gap-6">
                <div className="flex-1 min-w-[300px]">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4">
                    Nano Banana Pro — бесплатно! 🍌
                  </h2>
                  <p className="text-lg text-gray-300 mb-6">
                    В тарифах <span className="text-purple-400 font-semibold">Creator+</span> и{' '}
                    <span className="text-cyan-400 font-semibold">Business</span> безлимитные генерации 
                    Nano Banana Pro без траты звёзд
                  </p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-200">Безлимит 1–2K фото</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-200">Премиум качество</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-200">Без траты ⭐</span>
                    </div>
                  </div>

                  <Link href="/pricing">
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 px-8 py-6 text-lg rounded-xl"
                    >
                      Смотреть тарифы
                    </Button>
                  </Link>
                </div>
                
                <div className="text-9xl opacity-20">🍌</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Всё для{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                контента
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Один инструмент вместо десятка сервисов
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: Palette,
                title: 'Фото',
                description: '15+ моделей для создания изображений любого стиля',
                gradient: 'from-purple-500/20 to-pink-500/20'
              },
              {
                icon: Video,
                title: 'Видео',
                description: '10+ моделей для генерации профессиональных видео',
                gradient: 'from-cyan-500/20 to-blue-500/20'
              },
              {
                icon: Sparkles,
                title: 'Эффекты',
                description: 'Апскейл, замена фона, стилизация и многое другое',
                gradient: 'from-pink-500/20 to-red-500/20'
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6`}>
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto"
          >
            {[
              { value: '1 000+', label: 'пользователей', icon: Users },
              { value: '5 000+', label: 'генераций', icon: Zap },
              { value: '10+', label: 'AI моделей', icon: Brain },
              { value: '98%', label: 'довольных', icon: Star }
            ].map((metric, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10"
              >
                <metric.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-400">{metric.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Top Models Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Топовые модели{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                мира
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Выбирайте лучшее для каждой задачи
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {topModels.map((model, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="group p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer text-center"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <model.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{model.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{model.type}</p>
                <div className={`inline-block px-3 py-1 rounded-full ${model.badgeColor} text-white text-xs font-semibold`}>
                  {model.badge}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto p-10 md:p-12 rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-500/20 text-center"
          >
            <Rocket className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Приглашай друзей — получай звёзды!
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              50⭐ за каждого друга + 10% от его пополнений навсегда
            </p>
            <Link href="/profile">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 px-8 py-6 text-lg rounded-xl"
              >
                Моя реферальная ссылка
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Галерея{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                работ
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Кликните по примеру, чтобы открыть генератор с этими настройками
            </p>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {['Все', 'Фото', 'Видео', 'Nano Banana', 'Veo', 'Kling'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter.toLowerCase())}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeFilter === filter.toLowerCase()
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
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
            className="text-center py-20 px-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
          >
            <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-4">
              Галерея эффектов пуста
            </p>
            <Link href="/generator?section=image" className="text-purple-400 hover:text-purple-300 transition-colors">
              Создайте контент в разделе Генератор →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Три шага до{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                результата
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {[
              {
                number: '01',
                title: 'Выберите',
                description: 'Модель или пример из галереи',
                icon: Target
              },
              {
                number: '02',
                title: 'Опишите',
                description: 'Что хотите создать в промпте',
                icon: Sparkles
              },
              {
                number: '03',
                title: 'Получите',
                description: 'Результат за секунды',
                icon: Zap
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="text-center"
              >
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center backdrop-blur-xl border border-white/10">
                    <step.icon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-lg">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-lg">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              Частые{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                вопросы
              </span>
            </h2>
            <p className="text-xl text-gray-400">
              Не нашли ответ?{' '}
              <a href="https://t.me/lensroom" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                Напишите в Telegram
              </a>
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  {openFAQ === i ? (
                    <ChevronUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-gray-400 leading-relaxed">
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
      <section className="py-32 relative">
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center relative"
          >
            {/* Glow Effect */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-[100px]"
            />

            <div className="relative z-10">
              <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Готовы{' '}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  создавать?
                </span>
              </h2>

              <p className="text-xl text-gray-300 mb-8">
                Получите 50⭐ бесплатно при регистрации
              </p>

              <Link href="/generator?section=image">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg"
                    className="group bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 px-12 py-8 text-xl rounded-2xl shadow-2xl shadow-purple-500/30"
                  >
                    <Sparkles className="w-6 h-6 mr-3" />
                    Начать бесплатно
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </motion.div>
              </Link>

              <p className="text-sm text-gray-500 mt-6">
                Вход через Telegram • Без карты
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
