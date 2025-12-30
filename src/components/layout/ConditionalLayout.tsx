'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { LowBalanceAlert } from '@/components/ui/low-balance-alert';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGeneratorPage = pathname === '/create' || pathname.startsWith('/create/');
  const isTestPage = pathname === '/test-minimal';

  if (isTestPage) {
    // Test pages only - no header/footer
    return <div className="min-h-screen">{children}</div>;
  }

  // All pages including generator - with header (footer only for non-generator)
  return (
    <>
      <Header />
      <LowBalanceAlert />
      <div className="min-h-screen">{children}</div>
    </>
  );
}

