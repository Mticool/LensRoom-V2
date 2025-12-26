import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "../globals.css";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { ReferralHandler } from "@/components/referrals/ReferralHandler";
import { ServiceWorkerRegistration } from "@/components/service-worker/ServiceWorkerRegistration";
import { CriticalResources } from "@/components/performance/CriticalResources";
import { Analytics } from "@/components/analytics/Analytics";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "LensRoom - AI Генератор",
  description: "Создавайте изображения и видео с помощью AI",
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') {
      t = 'dark';
      localStorage.setItem('theme', t);
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function GeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <Providers>
            <Analytics 
              gaId={process.env.NEXT_PUBLIC_GA_ID}
              ymId={process.env.NEXT_PUBLIC_YM_ID}
            />
            <ServiceWorkerRegistration />
            <CriticalResources />
            <Suspense fallback={null}>
              <ReferralHandler />
            </Suspense>
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

