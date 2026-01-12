"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import type { StudioModel } from "@/config/studioModels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface ModelSidebarProps {
  models: StudioModel[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

const ModelButton = memo(
  ({ model, isActive, onClick }: { model: StudioModel; isActive: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 rounded-2xl border transition-all",
        "motion-reduce:transition-none relative",
        isActive
          ? "bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--text)] shadow-lg shadow-[var(--gold)]/10 ring-1 ring-[var(--gold)]/30"
          : "bg-[var(--surface2)]/50 border-white/5 hover:bg-[var(--surface2)] hover:border-white/15 text-[var(--text)]"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[var(--gold)] rounded-r-full shadow-lg shadow-[var(--gold)]/50" />
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={cn(
            "text-sm truncate flex items-center gap-2",
            isActive ? "font-bold text-[var(--gold)]" : "font-semibold text-white/90"
          )}>
            {model.name}
            {isActive && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--gold)] text-black text-[10px] font-extrabold shadow-md">
                ✓
              </span>
            )}
          </div>
          <div className={cn(
            "text-xs mt-1 truncate",
            isActive ? "text-white/80 font-medium" : "text-white/60"
          )}>{model.subtitle}</div>
        </div>
        {/* Price removed from selector UI */}
      </div>
    </button>
  )
);
ModelButton.displayName = "ModelButton";

const Section = memo(
  ({
    title,
    items,
    selectedKey,
    onSelect,
    isCollapsible = false,
  }: {
    title: string;
    items: StudioModel[];
    selectedKey: string;
    onSelect: (key: string) => void;
    isCollapsible?: boolean;
  }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="space-y-2">
        <div className="px-4 pt-4">
          {isCollapsible ? (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              {title}
              <ChevronDown
                className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")}
              />
            </button>
          ) : (
            <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">{title}</div>
          )}
        </div>
        {!collapsed && (
          <div className="px-2 pb-2 grid grid-cols-2 gap-2">
            {items.map((m) => (
              <ModelButton
                key={m.key}
                model={m}
                isActive={m.key === selectedKey}
                onClick={() => onSelect(m.key)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
Section.displayName = "Section";

const SidebarContent = memo(
  ({
    photo,
    video,
    selectedKey,
    onSelect,
  }: {
    photo: StudioModel[];
    video: StudioModel[];
    selectedKey: string;
    onSelect: (key: string) => void;
  }) => (
    <>
      <Section title="Фото" items={photo} selectedKey={selectedKey} onSelect={onSelect} />
      <div className="h-px bg-[var(--border)]" />
      <Section title="Видео" items={video} selectedKey={selectedKey} onSelect={onSelect} />
    </>
  )
);
SidebarContent.displayName = "SidebarContent";

export const ModelSidebar = memo(function ModelSidebar({
  models,
  selectedKey,
  onSelect,
}: ModelSidebarProps) {
  const { photo, video, selectedModel } = useMemo(() => {
    return {
      photo: models.filter((m) => m.kind === "photo"),
      video: models.filter((m) => m.kind === "video"),
      selectedModel: models.find((m) => m.key === selectedKey),
    };
  }, [models, selectedKey]);

  const [open, setOpen] = useState(false);

  const handleSelect = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <>
      {/* Desktop: Sidebar */}
      <div className="hidden lg:block rounded-[20px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <div className="text-sm font-semibold">Модели</div>
          <div className="text-xs text-[var(--muted)] mt-1">
            Фото и видео в одном интерфейсе
          </div>
        </div>
        <SidebarContent
          photo={photo}
          video={video}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </div>
    </>
  );
});

// Export mobile selector separately for use in StudioShell header
export const MobileModelSelector = memo(function MobileModelSelector({
  models,
  selectedKey,
  onSelect,
}: ModelSidebarProps) {
  const { photo, video, selectedModel } = useMemo(() => {
    return {
      photo: models.filter((m) => m.kind === "photo"),
      video: models.filter((m) => m.kind === "video"),
      selectedModel: models.find((m) => m.key === selectedKey),
    };
  }, [models, selectedKey]);

  const [open, setOpen] = useState(false);

  const handleSelect = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-auto py-3 border-[var(--border)] hover:border-[var(--gold)]/50 transition-colors"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface2)] flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="font-semibold text-sm text-[var(--text)] truncate">
                {selectedModel?.name || "Выбрать модель"}
              </div>
              <div className="text-xs text-[var(--muted)] truncate mt-0.5">
                {selectedModel?.subtitle || "Нажмите для выбора"}
              </div>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[var(--muted)] shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto !z-[100]">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">Выберите модель</SheetTitle>
          <p className="text-sm text-[var(--muted)]">
            Текущая: <span className="text-[var(--gold)] font-medium">{selectedModel?.name}</span>
          </p>
        </SheetHeader>
        <div className="space-y-2">
          <SidebarContent
            photo={photo}
            video={video}
            selectedKey={selectedKey}
            onSelect={handleSelect}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
});
