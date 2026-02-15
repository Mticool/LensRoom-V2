import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSourceAssetUrl } from "@/lib/previews/asset-url";
import { generateImagePreview, generateVideoPoster, generateVideoPosterFromLocalFile } from "@/lib/previews";
import { getModelById } from "@/config/models";
import { writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import sharp from "sharp";

function getExpectedSecret(): string {
  return (
    (env.optional("PREVIEWS_PROCESS_SECRET") || "").trim() ||
    (env.optional("PREVIEWS_REQUEUE_SECRET") || "").trim() ||
    (env.optional("KIE_MANUAL_SYNC_SECRET") || "").trim() ||
    (env.optional("KIE_CALLBACK_SECRET") || "").trim()
  );
}

function getProvidedSecret(req: NextRequest): string {
  const sp = req.nextUrl.searchParams;
  return (
    (sp.get("secret") || "").trim() ||
    (req.headers.get("x-sync-secret") || "").trim() ||
    (req.headers.get("authorization") || "").replace(/^Bearer\\s+/i, "").trim()
  );
}

function buildPublicGenerationsUrl(storagePath: string): string | null {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  if (!base) return null;
  // storagePath is inside the `generations` bucket (e.g. "userId/foo.png")
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/generations/${storagePath}`;
}

function isLaoZhangContentUrl(url: string): boolean {
  const v = String(url || "");
  return /https?:\/\/api\.laozhang\.ai\/v1\/videos\/[^/]+\/content/i.test(v);
}

function isLegacyLaoZhangModelId(modelId: string): boolean {
  const id = String(modelId || "").toLowerCase();
  return id.startsWith("veo-3.1") || id.startsWith("sora-2");
}

async function createVideoFallbackPoster(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  generationId: string;
}) {
  const { supabase, userId, generationId } = params;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="576" fill="url(#bg)"/>
  <circle cx="512" cy="250" r="66" fill="#334155"/>
  <polygon points="490,215 490,285 548,250" fill="#f8fafc"/>
  <text x="512" y="355" text-anchor="middle" fill="#e2e8f0" font-size="36" font-family="Arial, sans-serif">Video</text>
  <text x="512" y="395" text-anchor="middle" fill="#94a3b8" font-size="22" font-family="Arial, sans-serif">Preview unavailable</text>
</svg>`;

  const posterBuffer = await sharp(Buffer.from(svg))
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const posterPath = `${userId}/posters/${generationId}_poster_fallback.webp`;
  const { error } = await supabase.storage
    .from("generations")
    .upload(posterPath, posterBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });
  if (error) throw new Error(`Fallback poster upload failed: ${error.message}`);
  return posterPath;
}

/**
 * POST /api/previews/process?generationId=uuid
 *
 * Generates preview (photo) or poster (video) for any "success/completed" generation
 * regardless of provider (KIE, LaoZhang, etc).
 *
 * This endpoint is intended to be called from the local PM2 previews worker only.
 */
