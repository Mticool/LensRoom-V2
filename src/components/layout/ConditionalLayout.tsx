'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTestPage = pathname === '/test-minimal';
  const isMobilePage = pathname === '/m' || pathname.startsWith('/m/');

  if (isTestPage || isMobilePage) {
    // Test pages and mobile showcase - no header/footer
    return <>{children}</>;
  }

  // All pages including generator - with header (footer only for non-generator)
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
