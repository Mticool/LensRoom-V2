import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "LensRoom - Создай видео за 2 клика с Veo 3.1 | AI Генератор",
    template: "%s | LensRoom",
  },
  description:
    "Видео с Veo 3.1 за 2 клика! Sora 2 Pro, Kling 2.6, Flux.2 — топ AI-моделей в одном месте. От идеи до результата за минуты, без монтажа и навыков. Попробуй бесплатно.",
  keywords: [
    "veo 3.1",
    "ai видео генератор",
    "создать видео онлайн",
    "sora 2 pro",
    "kling 2.6",
    "ai генератор",
    "нейросеть видео",
    "flux 2",
    "midjourney v7",
    "генерация видео",
    "ai контент",
    "видео за 2 клика",
    "нейросеть для видео",
  ],
  authors: [{ name: "LensRoom" }],
  creator: "LensRoom",
  publisher: "LensRoom",
  metadataBase: new URL("https://lensroom.ru"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Создай видео с Veo 3.1 за 2 клика | LensRoom",
    description:
      "🎬 Veo 3.1, Sora 2 Pro, Kling 2.6 — создавай видео как профи за минуты. Без монтажа, без опыта. 12 топовых AI-моделей для контента, рекламы, e-commerce.",
    url: "https://lensroom.ru",
    siteName: "LensRoom",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LensRoom - Создай видео за 2 клика с Veo 3.1",
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Создай видео за 2 клика | LensRoom",
    description: "🚀 Veo 3.1, Sora 2, Kling — генерируй профессиональное видео за минуты. Попробуй бесплатно!",
    images: ["/og-image.png"],
    creator: "@lensroom",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

// JSON-LD Schema
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LensRoom",
  description: "AI платформа для генерации профессиональных фото и видео",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1250",
  },
  featureList: [
    "AI генерация фото",
    "AI генерация видео",
    "Продуктовые карточки",
    "500+ промптов",
    "12 AI моделей",
  ],
};

// Inline script to prevent flash of wrong theme (FOUC)
// Priority: 1) localStorage.theme 2) default to "dark"
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
        <link rel="dns-prefetch" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA iOS Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LensRoom" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        
        {/* Splash screens for iOS (optional - добавить позже) */}
        {/* <link rel="apple-touch-startup-image" href="/splash.png" /> */}
        
        {/* Scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
