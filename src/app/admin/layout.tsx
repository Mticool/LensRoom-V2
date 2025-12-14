'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { checkIsAdmin } from '@/lib/admin';
import { 
  Loader2, 
  LayoutDashboard, 
  Users, 
  Image as ImageIcon, 
  Sparkles, 
  CreditCard, 
  Settings,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Пользователи', href: '/admin/users', icon: Users },
  { name: 'Генерации', href: '/admin/generations', icon: Sparkles },
  { name: 'Showcase', href: '/admin/showcase', icon: ImageIcon },
  { name: 'Платежи', href: '/admin/payments', icon: CreditCard },
  { name: 'Настройки', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    checkIsAdmin(user.id).then(result => {
      if (!result) {
        router.push('/');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    });
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c8ff00] animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-16">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white/[0.02] border-r border-white/10 fixed left-0 top-16">
          <div className="p-4">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#c8ff00]/20 flex items-center justify-center">
                <Settings className="w-4 h-4 text-[#c8ff00]" />
              </div>
              Admin Panel
            </h2>
            
            <nav className="space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname?.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all",
                      isActive 
                        ? "bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/20" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* Admin Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
            <div className="text-xs text-white/40">
              <p>Logged in as:</p>
              <p className="text-white/60 truncate">{user?.email}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
