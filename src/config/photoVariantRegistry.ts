import { PHOTO_MODELS, type PhotoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";

export type ParamKey = "version" | "mode" | "resolution" | "quality" | "format";

export type Variant = {
  id: string; // e.g. "v2_pro_2k_fast"
  params: Partial<Record<ParamKey, string>>;
  stars: number;
  enabled: boolean;
  planGate?: "free" | "pro" | "agency";
  // Internal linkage back to legacy model config
  sourceModelId: string; // id in src/config/models.ts (used for backend)
};

export type PhotoModel = {
  id: string; // stable slug (base model)
  title: string; // display title without suffixes
  type: "photo";
  shortDescription: string; // краткое описание для списка (до 60 символов)
  description: string; // развёрнутое описание для генератора
  rank: number; // порядок отображения (из исходных моделей)
  paramSchema: Array<{
    key: ParamKey;
    label: string;
    ui: "segmented" | "select";
    options: Array<{ value: string; label: string }>;
    order: number;
  }>;
  variants: Variant[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function parseNameParams(name: string): Partial<Record<ParamKey, string>> {
  const n = name;
  const params: Partial<Record<ParamKey, string>> = {};

  // resolution tokens
  const resMatch = n.match(/(?:^|\s|\()(?:(≤\s*2K)|([1248])K)(?:\)|\s|$)/i);
  if (resMatch) {
    const raw = (resMatch[1] || resMatch[2] || "").toLowerCase();
    if (raw.includes("≤")) params.resolution = "2k";
    else if (raw) params.resolution = `${raw}k`;
  }

  // mode tokens
  if (/\bpro\b/i.test(n)) params.mode = "pro";
  if (/\bflex\b/i.test(n)) params.mode = "flex";
  if (/\bmax\b/i.test(n)) params.mode = "max";

  // version tokens
  const vMatch = n.match(/\bv\s*([0-9]+(?:\.[0-9]+)?)\b/i);
  if (vMatch?.[1]) params.version = `v${vMatch[1]}`;
  // also treat ".2" in names like "FLUX.2" as v2 (best-effort)
  const dotV = n.match(/\.(\d)(?:\s|$)/);
  if (!params.version && dotV?.[1]) params.version = `v${dotV[1]}`;
  // treat standalone "2" as v2 (e.g. "FLUX 2 Pro")
  if (!params.version && /\b2\b/.test(n)) params.version = "v2";

  // quality tokens
  if (/\bfast\b/i.test(n)) params.quality = "fast";
  if (/\bquality\b/i.test(n)) params.quality = "quality";

  // format tokens (aspect ratios inside name)
  const fmt = n.match(/\b(1:1|4:5|16:9|9:16|4:3|3:4)\b/);
  if (fmt?.[1]) params.format = fmt[1];

  return params;
}

function baseTitleFromName(name: string): string {
  // Special case: keep "Nano Banana Pro" as separate from "Nano Banana"
  if (/nano\s+banana\s+pro/i.test(name)) {
    return "Nano Banana Pro";
  }

  // Remove bracketed parts and known suffix tokens
  let t = name;
  t = t.replace(/\([^)]*\)/g, " ").trim();

  // Remove common suffix tokens
  // Keep this conservative (only v1/v2), to avoid collapsing distinct models like "V3".
  t = t.replace(/\bv\s*[12]\b/gi, " ");
  // also strip ".2" when used as version marker (e.g. "FLUX.2")
  t = t.replace(/\.2\b/g, " ");
  // and standalone trailing/isolated "2" (e.g. "FLUX 2 Pro")
  t = t.replace(/(?:^|\s)2(?:\s|$)/g, " ");
  t = t.replace(/\bpro\b/gi, " ");
  t = t.replace(/\bflex\b/gi, " ");
  t = t.replace(/\bmax\b/gi, " ");
  t = t.replace(/\bfast\b/gi, " ");
  t = t.replace(/\bquality\b/gi, " ");
  t = t.replace(/(?:^|\s)(?:≤\s*2K|[1248]K)(?:\s|$)/gi, " ");
  t = t.replace(/\b(1:1|4:5|16:9|9:16|4:3|3:4)\b/g, " ");
  t = t.replace(/\s+/g, " ").trim();

  return t || name;
}

function expandVariantsFromPricing(
  model: PhotoModelConfig,
  baseParams: Partial<Record<ParamKey, string>>
): Variant[] {
  // If pricing is a number -> single variant
  if (typeof model.pricing === "number") {
    const stars = computePrice(model.id, { variants: 1 }).stars;
    return [
      {
        id: slugify(Object.entries(baseParams).map(([k, v]) => `${k}_${v}`).join("_") || model.id),
        params: baseParams,
        stars,
        enabled: true,
        sourceModelId: model.id,
      },
    ];
  }

  const pricingObj = model.pricing as Record<string, number>;
  const keys = model.qualityOptions?.length ? model.qualityOptions : Object.keys(pricingObj);

  const built = keys
    .filter((k) => (pricingObj as any)[k] !== undefined)
    .map((k) => {
      const params = { ...baseParams } as Partial<Record<ParamKey, string>>;

      // map pricing key to param
      const lk = String(k).toLowerCase();
      if (lk === "turbo" || lk === "balanced" || lk === "quality" || lk === "fast" || lk === "ultra") {
        params.quality = lk;
      } else if (lk === "1k" || lk === "2k" || lk === "4k" || lk === "8k") {
        params.resolution = lk;
      } else if (lk.startsWith("a_") || lk.startsWith("b_") || lk.startsWith("c_")) {
        // Ideogram Character packs
        params.quality = lk;
      }

      const stars = computePrice(model.id, { quality: k, variants: 1 }).stars;
      const variantIdParts: string[] = [];
      (["version", "mode", "resolution", "quality", "format"] as const).forEach((pk) => {
        if (params[pk]) variantIdParts.push(String(params[pk]));
      });
      const id = slugify(variantIdParts.join("_") || `${model.id}_${k}`);

      return {
        id,
        params,
        stars,
        enabled: true,
        sourceModelId: model.id,
      };
    });

  // If all variants have the same stars, collapse into a single variant to avoid fake choices.
  const starsSet = new Set(built.map((v) => v.stars));
  if (starsSet.size <= 1 && built[0]) {
    return [
      {
        id: slugify(model.id),
        params: baseParams,
        stars: built[0].stars,
        enabled: true,
        sourceModelId: model.id,
      },
    ];
  }

  return built;
}

function buildParamSchema(variants: Variant[]): PhotoModel["paramSchema"] {
  const keys: ParamKey[] = ["version", "mode", "resolution", "quality", "format"];
  const labels: Record<ParamKey, string> = {
    version: "Версия",
    mode: "Режим",
    resolution: "Разрешение",
    quality: "Качество",
    format: "Формат",
  };
  const order: Record<ParamKey, number> = {
    version: 10,
    mode: 20,
    resolution: 30,
    quality: 40,
    format: 50,
  };

  const schema = keys
    .map((k) => {
      const values = Array.from(new Set(variants.map((v) => v.params[k]).filter(Boolean) as string[]));
      if (values.length <= 1) return null; // hide params with no real choice
      const ui: "segmented" | "select" = values.length <= 4 ? "segmented" : "select";

      const labelFor = (value: string) => {
        if (value === "default") return "BASE";
        if (k === "quality") {
          const m = value.match(/^([abc])_(\d+)cred$/i);
          if (m) return `${m[1].toUpperCase()} • ${m[2]}c`;
          if (value === "turbo") return "Turbo";
          if (value === "balanced") return "Balanced";
          if (value === "quality") return "Quality";
          if (value === "fast") return "Fast";
          if (value === "ultra") return "Ultra";
        }
        if (k === "resolution") {
          if (/^\d+k$/i.test(value)) return value.toUpperCase();
        }
        if (k === "mode") {
          if (value === "pro") return "Pro";
          if (value === "flex") return "Flex";
          if (value === "max") return "Max";
        }
        if (k === "version") return value.toUpperCase();
        return value;
      };

      return {
        key: k,
        label: labels[k],
        ui,
        options: values
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .map((value) => ({ value, label: labelFor(String(value)) })),
        order: order[k],
      };
    })
    .filter(Boolean) as PhotoModel["paramSchema"];

  return schema.sort((a, b) => a.order - b.order);
}

export function buildPhotoVariantModels(models: PhotoModelConfig[] = PHOTO_MODELS): PhotoModel[] {
  const grouped = new Map<string, { title: string; items: PhotoModelConfig[] }>();

  for (const m of models) {
    const baseTitle = baseTitleFromName(m.name);
    const baseId = slugify(baseTitle);
    const entry = grouped.get(baseId) || { title: baseTitle, items: [] };
    entry.items.push(m);
    grouped.set(baseId, entry);
  }

  const baseModels: PhotoModel[] = [];

  for (const [id, group] of grouped.entries()) {
    const variants: Variant[] = [];
    for (const m of group.items) {
      const baseParams = parseNameParams(m.name);
      variants.push(...expandVariantsFromPricing(m, baseParams));
    }

    // De-duplicate variants by (sourceModelId + params signature)
    const unique: Variant[] = [];
    const seen = new Set<string>();
    for (const v of variants) {
      const sig = `${v.sourceModelId}::${JSON.stringify(v.params)}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      unique.push(v);
    }

    // If some variants have a param and some don't -> make "default" explicit, so UI can switch.
    (["version", "mode", "resolution", "quality", "format"] as const).forEach((k) => {
      const hasAny = unique.some((v) => !!v.params[k]);
      const hasMissing = unique.some((v) => !v.params[k]);
      if (hasAny && hasMissing) {
        unique.forEach((v) => {
          if (!v.params[k]) v.params[k] = "default";
        });
      }
    });

    // Extract description from first model in group (or merge if needed)
    const firstModel = group.items[0];
    const fullDescription = firstModel?.description || "";
    // Short description: use shortDescription if available, otherwise generate from description
    const shortDesc = firstModel?.shortDescription || fullDescription
      .split(/[.!?]/)[0]
      .trim()
      .slice(0, 60)
      .replace(/\s+$/, "")
      .replace(/\.$/, "") || fullDescription.slice(0, 60).trim();
    // Use minimum rank from group items (lower rank = higher priority)
    const minRank = Math.min(...group.items.map((m) => m.rank || 999));

    baseModels.push({
      id,
      title: group.title,
      type: "photo",
      shortDescription: shortDesc,
      description: fullDescription,
      rank: minRank,
      paramSchema: buildParamSchema(unique),
      variants: unique.sort((a, b) => a.stars - b.stars),
    });
  }

  // Sort by rank (lower rank = higher priority), then alphabetically for same rank
  return baseModels.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    // Special case: ensure "Nano Banana" comes before "Nano Banana Pro"
    if (a.title === "Nano Banana" && b.title === "Nano Banana Pro") return -1;
    if (a.title === "Nano Banana Pro" && b.title === "Nano Banana") return 1;
    return a.title.localeCompare(b.title);
  });
}

export const PHOTO_VARIANT_MODELS: PhotoModel[] = buildPhotoVariantModels();

export function getPhotoBaseModelById(baseId: string): PhotoModel | undefined {
  const id = String(baseId || "").trim().toLowerCase();
  if (!id) return undefined;
  return PHOTO_VARIANT_MODELS.find((m) => m.id === id);
}

export function getPhotoVariantByIds(
  baseId: string,
  variantId: string
): { base: PhotoModel; variant: Variant } | undefined {
  const base = getPhotoBaseModelById(baseId);
  if (!base) return undefined;
  const vid = String(variantId || "").trim().toLowerCase();
  if (!vid) return undefined;
  const variant = base.variants.find((v) => v.id === vid);
  if (!variant) return undefined;
  return { base, variant };
}

