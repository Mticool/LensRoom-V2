import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/layout";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: {
    default: "LensRoom - AI Генератор Фото и Видео",
    template: "%s | LensRoom",
  },
  description:
    "12 лучших AI моделей для создания профессиональных фото и видео. Flux.2, Sora 2, Kling, Veo 3.1 - генерация за секунды.",
  keywords: [
    "ai генератор",
    "нейросеть фото",
    "ai видео",
    "генератор изображений",
    "flux",
    "sora",
    "midjourney",
    "kling",
    "veo",
    "генерация картинок",
    "нейросеть",
    "искусственный интеллект",
  ],
  authors: [{ name: "LensRoom" }],
  creator: "LensRoom",
  publisher: "LensRoom",
  metadataBase: new URL("https://lensroom.ru"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LensRoom - AI Генератор Фото и Видео",
    description:
      "12 лучших AI моделей для создания контента. Flux.2, Sora 2, Kling, Veo 3.1.",
    url: "https://lensroom.ru",
    siteName: "LensRoom",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LensRoom - AI Генератор Фото и Видео",
      },
    ],
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LensRoom - AI Генератор",
    description: "12 AI моделей для создания фото и видео",
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
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <Providers>
            <Header />
            <div className="min-h-screen">{children}</div>
            <Footer />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
