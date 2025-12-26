'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
import { LowBalanceAlert } from '@/components/ui/low-balance-alert';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGeneratorPage = pathname === '/create' || pathname.startsWith('/create/');
  const isTestPage = pathname === '/test-minimal';

  if (isGeneratorPage || isTestPage) {
    // Generator and test pages - no header/footer
    return <div className="min-h-screen">{children}</div>;
  }

  // Normal pages - with header/footer
  return (
    <>
      <Header />
      <LowBalanceAlert />
      <div className="min-h-screen">{children}</div>
      <Footer />
    </>
  );
}

