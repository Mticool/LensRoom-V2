'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { 
  User, Calendar, CreditCard, Crown, LogOut, Loader2, 
  Image, Video, RefreshCw, ExternalLink, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

interface Generation {
  id: string;
  type: 'photo' | 'video';
  model_name: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: { url: string }[];
  credits_used: number;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useTelegramAuth();
  const { balance, fetchBalance } = useCreditsStore();
  const router = useRouter();
  
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'photo' | 'video'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchGenerations();
    }
  }, [user, fetchBalance]);

  const fetchGenerations = async () => {
    try {
      setLoadingGenerations(true);
      const response = await fetch('/api/generations', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);
      }
    } catch (error) {
      console.error('Error fetching generations:', error);
    } finally {
      setLoadingGenerations(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success('Вы вышли из аккаунта');
    router.push('/');
  };

  const filteredGenerations = generations.filter(g => 
    activeTab === 'all' || g.type === activeTab
  );

  const displayName = user.firstName || user.username || 'Пользователь';

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20">
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2">
            Личный <span className="text-[var(--gold)]">кабинет</span>
          </h1>
          <p className="text-[var(--muted)]">Ваши генерации и настройки аккаунта</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - User Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6 bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center gap-4 mb-6">
                  {user.photoUrl ? (
                    <img 
                      src={user.photoUrl} 
                      alt={displayName}
                      className="w-16 h-16 rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--gold)]/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-[var(--gold)]">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text)]">{displayName}</h2>
                    {user.username && (
                      <p className="text-sm text-[var(--muted)]">@{user.username}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface2)]">
                    <Calendar className="w-5 h-5 text-[var(--muted)]" />
                    <div>
                      <p className="text-xs text-[var(--muted)]">Telegram ID</p>
                      <p className="text-[var(--text)] font-mono text-sm">{user.telegramId}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Balance Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Баланс</h3>
                  <CreditCard className="w-5 h-5 text-[var(--muted)]" />
                </div>
                <p className="text-4xl font-bold text-[var(--gold)] mb-4">
                  {balance} ⭐
                </p>
                <Button asChild className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
                  <Link href="/pricing">Пополнить баланс</Link>
                </Button>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <Button asChild variant="outline" className="w-full border-[var(--border)]">
                <Link href="/account/subscription">
                  <Crown className="w-4 h-4 mr-2" />
                  Подписка
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </motion.div>
          </div>

          {/* Main - Generations History */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-[var(--text)]">История генераций</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={fetchGenerations}
                    className="text-[var(--muted)]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  {(['all', 'photo', 'video'] as const).map((tab) => (
                    <Button
                      key={tab}
                      variant={activeTab === tab ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab(tab)}
                      className={activeTab === tab ? 'bg-[var(--gold)] text-black' : ''}
                    >
                      {tab === 'all' && 'Все'}
                      {tab === 'photo' && <><Image className="w-4 h-4 mr-1" /> Фото</>}
                      {tab === 'video' && <><Video className="w-4 h-4 mr-1" /> Видео</>}
                    </Button>
                  ))}
                </div>

                {/* Generations List */}
                {loadingGenerations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
                  </div>
                ) : filteredGenerations.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
                    <p className="text-[var(--muted)]">Пока нет генераций</p>
                    <Button asChild className="mt-4 bg-[var(--gold)] text-black">
                      <Link href="/create">Создать первую</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {filteredGenerations.map((gen) => (
                      <div 
                        key={gen.id}
                        className="flex gap-4 p-4 rounded-lg bg-[var(--surface2)] border border-[var(--border)]"
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {gen.results?.[0]?.url ? (
                            <img 
                              src={gen.results[0].url} 
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : gen.type === 'video' ? (
                            <Video className="w-8 h-8 text-[var(--muted)]" />
                          ) : (
                            <Image className="w-8 h-8 text-[var(--muted)]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              gen.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              gen.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                              gen.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-[var(--muted)]/20 text-[var(--muted)]'
                            }`}>
                              {gen.status === 'completed' ? '✓ Готово' :
                               gen.status === 'processing' ? '⏳ В работе' :
                               gen.status === 'failed' ? '✗ Ошибка' : '⋯ Ожидание'}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {gen.type === 'video' ? '🎬 Видео' : '🖼 Фото'}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text)] line-clamp-2 mb-1">
                            {gen.prompt}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                            <span>{gen.model_name}</span>
                            <span>•</span>
                            <span>{gen.credits_used} ⭐</span>
                            <span>•</span>
                            <span>{new Date(gen.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {gen.status === 'completed' && gen.results?.[0]?.url && (
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-[var(--muted)]"
                              onClick={() => window.open(gen.results![0].url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
