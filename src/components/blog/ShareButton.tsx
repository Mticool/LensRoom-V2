"use client";

import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  url: string;
}

export function ShareButton({ title, url }: ShareButtonProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("Ссылка скопирована!");
      } catch {
        // Fallback: select text
        prompt("Скопируйте ссылку:", url);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--surface2)] rounded-xl hover:bg-white/10 transition-colors"
    >
      <Share2 className="w-4 h-4" />
      Поделиться
    </button>
  );
}

