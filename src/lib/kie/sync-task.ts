import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { notifyGenerationStatus } from "@/lib/telegram/notify";

function getKieMarketConfig() {
  const apiKey = env.required("KIE_API_KEY", "KIE Market API key");
  const baseUrl = env.optional("KIE_MARKET_BASE_URL") || "https://api.kie.ai";
  if (!apiKey) return null;
  return { apiKey, baseUrl };
}

export type KieTaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

function parseResultJsonToUrls(resultJson: string): string[] {
  try {
    const parsed = JSON.parse(resultJson);
    if (parsed?.outputs && Array.isArray(parsed.outputs)) return parsed.outputs.filter((u: any) => typeof u === "string");
    if (parsed?.resultUrls && Array.isArray(parsed.resultUrls)) return parsed.resultUrls.filter((u: any) => typeof u === "string");
    if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === "string");
    if (typeof parsed === "string") return [parsed];
    return [];
  } catch {
    return [resultJson];
  }
}

async function fetchRecordInfo(taskId: string): Promise<{ state: KieTaskState; resultJson?: string; failMsg?: string; failCode?: string }> {
  const cfg = getKieMarketConfig();
  if (!cfg) throw new Error("KIE not configured");

  const res = await fetch(`${cfg.baseUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`KIE recordInfo error (${res.status}): ${text.slice(0, 200)}`);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`KIE recordInfo invalid JSON: ${text.slice(0, 200)}`);
  }

  // KIE Market API may return either { code: 0, ... } or { code: 200, ... } for success.
  const okCode = json?.code === 0 || json?.code === 200 || json?.code === "0" || json?.code === "200";
  if (!okCode) {
    const code = typeof json?.code !== "undefined" ? String(json.code) : "unknown";
    const msg = json?.message || json?.msg || json?.error || "KIE recordInfo returned error";
    throw new Error(`${msg}${code ? ` (code: ${code})` : ""}`);
  }

  const data = json?.data || {};
  return {
    state: data.state as KieTaskState,
    resultJson: data.resultJson,
    failMsg: data.failMsg,
    failCode: data.failCode,
  };
}

async function safeUpdateGeneration(supabase: SupabaseClient, generationId: string, patch: Record<string, any>) {
  let working = { ...patch };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from("generations").update(working).eq("id", generationId);
    if (!error) return;
    if ((error as any).code !== "PGRST204") throw error;
    const msg: string = (error as any).message || "";
    const m = msg.match(/Could not find the '([^']+)' column/);
    const missing = m?.[1];
    if (!missing) throw error;
    delete working[missing];
  }
}

async function downloadAndStoreAsset(params: {
  supabase: SupabaseClient;
  generationId: string;
  userId: string;
  kind: "image" | "video";
  sourceUrl: string;
}): Promise<string> {
  const { supabase, generationId, userId, kind, sourceUrl } = params;

  const downloadResponse = await fetch(sourceUrl);
  if (!downloadResponse.ok) throw new Error(`Download failed: ${downloadResponse.status}`);

  const buffer = await downloadResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  console.log("[KIE sync-task] downloaded", { generationId, kind, bytes: bytes.byteLength, sourceUrl });

  const contentType = downloadResponse.headers.get("content-type") || "";
  let extension = kind === "video" ? "mp4" : "jpg";
  if (contentType.includes("png")) extension = "png";
  else if (contentType.includes("webp")) extension = "webp";
  else if (contentType.includes("mp4")) extension = "mp4";
  else if (contentType.includes("webm")) extension = "webm";

  const fileName = `${generationId}_${Date.now()}.${extension}`;
  const storagePath = `${userId}/${kind}/${fileName}`;

  console.log("[KIE sync-task] uploading", { generationId, storagePath, contentType });
  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(storagePath, bytes, { contentType: contentType || undefined, upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("generations").getPublicUrl(storagePath);
  console.log("[KIE sync-task] stored", { generationId, publicUrl: data.publicUrl });
  return data.publicUrl;
}

export async function syncKieTaskToDb(params: { supabase: SupabaseClient; taskId: string }) {
  const { supabase, taskId } = params;

  // There can be duplicate rows with the same task_id (e.g., retries).
  // Always pick the most recent record instead of using `.single()`.
  const { data: generation, error: fetchError } = await supabase
    .from("generations")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !generation) {
    return { ok: false, reason: "generation_not_found" as const };
  }

  const st = String(generation.status || "").toLowerCase();
  if (st === "completed" || st === "failed") {
    return { ok: true, status: st as "completed" | "failed", assetUrl: generation.asset_url || null };
  }
  if (st === "success") {
    return { ok: true, status: "completed" as const, assetUrl: generation.asset_url || null };
  }

  const info = await fetchRecordInfo(taskId);
  console.log("[KIE sync-task] recordInfo", { taskId, state: info.state, hasResultJson: !!info.resultJson, failCode: info.failCode });

  if (info.state === "success") {
    const urls = info.resultJson ? parseResultJsonToUrls(info.resultJson) : [];
    if (!urls.length) {
      await safeUpdateGeneration(supabase, generation.id, {
        status: "failed",
        error: "No results returned from KIE recordInfo",
        updated_at: new Date().toISOString(),
      });
      return { ok: true, status: "failed" as const, error: "no_results" as const };
    }

    const kind: "image" | "video" = String(generation.type || "").toLowerCase() === "video" ? "video" : "image";

    let assetUrl: string | null = null;
    try {
      assetUrl = await downloadAndStoreAsset({
        supabase,
        generationId: generation.id,
        userId: generation.user_id,
        kind,
        sourceUrl: urls[0],
      });
    } catch (e) {
      console.warn("[KIE sync-task] storage failed, using source url", { taskId, err: e });
      assetUrl = urls[0];
    }

    // For videos: asset_url is the video file. preview/thumbnail should be an image poster (generated client-side),
    // so don't set them to the video URL.
    const isVideo = kind === "video";
    await safeUpdateGeneration(supabase, generation.id, {
      status: "success",
      result_urls: urls,
      asset_url: assetUrl,
      preview_url: isVideo ? null : assetUrl,
      thumbnail_url: isVideo ? null : assetUrl,
      error: null,
      updated_at: new Date().toISOString(),
    });

    // Telegram notification (idempotent in DB)
    try {
      const kind = String(generation.type || "").toLowerCase() === "video" ? "video" : "photo";
      await notifyGenerationStatus({ userId: String(generation.user_id), generationId: String(generation.id), kind, status: "success" });
    } catch {
      // ignore
    }

    return { ok: true, status: "success" as const, assetUrl, resultUrls: urls };
  }

  if (info.state === "fail") {
    const msg = info.failMsg || `Generation failed (code: ${info.failCode || "unknown"})`;
    await safeUpdateGeneration(supabase, generation.id, {
      status: "failed",
      error: msg,
      updated_at: new Date().toISOString(),
    });

    // Telegram notification (idempotent in DB)
    try {
      const kind = String(generation.type || "").toLowerCase() === "video" ? "video" : "photo";
      await notifyGenerationStatus({ userId: String(generation.user_id), generationId: String(generation.id), kind, status: "failed" });
    } catch {
      // ignore
    }
    return { ok: true, status: "failed" as const, error: msg };
  }

  // In-progress states
  const nextStatus = info.state === "waiting" || info.state === "queuing" ? "queued" : "generating";
  await safeUpdateGeneration(supabase, generation.id, {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  });

  return { ok: true, status: nextStatus as "queued" | "generating", state: info.state };
}
