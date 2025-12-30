'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Video, Image as ImageIcon, Mic, ArrowRight, Brain, Palette, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const features = [
    {
      icon: Palette,
      title: 'Дизайн',
      description: 'Создавайте фотореалистичные изображения с помощью передовых AI моделей',
      gradient: 'from-purple-500/20 to-pink-500/20',
      glowColor: 'shadow-purple-500/50',
      href: '/generator?section=image',
      models: '15+ моделей'
    },
    {
      icon: Video,
      title: 'Видео',
      description: 'Генерируйте профессиональные видео из текста или изображений',
      gradient: 'from-cyan-500/20 to-blue-500/20',
      glowColor: 'shadow-cyan-500/50',
      href: '/generator?section=video',
      models: '10+ моделей'
    },
    {
      icon: Music,
      title: 'Аудио',
      description: 'Синтезируйте естественную речь и создавайте музыку',
      gradient: 'from-pink-500/20 to-red-500/20',
      glowColor: 'shadow-pink-500/50',
      href: '/generator?section=audio',
      models: '5+ моделей'
    }
  ];

  const capabilities = [
    { icon: Brain, label: '50+ AI моделей', description: 'Лучшие модели со всего мира' },
    { icon: Zap, label: 'Мгновенная генерация', description: 'Результаты за секунды' },
    { icon: Sparkles, label: 'Высокое качество', description: 'До 8K разрешения' },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 -left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-0 -right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 100, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-[120px]"
          />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-8 hover:bg-white/10 transition-all cursor-default"
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-sm font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Powered by 50+ AI Models
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-6xl md:text-8xl font-bold mb-8 leading-[1.1]"
            >
              Создавайте с{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                  AI
                </span>
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-400 blur-2xl"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Генерируйте изображения, видео и аудио с помощью передовых нейросетей. 
              Превратите идеи в реальность за секунды.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
            >
              <Link href="/generator?section=image">
                <Button 
                  size="lg"
                  className="group relative bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-purple-500/50"
                >
                  <span className="relative z-10 flex items-center">
                    Начать создавать
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                  </span>
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl blur-xl opacity-50"
                  />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button 
                  size="lg"
                  variant="outline"
                  className="px-10 py-7 text-lg rounded-2xl bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  Посмотреть тарифы
                </Button>
              </Link>
            </motion.div>

            {/* Capabilities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              {capabilities.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <item.icon className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="font-semibold text-white mb-1">{item.label}</div>
                    <div className="text-sm text-gray-400">{item.description}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Всё что вам{' '}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                нужно
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Мощные инструменты для создания контента нового поколения
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
              >
                <Link href={feature.href}>
                  <div className="group relative h-full">
                    {/* Card */}
                    <div className="relative p-10 rounded-3xl bg-black border border-white/10 hover:border-white/20 transition-all duration-500 h-full backdrop-blur-xl overflow-hidden">
                      {/* Gradient Background */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                        initial={false}
                      />
                      
                      {/* Glow Effect */}
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0, 0.3, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className={`absolute -inset-4 bg-gradient-to-br ${feature.gradient} blur-3xl opacity-0 group-hover:opacity-20`}
                      />

                      <div className="relative z-10">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl flex items-center justify-center mb-8 group-hover:shadow-2xl group-hover:shadow-purple-500/20 transition-all border border-white/10"
                        >
                          <feature.icon className="w-10 h-10 text-white" />
                        </motion.div>

                        {/* Badge */}
                        <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 mb-4">
                          {feature.models}
                        </div>

                        {/* Content */}
                        <h3 className="text-3xl font-bold mb-4 group-hover:text-white transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed mb-6 group-hover:text-gray-300 transition-colors">
                          {feature.description}
                        </p>

                        {/* Arrow */}
                        <div className="flex items-center gap-2 text-purple-400 font-medium group-hover:gap-3 transition-all">
                          <span>Попробовать</span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
        
        <div className="container mx-auto px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto text-center relative"
          >
            {/* Glow Effect */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 blur-[100px]"
            />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-8"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Начните бесплатно</span>
              </motion.div>

              <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                Готовы создавать
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  что-то удивительное?
                </span>
              </h2>

              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                Присоединяйтесь к тысячам создателей, которые уже используют LensRoom
              </p>

              <Link href="/generator?section=image">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="lg"
                    className="group relative bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white px-12 py-8 text-xl rounded-2xl shadow-2xl shadow-purple-500/30 transition-all"
                  >
                    <span className="relative z-10 flex items-center">
                      <Sparkles className="w-6 h-6 mr-3" />
                      Начать создавать бесплатно
                      <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                    </span>
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl blur-2xl opacity-50"
                    />
                  </Button>
                </motion.div>
              </Link>

              <p className="text-sm text-gray-500 mt-8">
                🎁 Бесплатные кредиты при регистрации • 💳 Не требуется карта
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
