import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { notifyGenerationStatus } from "@/lib/telegram/notify";
import { getKieClient } from "@/lib/api/kie-client";
import { getModelById } from "@/config/models";
import { trackFirstGenerationEvent } from "@/lib/referrals/track-first-generation";
import { generateImagePreview, generateVideoPoster, generateVideoAnimatedPreview } from "@/lib/previews";
import { getSourceAssetUrl, validateAssetUrl } from "@/lib/previews/asset-url";
import { refundGenerationCredits } from "@/lib/credits/refund";

/**
 * INSTANT PREVIEWS VERSION
 * 
 * Changes:
 * - Saves original_path for storage-backed assets
 * - Sets preview_status='none' immediately on success
 * - Triggers async preview generation without blocking
 * - Library shows content immediately (original if no preview)
 */

function getKieMarketConfig() {
  const apiKey = env.required("KIE_API_KEY", "KIE Market API key");
  const baseUrl = env.optional("KIE_MARKET_BASE_URL") || "https://api.kie.ai";
  if (!apiKey) return null;
  return { apiKey, baseUrl };
}

export type KieTaskState = "waiting" | "queuing" | "generating" | "success" | "fail";

function parseResultJsonToUrls(resultJson: string): string[] {
  // First try normal JSON parse
  try {
    const parsed = JSON.parse(resultJson);
    if (parsed?.outputs && Array.isArray(parsed.outputs)) return parsed.outputs.filter((u: any) => typeof u === "string");
    if (parsed?.resultUrls && Array.isArray(parsed.resultUrls)) return parsed.resultUrls.filter((u: any) => typeof u === "string");
    if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === "string");
    if (typeof parsed === "string") return [parsed];
    return [];
  } catch {
    // JSON parse failed - try to extract URLs with regex
    console.warn('[KIE] JSON parse failed for resultJson, trying regex extraction');
    
    // Look for URLs in the string
    const urlMatches = resultJson.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp|gif|mp4|mov|webm)[^\s"'<>]*/gi);
    if (urlMatches && urlMatches.length > 0) {
      console.log('[KIE] Extracted URLs via regex:', urlMatches.length);
      return urlMatches;
    }
    
    // If it's a direct URL string
    if (resultJson.startsWith('http')) {
      return [resultJson.split(/[\s"']/)[0]];
    }
    
    // Last resort - return as-is if it looks like a URL
    if (resultJson.includes('http')) {
      const match = resultJson.match(/https?:\/\/[^\s"'<>]+/);
      if (match) return [match[0]];
    }
    
    return [];
  }
}

async function fetchRecordInfo(taskId: string, retries = 3): Promise<{ state: KieTaskState; resultJson?: string; failMsg?: string; failCode?: string }> {
  const cfg = getKieMarketConfig();
  if (!cfg) throw new Error("KIE not configured");

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const res = await fetch(`${cfg.baseUrl}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
        signal: controller.signal,
      });
      
      clearTimeout(timeout);

      const text = await res.text();
      if (!res.ok) throw new Error(`KIE recordInfo error (${res.status}): ${text.slice(0, 200)}`);

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        // JSON parse error - might be truncated response
        console.error(`[KIE] JSON parse error (attempt ${attempt + 1}/${retries}):`, {
          taskId,
          textLength: text.length,
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        
        // Try to extract data from truncated JSON using regex
        const stateMatch = text.match(/"state"\s*:\s*"(waiting|queuing|generating|success|fail)"/);
        const resultJsonMatch = text.match(/"resultJson"\s*:\s*"([^"]+)/);
        const failMsgMatch = text.match(/"failMsg"\s*:\s*"([^"]+)"/);
        
        if (stateMatch) {
          console.log('[KIE] Extracted state from truncated JSON:', stateMatch[1]);
          
          // Try to find URLs in the truncated response
          let resultJson: string | undefined;
          if (resultJsonMatch) {
            // The resultJson might be truncated, but try to extract URLs
            const partialResult = resultJsonMatch[1];
            const urlMatch = text.match(/https?:\/\/[^\s"'\\]+\.(png|jpg|jpeg|webp|gif|mp4|mov|webm)[^\s"'\\]*/i);
            if (urlMatch) {
              resultJson = urlMatch[0];
              console.log('[KIE] Extracted URL from truncated response:', resultJson);
            }
          }
          
          return {
            state: stateMatch[1] as KieTaskState,
            resultJson,
            failMsg: failMsgMatch?.[1],
            failCode: undefined,
          };
        }
        
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // Backoff
          continue;
        }
        throw new Error(`KIE recordInfo invalid JSON after ${retries} attempts`);
      }

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
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Don't retry on non-retryable errors
      if (lastError.message.includes('KIE recordInfo returned error')) {
        throw lastError;
      }
      
      if (attempt < retries - 1) {
        console.warn(`[KIE] fetchRecordInfo attempt ${attempt + 1} failed, retrying...`, lastError.message);
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('fetchRecordInfo failed');
}

async function safeUpdateGeneration(supabase: SupabaseClient, generationId: string, patch: Record<string, any>) {
  const working = { ...patch };
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

/**
 * Extract storage path from Supabase URL
 * https://<project>.supabase.co/storage/v1/object/public/generations/<path>
 */
function extractStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/generations\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Generate preview/poster for a generation (non-blocking, marks status)
 * IDEMPOTENT: Skip if preview_path/poster_path already exists
 */
async function generatePreviewAsync(params: {
  supabase: SupabaseClient;
  generationId: string;
  userId: string;
  type: "photo" | "video";
  sourceUrl: string;
}): Promise<void> {
  const previewsEnabled = env.optional("PREVIEWS_ENABLED");
  if (previewsEnabled === "0" || previewsEnabled === "false") {
    console.log(`[Preview] Skipped (PREVIEWS_ENABLED=false): ${params.generationId}`);
    return;
  }

  const { supabase, generationId, userId, type, sourceUrl } = params;

  // Check if already has preview (idempotent)
  const { data: existing } = await supabase
    .from("generations")
    .select("preview_path, poster_path, preview_status")
    .eq("id", generationId)
    .single();

  if (existing) {
    if (type === "photo" && existing.preview_path) {
      console.log(`[Preview] Already exists: ${generationId} (photo)`);
      return;
    }
    if (type === "video" && existing.poster_path) {
      console.log(`[Preview] Already exists: ${generationId} (video)`);
      return;
    }
    if (existing.preview_status === "processing") {
      console.log(`[Preview] Already processing: ${generationId}`);
      return;
    }
  }

  try {
    // Mark as processing
    await safeUpdateGeneration(supabase, generationId, {
      preview_status: "processing",
    });

    if (type === "photo") {
      const { path } = await generateImagePreview({
        sourceUrl,
        userId,
        generationId,
        supabase,
      });

      await safeUpdateGeneration(supabase, generationId, {
        preview_path: path,
        preview_status: "ready",
      });

      console.log(`[Preview] Ready generationId=${generationId} type=photo path=${path}`);
    } else if (type === "video") {
      // Generate both poster (static) and animated preview
      const posterPromise = generateVideoPoster({
        videoUrl: sourceUrl,
        userId,
        generationId,
        supabase,
      });

      const previewPromise = generateVideoAnimatedPreview({
        videoUrl: sourceUrl,
        userId,
        generationId,
        supabase,
      }).catch((err) => {
        console.warn(`[Preview] Animated preview failed (non-critical): ${err.message}`);
        return null; // Non-critical, poster is enough
      });

      const [posterResult, previewResult] = await Promise.all([posterPromise, previewPromise]);

      await safeUpdateGeneration(supabase, generationId, {
        poster_path: posterResult.path,
        preview_path: previewResult?.path || null,
        preview_status: "ready",
      });

      console.log(`[Preview] Ready generationId=${generationId} type=video poster=${posterResult.path} animated=${previewResult?.path || 'failed'}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Preview] Generation failed:", { generationId, type, error: message });

    await safeUpdateGeneration(supabase, generationId, {
      preview_status: "failed",
      error: message,
    }).catch(() => {});
  }
}

async function downloadAndStoreAsset(params: {
  supabase: SupabaseClient;
  generationId: string;
  userId: string;
  kind: "image" | "video";
  sourceUrl: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
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
  console.log("[KIE sync-task] stored", { generationId, publicUrl: data.publicUrl, storagePath });
  
  return { publicUrl: data.publicUrl, storagePath };
}

export async function syncKieTaskToDb(params: { supabase: SupabaseClient; taskId: string }) {
  const { supabase, taskId } = params;

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

  const sourceAssetUrl = getSourceAssetUrl(generation);
  console.log(`[Sync ENTRY] taskId=${taskId}, genId=${generation.id}, status=${generation.status}, type=${generation.type}, sourceAsset=${sourceAssetUrl ? 'found' : 'MISSING'}, preview_path=${generation.preview_path}, preview_status=${generation.preview_status}`);

  const st = String(generation.status || "").toLowerCase();
  
  // Check if preview/poster needed for already-completed generations
  const isTerminalStatus = st === "completed" || st === "success" || st === "failed";
  
  if (isTerminalStatus) {
    const isPhoto = String(generation.type || "").toLowerCase() === "photo";
    const isVideo = String(generation.type || "").toLowerCase() === "video";
    const previewStatus = String(generation.preview_status || "none");
    
    const needsPreview = 
      isPhoto && 
      !generation.preview_path && 
      previewStatus !== "ready" && 
      previewStatus !== "processing";
    
    const needsPoster = 
      isVideo && 
      !generation.poster_path && 
      previewStatus !== "ready" && 
      previewStatus !== "processing";
    
    console.log(`[Sync DEBUG] status=${st}, type=${generation.type}, preview_status=${previewStatus}, needsPreview=${needsPreview}, needsPoster=${needsPoster}, sourceAsset=${sourceAssetUrl ? 'found' : 'none'}`);
    
    if ((needsPreview || needsPoster) && st !== "failed") {
      if (!sourceAssetUrl) {
        console.warn(`[Preview] ⚠️ generationId=${generation.id} needs preview but no asset URL found`);
        await safeUpdateGeneration(supabase, generation.id, {
          preview_status: "failed",
          error: "No asset URL found (checked asset_url, result_url, result_urls, thumbnail_url)",
        }).catch(() => {});
      } else {
        console.log(`[Preview] Queued generationId=${generation.id} reason=needsPreview type=${generation.type} status=${st} asset=${sourceAssetUrl.substring(0, 50)}...`);
        
        // Trigger preview generation asynchronously (INSTANT - don't block return)
        setImmediate(() => {
          generatePreviewAsync({
            supabase,
            generationId: generation.id,
            userId: generation.user_id,
            type: isVideo ? "video" : "photo",
            sourceUrl: sourceAssetUrl,
          }).catch((err) => {
            console.error(`[Preview] ❌ Failed for ${generation.id}:`, err);
          });
        });
      }
    }
    
    return { 
      ok: true, 
      status: st === "failed" ? "failed" : "completed", 
      assetUrl: sourceAssetUrl || null 
    };
  }

  // ---- VIDEO SYNC (including Veo) ----
  if (String(generation.type || "").toLowerCase() === "video") {
    let status: any = null;
    let lastErr: any = null;
    try {
      const kieClient: any = getKieClient();
      const modelCfg: any = generation.model_id ? getModelById(String(generation.model_id)) : null;
      const provider = modelCfg?.provider;

      try {
        status = await kieClient.getVideoGenerationStatus(String(taskId), provider);
      } catch (e1) {
        lastErr = e1;
        try {
          status = await kieClient.getVideoGenerationStatus(String(taskId));
        } catch (e2) {
          lastErr = e2;
          status = await kieClient.getVideoGenerationStatus(String(taskId), "kie_veo");
        }
      }
    } catch (e) {
      lastErr = e;
    }

    if (!status) {
      return { ok: false, reason: "video_status_unavailable" as const, error: String(lastErr || "") };
    }

    const mapped =
      status.status === "completed" ? "success" : status.status === "failed" ? "failed" : status.status === "queued" ? "queued" : "generating";

    if (mapped === "success" && Array.isArray(status.outputs) && status.outputs[0]?.url) {
      const sourceUrl = String(status.outputs[0].url);
      let assetUrl: string | null = null;
      let originalPath: string | null = null;
      
      try {
        const stored = await downloadAndStoreAsset({
          supabase,
          generationId: generation.id,
          userId: generation.user_id,
          kind: "video",
          sourceUrl,
        });
        assetUrl = stored.publicUrl;
        originalPath = stored.storagePath;
      } catch (e) {
        console.warn("[KIE sync-task] video storage failed, using source url", { taskId, err: e });
        assetUrl = sourceUrl;
      }

      // Update with original_path and preview_status='none' for instant trigger
      await safeUpdateGeneration(supabase, generation.id, {
        status: "success",
        result_urls: [sourceUrl],
        asset_url: assetUrl,
        original_path: originalPath, // NEW: save storage path
        preview_status: "none",      // NEW: ready for instant preview
        preview_url: null,
        thumbnail_url: null,
        error: null,
        updated_at: new Date().toISOString(),
      });

      // Generate video poster (INSTANT - non-blocking)
      setImmediate(() => {
        generatePreviewAsync({
          supabase,
          generationId: generation.id,
          userId: generation.user_id,
          type: "video",
          sourceUrl: assetUrl || sourceUrl,
        }).catch((err) => {
          console.error("[Sync] Video poster generation failed:", err);
        });
      });

      try {
        await notifyGenerationStatus({
          userId: String(generation.user_id),
          generationId: String(generation.id),
          kind: "video",
          status: "success",
        });
      } catch {}

      try {
        await trackFirstGenerationEvent(String(generation.user_id), String(generation.id));
      } catch {}

      return { ok: true, status: "success" as const, assetUrl, resultUrls: [sourceUrl] };
    }

    if (mapped === "failed") {
      const msg = String(status.error || "Video generation failed");
      await safeUpdateGeneration(supabase, generation.id, {
        status: "failed",
        error: msg,
        updated_at: new Date().toISOString(),
      });
      
      // Auto-refund credits on failure
      await refundGenerationCredits(supabase, generation.id, 'video_generation_failed', { error: msg });
      
      try {
        await notifyGenerationStatus({
          userId: String(generation.user_id),
          generationId: String(generation.id),
          kind: "video",
          status: "failed",
        });
      } catch {}
      return { ok: true, status: "failed" as const, error: msg };
    }

    await safeUpdateGeneration(supabase, generation.id, {
      status: mapped === "queued" ? "queued" : "generating",
      updated_at: new Date().toISOString(),
    });
    return { ok: true, status: mapped as "queued" | "generating", state: status.status };
  }

  // ---- IMAGE SYNC ----
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
      // Auto-refund credits when no results
      await refundGenerationCredits(supabase, generation.id, 'no_results_returned');
      return { ok: true, status: "failed" as const, error: "no_results" as const };
    }

    const kind: "image" | "video" = String(generation.type || "").toLowerCase() === "video" ? "video" : "image";

    let assetUrl: string | null = null;
    let originalPath: string | null = null;
    
    try {
      const stored = await downloadAndStoreAsset({
        supabase,
        generationId: generation.id,
        userId: generation.user_id,
        kind,
        sourceUrl: urls[0],
      });
      assetUrl = stored.publicUrl;
      originalPath = stored.storagePath;
    } catch (e) {
      console.warn("[KIE sync-task] storage failed, using source url", { taskId, err: e });
      assetUrl = urls[0];
    }

    const isVideo = kind === "video";
    
    // Update with original_path and preview_status='none' for instant trigger
    await safeUpdateGeneration(supabase, generation.id, {
      status: "success",
      result_urls: urls,
      asset_url: assetUrl,
      original_path: originalPath, // NEW: save storage path
      preview_status: "none",      // NEW: ready for instant preview
      preview_url: isVideo ? null : assetUrl,
      thumbnail_url: isVideo ? null : assetUrl,
      error: null,
      updated_at: new Date().toISOString(),
    });

    // Generate preview/poster (INSTANT - non-blocking)
    const genType = isVideo ? "video" : "photo";
    setImmediate(() => {
      generatePreviewAsync({
        supabase,
        generationId: generation.id,
        userId: generation.user_id,
        type: genType,
        sourceUrl: assetUrl || urls[0],
      }).catch((err) => {
        console.error(`[Sync] ${genType} preview generation failed:`, err);
      });
    });

    // Telegram notification
    try {
      const kind = String(generation.type || "").toLowerCase() === "video" ? "video" : "photo";
      await notifyGenerationStatus({ userId: String(generation.user_id), generationId: String(generation.id), kind, status: "success" });
    } catch {}

    // Track referral event
    try {
      await trackFirstGenerationEvent(String(generation.user_id), String(generation.id));
    } catch {}

    return { ok: true, status: "success" as const, assetUrl, resultUrls: urls };
  }

  if (info.state === "fail") {
    const msg = info.failMsg || `Generation failed (code: ${info.failCode || "unknown"})`;
    await safeUpdateGeneration(supabase, generation.id, {
      status: "failed",
      error: msg,
      updated_at: new Date().toISOString(),
    });

    // Auto-refund credits on failure
    await refundGenerationCredits(supabase, generation.id, 'image_generation_failed', { 
      error: msg, 
      failCode: info.failCode 
    });

    try {
      const kind = String(generation.type || "").toLowerCase() === "video" ? "video" : "photo";
      await notifyGenerationStatus({ userId: String(generation.user_id), generationId: String(generation.id), kind, status: "failed" });
    } catch {}
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