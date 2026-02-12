'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo, useLayoutEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, CreditCard, Crown, ChevronDown, Settings, MessageCircle, Image as ImageIcon, Star, User, Music, Video, FolderOpen, Clapperboard } from 'lucide-react';
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
    { id: "grok-imagine", name: "Grok Imagine", badge: "Spicy", hot: true, desc: "Креативные фото с юмором" },
    { id: "gpt-image", name: "GPT Image 1.5", badge: "v1.5", desc: "Точное следование промпту" },
    { id: "nano-banana-pro", name: "Nano Banana Pro", badge: "4K", new: true, desc: "Безлимит в подписке" },
    { id: "flux-2-pro", name: "FLUX.2 Pro", badge: "Pro", desc: "Быстрая генерация" },
    { id: "seedream-4.5", name: "Seedream 4.5", badge: "Ultra", desc: "Фотореализм" },
    { id: "nano-banana", name: "Nano Banana", desc: "Базовая модель" },
    { id: "z-image", name: "Z-image", badge: "Эконом", desc: "Самая дешёвая" },
  ],
  video: [
    { id: "veo-3.1-fast", name: "Veo 3.1 Fast", badge: "Cinema", hot: true, desc: "Быстро • 4-8с • До 3 референсов" },
    { id: "kling-2.1", name: "Kling 2.1", badge: "Master", desc: "5-10с • Максимальное качество" },
    { id: "kling-2.5", name: "Kling 2.5", badge: "Turbo", desc: "5-10с • Скорость + качество" },
    { id: "kling-2.6", name: "Kling 2.6", badge: "Audio", new: true, desc: "5-10с • Генерация звука" },
    { id: "kling-o1", name: "Kling O1 Standard", badge: "PRO", desc: "I2V • Start/End • V2V Reference" },
    { id: "kling-o3-standard", name: "Kling O3 Standard", badge: "NEW", new: true, desc: "T2V • I2V • V2V • Multishot • Audio" },
    { id: "kling-motion-control", name: "Motion Control", badge: "Motion", desc: "Перенос движения на персонажа" },
    { id: "grok-video", name: "Grok Video", badge: "Audio", hot: true, desc: "6-30с • 6 стилей • Аудио" },
    { id: "sora-2", name: "Sora 2", badge: "Pro", desc: "10-15с • Универсальная" },
    { id: "wan-2.6", name: "WAN 2.6", badge: "Ultra", desc: "5-15с • Управление камерой • V2V" },
  ],
  audio: [
    { id: "suno", name: "Suno AI", badge: "Music", desc: "Генерация музыки" },
  ],
};

type PrimarySectionId = 'photo' | 'video' | 'motion' | 'music' | 'voice';

const MOBILE_PRIMARY_SECTIONS: Array<{
  id: PrimarySectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  // Used for the "Quick Actions" color accents in the fullscreen mobile menu.
  accentClassName: string;
}> = [
  {
    id: 'photo',
    label: 'Фото',
    icon: ImageIcon,
    href: '/create/studio?section=photo',
    accentClassName: 'text-blue-500 hover:border-blue-500/50',
  },
  {
    id: 'video',
    label: 'Видео',
    icon: Video,
    href: '/create/studio?section=video',
    accentClassName: 'text-violet-500 hover:border-violet-500/50',
  },
  {
    id: 'motion',
    label: 'Motion Control',
    icon: Clapperboard,
    href: '/create/studio?section=motion&model=kling-motion-control',
    accentClassName: 'text-orange-500 hover:border-orange-500/50',
  },
  {
    id: 'music',
    label: 'Музыка',
    icon: Music,
    href: '/create/studio?section=music',
    accentClassName: 'text-pink-500 hover:border-pink-500/50',
  },
  {
    id: 'voice',
    label: 'Озвучка',
    icon: User,
    href: '/create/studio?section=voice',
    accentClassName: 'text-emerald-500 hover:border-emerald-500/50',
  },
];

interface HeaderProps {
  pageTitle?: string;
}

