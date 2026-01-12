import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Студия",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}


