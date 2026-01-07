'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, CreditCard, Crown, ChevronDown, Settings, MessageCircle, Image as ImageIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

// Модели для дропдаунов — clean style
const MODELS = {
  design: [
    { id: "grok-imagine", name: "Grok Imagine", badge: "xAI", hot: true },
    { id: "gpt-image", name: "GPT Image 1.5", badge: "OpenAI" },
    { id: "nano-banana-pro", name: "Nano Banana Pro", badge: "4K", new: true },
    { id: "flux-2-pro", name: "FLUX.2 Pro", badge: "BFL" },
    { id: "seedream-4.5", name: "Seedream 4.5", badge: "ByteDance" },
    { id: "nano-banana", name: "Nano Banana" },
    { id: "z-image", name: "Z-image" },
  ],
  video: [
    { id: "veo-3.1", name: "Veo 3.1", badge: "Google", hot: true },
    { id: "kling-motion-control", name: "Motion Control", badge: "Kling", new: true },
    { id: "kling", name: "Kling AI", badge: "Trending" },
    { id: "grok-video", name: "Grok Video", badge: "xAI", hot: true },
    { id: "sora-2", name: "Sora 2", badge: "OpenAI" },
    { id: "sora-2-pro", name: "Sora 2 Pro", badge: "Premium" },
    { id: "kling-o1", name: "Kling O1", badge: "FAL.ai" },
    { id: "wan", name: "WAN AI" },
  ],
  audio: [
    { id: "suno", name: "Suno AI", badge: "Music" },
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

  const handleSignOut = async () => {
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
      console.error('Sign out error:', error);
      toast.error('Ошибка выхода');
    }
  };

  const handleConnectBot = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoomBot';
    window.open(`https://t.me/${botUsername}?start=notify`, '_blank');
    setUserMenuOpen(false);
  };

  const displayName =
    telegramUser?.firstName ||
    telegramUser?.username ||
    supabaseUser?.email ||
    'Пользователь';

  const navigation: Array<{ name: string; href?: string; dropdown?: 'design' | 'video' | 'audio' }> = [
    { name: 'Дизайн', dropdown: 'design' },
    { name: 'Видео', dropdown: 'video' },
    { name: 'Аудио', dropdown: 'audio' },
    { name: 'Вдохновение', href: '/inspiration' },
    { name: 'Тарифы', href: '/pricing' },
  ];

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
                      
                      {/* Dropdown - clean style */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[340px] bg-[var(--surface)]/98 backdrop-blur-xl border border-[var(--border)] rounded-[16px] shadow-2xl shadow-black/30 overflow-hidden"
                          >
                            {/* Models Grid */}
                            <div className="p-3 grid grid-cols-2 gap-1">
                              {MODELS[item.dropdown].map((model: any) => (
                                <Link
                                  key={model.id}
                                  href={`/generator?section=${item.dropdown === 'design' ? 'image' : item.dropdown}&model=${model.id}`}
                                  onClick={() => setActiveDropdown(null)}
                                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-[var(--surface2)] transition-all duration-150"
                                >
                                  {/* Badge/Icon */}
                                  {model.hot ? (
                                    <span className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-[8px] font-bold text-white">●</span>
                                  ) : model.new ? (
                                    <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#a78bfa] to-[#22d3ee] flex items-center justify-center text-[8px] font-bold text-white">✦</span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-md bg-[var(--surface2)] flex items-center justify-center text-[10px] font-medium text-[var(--muted)]">
                                      {model.name.charAt(0)}
                                    </span>
                                  )}
                                  
                                  {/* Name */}
                                  <span className="text-[13px] font-medium text-[var(--text)] group-hover:text-[var(--accent-primary)] transition-colors">{model.name}</span>
                                </Link>
                              ))}
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
                <div className="w-24 h-10 bg-[var(--surface)] rounded-[12px] animate-pulse" />
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
                              <Link
                                href="/admin/waitlist"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                Админ
                              </Link>
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
            <div className="flex lg:hidden items-center gap-1">
              <ThemeToggle />
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-14 z-40 lg:hidden"
          >
            <div 
              className="absolute inset-0 bg-[var(--bg)] h-screen"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative bg-[var(--surface)] border-b border-[var(--border)] shadow-lg max-h-[80vh] overflow-y-auto">
              <div className="container mx-auto px-4 py-3 space-y-1">
                {/* Mobile Dropdowns */}
                {(['design', 'video', 'audio'] as const).map((section) => (
                  <div key={section} className="space-y-0.5">
                    <div className="px-3 py-1.5 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      {section === 'design' ? 'Дизайн' : section === 'video' ? 'Видео' : 'Аудио'}
                    </div>
                    {MODELS[section].map((model) => (
                      <Link
                        key={model.id}
                        href={`/generator?section=${section === 'design' ? 'image' : section}&model=${model.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <span>{model.name}</span>
                        <span className="text-xs opacity-60">{model.cost}⭐</span>
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="pt-2 border-t border-[var(--border)]">
                  <Link
                    href="/inspiration"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    Вдохновение
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    Тарифы
                  </Link>
                </div>

                <div className="pt-2 border-t border-[var(--border)] space-y-1">
                  {(telegramUser || supabaseUser) ? (
                    <>
                      <div className="px-3 py-2 rounded-md bg-[var(--surface2)]">
                        <div className="flex items-center gap-2">
                          {telegramUser?.photoUrl ? (
                            <Image
                              src={telegramUser.photoUrl}
                              alt={displayName}
                              width={28}
                              height={28}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] font-semibold text-sm">
                              {displayName[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-[var(--text)]">
                              {balance} ⭐
                            </p>
                            <p className="text-xs text-[var(--muted)]">{displayName}</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/library"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--muted)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Мои результаты
                      </Link>
                      <Link
                        href="/account/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--muted)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        Подписка
                      </Link>
                      <button
                        onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Выйти
                      </button>
                    </>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); setLoginOpen(true); }}>
                      Войти
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Spacer */}
      <div className="h-14" />
    </>
  );
}
