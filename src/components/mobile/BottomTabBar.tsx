'use client';

import { Home, Sparkles, History, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

type TabId = 'home' | 'create' | 'history' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const tabs: Tab[] = [
  { id: 'home', label: 'Главная', icon: Home, path: '/m' },
  { id: 'create', label: 'Создать', icon: Sparkles, path: '/create/studio' },
  { id: 'history', label: 'История', icon: History, path: '/library' },
  { id: 'profile', label: 'Профиль', icon: User, path: '/account' },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = (): TabId => {
    if (pathname === '/m' || pathname === '/') return 'home';
    if (pathname.startsWith('/create/studio') || pathname.startsWith('/create/')) return 'create';
    if (pathname.startsWith('/library')) return 'history';
    if (pathname.startsWith('/account')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F10]/98 backdrop-blur-xl border-t border-[#27272A]">
      <div
        className="flex items-center justify-around px-2"
        style={{
          height: 'calc(4rem + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-16 py-2 transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-[#00D9FF]'
                  : 'text-[#71717A] active:text-[#A1A1AA]'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00D9FF]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
