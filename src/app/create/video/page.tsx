"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Lazy load heavy studio component
const StudioRuntime = dynamic(
  () => import("@/components/studio/StudioRuntime").then(mod => mod.StudioRuntime),
  {
    loading: () => <StudioLoading />,
    ssr: false, // Client-side only for faster initial load
  }
);

function StudioLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[var(--muted)] text-sm">Загрузка видео студии...</p>
      </div>
    </div>
  );
}

export default function VideoCreatePage() {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioRuntime defaultKind="video" />
    </Suspense>
  );
}
