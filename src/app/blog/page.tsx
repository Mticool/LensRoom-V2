import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { SEED_BLOG_ARTICLES } from "@/content/blogSeed";

export const metadata: Metadata = {
  title: "Блог | Статьи об AI генерации",
  description:
    "Полезные статьи о генерации изображений и видео с помощью искусственного интеллекта. Руководства, советы и примеры промптов.",
  openGraph: {
    title: "Блог LensRoom - Статьи об AI генерации",
    description: "Руководства, советы и примеры промптов для AI генерации",
    type: "website",
  },
};

// Revalidate every hour
export const revalidate = 3600;

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  author: string;
  tags: string[];
  published_at: string;
  views_count: number;
};

async function getArticles(): Promise<Article[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return SEED_BLOG_ARTICLES;

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, description, cover_image, author, tags, published_at, views_count")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Blog] Error fetching articles:", error);
    return SEED_BLOG_ARTICLES;
  }

  const list = data || [];
  // If DB is empty (or articles not published yet) - show seed articles so blog is not empty.
  if (list.length === 0) return SEED_BLOG_ARTICLES;
  return list;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function estimateReadTime(description: string | null): number {
  const words = (description || "").split(/\s+/).length;
  return Math.max(3, Math.ceil(words / 200) + 2); // Minimum 3 min
}

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Hero Section */}
      <section className="py-16 sm:py-24 border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text)] mb-4">
            Блог LensRoom
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Руководства, советы и примеры использования AI для генерации
            профессиональных фото и видео
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--muted)]">Статьи скоро появятся...</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <article
                  key={article.id}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden hover:border-white/20 transition-all"
                >
                  {/* Cover Image */}
                  {article.cover_image && (
                    <div className="aspect-video bg-[var(--surface2)] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.cover_image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-[var(--gold)]/10 text-[var(--gold)] rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-2 line-clamp-2 group-hover:text-[var(--gold)] transition-colors">
                      <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                    </h2>

                    {/* Description */}
                    {article.description && (
                      <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
                        {article.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.published_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(article.description)} мин
                        </span>
                      </div>
                    </div>

                    {/* Read More */}
                    <Link
                      href={`/blog/${article.slug}`}
                      className="mt-4 flex items-center gap-1 text-sm text-[var(--gold)] font-medium group-hover:gap-2 transition-all"
                    >
                      Читать далее
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
            Готовы попробовать AI генерацию?
          </h2>
          <p className="text-[var(--muted)] mb-6">
            Создайте первое изображение бесплатно уже сейчас
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Начать создавать
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

