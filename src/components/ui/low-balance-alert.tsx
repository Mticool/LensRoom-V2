'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, X, Zap } from 'lucide-react';
import { useCreditsStore } from '@/stores/credits-store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function LowBalanceAlert() {
  const router = useRouter();
  const { balance, checkLowBalance, shouldShowLowBalanceNotification, markLowBalanceNotified } = useCreditsStore();
  const [isVisible, setIsVisible] = useState(false);
  const [severity, setSeverity] = useState<'critical' | 'low' | 'medium' | null>(null);

  useEffect(() => {
    const level = checkLowBalance();
    setSeverity(level);
    
    if (level && shouldShowLowBalanceNotification()) {
      // Small delay to not interrupt initial page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [balance, checkLowBalance, shouldShowLowBalanceNotification]);

  const handleDismiss = () => {
    setIsVisible(false);
    markLowBalanceNotified();
  };

  const handleTopUp = () => {
    setIsVisible(false);
    markLowBalanceNotified();
    router.push('/pricing');
  };

  if (!severity || !isVisible) return null;

  const config = {
    critical: {
      bg: 'bg-red-500/10 border-red-500/30',
      icon: 'text-red-400',
      title: 'Баланс почти на нуле!',
      description: `У вас осталось ${balance} ⭐. Пополните баланс, чтобы продолжить создавать контент.`,
    },
    low: {
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      icon: 'text-yellow-400',
      title: 'Заканчиваются звёзды',
      description: `У вас осталось ${balance} ⭐. Рекомендуем пополнить баланс.`,
    },
    medium: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      icon: 'text-blue-400',
      title: 'Напоминание о балансе',
      description: `У вас ${balance} ⭐. При активном использовании они быстро закончатся.`,
    },
  };

  const { bg, icon, title, description } = config[severity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)]"
      >
        <div className={`rounded-2xl border ${bg} p-4 shadow-lg backdrop-blur-sm`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 shrink-0 ${icon}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-[var(--text)]">{title}</h4>
                <button
                  onClick={handleDismiss}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--text2)]">{description}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleTopUp}
                  className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Пополнить
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-[var(--muted)]"
                >
                  Позже
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
