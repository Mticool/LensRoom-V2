'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useCreditsStore } from '@/stores/credits-store';

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { fetchBalance, balance } = useCreditsStore();
  
  const type = searchParams.get('type');
  const credits = searchParams.get('credits');
  const plan = searchParams.get('plan');
  
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Update credits balance
    fetchBalance();
    
    // Get window size for confetti
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    
    // Stop confetti after 5 seconds
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
          gravity={0.3}
          colors={['#8cf425', '#6bbf1a', '#10B981', '#34D399', '#EC4899']}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <Card variant="hover" className="text-center">
          <div className="p-12">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.2, 
                type: 'spring', 
                stiffness: 200,
                damping: 15 
              }}
              className="flex justify-center mb-8"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(34, 197, 94, 0.4)',
                    '0 0 0 20px rgba(34, 197, 94, 0)',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-white" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-4"
            >
              {isSubscription ? 'Подписка оформлена! 🎉' : 'Оплата прошла успешно! ✨'}
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
                  Теперь вы получаете{' '}
                  <span className="font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                    {credits} кредитов
                  </span>{' '}
                  каждый месяц!
                </>
              ) : credits ? (
                <>
                  На ваш счёт зачислено{' '}
                  <span className="font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                    {credits} кредитов
                  </span>
                </>
              ) : (
                'Кредиты зачислены на ваш счёт'
              )}
            </motion.p>

            {/* Current Balance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className="mb-8 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"
            >
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Текущий баланс</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                {balance} ⭐
              </p>
            </motion.div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
              >
                <Sparkles className="w-8 h-8 text-purple-500 mb-3 mx-auto" />
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Кредиты зачислены
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Можете сразу начать создавать контент
                </p>
              </motion.div>

              {isSubscription && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="p-6 rounded-2xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
                >
                  <CheckCircle className="w-8 h-8 text-green-500 mb-3 mx-auto" />
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                    Автопродление
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Кредиты будут начисляться автоматически
                  </p>
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
              <Button asChild variant="default" size="lg" className="min-w-[200px]">
                <Link href="/create/studio?section=photo">
                  Начать создавать
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              {isSubscription && (
                <Button asChild variant="secondary" size="lg" className="min-w-[200px]">
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
