'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-purple-500)]/5 via-transparent to-transparent" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      <div className="container mx-auto px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-purple-500)]/15 border border-[var(--color-purple-500)]/30 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-purple-400)] animate-pulse" />
            <span className="text-sm font-medium text-[var(--color-purple-400)]">12 AI моделей в одном месте</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-text-primary)] mb-6"
          >
            Создавайте контент
            <br />
            <span className="bg-gradient-to-r from-[var(--color-purple-400)] via-[var(--color-blue-400)] to-[var(--color-purple-400)] bg-clip-text text-transparent">
              с помощью AI
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg lg:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            От фотореалистичных изображений до профессиональных видео. 
            Объединяем лучшие AI-модели в простом интерфейсе.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button asChild size="lg">
              <Link href="/create">
                Начать бесплатно
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">
                Смотреть тарифы
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 mt-16 pt-8 border-t border-[var(--color-border)]"
          >
            {[
              { value: '12+', label: 'AI моделей' },
              { value: '50K+', label: 'Генераций' },
              { value: '<30с', label: 'На результат' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</div>
                <div className="text-sm text-[var(--color-text-tertiary)]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 lg:mt-20"
        >
          <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2 shadow-2xl">
            <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-[var(--color-purple-500)]/10 via-[var(--color-bg-tertiary)] to-[var(--color-blue-500)]/10 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-purple-500)] to-[var(--color-blue-500)] flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="text-[var(--color-text-tertiary)] text-sm">Интерфейс генератора</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
