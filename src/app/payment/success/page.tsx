'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCreditsStore } from '@/stores/credits-store';
import Link from 'next/link';
import confetti from 'canvas-confetti';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { fetchBalance, balance } = useCreditsStore();
  const [isLoaded, setIsLoaded] = useState(false);

  const credits = searchParams.get('credits');
  const orderId = searchParams.get('order');

  useEffect(() => {
    // Refresh credits balance
    fetchBalance();
    
    // Trigger confetti
    if (typeof window !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#3B82F6', '#10B981'],
      });
    }

    setIsLoaded(true);
  }, [fetchBalance]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full"
    >
      <Card variant="glow" padding="lg" className="text-center">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Оплата прошла успешно! 🎉
        </h1>
        
        <p className="text-[var(--color-text-secondary)] mb-6">
          Кредиты добавлены на ваш аккаунт
        </p>

        {/* Credits Added */}
        {credits && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-6"
          >
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Начислено кредитов
            </p>
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              +{credits} ⭐
            </div>
          </motion.div>
        )}

        {/* Current Balance */}
        {isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <p className="text-sm text-[var(--color-text-tertiary)]">
              Текущий баланс: <span className="text-purple-400 font-semibold">{balance} ⭐</span>
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild variant="primary" className="w-full">
            <Link href="/create">
              <Sparkles className="w-4 h-4 mr-2" />
              Начать генерацию
            </Link>
          </Button>
          
          <Button asChild variant="secondary" className="w-full">
            <Link href="/profile">
              Перейти в профиль
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Order ID */}
        {orderId && (
          <p className="text-xs text-[var(--color-text-tertiary)] mt-6">
            Номер заказа: {orderId}
          </p>
        )}
      </Card>
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full">
      <Card variant="glow" padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
          <p className="text-[var(--color-text-secondary)]">Загрузка...</p>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
