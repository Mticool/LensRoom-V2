"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTable, Column } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, Image as ImageIcon, Film, X } from "lucide-react";
import { PHOTO_MODELS, VIDEO_MODELS } from "@/config/models";

interface Style {
  id: string;
  title: string;
  description?: string;
  placement: "homepage" | "inspiration" | "both";
  preview_image?: string;
  thumbnail_url?: string;
  model_key: string;
  preset_id?: string;
  template_prompt?: string;
  cost_stars: number;
  featured: boolean;
  published: boolean;
  display_order: number;
  category?: string;
  tags?: string[];
  views_count: number;
  uses_count: number;
  created_at: string;
  updated_at: string;
}

export default function AdminStylesPage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStyle, setEditingStyle] = useState<Style | null>(null);
  const [showForm, setShowForm] = useState(false);
  const categories = Array.from(
    new Set(
      styles
        .map((s) => (s.category || "").trim())
        .filter((c) => c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const loadStyles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/styles", { credentials: "include" });
      const data = await res.json();
      setStyles(data.styles || []);
    } catch (error) {
      console.error("Failed to load styles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStyles();
  }, []);

  const handleSave = async (style: Partial<Style>) => {
    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(style),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save style");
      }

      await loadStyles();
      setShowForm(false);
      setEditingStyle(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот стиль?")) return;

    try {
      const res = await fetch(`/api/admin/styles?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete style");
      }

      await loadStyles();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const columns: Column<Style>[] = [
    {
      key: "preview_image",
      label: "Превью",
      mobileLabel: "📷",
      render: (item) =>
        item.preview_image ? (
          <img
            src={item.preview_image}
            alt={item.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        ) : (
          <div className="w-16 h-16 bg-[var(--surface2)] rounded-lg flex items-center justify-center text-xs text-[var(--muted)]">
            Нет
          </div>
        ),
    },
    {
      key: "title",
      label: "Название",
      mobileLabel: "Название",
      render: (item) => (
        <div>
          <div className="font-medium text-[var(--text)]">{item.title}</div>
          {item.description && (
            <div className="text-xs text-[var(--muted)] mt-1">
              {item.description.slice(0, 50)}
              {item.description.length > 50 ? "..." : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "placement",
      label: "Размещение",
      mobileLabel: "📍",
      render: (item) => {
        const labels = {
          homepage: "Главная",
          inspiration: "Вдохновение",
          both: "Оба",
        };
        return (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface2)] text-[var(--muted)]">
            {labels[item.placement]}
          </span>
        );
      },
    },
    {
      key: "cost_stars",
      label: "Стоимость",
      mobileLabel: "⭐",
      render: (item) => `${item.cost_stars} ⭐`,
    },
    {
      key: "status",
      label: "Статус",
      mobileLabel: "📊",
      render: (item) => (
        <div className="flex gap-2">
          {item.published ? (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
              ✓ Опубликован
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">
              ✗ Черновик
            </span>
          )}
          {item.featured && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
              ⭐ Избранное
            </span>
          )}
        </div>
      ),
    },
    {
      key: "stats",
      label: "Статистика",
      mobileLabel: "📈",
      render: (item) => (
        <div className="text-xs text-[var(--muted)]">
          {item.views_count} просм. / {item.uses_count} исп.
        </div>
      ),
    },
    {
      key: "actions",
      label: "Действия",
      mobileLabel: "⚙️",
      render: (item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingStyle(item);
              setShowForm(true);
            }}
          >
            Изменить
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(item.id)}
            className="text-red-400 hover:text-red-300"
          >
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Стили</h1>
          <p className="text-[var(--muted)]">
            Управление стилями для главной страницы и раздела вдохновение
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingStyle(null);
            setShowForm(true);
          }}
        >
          + Добавить стиль
        </Button>
      </div>

      {/* Форма создания/редактирования */}
      {showForm && (
        <StyleForm
          style={editingStyle}
          categories={categories}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingStyle(null);
          }}
        />
      )}

      {/* Таблица стилей */}
      <Card padding="none">
        <CardHeader>
          <CardTitle>Все стили ({styles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)]">Загрузка...</div>
          ) : (
            <AdminTable
              columns={columns}
              data={styles}
              getRowKey={(item) => item.id}
              emptyMessage="Нет стилей"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StyleForm({
  style,
  categories,
  onSave,
  onCancel,
}: {
  style: Style | null;
  categories: string[];
  onSave: (style: Partial<Style>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Style>>(
    style || {
      title: "",
      description: "",
      placement: "inspiration",
      model_key: "flux-1.1-pro",
      cost_stars: 4,
      featured: false,
      published: true,
      display_order: 0,
      tags: [],
    }
  );
  const [genOpen, setGenOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{style ? "Редактировать стиль" : "Новый стиль"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Название *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Размещение */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Размещение *
              </label>
              <select
                value={formData.placement}
                onChange={(e) =>
                  setFormData({ ...formData, placement: e.target.value as any })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="homepage">Главная</option>
                <option value="inspiration">Вдохновение</option>
                <option value="both">Оба</option>
              </select>
            </div>

            {/* Описание */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Превью URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                URL превью
              </label>
              <input
                type="url"
                value={formData.preview_image}
                onChange={(e) =>
                  setFormData({ ...formData, preview_image: e.target.value })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              {formData.preview_image ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)]">
                  <img
                    src={String(formData.preview_image)}
                    alt="Preview"
                    className="w-full max-h-[220px] object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mt-3 text-xs text-[var(--muted)]">
                  Предпросмотр появится после вставки URL или генерации.
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setGenOpen(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Сгенерировать превью
                </Button>
                <span className="text-xs text-[var(--muted)]">
                  Фото/Видео → подставим превью автоматически
                </span>
              </div>
            </div>

            {/* Model Key */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Model Key *
              </label>
              <input
                type="text"
                required
                value={formData.model_key}
                onChange={(e) => setFormData({ ...formData, model_key: e.target.value })}
                placeholder="flux-1.1-pro"
                list="style-model-keys"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <datalist id="style-model-keys">
                {PHOTO_MODELS.map((m) => (
                  <option key={`p:${m.id}`} value={m.id}>
                    {m.name}
                  </option>
                ))}
                {VIDEO_MODELS.map((m) => (
                  <option key={`v:${m.id}`} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </datalist>
              <div className="mt-1 text-xs text-[var(--muted)]">
                Это ID модели в системе (используется в URL как <span className="font-mono">?model=...</span>).
              </div>
            </div>

            {/* Стоимость */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Стоимость (⭐)
              </label>
              <input
                type="number"
                min="0"
                value={formData.cost_stars}
                onChange={(e) =>
                  setFormData({ ...formData, cost_stars: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Порядок */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Порядок отображения
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Категория
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="portrait, landscape, art..."
                list="style-categories"
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <datalist id="style-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Template Prompt */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Шаблон промпта
              </label>
              <textarea
                value={formData.template_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, template_prompt: e.target.value })
                }
                rows={2}
                placeholder="A beautiful {subject} in {style}..."
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            {/* Чекбоксы */}
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) =>
                    setFormData({ ...formData, published: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">Опубликовано</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">Избранное</span>
              </label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
          </form>
        </CardContent>
      </Card>

      <StyleGeneratorModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        defaultPrompt={String(formData.template_prompt || formData.description || formData.title || "")}
        onApplyPreviewUrl={(url) => {
          setFormData((prev) => ({
            ...prev,
            preview_image: url,
            thumbnail_url: url,
          }));
          setGenOpen(false);
        }}
      />
    </>
  );
}

function StyleGeneratorModal({
  open,
  onClose,
  defaultPrompt,
  onApplyPreviewUrl,
}: {
  open: boolean;
  onClose: () => void;
  defaultPrompt: string;
  onApplyPreviewUrl: (url: string) => void;
}) {
  const [kind, setKind] = useState<"photo" | "video">("photo");
  const [prompt, setPrompt] = useState(defaultPrompt || "");
  const [model, setModel] = useState<string>(PHOTO_MODELS[0]?.id || "nano-banana-pro");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16" | "16:9">("1:1");
  const [duration, setDuration] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [resultUrl, setResultUrl] = useState<string>("");

  // Keep model list in sync with kind
  useEffect(() => {
    if (kind === "photo") setModel(PHOTO_MODELS[0]?.id || "nano-banana-pro");
    else setModel(VIDEO_MODELS[0]?.id || "kling-2.6");
  }, [kind]);

  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt || "");
      setProgress(0);
      setResultUrl("");
    }
  }, [open, defaultPrompt]);

  const pollJob = async (jobId: string, provider?: string) => {
    const maxAttempts = 180;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const qs = new URLSearchParams();
      qs.set("kind", kind === "video" ? "video" : "image");
      if (provider) qs.set("provider", provider);
      const res = await fetch(`/api/jobs/${jobId}?${qs.toString()}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Job status error (${res.status})`);
      if (typeof data?.progress === "number") setProgress(Math.max(0, Math.min(100, data.progress)));
      if (data.status === "completed" && Array.isArray(data.results) && data.results[0]?.url) {
        return String(data.results[0].url);
      }
      if (data.status === "failed") throw new Error(data.error || "Generation failed");
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Timeout");
  };

  const uploadPoster = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "styles");
    const res = await fetch("/api/admin/content/upload", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    return String(data.url || "");
  };

  const generatePosterFromVideoUrl = async (videoUrl: string) => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
    });
    try {
      video.currentTime = Math.min(0.1, video.duration || 0.1);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
    } catch {
      // ignore
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, video.videoWidth || 1);
    canvas.height = Math.max(1, video.videoHeight || 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.82));
    if (!blob) throw new Error("Failed to render poster");
    return new File([blob], `style-poster-${Date.now()}.webp`, { type: "image/webp" });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Введите промпт");
      return;
    }
    setLoading(true);
    setProgress(0);
    setResultUrl("");
    try {
      const endpoint = kind === "video" ? "/api/generate/video" : "/api/generate/photo";
      const payload =
        kind === "video"
          ? { prompt, model, duration, mode: "t2v", aspectRatio, variants: 1 }
          : { prompt, model, aspectRatio, variants: 1, mode: "t2i" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Generate failed (${res.status})`);
      }

      const jobId = String(data.jobId || "");
      const provider = data.provider ? String(data.provider) : undefined;
      if (!jobId) throw new Error("No jobId returned");

      const url = await pollJob(jobId, provider);

      if (kind === "photo") {
        setResultUrl(url);
        onApplyPreviewUrl(url);
        toast.success("Превью сгенерировано и подставлено ✅");
      } else {
        // Video: generate poster (image) and upload it, then apply poster URL as preview image.
        setResultUrl(url);
        try {
          const posterFile = await generatePosterFromVideoUrl(url);
          const posterUrl = await uploadPoster(posterFile);
          if (posterUrl) {
            onApplyPreviewUrl(posterUrl);
            toast.success("Видео готово, постер подставлен ✅");
          } else {
            toast.error("Видео готово, но не удалось загрузить постер. Загрузите превью вручную.");
          }
        } catch (e) {
          toast.error("Видео готово, но постер не удалось создать. Загрузите превью вручную.");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка генерации";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <div className="text-lg font-bold text-[var(--text)]">Генератор превью</div>
            <div className="text-xs text-[var(--muted)]">Сгенерируйте картинку/видео и вставьте превью в стиль</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface)]">
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={kind === "photo" ? "default" : "outline"} onClick={() => setKind("photo")}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Фото
            </Button>
            <Button type="button" variant={kind === "video" ? "default" : "outline"} onClick={() => setKind("video")}>
              <Film className="w-4 h-4 mr-2" />
              Видео
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Модель</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              >
                {(kind === "photo" ? PHOTO_MODELS : VIDEO_MODELS).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Соотношение</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              >
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
            </div>

            {kind === "video" && (
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Длительность</label>
                <select
                  value={String(duration)}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
                >
                  <option value="5">5 сек</option>
                  <option value="10">10 сек</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Промпт</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text)]"
              placeholder="Например: Cinematic portrait, dramatic lighting..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Сгенерировать
            </Button>
            {loading && (
              <div className="text-sm text-[var(--muted)]">
                Прогресс: {progress ? `${progress}%` : "в процессе…"}
              </div>
            )}
          </div>

          {resultUrl && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-sm font-medium text-[var(--text)] mb-2">Результат</div>
              <a href={resultUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 break-all">
                {resultUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
