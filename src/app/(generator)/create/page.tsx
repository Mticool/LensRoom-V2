"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { NanoBananaGenerator } from "@/components/generator-v2/NanoBananaGenerator";
import { NanoBananaProGenerator } from "@/components/generator-v2/NanoBananaProGenerator";
import { ZImageGenerator } from "@/components/generator-v2/ZImageGenerator";
import { FluxProGenerator } from "@/components/generator-v2/FluxProGenerator";
import { SeedreamGenerator } from "@/components/generator-v2/SeedreamGenerator";
import { GPTImageGenerator } from "@/components/generator-v2/GPTImageGenerator";
import { GrokImagineGenerator } from "@/components/generator-v2/GrokImagineGenerator";
import { TopazUpscaleGenerator } from "@/components/generator-v2/TopazUpscaleGenerator";
import { RecraftRemoveBGGenerator } from "@/components/generator-v2/RecraftRemoveBGGenerator";
import { ModelSelector } from "@/components/generator-v2/ModelSelector";
import { AudioStudio } from "@/components/audio";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") || "image").trim().toLowerCase();

  const initialPrompt = useMemo(() => {
    const p = searchParams.get("prompt");
    return typeof p === "string" ? p : "";
  }, [searchParams]);

  const [selectedModel, setSelectedModel] = useState('nano-banana-pro');

  const router = useRouter();

  // Video/Motion: redirect to unified studio (no legacy video UI on /create)
  useEffect(() => {
    if (section === "video" || section === "motion") {
      const params = new URLSearchParams(window.location.search);
      params.set("section", section);
      router.replace(`/create/studio?${params.toString()}`, { scroll: false });
    }
  }, [section, router]);

  if (section === "video" || section === "motion") {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-24 flex items-center justify-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Загрузка…
        </div>
      </div>
    );
  }

  // Audio section - full page with its own layout
  if (section === "audio") {
    return <AudioStudio />;
  }

  // Render the appropriate generator based on selected model
  const renderGenerator = () => {
    switch (selectedModel) {
      case 'nano-banana-pro':
        return <NanoBananaProGenerator />;
      case 'nano-banana':
        return <NanoBananaGenerator />;
      case 'z-image':
        return <ZImageGenerator />;
      case 'flux-2-pro':
        return <FluxProGenerator />;
      case 'seedream-4.5':
        return <SeedreamGenerator />;
      case 'gpt-image':
        return <GPTImageGenerator />;
      case 'grok-imagine':
        return <GrokImagineGenerator />;
      case 'topaz-image-upscale':
        return <TopazUpscaleGenerator />;
      case 'recraft-remove-background':
        return <RecraftRemoveBGGenerator />;
      default:
        return <NanoBananaProGenerator />;
    }
  };

  // Image section (default)
  return (
    <div className="relative">
      {/* Model Selector - Fixed below header */}
      <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-40">
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
      </div>
      
      {/* Generator - pt accounts for header + ModelSelector */}
      <div className="pt-24">
        {renderGenerator()}
      </div>
    </div>
  );
}
