'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { usePreferencesStore } from '@/stores/preferences-store';
import { 
  User, Calendar, CreditCard, Crown, LogOut, Loader2, 
  Image, Video, RefreshCw, ExternalLink, Users, Copy, Check, 
  Settings, Key, Star, Sparkles, TrendingUp, Bell, BellOff,
  ChevronRight, Zap, Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { ProfileSkeleton } from '@/components/ui/skeleton';
import { NoGenerationsEmpty } from '@/components/ui/empty-state';

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

type AffiliateEarning = {
  id: string;
  referral_user_id: string;
  payment_id: string;
  amount_rub: number;
  commission_percent: number;
  commission_rub: number;
  tariff_name: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  is_first_purchase?: boolean | null;
  buyer_payment_index?: number | null;
  referral?: { username: string | null; displayName: string | null };
};

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useTelegramAuth();
  const { balance, fetchBalance } = useCreditsStore();
  const { showSuccessNotifications, setShowSuccessNotifications } = usePreferencesStore();
  const router = useRouter();
  
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'photo' | 'video'>('all');

  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);
  const [refData, setRefData] = useState<null | { link: string; invitedCount: number; earnedStars: number }>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [affiliateData, setAffiliateData] = useState<null | {
    isAffiliate: boolean;
    tier: null | { tier: string; percent: number; recurring_percent?: number; updated_at: string };
    totals: { pendingRub: number; paidRub: number; totalRub: number };
    earnings: AffiliateEarning[];
  }>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchGenerations();
      fetchReferral();
      fetchAffiliate();
    }
  }, [user, fetchBalance]);

  const fetchReferral = async () => {
    try {
      setRefLoading(true);
      setRefError(null);
      const res = await fetch('/api/referrals/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefError(data?.error || 'Не удалось загрузить');
        setRefData(null);
        return;
      }
      setRefData({
        link: data?.link,
        invitedCount: data?.invitedCount || 0,
        earnedStars: data?.stats?.totalRewards || 0,
      });
    } catch {
      setRefError('Не удалось загрузить');
      setRefData(null);
    } finally {
      setRefLoading(false);
    }
  };

  const fetchAffiliate = async () => {
    try {
      setAffiliateLoading(true);
      const res = await fetch('/api/affiliate/earnings/me?limit=5', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAffiliateData(null);
        return;
      }
      setAffiliateData(data);
    } catch {
      setAffiliateData(null);
    } finally {
      setAffiliateLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!refData?.link) return;
    try {
      await navigator.clipboard.writeText(refData.link);
      setRefCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setRefCopied(false), 1500);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const fetchGenerations = async () => {
    try {
      setLoadingGenerations(true);
      const response = await fetch('/api/generations', { credentials: 'include' });
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
      <div className="min-h-screen bg-[var(--bg)] pt-20">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Вы вышли из аккаунта');
    router.push('/');
  };

  const filteredGenerations = generations.filter(g => 
    activeTab === 'all' || g.type === activeTab
  );

  const displayName = user.firstName || user.username || 'Пользователь';
  const photoCount = generations.filter(g => g.type === 'photo' && g.status === 'completed').length;
  const videoCount = generations.filter(g => g.type === 'video' && g.status === 'completed').length;
  const totalSpent = generations.reduce((sum, g) => sum + (g.credits_used || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-12">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--gold)]/20 via-[var(--surface)] to-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 mb-6"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            {user.photoUrl ? (
              <img 
                src={user.photoUrl} 
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-[var(--gold)]/30 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[var(--gold)] to-amber-600 flex items-center justify-center shadow-xl">
                <span className="text-3xl sm:text-4xl font-bold text-black">
                  {displayName[0].toUpperCase()}
                </span>
              </div>
            )}

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-1">
                {displayName}
              </h1>
              {user.username && (
                <p className="text-[var(--muted)] mb-3">@{user.username}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 text-[var(--gold)] text-sm font-medium">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {balance} звёзд
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[var(--muted)] text-sm">
                  ID: {user.telegramId}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild className="flex-1 sm:flex-initial bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90">
                <Link href="/pricing">
                  <Zap className="w-4 h-4 mr-2" />
                  Пополнить
                </Link>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Баланс', value: `${balance}`, icon: Star, color: 'text-[var(--gold)]', suffix: '⭐' },
            { label: 'Фото', value: photoCount, icon: Image, color: 'text-emerald-400' },
            { label: 'Видео', value: videoCount, icon: Video, color: 'text-violet-400' },
            { label: 'Потрачено', value: totalSpent, icon: TrendingUp, color: 'text-rose-400', suffix: '⭐' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-[var(--muted)]">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>
                {stat.value}{stat.suffix}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Links */}
          <div className="space-y-4">
            {/* Referral Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">Пригласи друга</h3>
                  <p className="text-xs text-[var(--muted)]">+50⭐ тебе и другу</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2.5 rounded-lg bg-white/5 text-center">
                  <p className="text-lg font-bold text-[var(--text)]">
                    {refLoading ? '—' : (refData?.invitedCount ?? 0)}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">приглашено</p>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 text-center">
                  <p className="text-lg font-bold text-violet-400">
                    {refLoading ? '—' : `${(refData?.earnedStars ?? 0)}⭐`}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">заработано</p>
                </div>
              </div>

              <Button
                onClick={copyReferralLink}
                disabled={refLoading || !refData?.link}
                className="w-full bg-violet-500 hover:bg-violet-600 text-white"
                size="sm"
              >
                {refCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {refCopied ? 'Скопировано!' : 'Копировать ссылку'}
              </Button>
            </motion.div>

            {/* Referrals + Earnings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--gold)]" />
                  <h3 className="font-semibold text-[var(--text)]">Ваши рефералы</h3>
                </div>
                <Link href="/referrals" className="text-xs text-[var(--gold)] hover:underline">
                  Открыть
                </Link>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface2)] flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">Приглашено</div>
                <div className="text-xl font-bold text-[var(--text)]">
                  {refLoading ? '—' : (refData?.invitedCount ?? 0)}
                </div>
              </div>

              {/* Affiliate earnings (RUB) */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div className="text-sm font-medium text-[var(--text)]">Заработок (₽)</div>
                  </div>
                  {affiliateData?.tier && (
                    <div className="text-[10px] text-[var(--muted)]">
                      1-я {affiliateData.tier.percent}% / повторные {affiliateData.tier.recurring_percent ?? 0}%
                    </div>
                  )}
                </div>

                {affiliateLoading ? (
                  <div className="text-sm text-[var(--muted)]">Загрузка…</div>
                ) : affiliateData?.isAffiliate ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="p-2.5 rounded-lg bg-white/5 text-center">
                        <div className="text-xs text-[var(--muted)] mb-0.5">всего</div>
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {Math.round(affiliateData.totals.totalRub).toLocaleString()}₽
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-yellow-500/10 text-center">
                        <div className="text-xs text-yellow-500 mb-0.5">к выплате</div>
                        <div className="text-sm font-semibold text-yellow-500">
                          {Math.round(affiliateData.totals.pendingRub).toLocaleString()}₽
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-green-500/10 text-center">
                        <div className="text-xs text-green-500 mb-0.5">выплачено</div>
                        <div className="text-sm font-semibold text-green-500">
                          {Math.round(affiliateData.totals.paidRub).toLocaleString()}₽
                        </div>
                      </div>
                    </div>

                    {affiliateData.earnings?.length > 0 && (
                      <div className="space-y-2">
                        {affiliateData.earnings.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface2)]"
                          >
                            <div className="min-w-0">
                              <div className="text-xs text-[var(--text)] truncate">
                                {e.referral?.displayName || (e.referral?.username ? `@${e.referral.username}` : 'Реферал')}
                              </div>
                              <div className="text-[10px] text-[var(--muted)]">
                                {e.is_first_purchase ? '1-я покупка' : 'повторная'} · {e.commission_percent}% · {new Date(e.created_at).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-[var(--text)]">
                              {Math.round(Number(e.commission_rub || 0)).toLocaleString()}₽
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-[var(--muted)]">
                    Начисления в ₽ появляются только у партнёров (после оплат ваших рефералов).
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            >
              {[
                { href: '/account/subscription', icon: Crown, label: 'Подписка', desc: 'Управление тарифом', color: 'text-[var(--gold)]' },
                { href: '/profile/api-keys', icon: Key, label: 'API ключи', desc: 'Midjourney и др.', color: 'text-emerald-400' },
                { href: '/library', icon: Image, label: 'Библиотека', desc: 'Все генерации', color: 'text-violet-400' },
              ].map((link, i) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className="flex items-center gap-3 p-4 hover:bg-[var(--surface2)] transition-colors border-b border-[var(--border)] last:border-0"
                >
                  <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center ${link.color}`}>
                    <link.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text)]">{link.label}</p>
                    <p className="text-xs text-[var(--muted)]">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              ))}
            </motion.div>

            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {showSuccessNotifications ? (
                    <Bell className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <BellOff className="w-5 h-5 text-[var(--muted)]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">Уведомления</p>
                    <p className="text-xs text-[var(--muted)]">При завершении генерации</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessNotifications(!showSuccessNotifications)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    showSuccessNotifications ? 'bg-emerald-500' : 'bg-[var(--surface2)]'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    showSuccessNotifications ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Recent Generations */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text)]">Последние генерации</h3>
                <div className="flex items-center gap-2">
                  {/* Tabs */}
                  <div className="flex p-1 rounded-lg bg-[var(--surface2)]">
                    {(['all', 'photo', 'video'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          activeTab === tab 
                            ? 'bg-white text-black' 
                            : 'text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {tab === 'all' ? 'Все' : tab === 'photo' ? 'Фото' : 'Видео'}
                      </button>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={fetchGenerations}
                    className="text-[var(--muted)] h-8 w-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5">
                {loadingGenerations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
                  </div>
                ) : filteredGenerations.length === 0 ? (
                  <NoGenerationsEmpty />
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredGenerations.slice(0, 10).map((gen, i) => (
                      <motion.div 
                        key={gen.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex gap-3 p-3 rounded-xl bg-[var(--surface2)] hover:bg-[var(--border)] transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-[var(--surface)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {gen.results?.[0]?.url ? (
                            <img 
                              src={gen.results[0].url} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : gen.type === 'video' ? (
                            <Video className="w-6 h-6 text-[var(--muted)]" />
                          ) : (
                            <Image className="w-6 h-6 text-[var(--muted)]" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              gen.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              gen.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                              gen.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-white/10 text-[var(--muted)]'
                            }`}>
                              {gen.status === 'completed' ? '✓' : gen.status === 'processing' ? '⏳' : gen.status === 'failed' ? '✗' : '⋯'}
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              {gen.type === 'video' ? '🎬' : '🖼'} {gen.model_name}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text)] line-clamp-1 mb-1">
                            {gen.prompt}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                            <span>{gen.credits_used}⭐</span>
                            <span>•</span>
                            <span>{new Date(gen.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>

                        {/* Action */}
                        {gen.status === 'completed' && gen.results?.[0]?.url && (
                          <button
                            onClick={() => window.open(gen.results![0].url, '_blank')}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white/10"
                          >
                            <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {filteredGenerations.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button asChild variant="outline" size="sm" className="border-[var(--border)]">
                      <Link href="/library">
                        Смотреть все ({filteredGenerations.length})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
