'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LoginDialog } from '@/components/auth/login-dialog';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const plan = searchParams.get('plan');
  const pack = searchParams.get('pack');

  useEffect(() => {
    // Ждём загрузки auth
    if (authLoading) return;

    // Если не авторизован — показываем диалог
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    // Если нет параметров — редирект на pricing
    if (!plan && !pack) {
      router.push('/pricing');
      return;
    }

    // Создаём платёж
    const createPayment = async () => {
      setProcessing(true);
      
      try {
        const type = plan ? 'subscription' : 'package';
        const itemId = plan || pack;

        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, itemId }),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Ошибка создания платежа');
        }

        // Редирект на Payform
        window.location.href = data.url;

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка';
        toast.error(message);
        setProcessing(false);
        // Возвращаем на pricing
        setTimeout(() => router.push('/pricing'), 2000);
      }
    };

    createPayment();
  }, [user, authLoading, plan, pack, router]);

  // Обработка после авторизации
  const handleAuthClose = () => {
    setAuthDialogOpen(false);
    if (!user) {
      router.push('/pricing');
    }
  };

  return (
    <>
      <div className="text-center">
        {authLoading || processing ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-[#c8ff00] mx-auto mb-4" />
            <p className="text-white/60">
              {authLoading ? 'Проверка авторизации...' : 'Создание платежа...'}
            </p>
          </>
        ) : !user ? (
          <>
            <p className="text-white/60 mb-4">Для оплаты необходимо войти</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-[#c8ff00] mx-auto mb-4" />
            <p className="text-white/60">Перенаправление на оплату...</p>
          </>
        )}
      </div>

      <LoginDialog isOpen={authDialogOpen} onClose={handleAuthClose} />
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#c8ff00] mx-auto mb-4" />
          <p className="text-white/60">Загрузка...</p>
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
