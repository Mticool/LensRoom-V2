'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCreditsStore } from '@/stores/credits-store';
import Link from 'next/link';
import Confetti from 'react-confetti';

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { fetchBalance, balance } = useCreditsStore();
  
  const type = searchParams.get('type'); // 'subscription' | 'package'
  const credits = searchParams.get('credits');
  const plan = searchParams.get('plan');
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Set window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Refresh credits balance
    fetchBalance();
    
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [fetchBalance]);

  const isSubscription = type === 'subscription';

  return (
    <>
      {showConfetti && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          colors={['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899']}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <Card variant="glow" className="text-center">
          <div className="p-12">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-[var(--color-text-primary)] mb-4"
            >
              {isSubscription ? 'Подписка оформлена!' : 'Оплата прошла успешно!'}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-[var(--color-text-secondary)] mb-8"
            >
              {isSubscription ? (
                <>
                  Теперь вы получаете <span className="font-bold text-purple-500">{credits} кредитов</span> каждый месяц!
                </>
              ) : credits ? (
                <>
                  На ваш счёт зачислено <span className="font-bold text-purple-500">{credits} кредитов</span>
                </>
              ) : (
                'Кредиты добавлены на ваш аккаунт'
              )}
            </motion.p>

            {/* Current Balance */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-8"
            >
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Текущий баланс: <span className="text-purple-400 font-semibold">{balance} ⭐</span>
              </p>
            </motion.div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="p-6 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">
                  <Sparkles className="w-8 h-8 text-purple-500 mb-3 mx-auto" />
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    Кредиты зачислены
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Можете сразу начать создавать контент
                  </p>
                </div>
              </motion.div>

              {isSubscription && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="p-6 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]">
                    <CheckCircle className="w-8 h-8 text-green-500 mb-3 mx-auto" />
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                      Автопродление
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Кредиты будут начисляться автоматически
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild variant="primary" size="lg">
                <Link href="/create">
                  Начать создавать
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              {isSubscription && (
                <Button asChild variant="secondary" size="lg">
                  <Link href="/account/subscription">
                    Управление подпиской
                  </Link>
                </Button>
              )}
            </motion.div>

            {/* Receipt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 pt-8 border-t border-[var(--color-border-primary)]"
            >
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Чек отправлен на вашу почту
              </p>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </>
  );
}
