'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, CreditCard, Crown, ChevronDown, Settings, MessageCircle, Image as ImageIcon, Star, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import logger from '@/lib/logger';

// Модели для дропдаунов — стиль syntx.ai
const MODELS = {
  design: [
    { id: "grok-imagine", name: "Grok Imagine", badge: "xAI", hot: true, desc: "Креативные фото с юмором" },
    { id: "gpt-image", name: "GPT Image 1.5", badge: "OpenAI", desc: "Точное следование промпту" },
    { id: "nano-banana-pro", name: "Nano Banana Pro", badge: "4K", new: true, desc: "Безлимит в подписке" },
    { id: "flux-2-pro", name: "FLUX.2 Pro", badge: "BFL", desc: "Быстрая генерация" },
    { id: "seedream-4.5", name: "Seedream 4.5", badge: "ByteDance", desc: "Фотореализм" },
    { id: "nano-banana", name: "Nano Banana", desc: "Базовая модель" },
    { id: "z-image", name: "Z-image", badge: "Эконом", desc: "Самая дешёвая" },
  ],
  video: [
    { id: "veo-3.1", name: "Veo 3.1", badge: "Google", hot: true, desc: "Аудио + высокое качество" },
    { id: "kling-motion-control", name: "Motion Control", badge: "Motion", new: true, desc: "Перенос движений" },
    { id: "kling", name: "Kling AI", badge: "Trending", desc: "Turbo/Audio/Pro режимы" },
    { id: "grok-video", name: "Grok Video", badge: "xAI", hot: true, desc: "T2V + I2V + Аудио" },
    { id: "sora-2", name: "Sora 2", badge: "OpenAI", desc: "Баланс цена/качество" },
    { id: "sora-2-pro", name: "Sora 2 Pro", badge: "Premium", desc: "1080p до 15 сек" },
    { id: "kling-o1", name: "Kling O1", badge: "FAL.ai", desc: "First→Last кадры" },
    { id: "wan", name: "WAN AI", desc: "Высокое разрешение" },
  ],
  audio: [
    { id: "suno", name: "Suno AI", badge: "Music", desc: "Генерация музыки" },
  ],
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'design' | 'video' | 'audio' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const telegramAuth = useTelegramAuth();
  const supabaseAuth = useAuth();
  const telegramUser = telegramAuth.user;
  const supabaseUser = supabaseAuth.user;
  const authLoading = telegramAuth.loading || supabaseAuth.loading;
  const { balance, fetchBalance } = useCreditsStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (telegramUser || supabaseUser) {
      fetchBalance();
    }
  }, [telegramUser, supabaseUser, fetchBalance]);

  const handleSignOut = useCallback(async () => {
    try {
      if (telegramUser) {
        await telegramAuth.signOut();
      }
      if (supabaseUser) {
        await supabaseAuth.signOut();
      }
      setUserMenuOpen(false);
      toast.success('Вы вышли из аккаунта');
    } catch (error) {
      logger.error('Sign out error:', error);
      toast.error('Ошибка выхода');
    }
  }, [telegramUser, supabaseUser, telegramAuth, supabaseAuth]);

  const handleConnectBot = useCallback(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoomBot';
    window.open(`https://t.me/${botUsername}?start=notify`, '_blank');
    setUserMenuOpen(false);
  }, []);

  const displayName = useMemo(() =>
    telegramUser?.firstName ||
    telegramUser?.username ||
    supabaseUser?.email ||
    'Пользователь',
    [telegramUser?.firstName, telegramUser?.username, supabaseUser?.email]
  );

  const navigation = useMemo(() => [
    { name: 'Дизайн', dropdown: 'design' as const },
    { name: 'Видео', dropdown: 'video' as const },
    { name: 'Аудио', dropdown: 'audio' as const },
    { name: 'Вдохновение', href: '/inspiration' },
    { name: 'Тарифы', href: '/pricing' },
  ], []);

  return (
    <>
      {/* Header - Premium Higgsfield style */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-2xl">
        <nav className="container mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#a78bfa] to-[#22d3ee] flex items-center justify-center shadow-lg shadow-[#a78bfa]/20 group-hover:shadow-[#a78bfa]/30 transition-shadow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-[16px] font-semibold text-[var(--text)] tracking-tight">LensRoom</span>
            </Link>

            {/* Desktop Nav - Premium style */}
            <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              {navigation.map((item) => {
                const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'));
                
                if (item.dropdown) {
                  const isDropdownOpen = activeDropdown === item.dropdown;
                  return (
                    <div key={item.name} className="relative">
                      <button
                        onClick={() => setActiveDropdown(isDropdownOpen ? null : item.dropdown!)}
                        className={cn(
                          "px-4 py-2 text-[14px] font-medium transition-all duration-200 rounded-[10px] flex items-center gap-1.5",
                          isDropdownOpen
                            ? "text-[var(--text)] bg-[var(--surface2)]"
                            : "text-[var(--muted-light)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50"
                        )}
                      >
                        {item.name}
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 transition-transform duration-200",
                          isDropdownOpen && "rotate-180"
                        )} />
                      </button>
                      
                      {/* Dropdown - Mega Menu style like syntx.ai */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-[20px] shadow-2xl shadow-black/30 overflow-hidden backdrop-blur-xl"
                          >
                            {/* Header */}
                            <div className="px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[#a78bfa]/5 to-[#22d3ee]/5">
                              <span className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                                {item.name === 'Дизайн' ? 'Фото модели' : item.name === 'Видео' ? 'Видео модели' : 'Аудио модели'}
                              </span>
                            </div>
                            
                            {/* Models Grid - Clean style like syntx.ai */}
                            <div className="p-3 grid grid-cols-2 gap-1">
                              {MODELS[item.dropdown].map((model: any) => (
                                <Link
                                  key={model.id}
                                  href={`/create/studio?section=${item.dropdown === 'design' ? 'image' : item.dropdown}&model=${model.id}`}
                                  onClick={() => setActiveDropdown(null)}
                                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-[var(--surface2)] transition-all duration-150"
                                >
                                  {/* Name */}
                                  <span className="text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent-primary)] transition-colors">{model.name}</span>
                                </Link>
                              ))}
                            </div>
                            
                            {/* Footer */}
                            <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface2)]/30">
                              <Link
                                href={`/create/studio?section=${item.dropdown === 'design' ? 'image' : item.dropdown}`}
                                onClick={() => setActiveDropdown(null)}
                                className="text-[12px] font-medium text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                              >
                                Все модели →
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    href={item.href!}
                    className={cn(
                      "px-4 py-2 text-[14px] font-medium transition-all duration-200 rounded-[10px]",
                      isActive
                        ? "text-[var(--text)] bg-[var(--surface2)]"
                        : "text-[var(--muted-light)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side - Premium style */}
            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggle />
              
              {authLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-10 bg-[var(--surface)] rounded-[12px] animate-pulse" />
                  <button
                    onClick={() => {
                      window.localStorage.clear();
                      window.location.reload();
                    }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)] px-2 py-1 rounded"
                    title="Сбросить и перезагрузить"
                  >
                    ⟳
                  </button>
                </div>
              ) : (telegramUser || supabaseUser) ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-200"
                  >
                    {telegramUser?.photoUrl ? (
                      <Image
                        src={telegramUser.photoUrl}
                        alt={displayName}
                        width={28}
                        height={28}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent-primary)] text-[13px] font-semibold">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-[14px] font-semibold text-[var(--text)]">
                      {balance} <Star className="w-3.5 h-3.5 inline text-[var(--accent-primary)]" />
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-[var(--muted)] transition-transform duration-200",
                      userMenuOpen && "rotate-180"
                    )} />
                  </button>

                  {/* User Dropdown */}
                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-1 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 overflow-hidden"
                        >
                          {/* User Info */}
                          <div className="px-3 py-2.5 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2.5">
                              {telegramUser?.photoUrl ? (
                                <Image
                                  src={telegramUser.photoUrl}
                                  alt={displayName}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-semibold text-sm">
                                  {displayName[0].toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text)] truncate">
                                  {displayName}
                                </p>
                                <p className="text-xs text-[var(--muted)]">
                                  {balance} ⭐ кредитов
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            <Link
                              href="/referrals"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <User className="w-4 h-4" />
                              Рефералы
                            </Link>
                            <Link
                              href="/profile"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <User className="w-4 h-4" />
                              Профиль
                            </Link>
                            <Link
                              href="/library"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" />
                              Мои результаты
                            </Link>
                            <Link
                              href="/account/subscription"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <Crown className="w-4 h-4" />
                              Подписка
                            </Link>
                            <Link
                              href="/pricing"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                              Купить кредиты
                            </Link>
                            
                            {telegramUser && !telegramUser.canNotify && (
                              <button
                                onClick={handleConnectBot}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors w-full"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Уведомления
                              </button>
                            )}

                            {telegramUser?.isAdmin && (
                              <>
                                <Link
                                  href="/admin"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                                >
                                  <Settings className="w-4 h-4" />
                                  Админ панель
                                </Link>
                                <Link
                                  href="/admin/referrals"
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                                >
                                  <User className="w-4 h-4" />
                                  Рефералы
                                </Link>
                              </>
                            )}
                          </div>

                          {/* Logout */}
                          <div className="border-t border-[var(--border)] py-1">
                            <button
                              onClick={handleSignOut}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full"
                            >
                              <LogOut className="w-4 h-4" />
                              Выйти
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLoginOpen(true)}
                  className="h-8"
                >
                  Войти
                </Button>
              )}
            </div>

            {/* Mobile */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Balance on mobile */}
              {(telegramUser || supabaseUser) && (
                <Link 
                  href="/pricing"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)]"
                >
                  <Star className="w-3.5 h-3.5 text-[var(--gold)] fill-[var(--gold)]" />
                  <span className="text-xs font-bold text-[var(--text)]">{balance}</span>
                </Link>
              )}
              
              <ThemeToggle />
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu - Full Screen syntx.ai style */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-xl"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="relative h-full flex flex-col pt-[72px] pb-safe"
            >
              {/* User Card - Top */}
              {(telegramUser || supabaseUser) && (
                <div className="px-5 pb-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      {telegramUser?.photoUrl ? (
                        <Image
                          src={telegramUser.photoUrl}
                          alt={displayName}
                          width={44}
                          height={44}
                          className="rounded-full ring-2 ring-[var(--accent-primary)]/30"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-bold text-lg">
                          {displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-base font-semibold text-[var(--text)]">{displayName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
                          <span className="text-sm font-bold text-[var(--gold)]">{balance}</span>
                          <span className="text-xs text-[var(--muted)]">кредитов</span>
                        </div>
                      </div>
                      <Link
                        href="/pricing"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-3 py-1.5 rounded-full bg-[var(--gold)] text-black text-xs font-bold"
                      >
                        +⭐
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 pb-24">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Link
                    href="/create?section=image"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-primary)]/50 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--text)]">Фото</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Создать изображение</p>
                  </Link>
                  <Link
                    href="/create?section=video"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-secondary)]/50 transition-colors"
                  >
                    <Sparkles className="w-6 h-6 text-[var(--accent-secondary)] mb-2" />
                    <p className="text-sm font-semibold text-[var(--text)]">Видео</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">Создать видео</p>
                  </Link>
                </div>

                {/* Models Sections */}
                {(['design', 'video', 'audio'] as const).map((section) => (
                  <div key={section} className="mb-6">
                    <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-3 px-1">
                      {section === 'design' ? '🎨 Фото модели' : section === 'video' ? '🎬 Видео модели' : '🎵 Аудио'}
                    </h3>
                    <div className="space-y-1">
                      {MODELS[section].slice(0, 4).map((model: any) => (
                        <Link
                          key={model.id}
                          href={`/create/studio?section=${section === 'design' ? 'image' : section}&model=${model.id}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors"
                        >
                          <span className="text-[15px] font-medium text-[var(--text)]">{model.name}</span>
                          {(model.hot || model.new) && (
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-full",
                              model.hot ? "bg-orange-500/20 text-orange-400" : "bg-[var(--gold)]/20 text-[var(--gold)]"
                            )}>
                              {model.hot ? 'HOT' : 'NEW'}
                            </span>
                          )}
                        </Link>
                      ))}
                      <Link
                        href={`/create/studio?section=${section === 'design' ? 'image' : section}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
                      >
                        Все модели →
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Navigation Links */}
                <div className="space-y-1 mb-6">
                  <Link
                    href="/inspiration"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors"
                  >
                    <span className="text-lg">✨</span>
                    <span className="text-[15px] font-medium text-[var(--text)]">Вдохновение</span>
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] transition-colors"
                  >
                    <span className="text-lg">💎</span>
                    <span className="text-[15px] font-medium text-[var(--text)]">Тарифы</span>
                  </Link>
                </div>

                {/* User Actions */}
                {(telegramUser || supabaseUser) ? (
                  <div className="space-y-1">
                    <Link
                      href="/library"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface)] transition-colors"
                    >
                      <ImageIcon className="w-5 h-5 text-[var(--muted)]" />
                      <span className="text-[15px] text-[var(--muted)]">Мои результаты</span>
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface)] transition-colors"
                    >
                      <User className="w-5 h-5 text-[var(--muted)]" />
                      <span className="text-[15px] text-[var(--muted)]">Профиль</span>
                    </Link>
                    <Link
                      href="/referrals"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--surface)] transition-colors"
                    >
                      <User className="w-5 h-5 text-[var(--muted)]" />
                      <span className="text-[15px] text-[var(--muted)]">Рефералы</span>
                    </Link>
                    <button
                      onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5 text-red-500" />
                      <span className="text-[15px] text-red-500">Выйти</span>
                    </button>
                  </div>
                ) : (
                  <Button 
                    className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
                    onClick={() => { setMobileMenuOpen(false); setLoginOpen(true); }}
                  >
                    Войти через Telegram
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Spacer - matches header height */}
      <div className="h-16" />
    </>
  );
}
