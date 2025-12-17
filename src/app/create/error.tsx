"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("/create error:", error);
  }, [error]);

  return (
    <div className="min-h-screen pt-24 bg-[var(--bg)] text-[var(--text)]">
      <div className="container mx-auto px-6 py-10">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-lg font-semibold">Что-то пошло не так</div>
          <div className="mt-2 text-sm text-[var(--muted)]">{error.message}</div>
          <div className="mt-4">
            <Button onClick={reset}>Повторить</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

