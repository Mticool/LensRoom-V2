"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoJobCard } from "../video-types";

interface VideoPreviewProps {
  job: VideoJobCard | null;
  size: "primary" | "secondary";
  onFocus: () => void;
}

export function VideoPreview({
  job,
  size,
  onFocus,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const canPlay = !!job?.resultUrl && job.status === "success";
  const aspect = size === "primary" ? "490 / 280" : "280 / 310";

  return (
    <button
      type="button"
      onClick={() => {
        onFocus();
        if (!canPlay) return;
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) {
          v.pause();
          return;
        }
        v.play().catch(() => {});
      }}
      className={cn(
        "group relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black transition-colors",
        "hover:border-white/20 hover:bg-black/80",
        "cursor-pointer text-left"
      )}
      style={{ aspectRatio: aspect }}
      aria-label={canPlay ? "Play video" : "Video preview"}
    >
      {canPlay ? (
        <video
          ref={videoRef}
          src={job!.resultUrl!}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-black to-[#111]" />
      )}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/35 via-black/10 to-black/20" />

      {!isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-black/40 border border-white/15 flex items-center justify-center group-hover:bg-black/55 group-hover:border-white/25 transition-colors">
            <Play className="w-8 h-8 text-white fill-white translate-x-[1px]" />
          </div>
        </div>
      ) : null}
    </button>
  );
}
