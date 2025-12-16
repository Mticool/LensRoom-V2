"use client";

import { useMemo } from "react";
import type { StudioModel } from "@/config/studioModels";
import { cn } from "@/lib/utils";

export function ModelSidebar({
  models,
  selectedKey,
  onSelect,
}: {
  models: StudioModel[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const { photo, video } = useMemo(() => {
    return {
      photo: models.filter((m) => m.kind === "photo"),
      video: models.filter((m) => m.kind === "video"),
    };
  }, [models]);

  const Section = ({ title, items }: { title: string; items: StudioModel[] }) => (
    <div className="space-y-2">
      <div className="px-4 pt-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{title}</div>
      </div>
      <div className="px-2 pb-2">
        {items.map((m) => {
          const active = m.key === selectedKey;
          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-2xl border transition-colors",
                "motion-reduce:transition-none",
                active
                  ? "bg-[var(--surface2)] border-white/20 text-[var(--text)]"
                  : "bg-transparent border-transparent hover:bg-[var(--surface)] hover:border-white/10 text-[var(--text)]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5 truncate">{m.apiId}</div>
                </div>
                <div className="text-xs text-[var(--muted)] shrink-0">{m.baseStars > 0 ? `${m.baseStars}⭐` : "—"}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Модели</div>
        <div className="text-xs text-[var(--muted)] mt-1">Фото и видео в одном интерфейсе</div>
      </div>
      <Section title="Фото" items={photo} />
      <div className="h-px bg-[var(--border)]" />
      <Section title="Видео" items={video} />
    </div>
  );
}
