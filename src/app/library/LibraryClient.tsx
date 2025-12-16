"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Generation = any;

type UiStatus = "queued" | "generating" | "success" | "failed";

function normalizeStatus(s: any): UiStatus {
  const v = String(s || "").toLowerCase();
  if (v === "success") return "success";
  if (v === "completed") return "success";
  if (v === "queued") return "queued";
  if (v === "waiting" || v === "queuing") return "queued";
  if (v === "generating" || v === "processing" || v === "pending") return "generating";
  return "failed";
}

function statusBadgeVariant(s: UiStatus): "default" | "success" | "error" | "outline" {
  if (s === "success") return "success";
  if (s === "failed") return "error";
  if (s === "queued") return "outline";
  return "default"; // generating
}

function getFirstUrl(g: Generation): string | null {
  const direct = g?.asset_url || g?.preview_url || g?.thumbnail_url;
  if (typeof direct === "string" && direct) return direct;

  const ru = g?.result_urls || g?.resultUrls;
  if (Array.isArray(ru) && typeof ru[0] === "string" && ru[0]) return ru[0];

  const results = g?.results;
  if (Array.isArray(results) && results[0]?.url) return String(results[0].url);

  return null;
}

export function LibraryClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Generation[]>([]);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Generation | null>(null);

  const syncEnabled = process.env.NEXT_PUBLIC_KIE_FALLBACK_SYNC === "true";

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        qs.set("limit", "50");
        if (syncEnabled) qs.set("sync", "true");

        const res = await fetch(`/api/generations?${qs.toString()}`, { signal: controller.signal });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || `Failed to load (${res.status})`);
        }

        if (!alive) return;
        setItems(Array.isArray(data?.generations) ? data.generations : []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [syncEnabled]);

  const grid = useMemo(() => {
    return items.map((g) => {
      const st = normalizeStatus(g?.status);
      const url = getFirstUrl(g);
      const isVideo = String(g?.type || "").toLowerCase() === "video";
      return { g, st, url, isVideo };
    });
  }, [items]);

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 bg-[var(--bg)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text)]">Мои результаты</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">История фото и видео генераций</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Загрузка…</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">{error}</div>
        )}

        {!loading && !error && grid.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-8 text-center">
            <div className="text-sm text-[var(--muted)]">Пока нет результатов. Создайте первую генерацию.</div>
          </div>
        )}

        {!loading && !error && grid.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {grid.map(({ g, st, url, isVideo }) => (
              <div key={String(g.id)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="relative aspect-square bg-black/20">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className={cn("w-full h-full", isVideo ? "object-cover opacity-90" : "object-cover")} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">Нет превью</div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge variant={statusBadgeVariant(st)}>{st}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-[var(--text)] truncate">{g.model_name || g.model_id || "—"}</div>
                  <div className="mt-1 text-xs text-[var(--muted)] line-clamp-2">{g.prompt || ""}</div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!url}
                      onClick={() => {
                        setSelected(g);
                        setOpen(true);
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Открыть
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && selected && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="relative max-w-5xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text)] truncate">{selected.model_name || "Результат"}</div>
              <button className="p-2 rounded-xl hover:bg-white/5" onClick={() => setOpen(false)} aria-label="Close">
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            <div className="p-3 sm:p-4 flex-1 overflow-auto bg-black">
              {String(selected.type || "").toLowerCase() === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={getFirstUrl(selected) || undefined} controls autoPlay className="w-full max-h-[60vh] bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getFirstUrl(selected) || ""} alt={selected.prompt || ""} className="w-full max-h-[60vh] object-contain bg-black" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
