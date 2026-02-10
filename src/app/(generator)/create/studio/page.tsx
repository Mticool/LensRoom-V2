"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StudioWorkspaces } from "@/components/generator-v2/StudioWorkspaces";
import { ModelSelector } from "@/components/generator-v2/ModelSelector";
import { MusicAndVoiceStudio } from "@/components/audio";
import { StudioRuntime } from "@/components/studio/StudioRuntime";
import { VideoGeneratorLight } from "@/components/video/VideoGeneratorLight";
import { VoiceSection } from "@/components/voice/VoiceSection";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Canonical sections: photo|video|motion|music
  // Backward-compat: image -> photo, audio -> music, kind -> section
  const raw = (searchParams.get("section") || searchParams.get("kind") || "").trim().toLowerCase();
  const section =
    raw === "image" ? "photo" :
    raw === "audio" ? "music" :
    raw || "photo";

  const selectedPhotoModel = (searchParams.get("model") || "nano-banana-pro").trim();

  return (
    <div
      className={`bg-[var(--bg)] ${section === "photo" ? "flex flex-col pt-0" : "min-h-screen pt-24"}`}
      style={section === "photo" ? { height: "calc(100dvh - var(--app-header-h))" } : undefined}
    >
      {/* Model selector removed from top-left — available in bottom bar instead */}

      {section === "music" ? (
        <Suspense fallback={<LoadingFallback />}>
          <MusicAndVoiceStudio />
        </Suspense>
      ) : section === "voice" ? (
        <Suspense fallback={<LoadingFallback />}>
          <VoiceSection />
        </Suspense>
      ) : section === "video" ? (
        <VideoGeneratorLight initialModel={searchParams.get("model")?.trim() || undefined} />
      ) : section === "motion" ? (
        <StudioRuntime defaultKind="video" variant="motion" />
      ) : (
        <Suspense fallback={<LoadingFallback />}>
          <div className={section === "photo" ? "flex-1 min-h-0 flex flex-col overflow-hidden" : ""}>
            <StudioWorkspaces fillViewport={section === "photo"} />
          </div>
        </Suspense>
      )}
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
