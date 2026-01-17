'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGeneratorPage = pathname === '/create' || pathname.startsWith('/create/');
  const isTestPage = pathname === '/test-minimal';
  const isMobilePage = pathname === '/m' || pathname.startsWith('/m/');

  if (isTestPage || isMobilePage) {
    // Test pages and mobile showcase - no header/footer
    return <div className="min-h-screen">{children}</div>;
  }

  // All pages including generator - with header (footer only for non-generator)
  return (
    <>
      <Header />
      <div className="min-h-screen">{children}</div>
    </>
  );
}
