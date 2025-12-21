"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  tags: string[];
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<Article | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    cover_image: "",
    tags: "",
    is_published: false,
  });

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/admin/articles/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Статья не найдена");
        const data = await res.json();
        setArticle(data.article);
        setForm({
          title: data.article.title,
          slug: data.article.slug,
          description: data.article.description || "",
          content: data.article.content,
          cover_image: data.article.cover_image || "",
          tags: (data.article.tags || []).join(", "),
          is_published: data.article.is_published,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const handleSubmit = async (publish?: boolean) => {
    if (!form.title || !form.slug || !form.content) {
      setError("Заполните название, slug и контент");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isPublished = publish !== undefined ? publish : form.is_published;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          is_published: isPublished,
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

  const handleDelete = async () => {
    if (!confirm("Удалить статью безвозвратно?")) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      router.push("/admin/articles");
    } catch (err) {
      alert("Ошибка удаления");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 bg-[var(--surface)] animate-pulse rounded-lg" />
        <div className="h-64 bg-[var(--surface)] animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <Link href="/admin/articles" className="text-[var(--gold)] text-sm mt-4 block">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="p-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              Редактирование статьи
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {article?.views_count || 0} просмотров •{" "}
              {article?.created_at
                ? new Date(article.created_at).toLocaleDateString("ru-RU")
                : ""}
            </p>
          </div>
        </div>

        {article?.is_published && (
          <a
            href={`/blog/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[var(--gold)] hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть на сайте
          </a>
        )}
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
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
              placeholder="Краткое описание статьи для поисковиков"
              rows={2}
              className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 resize-none"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-2 block">
              Обложка (URL)
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
            placeholder="# Заголовок..."
            rows={20}
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]/50 resize-y font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleDelete}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Удалить
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="border-[var(--border)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
          {form.is_published ? (
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="border-[var(--border)]"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Снять с публикации
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="bg-[var(--gold)] text-black hover:bg-[var(--gold)]/90"
            >
              <Eye className="w-4 h-4 mr-2" />
              Опубликовать
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
