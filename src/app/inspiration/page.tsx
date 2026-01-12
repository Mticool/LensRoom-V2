import { Suspense } from "react";
import type { Metadata } from "next";
import { InspirationGallery } from "@/components/inspiration/InspirationGallery";

export const metadata: Metadata = {
  title: "Галерея вдохновения",
  description: "Галерея вдохновения: лучшие примеры работ. Откройте стиль и повторите генерацию в один клик.",
  keywords: [
    "галерея вдохновения",
    "примеры работ нейросеть",
    "лучшие промпты",
    "идеи для генерации",
    "AI контент",
    "LensRoom",
  ],
  alternates: {
    canonical: "/inspiration",
  },
  openGraph: {
    title: "Галерея вдохновения",
    description: "Лучшие примеры работ — повторите одним кликом.",
    url: "https://lensroom.ru/inspiration",
    type: "website",
  },
};

// Loading skeleton for Suspense
function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-20 rounded-full bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="break-inside-avoid mb-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
            <div className="aspect-[4/5] bg-[var(--surface2)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InspirationPage() {
  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 bg-[var(--bg)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-[var(--text)]">
            Галерея вдохновения
          </h1>
          <p className="text-base sm:text-xl text-[var(--text2)]">
            Лучшие работы — повторите одним кликом
          </p>
        </div>

        {/* Gallery with Suspense */}
        <Suspense fallback={<GallerySkeleton />}>
          <InspirationGallery />
        </Suspense>
      </div>
    </div>
  );
}
