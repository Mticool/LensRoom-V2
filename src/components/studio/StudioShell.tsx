"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown } from "lucide-react";

export function StudioShell({
  sidebar,
  children,
  mobileModelSelector,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  mobileModelSelector?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="studio-theme min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-16 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
        <div className="px-4 py-3">
          {/* Mobile model selector - replaces "Studio" text */}
          {mobileModelSelector || (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)]"
                >
                  <span className="text-sm font-semibold">Studio</span>
                  <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[80vh] overflow-y-auto bg-[var(--bg)] text-[var(--text)] border-t border-[var(--border)]"
              >
                <div className="h-full">{sidebar}</div>
              </SheetContent>
            </Sheet>
          )}
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
