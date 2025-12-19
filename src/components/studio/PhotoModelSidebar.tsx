"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PhotoModel } from "@/config/photoVariantRegistry";

interface PhotoModelSidebarProps {
  models: PhotoModel[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function minStars(model: PhotoModel): number {
  const enabled = model.variants.filter((v) => v.enabled);
  const list = enabled.length ? enabled : model.variants;
  return Math.min(...list.map((v) => v.stars));
}

const ModelButton = memo(function ModelButton({
  model,
  isActive,
  onClick,
}: {
  model: PhotoModel;
  isActive: boolean;
  onClick: () => void;
}) {
  const ms = useMemo(() => minStars(model), [model]);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-2xl border transition-all",
        "motion-reduce:transition-none relative",
        isActive
          ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--text)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
          : "bg-transparent border-transparent hover:bg-[var(--surface)] hover:border-white/10 text-[var(--text)]"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[var(--gold)] rounded-r-full shadow-lg shadow-[var(--gold)]/50" />
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn("text-sm truncate flex items-center gap-2", isActive ? "font-bold text-[var(--gold)]" : "font-medium")}>
            {model.title}
            {isActive && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--gold)] text-black text-[10px] font-extrabold shadow-md">
                ✓
              </span>
            )}
          </div>
          <div className={cn("text-xs mt-0.5 truncate", isActive ? "text-[var(--text)]/90 font-medium" : "text-[var(--muted)]")}>
            {model.shortDescription || (model.paramSchema.length ? "Выберите параметры ниже" : "Готово к генерации")}
          </div>
        </div>
        <div className={cn("text-xs shrink-0", isActive ? "text-[var(--gold)] font-bold" : "text-[var(--muted)] font-medium")}>
          {Number.isFinite(ms) && ms > 0 ? `from ⭐${ms}` : "—"}
        </div>
      </div>
    </button>
  );
});

export const PhotoModelSidebar = memo(function PhotoModelSidebar({ models, selectedId, onSelect }: PhotoModelSidebarProps) {
  const sorted = useMemo(() => models.slice().sort((a, b) => a.title.localeCompare(b.title)), [models]);
  return (
    <div className="hidden lg:block rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <div className="text-sm font-semibold">Фото модели</div>
        <div className="text-xs text-[var(--muted)] mt-1">Без дублей — вариации внутри</div>
      </div>
      <div className="px-2 pb-2">
        {sorted.map((m) => (
          <ModelButton key={m.id} model={m} isActive={m.id === selectedId} onClick={() => onSelect(m.id)} />
        ))}
      </div>
    </div>
  );
});

export const MobilePhotoModelSelector = memo(function MobilePhotoModelSelector({
  models,
  selectedId,
  onSelect,
}: PhotoModelSidebarProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => models.find((m) => m.id === selectedId) || models[0], [models, selectedId]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-auto py-3 border-[var(--border)] hover:border-[var(--gold)]/50 transition-colors">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface2)] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold text-sm text-[var(--text)] truncate">{selected?.title || "Выбрать модель"}</div>
              <div className="text-xs text-[var(--muted)] truncate mt-0.5">
                {selected?.shortDescription || (selected?.paramSchema?.length ? "Нажмите для выбора" : "Готово")}
              </div>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[var(--muted)] shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto !z-[100]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">Выберите модель</SheetTitle>
        </SheetHeader>
        <div className="space-y-2">
          {models
            .slice()
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((m) => (
              <ModelButton
                key={m.id}
                model={m}
                isActive={m.id === selectedId}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
});