export async function POST(req: NextRequest) {
  const expected = getExpectedSecret();
  if (!expected) {
    return NextResponse.json({ error: "Previews processing disabled" }, { status: 403 });
  }
  const provided = getProvidedSecret(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generationId = (req.nextUrl.searchParams.get("generationId") || "").trim();
  if (!generationId) {
    return NextResponse.json({ error: "Missing generationId" }, { status: 400 });
  }
  if (generationId.length > 128) {
    return NextResponse.json({ error: "Invalid generationId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Keep selection compatible with older production schemas (some optional columns may be absent).
  const legacyFields =
    "id,user_id,type,status,preview_status,preview_path,poster_path,asset_url,result_url,result_urls,thumbnail_url,updated_at";
  const fieldsV2 = `${legacyFields},original_path`;
  const fieldsV3 = `${fieldsV2},model_id,task_id,metadata`;

  let gen: any = null;
  let fetchError: any = null;
  for (const fields of [fieldsV3, fieldsV2, legacyFields]) {
    const r = await supabase.from("generations").select(fields).eq("id", generationId).single();
    gen = r.data;
    fetchError = r.error;
    if (!fetchError) break;
    const code = String((fetchError as any)?.code || "");
    const message = String((fetchError as any)?.message || "");
    // Production schemas can be missing optional columns (e.g. metadata/model_id).
    // PostgREST may surface this as PGRST204 or as a Postgres 42703 (undefined_column).
    if (code === "PGRST204" || code === "42703" || /does not exist/i.test(message)) continue;
    break;
  }

  if (fetchError) {
    console.error("[Previews Process] Fetch error:", fetchError);
    // If row does not exist, PostgREST typically returns 406/PGRST116.
    // Preserve a 404 for that case, but surface other errors.
    const code = String((fetchError as any)?.code || "");
    const message = String((fetchError as any)?.message || "");
    const isNotFound = code === "PGRST116" || /0 rows/i.test(message);
    if (isNotFound) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Generation fetch failed", details: message || code || "unknown" },
      { status: 500 }
    );
  }
  if (!gen) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  const type = String(gen.type || "").toLowerCase();
  const status = String(gen.status || "").toLowerCase();
  if (!["photo", "video"].includes(type)) {
    return NextResponse.json({ error: "Unsupported generation type" }, { status: 400 });
  }
  if (!["success", "completed", "succeeded"].includes(status)) {
    return NextResponse.json({ error: "Generation is not terminal" }, { status: 409 });
  }

  // Idempotency: if already ready, no-op.
  if (type === "photo" && gen.preview_path) {
    return NextResponse.json({ ok: true, skipped: true, reason: "preview_exists" });
  }
  if (type === "video" && gen.poster_path) {
    return NextResponse.json({ ok: true, skipped: true, reason: "poster_exists" });
  }

  let sourceUrl =
    (gen.original_path ? buildPublicGenerationsUrl(String(gen.original_path)) : null) ||
    getSourceAssetUrl(gen);

  // LaoZhang videos: provider URLs are expirable. Prefer refreshing the /content URL using task_id.
  if (type === "video") {
    const meta = (gen as any)?.metadata;
    const metaProvider = typeof meta === "object" ? String(meta?.provider || "").toLowerCase() : "";
    const modelId = gen.model_id ? String(gen.model_id) : "";
    const modelInfo = modelId ? (getModelById(modelId) as any) : null;
    const taskId = gen.task_id ? String(gen.task_id) : "";
    const isLaoZhang =
      metaProvider === "laozhang" ||
      String(modelInfo?.provider || "").toLowerCase() === "laozhang" ||
      isLegacyLaoZhangModelId(modelId) ||
      taskId.startsWith("foaicmpl-") ||
      isLaoZhangContentUrl(String(sourceUrl || ""));
    if (isLaoZhang && taskId) {
      try {
        const { getLaoZhangClient } = await import("@/lib/api/laozhang-client");
        const lz = getLaoZhangClient();
        const task = await lz.getVideoTask(taskId);
        const refreshed = (task as any)?.video_url || null;
        if (refreshed && typeof refreshed === "string") {
          sourceUrl = refreshed;
        }
      } catch (e) {
        console.error("[Previews Process] LaoZhang refresh failed:", e);
      }
    }
  }
  if (!sourceUrl) {
    await supabase
      .from("generations")
      .update({
        preview_status: "failed",
        error: "Preview source missing (no asset url/path)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId);
    return NextResponse.json({ error: "Source URL not found" }, { status: 422 });
  }

  // Mark as processing (best effort).
  await supabase
    .from("generations")
    .update({ preview_status: "processing", updated_at: new Date().toISOString() })
    .eq("id", generationId);

  try {
    if (type === "photo") {
      const res = await generateImagePreview({
        sourceUrl,
        userId: String(gen.user_id),
        generationId,
        supabase,
      });
      await supabase
        .from("generations")
        .update({
          preview_status: "ready",
          preview_path: res.path,
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId);
      return NextResponse.json({ ok: true, type, preview_path: res.path });
    }

    // LaoZhang video URLs may require auth and /content may return raw mp4 bytes.
    // Generate poster by downloading bytes server-side when possible.
    const meta = (gen as any)?.metadata;
    const metaProvider = typeof meta === "object" ? String(meta?.provider || "").toLowerCase() : "";
    const modelId = gen.model_id ? String(gen.model_id) : "";
    const modelInfo = modelId ? (getModelById(modelId) as any) : null;
    const isLaoZhang =
      metaProvider === "laozhang" ||
      String(modelInfo?.provider || "").toLowerCase() === "laozhang" ||
      isLegacyLaoZhangModelId(modelId);
    const taskId = gen.task_id ? String(gen.task_id) : "";

    let res: { path: string; publicUrl: string };
    if (isLaoZhang && taskId) {
      const { getLaoZhangClient } = await import("@/lib/api/laozhang-client");
      const lz = getLaoZhangClient();
      const upstream = await lz.fetchVideoContent(taskId);
      if (!upstream.ok) {
        const t = await upstream.text().catch(() => "");
        throw new Error(`LaoZhang content fetch failed: ${upstream.status} ${t.slice(0, 200)}`);
      }

      const ct = (upstream.headers.get("content-type") || "").toLowerCase();
      // Some deployments return JSON with a public URL; others return raw mp4 bytes.
      if (ct.includes("application/json")) {
        const j = await upstream.json().catch(() => null);
        const u = j?.url || j?.video_url || j?.videoUrl;
        if (typeof u === "string" && u.startsWith("http")) {
          res = await generateVideoPoster({
            videoUrl: u,
            userId: String(gen.user_id),
            generationId,
            supabase,
          });
        } else {
          throw new Error("LaoZhang content JSON has no url");
        }
      } else {
        const tempVideo = join(tmpdir(), `poster_video_${generationId}_${Date.now()}.mp4`);
        if (upstream.body) {
          await pipeline(Readable.fromWeb(upstream.body as any), createWriteStream(tempVideo));
        } else {
          const ab = await upstream.arrayBuffer();
          await writeFile(tempVideo, Buffer.from(ab));
        }
        res = await generateVideoPosterFromLocalFile({
          videoPath: tempVideo,
          userId: String(gen.user_id),
          generationId,
          supabase,
        });
      }
    } else {
      try {
        res = await generateVideoPoster({
          videoUrl: sourceUrl,
          userId: String(gen.user_id),
          generationId,
          supabase,
        });
      } catch (posterErr) {
        // Fallback: some LaoZhang /content URLs require Authorization.
        if (!isLaoZhangContentUrl(sourceUrl)) throw posterErr;
        const laoKey = env.optional("LAOZHANG_API_KEY");
        if (!laoKey) throw posterErr;

        const upstream = await fetch(sourceUrl, {
          headers: { Authorization: `Bearer ${laoKey}` },
        });
        if (!upstream.ok) throw posterErr;

        const tempVideo = join(tmpdir(), `poster_video_${generationId}_${Date.now()}.mp4`);
        if (upstream.body) {
          await pipeline(Readable.fromWeb(upstream.body as any), createWriteStream(tempVideo));
        } else {
          const ab = await upstream.arrayBuffer();
          await writeFile(tempVideo, Buffer.from(ab));
        }
        res = await generateVideoPosterFromLocalFile({
          videoPath: tempVideo,
          userId: String(gen.user_id),
          generationId,
          supabase,
        });
      }
    }
    await supabase
      .from("generations")
      .update({
        preview_status: "ready",
        poster_path: res.path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId);
    return NextResponse.json({ ok: true, type, poster_path: res.path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (type === "video") {
      try {
        const fallbackPath = await createVideoFallbackPoster({
          supabase,
          userId: String(gen.user_id),
          generationId,
        });
        await supabase
          .from("generations")
          .update({
            preview_status: "ready",
            poster_path: fallbackPath,
            // Keep original error context but don't block library render.
            error: `Poster fallback used: ${msg.slice(0, 300)}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", generationId);
        return NextResponse.json({ ok: true, type, poster_path: fallbackPath, fallback: true });
      } catch (fallbackErr) {
        console.error("[Previews Process] Fallback poster failed:", fallbackErr);
      }
    }
    await supabase
      .from("generations")
      .update({
        preview_status: "failed",
        error: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId);
    return NextResponse.json({ error: "Preview generation failed", details: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/previews/process",
    usage: "POST /api/previews/process?generationId=...&secret=***",
  });
}
