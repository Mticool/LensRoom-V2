"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { StudioWorkspaces } from "@/components/generator-v2/StudioWorkspaces";
import { SectionTabs } from "@/components/generator-v2/SectionTabs";
import { AudioStudio } from "@/components/audio";

// Loading fallback matching the existing loading.tsx style
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-24">
      <div className="container mx-auto px-6 py-10">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Загрузка…
        </div>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams
function StudioContent() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") || "image").trim().toLowerCase();

  const initialPrompt = useMemo(() => {
    const p = searchParams.get("prompt");
    return typeof p === "string" ? p : "";
  }, [searchParams]);

  // Audio section - full page, no tabs needed (has its own header)
  if (section === "audio") {
    return <AudioStudio />;
  }

  // Video section redirects to /generators (see next.config.ts)
  // No need to handle section=video here

  // Image section (default) - with section tabs
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="pt-4 pb-2 px-4">
        <SectionTabs />
      </div>
      <StudioWorkspaces />
    </div>
  );
}

// Main page component with Suspense boundary
export default function StudioPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StudioContent />
    </Suspense>
  );
}
