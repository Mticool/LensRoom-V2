"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryEditor, type EffectPreset } from "@/components/admin/gallery-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ContentMeta = {
  effectsGallery: boolean;
  inspiration: string[];
};

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
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlacement, setActivePlacement] = useState<"home" | "inspiration">("home");

  const load = async (placement?: string) => {
    setLoading(true);
    try {
      const m = await fetch("/api/admin/content/meta", { credentials: "include" }).then((r) => r.json());
      setMeta(m);

      if (m?.effectsGallery) {
        const params = new URLSearchParams();
        if (placement) params.set("placement", placement);
        const url = `/api/admin/gallery?${params.toString()}`;
        const res = await fetch(url, { credentials: "include" }).then((r) => r.json());
        const list = Array.isArray(res?.effects) ? res.effects : [];
        setPresets(list.map(fromDb));
      } else {
        setPresets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activePlacement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const inspirationTables = useMemo(() => meta?.inspiration || [], [meta]);

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
          {!meta && loading ? (
            <div className="text-sm text-[var(--muted)]">Загрузка...</div>
          ) : meta?.effectsGallery ? (
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
          ) : (
            <div className="text-sm text-[var(--muted)]">Таблица `effects_gallery` не найдена.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


