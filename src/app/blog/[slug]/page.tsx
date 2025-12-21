import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  tags: string[];
  published_at: string;
  updated_at: string;
  views_count: number;
};

// Revalidate every hour
export const revalidate = 3600;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getArticle(slug: string): Promise<Article | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) return null;

  // Increment views (fire and forget)
  supabase
    .from("articles")
    .update({ views_count: (data.views_count || 0) + 1 })
    .eq("id", data.id)
    .then(() => {});

  return data;
}

async function getRelatedArticles(
  currentSlug: string,
  tags: string[]
): Promise<Article[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, description, cover_image, tags, published_at")
    .eq("is_published", true)
    .neq("slug", currentSlug)
    .overlaps("tags", tags)
    .order("published_at", { ascending: false })
    .limit(3);

  return (data as Article[]) || [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Статья не найдена",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lensroom.ru";

  return {
    title: article.title,
    description: article.description || `Читайте статью "${article.title}" на LensRoom`,
    keywords: article.tags,
    authors: [{ name: article.author }],
    openGraph: {
      title: article.title,
      description: article.description || undefined,
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      authors: [article.author],
      tags: article.tags,
      images: article.cover_image
        ? [
            {
              url: article.cover_image,
              width: 1200,
              height: 630,
              alt: article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description || undefined,
      images: article.cover_image ? [article.cover_image] : undefined,
    },
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
  };
}

// Generate static params for popular articles
export async function generateStaticParams() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from("articles")
    .select("slug")
    .eq("is_published", true)
    .order("views_count", { ascending: false })
    .limit(20);

  return (data || []).map((article) => ({
    slug: article.slug,
  }));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Simple Markdown to HTML converter
function renderMarkdown(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-8 mb-4">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-12 mb-6">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-[var(--surface2)] p-4 rounded-xl overflow-x-auto my-6 text-sm"><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-[var(--surface2)] px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-2 list-decimal">$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-4">')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--gold)] hover:underline">$1</a>');
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(article.slug, article.tags);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lensroom.ru";

  // JSON-LD for article
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.cover_image,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "LensRoom",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${article.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="min-h-screen bg-[var(--bg)]">
        {/* Header */}
        <header className="py-8 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Все статьи
            </Link>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs bg-[var(--gold)]/10 text-[var(--gold)] rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4">
              {article.title}
            </h1>

            {/* Description */}
            {article.description && (
              <p className="text-lg text-[var(--muted)] mb-6">
                {article.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(article.published_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {estimateReadTime(article.content)} мин чтения
              </span>
              <span>Автор: {article.author}</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {article.cover_image && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <div className="aspect-video rounded-2xl overflow-hidden bg-[var(--surface2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="prose prose-invert prose-lg max-w-none text-[var(--text)] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: `<p class="mb-4">${renderMarkdown(article.content)}</p>`,
            }}
          />
        </div>

        {/* Share */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">
              Понравилась статья? Поделитесь!
            </span>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: article.title,
                    url: `${baseUrl}/blog/${article.slug}`,
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--surface2)] rounded-xl hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Поделиться
            </button>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-12 border-t border-[var(--border)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <h2 className="text-2xl font-bold text-[var(--text)] mb-8">
                Похожие статьи
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-white/20 transition-all"
                  >
                    <h3 className="font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                    {related.description && (
                      <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">
                        {related.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
              Попробуйте AI генерацию
            </h2>
            <p className="text-[var(--muted)] mb-6">
              Создайте профессиональные фото и видео прямо сейчас
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Начать бесплатно
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
