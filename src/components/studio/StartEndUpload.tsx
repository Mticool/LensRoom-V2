"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

function fileToUrl(file: File | null | undefined): string | null {
  if (!file) return null;
  return URL.createObjectURL(file);
}

export function StartEndUpload({
  firstFrame,
  lastFrame,
  onFirstFrameChange,
  onLastFrameChange,
}: {
  firstFrame: File | null;
  lastFrame: File | null;
  onFirstFrameChange: (file: File | null) => void;
  onLastFrameChange: (file: File | null) => void;
}) {
  const firstId = useId();
  const lastId = useId();

  const Tile = ({
    id,
    title,
    file,
    onChange,
  }: {
    id: string;
    title: string;
    file: File | null;
    onChange: (file: File | null) => void;
  }) => {
    const url = fileToUrl(file);
    return (
      <div className="flex-1">
        <div className="text-[11px] text-[var(--muted)] mb-2">{title}</div>
        <label
          htmlFor={id}
          className={cn(
            "block rounded-[18px] border border-white/10 bg-[var(--surface2)] overflow-hidden cursor-pointer",
            "transition-colors hover:border-white/20 motion-reduce:transition-none"
          )}
        >
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
          <div className="aspect-[4/3] flex items-center justify-center">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5 text-white/70" />
                </div>
                <div className="mt-3 text-xs text-white/80">Загрузить</div>
                <div className="mt-1 text-[10px] text-[var(--muted)]">JPG/PNG</div>
              </div>
            )}
          </div>
        </label>
      </div>
    );
  };

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-sm font-semibold mb-1">Кадры</div>
      <div className="text-xs text-[var(--muted)] mb-4">Первый → Последний (start_end)</div>
      <div className="flex gap-4">
        <Tile id={firstId} title="Первый кадр" file={firstFrame} onChange={onFirstFrameChange} />
        <Tile id={lastId} title="Последний кадр" file={lastFrame} onChange={onLastFrameChange} />
      </div>
    </div>
  );
}
