import type { Metadata } from "next";
import Link from "next/link";
import { MODEL_LANDINGS } from "@/lib/seo/model-pages";

export const metadata: Metadata = {
  title: "Нейросети (модели)",
  description: "Каталог нейросетей LensRoom: модели для генерации изображений и видео онлайн.",
  alternates: { canonical: "/models" },
};

function groupBy<T extends { category: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});
}

export default function ModelsIndexPage() {
  const grouped = groupBy(MODEL_LANDINGS);
  const imageModels = grouped.image || [];
  const videoModels = grouped.video || [];

  const Card = ({ slug, name, description }: { slug: string; name: string; description: string }) => (
    <Link
      href={`/models/${slug}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-hover)] transition-colors"
    >
      <div className="text-lg font-semibold text-[var(--text)]">{name}</div>
      <div className="mt-1 text-sm text-[var(--text2)]">{description}</div>
      <div className="mt-3 text-sm font-medium text-[var(--accent-primary)]">Открыть →</div>
    </Link>
  );

  return (
    <main className="min-h-screen bg-[var(--bg)] pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text)]">Нейросети (модели)</h1>
        <p className="mt-3 text-[var(--text2)] max-w-3xl">
          Отдельные страницы под каждую модель помогают поиску (Яндекс/Google) лучше понимать сайт и показывать LensRoom по
          точным запросам.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-[var(--text)]">Изображения</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageModels.map((m) => (
              <Card key={m.slug} slug={m.slug} name={m.name} description={m.description} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-[var(--text)]">Видео</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoModels.map((m) => (
              <Card key={m.slug} slug={m.slug} name={m.name} description={m.description} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}


