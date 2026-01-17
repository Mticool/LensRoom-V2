'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Star, LogOut, Settings, CreditCard, Gift,
  Trophy, Crown, Zap, ChevronRight, Sparkles,
  Bell, Mail, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BottomTabBar } from '@/components/mobile';

interface UserData {
  id: string;
  username: string;
  email?: string;
  telegramId?: string;
  credits: number;
  role: string;
  subscription?: {
    plan: string;
    expiresAt?: string;
  };
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center pb-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00D9FF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    {
      icon: CreditCard,
      label: 'Тарифы и подписки',
      description: 'Управление подпиской',
      href: '/account/subscription',
      badge: user.subscription?.plan || 'Free',
      color: 'text-[#00D9FF]',
    },
    {
      icon: Gift,
      label: 'Реферальная программа',
      description: 'Приглашай друзей и получай бонусы',
      href: '/referrals',
      color: 'text-purple-400',
    },
    {
      icon: Bell,
      label: 'Уведомления',
      description: 'Настройки уведомлений',
      href: '/account/notifications',
      color: 'text-amber-400',
    },
    {
      icon: Settings,
      label: 'Настройки',
      description: 'Общие настройки аккаунта',
      href: '/account/settings',
      color: 'text-slate-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F10] pb-20">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00D9FF]/10 to-transparent" />
        <div className="relative px-4 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Avatar */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00D9FF] to-[#0EA5E9] flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>

            {/* Username */}
            <h1 className="text-2xl font-bold text-white mb-1">
              {user.username || 'Пользователь'}
            </h1>

            {/* Role Badge */}
            {user.role !== 'user' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#CDFF00]/10 border border-[#CDFF00]/20">
                <Crown className="w-3 h-3 text-[#CDFF00]" />
                <span className="text-xs font-medium text-[#CDFF00] uppercase">
                  {user.role}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Credits */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A]">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-[#71717A]">Баланс</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {user.credits.toLocaleString()}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="mt-2 text-xs text-[#00D9FF] hover:underline"
            >
              Пополнить →
            </button>
          </div>

          {/* Subscription */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00D9FF]/10 to-[#0EA5E9]/5 border border-[#00D9FF]/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-xs text-[#71717A]">Тариф</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {user.subscription?.plan || 'Free'}
            </p>
            {user.subscription?.expiresAt && (
              <p className="mt-1 text-xs text-[#71717A]">
                До {new Date(user.subscription.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => router.push(item.href)}
            className="w-full p-4 rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-[#27272A] flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#27272A] text-xs text-[#A1A1AA]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#71717A] mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#52525B] group-hover:text-[#A1A1AA] transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 text-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Выйти</span>
        </motion.button>
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
