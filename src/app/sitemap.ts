import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Create admin client for sitemap generation
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lensroom.ru";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/create/video`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/create/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/inspiration`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic article pages
  let articlePages: MetadataRoute.Sitemap = [];

  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data: articles } = await supabase
        .from("articles")
        .select("slug, updated_at, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (articles) {
        articlePages = articles.map((article) => ({
          url: `${baseUrl}/blog/${article.slug}`,
          lastModified: new Date(article.updated_at || article.published_at),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));
      }
    }
  } catch (error) {
    console.error("[Sitemap] Error fetching articles:", error);
  }

  return [...staticPages, ...articlePages];
}






