"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryEditor, type EffectPreset } from "@/components/admin/gallery-editor";

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
    templatePrompt: String(row.template_prompt || row.templatePrompt || ""),
    featured: !!(row.featured ?? false),
    published: !!(row.published ?? false),
    order: Number(row.display_order ?? row.order ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export default function AdminContentPage() {
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const m = await fetch("/api/admin/content/meta", { credentials: "include" }).then((r) => r.json());
      setMeta(m);

      if (m?.effectsGallery) {
        const res = await fetch("/api/admin/gallery", { credentials: "include" }).then((r) => r.json());
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Контент</h1>
        <p className="text-[var(--muted)]">Редактирование витрин и контентных таблиц</p>
      </div>

      {/* Effects gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Effects gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {!meta && loading ? (
            <div className="text-sm text-[var(--muted)]">Загрузка...</div>
          ) : meta?.effectsGallery ? (
            <GalleryEditor presets={presets} onSave={onSave} onDelete={onDelete} onReorder={onReorder} loading={loading} />
          ) : (
            <div className="text-sm text-[var(--muted)]">Таблица `effects_gallery` не найдена.</div>
          )}
        </CardContent>
      </Card>

      {/* Inspiration tables (MVP: detection only) */}
      {inspirationTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inspiration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-[var(--muted)]">
              Найдены таблицы: {inspirationTables.join(", ")}. Редактор для них — следующий шаг MVP.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

