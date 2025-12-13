'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, User, CreditCard, History, Settings, Crown, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { useTheme } from '@/lib/theme-provider';

const navigation = [
  { name: 'Фото', href: '/create' },
  { name: 'Видео', href: '/create/video' },
  { name: 'Продукты', href: '/create/products' },
  { name: 'Библиотека', href: '/library' },
  { name: 'Вдохновение', href: '/inspiration' },
  { name: 'Тарифы', href: '/pricing' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const { balance, loading: creditsLoading, fetchBalance } = useCreditsStore();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch credits when user logs in
  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user, fetchBalance]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isLoading = authLoading || creditsLoading;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled 
            ? "bg-[var(--color-bg-primary)]/90 backdrop-blur-2xl border-b border-[var(--color-border)]" 
            : "bg-transparent"
        )}
      >
        <nav className="container-apple">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 
                              flex items-center justify-center shadow-lg shadow-purple-500/25
                              group-hover:scale-110 group-hover:shadow-purple-500/40 transition-all duration-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--color-text-primary)]">
                LensRoom
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-purple-500/15 text-purple-400"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {/* Credits Badge */}
              <Link 
                href="/pricing"
                className={cn(
                  "px-4 py-2 rounded-lg border transition-colors",
                  balance < 20 && user
                    ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:border-yellow-500/50"
                    : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 hover:border-purple-500/50"
                )}
              >
                <span className={cn(
                  "text-sm font-bold bg-clip-text text-transparent",
                  balance < 20 && user
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                    : "bg-gradient-to-r from-purple-500 to-blue-500"
                )}>
                  {isLoading ? '...' : user ? `${balance} ⭐` : '100 ⭐'}
                </span>
              </Link>

              {/* Auth */}
              {authLoading ? (
                <div className="w-20 h-10 bg-[var(--color-bg-tertiary)] rounded-lg animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  </button>

                  {/* User Dropdown */}
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-64 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-[var(--color-border)]">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-purple-400 font-semibold">
                              {balance} кредитов
                            </span>
                          </div>
                        </div>
                        <div className="p-2">
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          >
                            <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            <span className="text-sm text-[var(--color-text-primary)]">Профиль</span>
                          </Link>
                          <Link
                            href="/account/subscription"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          >
                            <Crown className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-[var(--color-text-primary)]">Подписка</span>
                          </Link>
                          <Link
                            href="/history"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          >
                            <History className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            <span className="text-sm text-[var(--color-text-primary)]">История</span>
                          </Link>
                          <Link
                            href="/pricing"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                          >
                            <CreditCard className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            <span className="text-sm text-[var(--color-text-primary)]">Купить кредиты</span>
                          </Link>
                          <div className="my-2 border-t border-[var(--color-border)]" />
                          <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors w-full text-left"
                          >
                            <LogOut className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">Выйти</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setLoginOpen(true)}>
                  Войти
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-[var(--color-text-primary)]" />
              ) : (
                <Menu className="w-6 h-6 text-[var(--color-text-primary)]" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ top: '64px' }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Content */}
            <div className="relative bg-[var(--color-bg-elevated)] rounded-b-2xl shadow-xl border-b border-[var(--color-border)]">
              <div className="container-apple py-6 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-3 rounded-xl text-base font-medium transition-colors",
                        isActive
                          ? "bg-purple-500/15 text-purple-400"
                          : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-[var(--color-border)] space-y-3">
                  {/* Theme Toggle Mobile */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl w-full hover:bg-secondary transition-colors"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Светлая тема</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-5 h-5 text-muted-foreground" />
                        <span className="text-foreground">Тёмная тема</span>
                      </>
                    )}
                  </button>

                  <div className={cn(
                    "px-4 py-3 rounded-xl border",
                    balance < 20 && user
                      ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
                      : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30"
                  )}>
                    <span className={cn(
                      "text-sm font-bold bg-clip-text text-transparent",
                      balance < 20 && user
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                        : "bg-gradient-to-r from-purple-500 to-blue-500"
                    )}>
                      {user ? `${balance} ⭐ Кредитов` : '100 ⭐ Бесплатно'}
                    </span>
                  </div>
                  
                  {user ? (
                    <>
                      <Link
                        href="/account/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                      >
                        <Crown className="w-5 h-5 text-purple-400" />
                        <span className="text-[var(--color-text-primary)]">Управление подпиской</span>
                      </Link>
                      <Button variant="secondary" className="w-full" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" className="w-full" onClick={() => { setMobileMenuOpen(false); setLoginOpen(true); }}>
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
