'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Sparkles, LogOut, CreditCard, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';

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
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading: authLoading, signOut } = useAuth();
  const { balance, fetchBalance } = useCreditsStore();

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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#26262E] bg-[#08080C]">
        <nav className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">LensRoom</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                      isActive
                        ? "text-white bg-[#16161D]"
                        : "text-[#A0A0AA] hover:text-white hover:bg-[#0F0F14]"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Auth */}
              {authLoading ? (
                <div className="w-24 h-10 bg-[#16161D] rounded-xl animate-pulse" />
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#0F0F14] border border-[#26262E] hover:border-[#3A3A45] transition-all"
                  >
                    <span className="text-sm font-semibold text-yellow-400">{balance} ⭐</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-[#A0A0AA] transition-transform",
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
                          className="absolute right-0 mt-2 w-56 bg-[#1C1C26] border border-[#26262E] rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-[#26262E]">
                            <p className="text-sm font-medium text-white truncate">
                              {user.email}
                            </p>
                            <p className="text-xs text-yellow-400">{balance} кредитов</p>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/account/subscription"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0AA] hover:text-white hover:bg-[#16161D] transition-colors"
                            >
                              <Crown className="w-4 h-4" />
                              Подписка
                            </Link>
                            <Link
                              href="/pricing"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#A0A0AA] hover:text-white hover:bg-[#16161D] transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                              Купить кредиты
                            </Link>
                          </div>
                          <div className="border-t border-[#26262E] py-1">
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
                <Button onClick={() => setLoginOpen(true)}>
                  Войти
                </Button>
              )}
            </div>

            {/* Mobile */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-[#0F0F14] transition-colors"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-white" />
                ) : (
                  <Menu className="w-6 h-6 text-white" />
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
              className="absolute inset-0 bg-[#08080C] h-screen"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative bg-[#0F0F14] border-b border-[#26262E] shadow-xl">
              <div className="container mx-auto px-6 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[#16161D] text-white"
                          : "text-[#A0A0AA] hover:text-white hover:bg-[#16161D]"
                      )}
                    >
                      {item.name}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-[#26262E] space-y-2">
                  {user ? (
                    <>
                      <div className="px-4 py-3 rounded-xl bg-[#16161D]">
                        <p className="text-sm font-semibold text-yellow-400">{balance} ⭐</p>
                        <p className="text-xs text-[#6B6B78]">{user.email}</p>
                      </div>
                      <Link
                        href="/account/subscription"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[#A0A0AA] hover:bg-[#16161D] transition-colors"
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
                    <Button className="w-full" onClick={() => { setMobileMenuOpen(false); setLoginOpen(true); }}>
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
