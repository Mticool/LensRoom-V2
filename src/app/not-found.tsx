'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--gold)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg mx-auto">
        {/* 404 Number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="mb-8"
        >
          <span className="text-[150px] sm:text-[200px] font-bold leading-none bg-gradient-to-b from-[var(--text)] via-[var(--text)] to-transparent bg-clip-text text-transparent select-none">
            404
          </span>
        </motion.div>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 flex items-center justify-center">
            <Search className="w-8 h-8 text-[var(--gold)]" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-3">
            Страница не найдена
          </h1>
          <p className="text-[var(--text2)] mb-8 max-w-md mx-auto">
            Возможно, страница была удалена или вы ввели неверный адрес. 
            Попробуйте вернуться на главную.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-[var(--border)] text-[var(--text)]">
            <Link href="/create">
              <Sparkles className="w-4 h-4 mr-2" />
              Создать контент
            </Link>
          </Button>
        </motion.div>

        {/* Fun message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-sm text-[var(--muted)]"
        >
          💡 Может, сгенерировать что-нибудь крутое вместо этого?
        </motion.p>
      </div>
    </div>
  );
}


