"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PanelLeft } from "lucide-react";

export function StudioShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="studio-theme min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-16 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide">Studio</div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] hover:border-[var(--border)] rounded-xl"
              >
                <PanelLeft className="w-4 h-4 mr-2" />
                Модели
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-[92vw] max-w-[380px] bg-[var(--bg)] text-[var(--text)] border-r border-[var(--border)]"
            >
              <div className="h-full overflow-y-auto">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="hidden lg:block">{sidebar}</aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </div>
  );
}
