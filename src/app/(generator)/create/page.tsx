import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function first(searchParams: Record<string, string | string[] | undefined> | undefined, k: string): string {
  const v = searchParams?.[k];
  return Array.isArray(v) ? String(v[0] || "") : String(v || "");
}

function normalizeSection(raw: string): "photo" | "video" | "motion" | "music" | "voice" {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "photo") return "photo";
  if (s === "video") return "video";
  if (s === "motion") return "motion";
  if (s === "music") return "music";
  if (s === "voice") return "voice";
  // Backward-compat
  if (s === "image") return "photo";
  if (s === "audio") return "music";
  return "photo";
}

/**
 * Legacy route.
 * We keep `/create` as a stable entrypoint and redirect to the unified generator `/create/studio`.
 */
export default async function CreateLegacyRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js app router types may provide `searchParams` as a Promise in newer versions.
  const sp = searchParams ? await searchParams : undefined;
  const section = normalizeSection(first(sp, "section") || first(sp, "kind"));

  const params = new URLSearchParams();
  params.set("section", section);

  // Project/thread (canonical: `project`, legacy: `thread`)
  const project = (first(sp, "project") || first(sp, "thread")).trim();
  if (project) params.set("project", project);

  const model = first(sp, "model").trim();
  if (model) params.set("model", model);

  const prompt = first(sp, "prompt").trim();
  if (prompt) params.set("prompt", prompt);

  const generationId = first(sp, "generationId").trim();
  if (generationId) params.set("generationId", generationId);

  redirect(`/create/studio?${params.toString()}`);
}
