import type { Metadata } from "next";

// /create and related routes are part of the app (not SEO landing pages).
export const metadata: Metadata = {
  title: "Создание",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GeneratorGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}


