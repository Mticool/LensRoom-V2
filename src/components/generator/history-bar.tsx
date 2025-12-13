"use client";

import * as React from "react";
import { History, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
}

interface HistoryBarProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function HistoryBar({ items = [], onSelect }: HistoryBarProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (items.length === 0) {
    return (
      <div className="border-t border-[--color-border-primary] bg-[--color-background-secondary]">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3 text-[--color-text-muted]">
            <History className="w-4 h-4" />
            <span className="text-sm">История генераций появится здесь</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[--color-border-primary] bg-[--color-background-secondary]">
      <div className="container mx-auto px-4 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[--color-text-tertiary] flex-shrink-0">
            <History className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">История</span>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0 hidden sm:flex"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden",
                    "border border-[--color-border-primary] hover:border-[--color-gold]",
                    "transition-all",
                    "bg-[--color-background-tertiary]"
                  )}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-[--color-text-muted]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0 hidden sm:flex"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
