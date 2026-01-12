import type { Metadata } from "next";

// Generator is an app-like page with lots of URL params and personalized states.
// We keep it out of SEO to avoid duplicates in Yandex/Google.
export const metadata: Metadata = {
  title: "Генератор",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/generator",
  },
};

export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}


