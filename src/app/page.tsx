'use client';

import dynamic from 'next/dynamic';
import { HomePageShell } from '@/components/home/HomePageShell';

const HomePage = dynamic(
  () => import('@/components/home/HomePageDesktop').then((m) => ({ default: m.HomePageDesktop })),
  {
    loading: () => <HomePageShell />,
    ssr: false,
  }
);

export default function HomeRoute() {
  return <HomePage />;
}
