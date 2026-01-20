import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { Analytics } from "@/components/analytics/Analytics";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "LensRoom — AI генератор изображений и видео • Nano Banana Pro безлимит",
    template: "%s | LensRoom",
  },
  description:
    "🔥 Nano Banana Pro — БЕЗЛИМИТ в тарифах Creator+ и Business! 10+ AI моделей: Veo 3.1, Sora 2, Kling, Flux. 50⭐ бесплатно при регистрации. Создавайте фото и видео за минуты.",
  keywords: [
    // Брендовые запросы
    "lensroom",
    "лензрум",
    "lens room",
    "lensroom ru",
    "lensroom генератор",
    // Основные запросы
    "нейросети",
    "ai генератор",
    "генерация изображений",
    "генерация видео",
    "nano banana pro",
    "nano banana",
    "безлимит генерация",
    // Русские запросы для Яндекса
    "нейросеть для картинок",
    "нейросеть для видео",
    "нейросеть онлайн бесплатно",
    "генерация картинок по тексту",
    "генерация видео по тексту",
    "сделать картинку нейросеть",
    "создать видео нейросеть",
    "ai генератор изображений",
    "ai генератор видео",
    "искусственный интеллект картинки",
    "искусственный интеллект видео",
    // Модели
    "veo 3",
    "veo 3.1",
    "sora 2",
    "sora openai",
    "kling ai",
    "kling 2.6",
    "flux",
    "midjourney альтернатива",
    "dall-e альтернатива",
    // Коммерческие запросы
    "генерация фото для маркетплейсов",
    "создать фото товара нейросеть",
    "видео для рекламы нейросеть",
    "контент для соцсетей ai",
  ],
  authors: [{ name: "LensRoom" }],
  creator: "LensRoom",
  publisher: "LensRoom",
  metadataBase: new URL("https://lensroom.ru"),
  openGraph: {
    title: "LensRoom — Nano Banana Pro БЕЗЛИМИТ 🔥",
    description:
      "10+ AI моделей в одном месте: Veo 3.1, Sora 2, Kling, Flux. Безлимитная генерация Pro изображений в тарифах Creator+ и Business. 50⭐ бесплатно!",
    url: "https://lensroom.ru",
    siteName: "LensRoom",
    images: [
      {
        url: "https://lensroom.ru/og-image.png",
        width: 1200,
        height: 630,
        alt: "LensRoom — Nano Banana Pro безлимит • AI генератор",
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LensRoom — Nano Banana Pro БЕЗЛИМИТ 🔥",
    description: "10+ AI моделей: Veo 3.1, Sora 2, Kling, Flux. Безлимитная генерация в Creator+ и Business. 50⭐ бесплатно!",
    images: ["https://lensroom.ru/og-image.png"],
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

// JSON-LD Schema - Organization
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://lensroom.ru/#organization",
  name: "LensRoom",
  url: "https://lensroom.ru",
  logo: "https://lensroom.ru/logo.svg",
  sameAs: [
    "https://t.me/LensRoom_bot",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@lensroom.ru",
    contactType: "customer service",
    availableLanguage: ["Russian", "English"],
  },
};

// JSON-LD Schema - WebApplication
const applicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://lensroom.ru/#webapp",
  name: "LensRoom - AI Генератор контента",
  description: "Создавайте профессиональное фото и видео с помощью AI за минуты. Veo 3.1, Sora 2, Kling, Flux.2 и другие топовые нейросети.",
  url: "https://lensroom.ru",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "RUB",
    lowPrice: "0",
    highPrice: "4990",
    offerCount: "3",
    offers: [
      {
        "@type": "Offer",
        name: "Стартовый пакет",
        price: "1490",
        priceCurrency: "RUB",
        description: "2200 звёзд для генерации",
      },
      {
        "@type": "Offer",
        name: "Популярный пакет",
        price: "1990",
        priceCurrency: "RUB",
        description: "3000 звёзд для генерации",
      },
      {
        "@type": "Offer",
        name: "PRO пакет",
        price: "4990",
        priceCurrency: "RUB",
        description: "7600 звёзд для генерации",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1250",
    bestRating: "5",
    worstRating: "1",
  },
  featureList: [
    "AI генерация фото (Flux.2, Midjourney, GPT Image)",
    "AI генерация видео (Veo 3.1, Sora 2, Kling)",
    "AI генерация музыки (Suno)",
    "12+ AI моделей",
    "Batch-обработка изображений",
    "История генераций",
  ],
  screenshot: "https://lensroom.ru/og-image.png",
  softwareVersion: "2.0",
  provider: {
    "@id": "https://lensroom.ru/#organization",
  },
};

// JSON-LD Schema - FAQPage for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Что такое LensRoom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LensRoom — это AI-платформа для создания профессионального фото и видео контента с помощью нейросетей Veo 3.1, Sora 2, Kling, Flux.2 и других. Создавайте контент за минуты без навыков монтажа.",
      },
    },
    {
      "@type": "Question",
      name: "Какие AI-модели доступны в LensRoom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LensRoom предлагает 12+ AI-моделей: Veo 3.1 (Google), Sora 2 (OpenAI), Kling 2.6, Flux.2 Pro, Midjourney V7, GPT Image, Nano Banana Pro, Grok Imagine, Suno для музыки и другие.",
      },
    },
    {
      "@type": "Question",
      name: "Сколько стоит генерация в LensRoom?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Цены начинаются от 7 звёзд за изображение. Пакеты: 1490₽ за 2200 звёзд, 1990₽ за 3000 звёзд, 4990₽ за 7600 звёзд. Также доступны подписки с ежемесячными звёздами.",
      },
    },
    {
      "@type": "Question",
      name: "Можно ли попробовать бесплатно?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да! Новые пользователи получают бонусные звёзды при регистрации. Также доступен демо-режим для быстрого ознакомления с платформой.",
      },
    },
  ],
};

// Combined JSON-LD
const jsonLd = [organizationSchema, applicationSchema, faqSchema];

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
    <html lang="ru" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
        <link rel="dns-prefetch" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* KIE API and CDN preconnects */}
        <link rel="dns-prefetch" href="https://api.kie.ai" />
        <link rel="dns-prefetch" href="https://tempfile.aiquickdraw.com" />
        
        {/* Яндекс.Вебмастер верификация - замените на свой код после регистрации */}
        {/* <meta name="yandex-verification" content="ваш_код_верификации" /> */}
        
        {/* Дополнительные SEO метатеги */}
        <meta name="geo.region" content="RU" />
        <meta name="geo.placename" content="Russia" />
        <meta name="language" content="Russian" />
        <meta name="revisit-after" content="3 days" />
        <meta name="rating" content="general" />
        
        {/* PWA iOS Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LensRoom" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        
        {/* Splash screens for iOS (optional - добавить позже) */}
        {/* <link rel="apple-touch-startup-image" href="/splash.png" /> */}
        
        {/* Scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {jsonLd.map((schema, index) => (
          <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        ))}
      </head>
      <body className={`${inter.className} antialiased`}>
        <Analytics 
          gaId={process.env.NEXT_PUBLIC_GA_ID} 
          ymId={process.env.NEXT_PUBLIC_YM_ID} 
        />
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}