export function Header({ pageTitle }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuMode, setMobileMenuMode] = useState<'photo' | 'video' | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'design' | 'video' | 'audio' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStudio = pathname.startsWith('/create/studio');
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

  // Ensure the fullscreen menu always starts in a clean (collapsed) state.
  useEffect(() => {
    if (mobileMenuOpen) setMobileMenuMode(null);
  }, [mobileMenuOpen]);

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
    { name: 'Фото', dropdown: 'design' as const },
    { name: 'Видео', dropdown: 'video' as const },
    { name: 'Музыка', href: '/create/studio?section=music' },
    { name: 'Озвучка', href: '/create/studio?section=voice' },
    { name: 'Вдохновение', href: '/inspiration' },
    { name: 'Тарифы', href: '/pricing' },
  ], []);

  // Keep CSS var in sync with the actual fixed header height (top bar + mobile primary row).
  // This prevents "anchors"/fixed overlays from hiding content on mobile across devices.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      const h = Math.max(0, Math.round(el.getBoundingClientRect().height));
      if (h > 0) document.documentElement.style.setProperty('--app-header-h', `${h}px`);
    };

    apply();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => apply());
      ro.observe(el);
    }

    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true } as any);

    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply as any);
      ro?.disconnect();
    };
  }, []);

  const activePrimarySection = useMemo<PrimarySectionId | null>(() => {
    if (!isStudio) return null;
    const raw = (searchParams.get('section') || searchParams.get('kind') || '').trim().toLowerCase();
    if (raw === 'image') return 'photo';
    if (raw === 'audio') return 'music';
    if (raw === 'photo') return 'photo';
    if (raw === 'video') return 'video';
    if (raw === 'motion') return 'motion';
    if (raw === 'music') return 'music';
    if (raw === 'voice') return 'voice';
    return 'photo';
  }, [isStudio, searchParams]);

  const goToPrimarySection = useCallback((nextSection: PrimarySectionId) => {
    if (!nextSection) return;

    if (isStudio) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', nextSection);

      // Keep project/thread intact (existing params already include them).
      // Avoid leaking section-specific params across modes.
      if (nextSection !== 'video') params.delete('generationId');

      if (nextSection === 'motion') {
        params.set('model', 'kling-motion-control');
      } else if (nextSection === 'photo') {
        // If we're switching from a non-photo section, the `model` could be a video model; force a safe default.
        if (activePrimarySection !== 'photo') {
          params.set('model', 'nano-banana-pro');
        } else if (!params.get('model')?.trim()) {
          params.set('model', 'nano-banana-pro');
        }
      } else if (nextSection === 'video') {
        if (activePrimarySection !== 'video') params.delete('model');
      } else {
        params.delete('model');
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      return;
    }

    const href = MOBILE_PRIMARY_SECTIONS.find((s) => s.id === nextSection)?.href;
    if (href) router.push(href, { scroll: false });
  }, [activePrimarySection, isStudio, pathname, router, searchParams]);

  const photoModelsForMenu = useMemo(() => MODELS.design, []);
  const videoModelsForMenu = useMemo(
    () => MODELS.video.filter((m) => m.id !== 'kling-motion-control'),
    []
  );

  return (
    <>
      {/* Header - Premium Higgsfield style */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--surface-glass)] backdrop-blur-2xl"
      >
        <nav className="container mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#8cf425] to-[#6bbf1a] flex items-center justify-center shadow-lg shadow-[#8cf425]/20 group-hover:shadow-[#8cf425]/30 transition-shadow">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-[16px] font-semibold text-[var(--text)] tracking-tight">LensRoom</span>
            </Link>

            {/* Desktop Nav - Premium style */}
            <div className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
              {navigation.map((item, index) => {
                const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'));
                
                if (item.dropdown) {
            const isDropdownOpen = activeDropdown === item.dropdown;
            return (
              <div key={item.name || `dropdown-${item.dropdown}`} className="relative">
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
                            <div className="px-4 py-3 border-b border-[var(--border)] bg-gradient-to-r from-[#8cf425]/5 to-[#6bbf1a]/5">
                              <span className="text-[13px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                                {item.dropdown === 'design' ? 'Фото модели' : 'Видео модели'}
                              </span>
                            </div>
                            
                            {/* Models Grid - Clean style like syntx.ai */}
                            <div className="p-3 grid grid-cols-2 gap-1">
                              {MODELS[item.dropdown].map((model: any) => {
                                // Motion Control: same video generator, opens on "Движение" tab (section=video)
                                const section = item.dropdown === 'design' ? 'photo' : item.dropdown;
                                return (
                                  <Link
                                    key={model.id}
                                    href={`/create/studio?section=${section}&model=${model.id}`}
                                    onClick={() => setActiveDropdown(null)}
                                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-[var(--surface2)] transition-all duration-150"
                                  >
                                    {/* Name */}
                                    <span className="text-[14px] font-medium text-[var(--text)] group-hover:text-[var(--accent-primary)] transition-colors">{model.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                            
                            {/* Footer */}
                            <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--surface2)]/30">
                              <Link
                                href={`/create/studio?section=${item.dropdown === 'design' ? 'photo' : item.dropdown}`}
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
            <div className="flex lg:hidden items-center gap-2 relative">
              {/* Page Title - Center (mobile only) */}
              {pageTitle && (
                <span className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-[var(--text)] truncate max-w-[40vw] pointer-events-none">
                  {pageTitle}
                </span>
              )}
              
              {/* Balance on mobile */}
              {(telegramUser || supabaseUser) && (
                <Link 
                  href="/pricing"
                  className="flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-full bg-[var(--surface)] border border-[var(--border)]"
                >
                  <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
                  <span className="text-sm font-bold text-[var(--text)]">{balance}</span>
                </Link>
              )}
              
              <ThemeToggle />
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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

        {/* Mobile Primary Row: visible quick switch to Studio sections (no hamburger needed) */}
        <div className="lg:hidden border-t border-[var(--border)]" data-testid="mobile-primary-row">
          <div className="container mx-auto px-3">
            <div className="h-11 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              {MOBILE_PRIMARY_SECTIONS.map((item) => {
                const isActive = isStudio && activePrimarySection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`mobile-primary-${item.id}`}
                    onClick={() => goToPrimarySection(item.id)}
                    className={cn(
                      // Visually compact like syntx/krea, but keep a 44px minimum touch target.
                      'min-h-[44px] h-9 px-3 rounded-full border transition-all flex items-center whitespace-nowrap touch-manipulation active:scale-[0.98]',
                      isActive
                        ? 'bg-[var(--surface2)]/80 border-[var(--border-hover)] text-[var(--text)]'
                        : 'bg-[var(--surface)]/70 border-[var(--border)] text-[var(--muted-light)] hover:text-[var(--text)] hover:bg-[var(--surface2)]/60'
                    )}
                  >
                    <span className="text-[12px] font-semibold tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
              className="relative h-full flex flex-col pt-[var(--app-header-h)] pb-safe"
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
                {/* Primary modes (duplicates the row, but useful inside menu for quick access) */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
                    Режим
                  </h3>
                  <div className="space-y-1">
                    {/* Photo: collapsible list of photo models */}
                    <button
                      type="button"
                      data-testid="mobile-menu-photo-toggle"
                      onClick={() => setMobileMenuMode((v) => (v === 'photo' ? null : 'photo'))}
                      className="w-full flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Фото</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-[var(--muted)] transition-transform duration-200',
                          mobileMenuMode === 'photo' && 'rotate-180'
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileMenuMode === 'photo' && (
                        <motion.div
                          data-testid="mobile-menu-photo-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden pl-2"
                        >
                          <div className="mt-1 space-y-1">
                            {photoModelsForMenu.map((model: any) => (
                              <Link
                                key={model.id}
                                href={`/create/studio?section=photo&model=${model.id}`}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  setMobileMenuMode(null);
                                }}
                                className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl bg-[var(--surface)]/70 hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                              >
                                <span className="text-[13px] text-[var(--text)]">{model.name}</span>
                                {(model.hot || model.new) && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 text-[10px] font-bold rounded-full',
                                      model.hot ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--gold)]/20 text-[var(--gold)]'
                                    )}
                                  >
                                    {model.hot ? 'HOT' : 'NEW'}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Video: collapsible list of video models */}
                    <button
                      type="button"
                      data-testid="mobile-menu-video-toggle"
                      onClick={() => setMobileMenuMode((v) => (v === 'video' ? null : 'video'))}
                      className="w-full flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Видео</span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-[var(--muted)] transition-transform duration-200',
                          mobileMenuMode === 'video' && 'rotate-180'
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileMenuMode === 'video' && (
                        <motion.div
                          data-testid="mobile-menu-video-panel"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden pl-2"
                        >
                          <div className="mt-1 space-y-1">
                            {videoModelsForMenu.map((model: any) => (
                              <Link
                                key={model.id}
                                href={`/create/studio?section=video&model=${model.id}`}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  setMobileMenuMode(null);
                                }}
                                className="flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl bg-[var(--surface)]/70 hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                              >
                                <span className="text-[13px] text-[var(--text)]">{model.name}</span>
                                {(model.hot || model.new) && (
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 text-[10px] font-bold rounded-full',
                                      model.hot ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--gold)]/20 text-[var(--gold)]'
                                    )}
                                  >
                                    {model.hot ? 'HOT' : 'NEW'}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Motion Control: direct link */}
                    <Link
                      href="/create/studio?section=motion&model=kling-motion-control"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileMenuMode(null);
                      }}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Motion Control</span>
                    </Link>

                    {/* Music + Voice: direct links */}
                    <Link
                      href="/create/studio?section=music"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileMenuMode(null);
                      }}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Музыка</span>
                    </Link>
                    <Link
                      href="/create/studio?section=voice"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileMenuMode(null);
                      }}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Озвучка</span>
                    </Link>
                  </div>
                </div>

                {/* Site navigation */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
                    Разделы
                  </h3>
                  <div className="space-y-1">
                    <Link
                      href="/library"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Мои работы</span>
                    </Link>
                    <Link
                      href="/inspiration"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Вдохновение</span>
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface2)] active:scale-[0.98] transition-all"
                    >
                      <span className="text-[14px] font-medium text-[var(--text)]">Тарифы</span>
                    </Link>
                  </div>
                </div>

                {/* Account Section */}
                {(telegramUser || supabaseUser) ? (
                  <div className="pt-4 border-t border-[var(--border)]">
                    <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2 px-1">
                      Аккаунт
                    </h3>
                    <div className="space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl hover:bg-[var(--surface)] active:scale-[0.98] transition-all"
                      >
                        <span className="text-[14px] text-[var(--muted)]">Профиль</span>
                      </Link>
                      <Link
                        href="/account/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl hover:bg-[var(--surface)] active:scale-[0.98] transition-all"
                      >
                        <span className="text-[14px] text-[var(--muted)]">Подписка</span>
                      </Link>
                      <Link
                        href="/referrals"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl hover:bg-[var(--surface)] active:scale-[0.98] transition-all"
                      >
                        <span className="text-[14px] text-[var(--muted)]">Рефералы</span>
                      </Link>
                      <button
                        onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                        className="flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl hover:bg-red-500/10 active:scale-[0.98] transition-all w-full"
                      >
                        <span className="text-[14px] text-red-500">Выйти</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-[var(--border)]">
                    <Button 
                      className="w-full h-14 text-base font-semibold bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90 active:scale-[0.98] transition-all"
                      onClick={() => { setMobileMenuOpen(false); setLoginOpen(true); }}
                    >
                      Войти через Telegram
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <LoginDialog isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Spacer - matches header height */}
      <div className="h-[var(--app-header-h)]" />
    </>
  );
}
