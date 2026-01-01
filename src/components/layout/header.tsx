'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, CreditCard, Crown, ChevronDown, Settings, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

// Модели для дропдаунов
const MODELS = {
  design: [
    { id: 'nano-banana', name: 'Nano Banana', cost: 7 },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', cost: 35 },
    { id: 'gpt-image', name: 'GPT Image', cost: 42 },
    { id: 'flux-2-pro', name: 'FLUX.2 Pro', cost: 10 },
    { id: 'flux-2-flex', name: 'FLUX.2 Flex', cost: 32 },
    { id: 'seedream-4.5', name: 'Seedream 4.5', cost: 11 },
    { id: 'z-image', name: 'Z-image', cost: 2 },
    { id: 'midjourney', name: 'Midjourney V7', cost: 50 },
  ],
  video: [
    { id: 'veo-3.1', name: 'Veo 3.1', cost: 260 },
    { id: 'kling', name: 'Kling AI', cost: 105 },
    { id: 'kling-o1', name: 'Kling O1', cost: 56 },
    { id: 'sora-2', name: 'Sora 2', cost: 50 },
    { id: 'sora-2-pro', name: 'Sora 2 Pro', cost: 650 },
    { id: 'wan', name: 'WAN AI', cost: 217 },
  ],
  audio: [
    { id: 'eleven-labs', name: 'ElevenLabs', cost: 15 },
    { id: 'suno', name: 'Suno AI', cost: 25 },
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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] glass">
        <nav className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-bold text-[var(--text)]">LensRoom</span>
            </Link>

            {/* Desktop Nav */}
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
                          "px-4 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1.5",
                          isDropdownOpen
                            ? "text-[var(--text)] bg-[var(--surface2)]"
                            : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                        )}
                      >
                        {item.name}
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 transition-transform",
                          isDropdownOpen && "rotate-180"
                        )} />
                      </button>
                      
                      {/* Dropdown */}
                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
                          >
                            <div className="py-1">
                              {MODELS[item.dropdown].map((model) => (
                                <Link
                                  key={model.id}
                                  href={`/generator?section=${item.dropdown === 'design' ? 'image' : item.dropdown}&model=${model.id}`}
                                  onClick={() => setActiveDropdown(null)}
                                  className="flex items-center justify-between px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                                >
                                  <span>{model.name}</span>
                                  <span className="text-xs text-[var(--muted)]">{model.cost}⭐</span>
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
                      "px-4 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1.5",
                      isActive
                        ? "text-[var(--text)] bg-[var(--surface2)]"
                        : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              
              {authLoading ? (
                <div className="w-24 h-10 bg-[var(--surface)] rounded-xl animate-pulse" />
              ) : (telegramUser || supabaseUser) ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-white/20 transition-all"
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
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white">
                      {balance} ⭐
                    </span>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-[var(--muted)] transition-transform",
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
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          {/* User Info */}
                          <div className="px-4 py-3 border-b border-[var(--border)]">
                            <div className="flex items-center gap-3">
                              {telegramUser?.photoUrl ? (
                                <Image
                                  src={telegramUser.photoUrl}
                                  alt={displayName}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] font-bold">
                                  {displayName[0].toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text)] truncate">
                                  {displayName}
                                </p>
                                {telegramUser?.username ? (
                                  <p className="text-xs text-[var(--muted)]">@{telegramUser.username}</p>
                                ) : supabaseUser?.email ? (
                                  <p className="text-xs text-[var(--muted)]">{supabaseUser.email}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-sm font-semibold text-white">{balance} ⭐</span>
                              <span className="text-xs text-[var(--muted)]">кредитов</span>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-1">
                            <Link
                              href="/library"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" />
                              Мои результаты
                            </Link>
                            <Link
                              href="/account/subscription"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <Crown className="w-4 h-4" />
                              Подписка
                            </Link>
                            <Link
                              href="/pricing"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                              Купить кредиты
                            </Link>
                            
                            {telegramUser && !telegramUser.canNotify && (
                              <button
                                onClick={handleConnectBot}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors w-full"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Подключить уведомления
                              </button>
                            )}

                            {telegramUser?.isAdmin && (
                              <Link
                                href="/admin/waitlist"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                                Админ: Waitlist
                              </Link>
                            )}
                          </div>

                          {/* Logout */}
                          <div className="border-t border-[var(--border)] py-1">
                            <button
                              onClick={handleSignOut}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
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
                <Button variant="outline" onClick={() => setLoginOpen(true)}>
                  Войти
                </Button>
              )}
            </div>

            {/* Mobile */}
            <div className="flex lg:hidden items-center gap-1">
              <ThemeToggle />
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-[var(--text)]" />
                ) : (
                  <Menu className="w-6 h-6 text-[var(--text)]" />
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
            className="fixed inset-x-0 top-16 z-40 lg:hidden"
          >
            <div 
              className="absolute inset-0 bg-[var(--bg)] h-screen"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative bg-[var(--surface)] border-b border-[var(--border)] shadow-xl">
              <div className="container mx-auto px-6 py-4 space-y-1">
                {/* Mobile Dropdowns */}
                {(['design', 'video', 'audio'] as const).map((section) => (
                  <div key={section} className="space-y-1">
                    <div className="px-4 py-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                      {section === 'design' ? 'Дизайн' : section === 'video' ? 'Видео' : 'Аудио'}
                    </div>
                    {MODELS[section].map((model) => (
                      <Link
                        key={model.id}
                        href={`/generator?section=${section === 'design' ? 'image' : section}&model=${model.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <span>{model.name}</span>
                        <span className="text-xs">{model.cost}⭐</span>
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="pt-4 border-t border-[var(--border)]">
                  <Link
                    href="/inspiration"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    Вдохновение
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                  >
                    Тарифы
                  </Link>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border)] space-y-2">
                  {(telegramUser || supabaseUser) ? (
                    <>
                      <div className="px-4 py-3 rounded-xl bg-[var(--surface2)]">
                        <div className="flex items-center gap-3">
                          {telegramUser?.photoUrl ? (
                            <Image
                              src={telegramUser.photoUrl}
                              alt={displayName}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                              {displayName[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {balance} ⭐
                            </p>
                            <p className="text-xs text-[var(--muted)]">{displayName}</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/library"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--muted)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Мои результаты
                      </Link>
                      <Link
                        href="/account/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--muted)] hover:bg-[var(--surface2)] transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        Подписка
                      </Link>
                      <button
                        onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
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
      <div className="h-16" />
    </>
  );
}
