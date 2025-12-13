'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, CreditCard, History, Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/hooks/use-profile';
import { getGenerations, getTransactions, type Generation, type CreditTransaction } from '@/lib/supabase/database';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, credits, plan, loading: profileLoading } = useProfile();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      const [gens, trans] = await Promise.all([
        getGenerations(user.id, 10),
        getTransactions(user.id, 10),
      ]);
      
      setGenerations(gens);
      setTransactions(trans);
    }
    
    loadData();
  }, [user]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const planLabels = {
    free: { label: 'Free', color: 'default' as const },
    creator: { label: 'Creator', color: 'purple' as const },
    business: { label: 'Business', color: 'gold' as const },
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            Профиль
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Управляйте своим аккаунтом и подпиской
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* User Card */}
            <Card variant="hover">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                  <span className="text-white text-3xl font-bold">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
                  {profile.full_name || user.email?.split('@')[0]}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  {user.email}
                </p>
                <Badge variant={planLabels[plan].color} className="mb-4">
                  <Crown className="w-3 h-3 mr-1" />
                  {planLabels[plan].label}
                </Badge>
              </div>
            </Card>

            {/* Credits Card */}
            <Card variant="hover">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Кредиты</h3>
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-4">
                {credits} ⭐
              </div>
              <Button asChild variant="default" className="w-full">
                <Link href="/pricing">Купить кредиты</Link>
              </Button>
            </Card>

            {/* Stats */}
            <Card variant="hover">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Статистика</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Генераций</span>
                  <span className="text-[var(--color-text-primary)] font-medium">{generations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">На сайте с</span>
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {new Date(profile.created_at).toLocaleDateString('ru')}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Right Column - History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Recent Generations */}
            <Card variant="hover">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Последние генерации</h3>
                <Link href="/history" className="text-sm text-purple-400 hover:text-purple-300">
                  Все →
                </Link>
              </div>
              
              {generations.length > 0 ? (
                <div className="space-y-4">
                  {generations.slice(0, 5).map((gen) => (
                    <div 
                      key={gen.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      {gen.result_urls?.[0] ? (
                        <img 
                          src={gen.result_urls[0]} 
                          alt="" 
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center">
                          <History className="w-6 h-6 text-[var(--color-text-tertiary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-primary)] line-clamp-2">
                          {gen.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="default" className="text-xs">
                            {gen.type}
                          </Badge>
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {gen.model}
                          </span>
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            {new Date(gen.created_at).toLocaleDateString('ru')}
                          </span>
                        </div>
                      </div>
                      <Badge 
                        variant={gen.status === 'completed' ? 'default' : gen.status === 'failed' ? 'default' : 'default'}
                        className={gen.status === 'completed' ? 'bg-green-500/20 text-green-400' : gen.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                      >
                        {gen.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-secondary)]">Пока нет генераций</p>
                  <Button asChild variant="default" className="mt-4">
                    <Link href="/create">Создать первую</Link>
                  </Button>
                </div>
              )}
            </Card>

            {/* Credit History */}
            <Card variant="hover">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-6">История кредитов</h3>
              
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0"
                    >
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {new Date(tx.created_at).toLocaleString('ru')}
                        </p>
                      </div>
                      <span className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} ⭐
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[var(--color-text-secondary)] py-4">
                  Нет транзакций
                </p>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

