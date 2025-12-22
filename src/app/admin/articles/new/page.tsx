"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye } from "lucide-react";

export default function NewArticlePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    cover_image: "",
    tags: "",
    is_published: false,
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
          з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
          п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
          ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
        };
        return map[char] || char;
      });
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleSubmit = async (publish: boolean) => {
    if (!form.title || !form.slug || !form.content) {
      setError("Заполните название, slug и контент");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          is_published: publish,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка сохранения");
      }

      router.push("/admin/articles");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/articles"
          className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Новая статья</h1>
          <p className="text-sm text-[var(--muted)]">
            Создайте контент для блога
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Заголовок *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Как использовать AI для генерации фото"
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              URL (slug) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)] text-sm">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="kak-ispolzovat-ai"
                className="flex-1 px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Описание (для SEO)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Краткое описание статьи для поисковиков (160 символов)"
              rows={2}
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 resize-none"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Обложка (URL изображения)
            </label>
            <input
              type="text"
              value={form.cover_image}
              onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ai, генерация, руководство"
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Контент (Markdown)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={`# Заголовок

Введение к статье...

## Подзаголовок

Текст раздела...

- Пункт списка
- Ещё пункт

**Жирный текст** и *курсив*

\`\`\`
Блок кода
\`\`\``}
            rows={20}
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="border-[var(--border)]"
        >
          <Save className="w-4 h-4 mr-2" />
          Сохранить черновик
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
        >
          <Eye className="w-4 h-4 mr-2" />
          Опубликовать
        </Button>
      </div>
    </div>
  );
}

