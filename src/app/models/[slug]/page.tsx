import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModelLandingBySlug } from "@/lib/seo/model-pages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = getModelLandingBySlug(slug);
  if (!m) return {};

  const baseTitle =
    m.category === "video"
      ? `${m.name} — нейросеть для генерации видео онлайн`
      : `${m.name} — нейросеть для генерации изображений онлайн`;

  return {
    title: baseTitle,
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: `/models/${m.slug}` },
    openGraph: {
      title: baseTitle,
      description: m.description,
      url: `https://lensroom.ru/models/${m.slug}`,
      type: "website",
    },
  };
}

export default async function ModelLandingPage({ params }: Props) {
  const { slug } = await params;
  const m = getModelLandingBySlug(slug);
  if (!m) notFound();

  const categoryUrl = m.category === "video" ? "/video" : "/image";
  const categoryName = m.category === "video" ? "видео" : "изображения";
  const ctaHref = (() => {
    if (!m.generatorModelId) return categoryUrl;
    const params = new URLSearchParams();
    params.set("section", m.category === "video" ? "video" : "image");
    params.set("model", m.generatorModelId);
    if (m.generatorVariant) params.set("variant", m.generatorVariant);
    if (m.generatorParams) {
      for (const [k, v] of Object.entries(m.generatorParams)) {
        if (v != null && String(v).length > 0) params.set(k, String(v));
      }
    }
    return `/generator?${params.toString()}`;
  })();

  return (
    <main className="min-h-screen bg-[var(--bg)] pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-sm text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--text)]">
            Главная
          </Link>{" "}
          <span className="mx-2">/</span>
          <Link href="/models" className="hover:text-[var(--text)]">
            Модели
          </Link>{" "}
          <span className="mx-2">/</span>
          <span className="text-[var(--text)]">{m.name}</span>
        </nav>

        <header className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface2)] px-3 py-1 text-sm text-[var(--muted)]">
            {m.category === "video" ? "Видео модель" : "Фото модель"}
          </div>

          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-[var(--text)]">{m.name}</h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--text2)] max-w-3xl">{m.description}</p>

          {m.generatorHint && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {m.generatorHint}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent-primary)] px-6 py-3 font-semibold text-black hover:opacity-95"
            >
              Попробовать {categoryName}
            </Link>
            <Link
              href={categoryUrl}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-transparent px-6 py-3 font-semibold text-[var(--text)] hover:bg-[var(--surface2)]"
            >
              Смотреть все {categoryName}
            </Link>
          </div>
        </header>

        <section className="mt-10 grid lg:grid-cols-3 gap-4">
          {[
            {
              title: "Как использовать",
              text:
                m.category === "video"
                  ? "Открой генератор, выбери модель и опиши сцену. Для image→video загрузите референс‑картинку."
                  : "Открой генератор, выбери модель и опиши изображение. Для фото→фото загрузите референс.",
            },
            {
              title: "Лучшие задачи",
              text:
                m.category === "video"
                  ? "Реклама, клипы, сторис, презентации, анимация продукта."
                  : "Продуктовые фото, портреты, креативы, иллюстрации, баннеры.",
            },
            {
              title: "Совет по промпту",
              text:
                m.category === "video"
                  ? "Добавляйте: стиль, действие, камера, свет, длительность/кадрирование."
                  : "Добавляйте: стиль, композиция, свет, линза, фон, детали.",
            },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="text-base font-semibold text-[var(--text)]">{b.title}</div>
              <div className="mt-2 text-sm text-[var(--text2)] leading-relaxed">{b.text}</div>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-[var(--text)]">Быстрый старт</h2>
          <ol className="mt-4 space-y-2 text-[var(--text2)]">
            <li>1) Открой генератор и выбери модель.</li>
            <li>2) Вставь промпт и (если нужно) загрузить референс.</li>
            <li>3) Нажми “Сгенерировать” и скачай результат.</li>
          </ol>
          <div className="mt-6">
            <Link href={ctaHref} className="text-[var(--accent-primary)] font-semibold hover:underline">
              Перейти в генератор →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}


