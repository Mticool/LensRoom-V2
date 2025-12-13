'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-purple-500)]/10 via-transparent to-transparent" />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-purple-500)] rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-blue-500)] rounded-full blur-[120px] opacity-20" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-strong)] mb-8">
            <Sparkles className="w-4 h-4 text-[var(--color-purple-400)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">12 AI моделей в одном месте</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--color-text-primary)] mb-6 leading-tight">
            Создавайте невероятный
            <br />
            <span className="bg-gradient-to-r from-[var(--color-purple-400)] to-[var(--color-blue-400)] bg-clip-text text-transparent">
              контент с AI
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed">
            От фотореалистичных изображений до профессиональных видео.
            Все топовые модели в одном интерфейсе.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="primary" className="min-w-[200px]">
              <Link href="/create">
                Начать бесплатно
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="secondary">
              <Link href="/inspiration">
                Посмотреть примеры
              </Link>
            </Button>
          </div>

          {/* Preview grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-16 grid grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            {['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
              'https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=400',
              'https://images.unsplash.com/photo-1618556450991-2f1af64e8191?w=400'
            ].map((img, i) => (
              <motion.div 
                key={i} 
                className="aspect-square rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-purple-500)]/50 transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
          >
            {[
              { value: '12', label: 'AI моделей' },
              { value: '50K+', label: 'Генераций' },
              { value: '< 30s', label: 'Среднее время' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-[var(--color-text-tertiary)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
