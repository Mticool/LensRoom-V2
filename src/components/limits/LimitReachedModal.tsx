/**
 * Modal: Достигнут лимит Free тарифа
 * Показывает пользователю что лимит исчерпан и предлагает апгрейд
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  usage?: {
    nanoBanana?: { used: number; limit: number };
    tools?: { used: number; limit: number };
  };
}

export function LimitReachedModal({ 
  isOpen, 
  onClose, 
  reason,
  usage 
}: LimitReachedModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative max-w-lg w-full bg-[var(--surface)] rounded-3xl border-2 border-[var(--gold)]/30 shadow-2xl shadow-[var(--gold)]/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>

              {/* Header with gradient */}
              <div className="relative p-8 pb-6 bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/5">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-[var(--gold)]" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-2">
                  Достигнут дневной лимит
                </h2>
                <p className="text-[var(--text2)] text-center">
                  {reason || 'Вы использовали все бесплатные генерации на сегодня'}
                </p>
              </div>

              {/* Usage stats */}
              {usage && (
                <div className="px-8 py-4 space-y-3">
                  {usage.nanoBanana && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-[var(--text2)]">Nano Banana:</span>
                      <Badge className="font-mono bg-white/10">
                        {usage.nanoBanana.used}/{usage.nanoBanana.limit}
                      </Badge>
                    </div>
                  )}
                  {usage.tools && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <span className="text-sm text-[var(--text2)]">Инструменты:</span>
                      <Badge className="font-mono bg-white/10">
                        {usage.tools.used}/{usage.tools.limit}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Recommended plans */}
              <div className="px-8 py-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
                  Рекомендуем для вас:
                </h3>
                
                <div className="space-y-3">
                  {/* Lite */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-[var(--text)]">Lite</h4>
                      <span className="text-lg font-bold text-[var(--gold)]">590₽/мес</span>
                    </div>
                    <p className="text-sm text-[var(--text2)] mb-3">
                      ∞ Nano Banana • 50 инструментов/мес
                    </p>
                  </div>

                  {/* Creator - Popular */}
                  <div className="relative p-4 rounded-xl bg-[var(--gold)]/10 border-2 border-[var(--gold)]/50 hover:border-[var(--gold)] transition-all">
                    <Badge className="absolute -top-2 left-4 bg-[var(--gold)] text-black text-xs">
                      Хит
                    </Badge>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-[var(--text)]">Creator</h4>
                      <span className="text-lg font-bold text-[var(--gold)]">1490₽/мес</span>
                    </div>
                    <p className="text-sm text-[var(--text2)] mb-1">
                      ∞ Nano + 30 Nano Pro • 100 инструментов
                    </p>
                    <div className="flex items-center gap-1 text-xs text-[var(--gold)]">
                      <Star className="w-3 h-3 fill-[var(--gold)]" />
                      <span>+500⭐ для премиум-моделей</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-8 pb-8 space-y-3">
                <Link href="/pricing" onClick={onClose}>
                  <Button className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 py-6 text-lg font-semibold">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Выбрать тариф
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full py-6"
                  onClick={onClose}
                >
                  Вернуться завтра
                </Button>
              </div>

              {/* Footer note */}
              <div className="px-8 pb-6 text-center">
                <p className="text-xs text-[var(--muted)]">
                  💡 Бесплатный лимит обновится завтра в 00:00
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook: Проверка лимитов и автопоказ модалки
 */
export function useLimitsCheck() {
  const [limits, setLimits] = useState<any>(null);
  const [shouldShowModal, setShouldShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkLimits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/limits/check', {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to check limits');
      }

      const data = await res.json();
      setLimits(data);

      // Показать модалку если лимит достигнут
      if (data.shouldUpsell) {
        setShouldShowModal(true);
      }
    } catch (error) {
      console.error('[Limits] Check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShouldShowModal(false);
  };

  return {
    limits,
    loading,
    shouldShowModal,
    checkLimits,
    closeModal
  };
}

