"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryEditor, type EffectPreset } from "@/components/admin/gallery-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EffectsApiRow = any;

function fromDb(row: EffectsApiRow): EffectPreset {
  return {
    id: row.id,
    presetId: String(row.preset_id || row.presetId || ""),
    title: String(row.title || ""),
    contentType: (row.content_type || row.contentType || "photo") as any,
    modelKey: String(row.model_key || row.modelKey || ""),
    tileRatio: (row.tile_ratio || row.tileRatio || "1:1") as any,
    costStars: Number(row.cost_stars ?? row.costStars ?? 0),
    mode: String(row.mode || "t2i"),
    variantId: String(row.variant_id || row.variantId || "default"),
    previewImage: String(row.preview_image || row.previewImage || ""),
    previewUrl: String(row.preview_url || row.previewUrl || row.preview_image || row.previewImage || ""),
    templatePrompt: String(row.template_prompt || row.templatePrompt || ""),
    featured: !!(row.featured ?? false),
    published: !!(row.published ?? false),
    order: Number(row.display_order ?? row.order ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    // New Content Constructor fields
    placement: (row.placement || "home") as "home" | "inspiration",
    status: (row.status || "draft") as "draft" | "published",
    category: String(row.category || ""),
    priority: Number(row.priority ?? 0),
    type: (row.type || (row.content_type === "video" ? "video" : "image")) as "image" | "video",
    assetUrl: String(row.asset_url || ""),
    posterUrl: String(row.poster_url || ""),
    aspect: (row.aspect || row.tile_ratio || "1:1") as "1:1" | "9:16" | "16:9",
    shortDescription: String(row.short_description || ""),
  };
}

export default function AdminContentPage() {
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlacement, setActivePlacement] = useState<"home" | "inspiration">("home");

  const load = async (placement?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (placement) params.set("placement", placement);
      const url = `/api/admin/gallery?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      const list = Array.isArray(data?.effects) ? data.effects : [];
      setPresets(list.map(fromDb));
    } catch (err: any) {
      console.error("Failed to load gallery:", err);
      setError(err.message || "Не удалось загрузить контент");
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activePlacement);
  }, [activePlacement]);

  const onSave = async (preset: EffectPreset) => {
    const res = await fetch("/api/admin/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(preset),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to save");
    }
    await load();
  };

  const onDelete = async (presetId: string) => {
    const res = await fetch(`/api/admin/gallery?presetId=${encodeURIComponent(presetId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to delete");
    }
    await load();
  };

  const onReorder = async (next: EffectPreset[]) => {
    // MVP: persist order via best-effort updates.
    const sorted = next.map((p, idx) => ({ ...p, order: idx }));
    for (const p of sorted) {
      await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(p),
      });
    }
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Контент-конструктор</h1>
        <p className="text-[var(--muted)]">Управление контентом для главной страницы и Inspiration</p>
      </div>

      {/* Content Constructor with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Карточки контента</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">Ошибка загрузки: {error}</p>
              <p className="text-xs text-[var(--muted)] mb-4">
                Возможно, таблица `effects_gallery` не создана в базе данных.
              </p>
              <button
                onClick={() => load(activePlacement)}
                className="px-4 py-2 bg-[var(--gold)] text-black rounded-lg hover:bg-[var(--gold)]/90"
              >
                Повторить попытку
              </button>
            </div>
          ) : (
            <Tabs value={activePlacement} onValueChange={(v) => setActivePlacement(v as "home" | "inspiration")}>
              <TabsList className="mb-6">
                <TabsTrigger value="home">Главная</TabsTrigger>
                <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
              </TabsList>
              
              <TabsContent value="home">
                <GalleryEditor 
                  presets={presets} 
                  onSave={onSave} 
                  onDelete={onDelete} 
                  onReorder={onReorder} 
                  loading={loading}
                  placement="home"
                />
              </TabsContent>
              
              <TabsContent value="inspiration">
                <GalleryEditor 
                  presets={presets} 
                  onSave={onSave} 
                  onDelete={onDelete} 
                  onReorder={onReorder} 
                  loading={loading}
                  placement="inspiration"
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


