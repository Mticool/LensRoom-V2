"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ExternalLink, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectWebView, openExternal } from "@/lib/telegram/webview";
import { cachedJson, invalidateCached } from "@/lib/client/generations-cache";
import { toast } from "sonner";

type Generation = any;

type UiStatus = "queued" | "generating" | "success" | "failed";

function looksLikeVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return u.includes(".mp4") || u.includes(".webm") || u.includes(".mov") || u.includes("video/");
}

function looksLikeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = String(url).toLowerCase();
  return (
    u.includes(".png") ||
    u.includes(".jpg") ||
    u.includes(".jpeg") ||
    u.includes(".webp") ||
    u.startsWith("data:image/")
  );
}

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Generation[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());
  const [posters, setPosters] = useState<Record<string, string>>({});

  const prevStatusRef = useRef<Record<string, UiStatus>>({});

  const isWebView = useMemo(() => detectWebView(), []);
  const syncEnabled = process.env.NEXT_PUBLIC_KIE_FALLBACK_SYNC === "true";

  const LIMIT = 24;

  const fetchGenerations = async (offset: number = 0, append: boolean = false) => {
    try {
      const isFirstLoad = offset === 0;
      if (isFirstLoad) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const qs = new URLSearchParams();
      qs.set("limit", String(LIMIT));
      qs.set("offset", String(offset));
      if (syncEnabled) qs.set("sync", "true");

      const url = `/api/generations?${qs.toString()}`;
      const cacheKey = `generations:${url}`;

      const data = await cachedJson(cacheKey, async () => {
        if (process.env.NODE_ENV !== "production") {
          console.info("[library] fetch /api/generations", { offset, syncEnabled });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || `Failed to load (${res.status})`);
        return json;
      });

      const newItems = Array.isArray(data?.generations) ? data.generations : [];
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setHasMore(newItems.length === LIMIT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchGenerations(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled]);

  // Allow other parts of the app (Studio) to add a new generation without full page reload.
  useEffect(() => {
    const onRefresh = (event: CustomEvent) => {
      try {
        invalidateCached("generations:");
      } catch {}
      
      // If event has newItem data, prepend it instead of full reload
      if (event?.detail?.newItem) {
        setItems((prev) => [event.detail.newItem, ...prev]);
        if (process.env.NODE_ENV !== "production") {
          console.info("[library] prepended new generation", event.detail.newItem.id);
        }
      } else {
        // Fallback: full reload (only when no newItem provided)
        fetchGenerations(0, false);
      }
    };
    window.addEventListener("generations:refresh", onRefresh as any);
    return () => window.removeEventListener("generations:refresh", onRefresh as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled]);

  const grid = useMemo(() => {
    return items.map((g) => {
      const url = getFirstUrl(g);
      const raw = String(g?.status || "").toLowerCase();
      const st = url && raw !== "success" && raw !== "completed" ? "success" : normalizeStatus(g?.status);
      const isVideo = String(g?.type || "").toLowerCase() === "video";
      return { g, st, url, isVideo };
    });
  }, [items]);

  const hasActiveJobs = useMemo(() => {
    return grid.some(({ st }) => st === "generating" || st === "queued");
  }, [grid]);

  // REMOVED: Constant polling causes page flickering
  // Instead, we only refresh when Studio explicitly triggers "generations:refresh" event

  // Toast on generating -> success transitions.
  useEffect(() => {
    const prev = prevStatusRef.current || {};
    const next: Record<string, UiStatus> = {};
    for (const { g, st, url } of grid) {
      const id = String(g?.id || "");
      if (!id) continue;
      next[id] = st;
      const was = prev[id];
      if ((was === "generating" || was === "queued") && st === "success" && url) {
        toast("Ready", {
          description: g?.model_name || g?.model_id || "Generation finished",
          action: {
            label: "Open",
            onClick: () => {
              setSelected(g);
              setOpen(true);
            },
          },
        });
      }
    }
    prevStatusRef.current = next;
  }, [grid]);

  async function capturePoster(videoUrl: string): Promise<string | null> {
    return await new Promise((resolve) => {
      try {
        const v = document.createElement("video");
        v.crossOrigin = "anonymous";
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        v.src = videoUrl;

        const cleanup = () => {
          v.pause();
          v.removeAttribute("src");
          v.load();
        };

        const fail = () => {
          cleanup();
          resolve(null);
        };

        v.addEventListener("error", fail, { once: true });
        v.addEventListener(
          "loadedmetadata",
          () => {
            const targetTime = Math.min(0.1, Math.max(0, (v.duration || 0) > 0.2 ? 0.1 : 0));
            try {
              v.currentTime = targetTime;
            } catch {
              // Some browsers require play() before seeking.
              v.play()
                .then(() => {
                  v.pause();
                  v.currentTime = targetTime;
                })
                .catch(fail);
            }
          },
          { once: true }
        );

        v.addEventListener(
          "seeked",
          () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = v.videoWidth || 256;
              canvas.height = v.videoHeight || 256;
              const ctx = canvas.getContext("2d");
              if (!ctx) return fail();
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
              cleanup();
              resolve(dataUrl);
            } catch {
              fail();
            }
          },
          { once: true }
        );
      } catch {
        resolve(null);
      }
    });
  }

  // Generate poster fallback for videos if preview/thumbnail is missing.
  useEffect(() => {
    const missing = grid
      .filter(({ g, isVideo }) => {
        if (!isVideo) return false;
        const id = String(g?.id || "");
        if (!id) return false;
        if (posters[id]) return false;
        // Some records set thumbnail_url/preview_url to the *video file* itself.
        // Treat that as missing preview and generate a poster instead.
        const previewCandidate = (g?.thumbnail_url || g?.preview_url) as any;
        const hasPreview = !!previewCandidate && looksLikeImageUrl(String(previewCandidate));
        const hasAsset = typeof g?.asset_url === "string" && !!g.asset_url;
        return !hasPreview && hasAsset;
      })
      .slice(0, 3); // small batch

    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      for (const { g } of missing) {
        const id = String(g?.id || "");
        const u = String(g?.asset_url || "");
        if (!id || !u) continue;
        const poster = await capturePoster(u);
        if (cancelled || !poster) continue;
        setPosters((prev) => ({ ...prev, [id]: poster }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [grid, posters]);

  const handleOpenExternal = (url: string) => {
    if (isWebView) {
      openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchGenerations(items.length, true);
    }
  };

  const handleImageError = (id: string) => {
    setImageError((prev) => new Set([...prev, id]));
  };

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
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {grid.map(({ g, st, url, isVideo }) => {
                const hasError = imageError.has(String(g.id));
                const videoSrc = isVideo ? (g?.asset_url || url) : null;
                const posterCandidate = isVideo ? (g?.thumbnail_url || g?.preview_url || undefined) : undefined;
                const poster =
                  isVideo
                    ? posters[String(g.id)] ||
                      (looksLikeImageUrl(String(posterCandidate || "")) ? String(posterCandidate) : undefined)
                    : undefined;
                return (
                  <div key={String(g.id)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="relative aspect-square bg-black/20">
                      {url && !hasError ? (
                        isVideo ? (
                          <video
                            src={videoSrc || undefined}
                            poster={poster}
                            preload="metadata"
                            muted
                            playsInline
                            controls={false}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(String(g.id))}
                          />
                        ) : (
                          // NOTE: keep <img> (not next/image) because results come from various external hosts
                          // and Next Image requires remotePatterns/domains config. This avoids prod runtime crashes.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={g.prompt || ""}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(String(g.id))}
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                          {hasError ? "Ошибка" : "Нет превью"}
                        </div>
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
                          size="sm"
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
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    "Загрузить ещё"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Viewer modal */}
      {open && selected && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="text-sm font-semibold text-[var(--text)] truncate">
                {selected.model_name || "Результат"}
              </div>
              <div className="flex items-center gap-2">
                {isWebView && getFirstUrl(selected) && (
                  <button
                    className="p-2 rounded-xl hover:bg-white/5 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    onClick={() => handleOpenExternal(getFirstUrl(selected)!)}
                    aria-label="Open in browser"
                    title="Открыть в браузере"
                  >
                    <Globe className="w-5 h-5" />
                  </button>
                )}
                <button
                  className="p-2 rounded-xl hover:bg-white/5"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-1 overflow-auto bg-black">
              {String(selected.type || "").toLowerCase() === "video" ? (
                <video
                  src={getFirstUrl(selected) || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[60vh] bg-black"
                  onError={() => {
                    // Show fallback on error
                    const url = getFirstUrl(selected);
                    if (url && isWebView) {
                      openExternal(url);
                      setOpen(false);
                    }
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getFirstUrl(selected) || ""}
                  alt={selected.prompt || ""}
                  className="w-full max-h-[60vh] object-contain bg-black"
                  onError={() => {
                    // Show fallback on error
                    const url = getFirstUrl(selected);
                    if (url && isWebView) {
                      openExternal(url);
                      setOpen(false);
                    }
                  }}
                />
              )}
            </div>
            {/* Fallback message */}
            {isWebView && getFirstUrl(selected) && (
              <div className="px-4 py-3 border-t border-[var(--border)] text-center">
                <button
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors inline-flex items-center gap-2"
                  onClick={() => handleOpenExternal(getFirstUrl(selected)!)}
                >
                  <Globe className="w-3 h-3" />
                  Не отображается? Открыть в браузере
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

