import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Тарифы и цены",
  description: "Тарифы LensRoom: пакеты звёзд и подписки. Выберите подходящий план для генерации изображений и видео.",
  keywords: [
    "тарифы",
    "цены",
    "стоимость генерации",
    "купить звезды",
    "подписка",
    "LensRoom",
  ],
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Тарифы и цены",
    description: "Пакеты звёзд и подписки для генерации изображений и видео в LensRoom.",
    url: "https://lensroom.ru/pricing",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}


