'use client';

import { useEffect, useState } from 'react';
import { HomePageDesktop } from '@/components/home/HomePageDesktop';
import HomePageMobileLegacy from '@/components/home/HomePageMobileLegacy';

export default function HomePageContent() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(media.matches);

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  if (isDesktop) {
    return <HomePageDesktop />;
  }

  return <HomePageMobileLegacy />;
}
