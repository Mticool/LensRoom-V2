"use client";

import { StudioWorkspaces } from "@/components/generator-v2/StudioWorkspaces";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { VideoStudio } from "../../../../components/video/VideoStudio";

export default function StudioPage() {
  const searchParams = useSearchParams();
  const section = (searchParams.get("section") || "").trim().toLowerCase();

  const initialPrompt = useMemo(() => {
    const p = searchParams.get("prompt");
    return typeof p === "string" ? p : "";
  }, [searchParams]);

  if (section === "video") {
    return <VideoStudio initialPrompt={initialPrompt} />;
  }
  return <StudioWorkspaces />;
}
