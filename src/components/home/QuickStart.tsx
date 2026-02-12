'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Wand2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Готовые шаблоны для быстрого старта
const QUICK_TEMPLATES = [
  {
    id: 'portrait',
    title: 'Портрет',
    prompt: 'cinematic portrait of a young woman with perfect skin, soft natural lighting, shallow depth of field, professional photography, 8k',
    emoji: '👩',
    color: '#8cf425',
  },
  {
    id: 'landscape',
    title: 'Пейзаж',
    prompt: 'breathtaking mountain landscape at golden hour, dramatic clouds, cinematic composition, hyper realistic, 8k quality',
    emoji: '🏔️',
    color: '#6bbf1a',
  },
  {
    id: 'cyber',
    title: 'Киберпанк',
    prompt: 'cyberpunk neon city at night, rain reflections on street, futuristic buildings, pink and blue neon lights, cinematic atmosphere',
    emoji: '🌃',
    color: '#f472b6',
  },
  {
    id: 'fantasy',
    title: 'Фэнтези',
    prompt: 'magical forest with glowing mushrooms, ethereal fairy lights, mystical atmosphere, fantasy art style, highly detailed',
    emoji: '✨',
    color: '#a0ff40',
  },
  {
    id: 'product',
    title: 'Продукт',
    prompt: 'premium product photography, luxury perfume bottle on marble surface, soft studio lighting, elegant minimalist composition',
    emoji: '💎',
    color: '#34d399',
  },
  {
    id: 'anime',
    title: 'Аниме',
    prompt: 'beautiful anime girl with flowing hair, cherry blossoms, soft pastel colors, studio ghibli style, highly detailed',
    emoji: '🌸',
    color: '#fb7185',
  },
];

interface QuickStartProps {
  onGenerate?: (prompt: string) => void;
}

export function QuickStart({ onGenerate }: QuickStartProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const handleQuickGenerate = async (templateId: string) => {
    const template = QUICK_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Используем демо-эндпоинт для быстрого показа
      const response = await fetch('/api/demo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      const data = await response.json();

      if (data.success && data.data?.url) {
        setResult(data.data.url);
      } else {
        setError(data.error || 'Не удалось создать изображение');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setSelectedTemplate(null);
    setError(null);
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-primary)]/5 to-transparent" />
      
      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-6">
            <Wand2 className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-sm text-[var(--accent-primary)] font-medium">Быстрый старт</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Попробуй прямо сейчас
          </h2>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto mb-2">
            Выбери стиль — мы создадим изображение за секунды.
          </p>
          <p className="text-sm text-[var(--accent-primary)] font-medium">
            ✨ Создано с LensRoom
          </p>
        </motion.div>

        {/* Result or Templates */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              {/* Result Card */}
              <div className="rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-2xl">
                <div className="aspect-square relative">
                  <img 
                    src={result} 
                    alt="Generated" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <span className="text-xs px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white">
                      ✨ AI Generated
                    </span>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <p className="text-sm text-[var(--muted)]">
                    {QUICK_TEMPLATES.find(t => t.id === selectedTemplate)?.prompt.slice(0, 80)}...
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleTryAgain}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface3)] text-sm font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Ещё раз
                    </button>
                    <Link href="/create/studio?section=photo" className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#8cf425] text-black text-sm font-medium">
                        Создать своё
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : error === 'login' ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="p-8 rounded-3xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
                <h3 className="text-xl font-bold mb-2">Получите 50⭐ бесплатно!</h3>
                <p className="text-[var(--muted)] mb-6">
                  Зарегистрируйтесь чтобы создавать контент без ограничений
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleTryAgain}
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface2)] text-sm font-medium"
                  >
                    Назад
                  </button>
                  <Link href="/create/studio?section=photo" className="flex-1">
                    <button className="w-full px-4 py-3 rounded-xl bg-[#8cf425] text-black text-sm font-medium">
                      Регистрация
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="templates"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Template Grid - clicking redirects to generator */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {QUICK_TEMPLATES.map((template, index) => (
                  <Link
                    key={template.id}
                    href={`/create/studio?section=photo&model=nano-banana-pro&prompt=${encodeURIComponent(template.prompt)}`}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent-primary)]/50 hover:shadow-lg hover:-translate-y-1"
                      style={{
                        boxShadow: undefined
                      }}
                    >
                      <div className="text-3xl mb-3">{template.emoji}</div>
                      <div className="text-sm font-medium text-[var(--text)]">{template.title}</div>
                      <div 
                        className="w-8 h-1 rounded-full mt-3 transition-all duration-300 group-hover:w-full"
                        style={{ backgroundColor: template.color }}
                      />
                      {/* Arrow indicator on hover */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-[var(--accent-primary)]" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>

              {/* Or custom prompt */}
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Или опишите своё изображение..."
                    className="w-full px-6 py-4 pr-32 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent-primary)]/50 transition-colors"
                  />
                  <Link 
                    href={customPrompt ? `/create/studio?section=photo&prompt=${encodeURIComponent(customPrompt)}` : '/create/studio?section=photo'}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8cf425] text-black text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      Создать
                    </button>
                  </Link>
                </div>
              </div>

              {/* Error message */}
              {error && error !== 'login' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-red-400 text-sm mt-4"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-[var(--muted)]"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Без регистрации
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Результат за ~10 сек
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Качество 1024×1024
          </span>
        </motion.div>
      </div>
    </section>
  );
}

export default QuickStart;
