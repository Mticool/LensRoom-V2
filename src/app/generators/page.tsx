import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Видео-генератор | LensRoom',
  description: 'Создавай видео из текста, картинок и motion-референсов с помощью лучших AI моделей: Veo, Sora, Kling и других.',
  openGraph: {
    title: 'Видео-генератор | LensRoom',
    description: 'Создавай видео из текста, картинок и motion-референсов',
  },
};

export default function GeneratorsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v;
  };

  // Legacy: /generators?mode=motion
  const mode = String(get("mode") || "").trim().toLowerCase();
  const section = mode === "motion" ? "motion" : "video";

  const params = new URLSearchParams();
  params.set("section", section);

  const project = String(get("project") || get("thread") || "").trim();
  if (project) params.set("project", project);

  const model = String(get("model") || "").trim();
  if (model) params.set("model", model);

  const prompt = String(get("prompt") || "").trim();
  if (prompt) params.set("prompt", prompt);

  const generationId = String(get("generationId") || "").trim();
  if (generationId) params.set("generationId", generationId);

  redirect(`/create/studio?${params.toString()}`);
}
