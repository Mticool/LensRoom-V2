"use client";

import { useMemo, useState } from 'react';
import { useSearchParams } from "next/navigation";
import { HiggsGenerator } from "@/components/generator-v2/higgsfield";
import { NanoBananaGenerator } from "@/components/generator-v2/NanoBananaGenerator";
import { ZImageGenerator } from "@/components/generator-v2/ZImageGenerator";
import { FluxProGenerator } from "@/components/generator-v2/FluxProGenerator";
import { SeedreamGenerator } from "@/components/generator-v2/SeedreamGenerator";
import { GPTImageGenerator } from "@/components/generator-v2/GPTImageGenerator";
import { GrokImagineGenerator } from "@/components/generator-v2/GrokImagineGenerator";
import { TopazUpscaleGenerator } from "@/components/generator-v2/TopazUpscaleGenerator";
import { RecraftRemoveBGGenerator } from "@/components/generator-v2/RecraftRemoveBGGenerator";
import { ModelSelector } from "@/components/generator-v2/ModelSelector";
import { VideoStudio } from "../../../components/video/VideoStudio";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") || "image").trim().toLowerCase();

  const initialPrompt = useMemo(() => {
    const p = searchParams.get("prompt");
    return typeof p === "string" ? p : "";
  }, [searchParams]);

  const [selectedModel, setSelectedModel] = useState('nano-banana-pro');

  if (section === "video") {
    return <VideoStudio initialPrompt={initialPrompt} />;
  }

  // Render the appropriate generator based on selected model
  const renderGenerator = () => {
    switch (selectedModel) {
      case 'nano-banana-pro':
        // New Higgsfield-style generator
        return <HiggsGenerator />;
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
        return <HiggsGenerator />;
    }
  };

  return (
    <div className="relative">
      {/* Model Selector - Fixed below header */}
      <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-40">
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
      </div>
      
      {/* Generator - pt accounts for ModelSelector */}
      <div className="pt-14">
        {renderGenerator()}
      </div>
    </div>
  );
}
