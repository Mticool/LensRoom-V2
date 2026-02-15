import { NextRequest, NextResponse } from "next/server";
import { getKieClient } from "@/lib/api/kie-client";
import { getFalClient } from "@/lib/api/fal-client";
import { getModelById } from "@/config/models";
import type { KieProvider } from "@/config/models";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";
import { refundCredits } from "@/lib/credits/refund";
import { requireAuth } from "@/lib/auth/requireRole";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/api/fetch-with-timeout";
import { SingleFlight } from "@/lib/server/singleflight";

const JOB_SF = new SingleFlight();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind"); // "image" | "video"
    const provider = url.searchParams.get("provider") || undefined;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: providerProbe } = await supabase
      .from("generations")
      .select("model_id")
      .eq("task_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const probedModelId = providerProbe?.model_id ? String(providerProbe.model_id) : "";
    const probedModel = probedModelId ? (getModelById(probedModelId) as any) : null;
    const inferredProvider = String(probedModel?.provider || "").toLowerCase() || undefined;
    const effectiveProvider = provider || inferredProvider;

    // Heuristic: LaoZhang video IDs look like "foaicmpl-<uuid>" or "video_<uuid>".
    // If we see such an ID, try LaoZhang directly even if DB hasn't recorded task_id yet.
    // Note: we still prefer returning our stable download proxy URL when we can find a generation row.
    if (!effectiveProvider && /^(foaicmpl-|video_)/i.test(jobId)) {
      let genRow: any = null;
      try {
        const { data: gen } = await supabase
          .from("generations")
          .select("id,status,user_id,created_at")
          .eq("task_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        genRow = gen;

        const { getLaoZhangClient } = await import("@/lib/api/laozhang-client");
        const lz = getLaoZhangClient();
        const task = await JOB_SF.run(`laozhang:status:${jobId}`, async () => lz.getVideoTask(jobId));
        const status = String(task.status || "processing").toLowerCase();

        if (status === "completed") {
          // Download and store video in Supabase Storage (prevents expirable URL issues)
          if (genRow?.id && genRow?.user_id && String(genRow.status || "").toLowerCase() !== "success") {
            try {
              let videoResponse = await lz.fetchVideoContent(jobId);
              if (videoResponse.ok) {
                let ct = videoResponse.headers.get("content-type") || "video/mp4";
                if (ct.toLowerCase().includes("application/json")) {
                  const j = await videoResponse.json().catch(() => null);
                  const u = j?.url || j?.video_url || j?.videoUrl;
                  if (typeof u === "string" && u.startsWith("http")) {
                    videoResponse = await fetchWithTimeout(u, { timeout: 90_000 });
                    ct = videoResponse.headers.get("content-type") || "video/mp4";
                  }
                }
                if (videoResponse.ok) {
                  const buf = Buffer.from(await videoResponse.arrayBuffer());
                  const ext = ct.includes("webm") ? "webm" : "mp4";
                  const sp = `${genRow.user_id}/laozhang_${jobId}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("generations")
                    .upload(sp, buf, { contentType: ext === "webm" ? "video/webm" : "video/mp4", upsert: true });
                  if (!upErr) {
                    const { data: pub } = supabase.storage.from("generations").getPublicUrl(sp);
                    await supabase.from("generations").update({
                      status: "success",
                      asset_url: pub.publicUrl,
                      result_url: pub.publicUrl,
                      result_urls: [pub.publicUrl],
                      original_path: sp,
                      updated_at: new Date().toISOString(),
                    }).eq("id", genRow.id);
                    console.log("[API] Heuristic LaoZhang video stored:", sp);
                  }
                }
              }
            } catch (storeErr) {
              console.error("[API] Heuristic LaoZhang store failed:", storeErr);
              // Fallback: save upstream URL for proxy
              const upstreamUrl = `https://api.laozhang.ai/v1/videos/${encodeURIComponent(jobId)}/content`;
              await supabase.from("generations").update({
                status: "success",
                asset_url: upstreamUrl,
                result_url: upstreamUrl,
                result_urls: [upstreamUrl],
                updated_at: new Date().toISOString(),
              }).eq("id", genRow.id).catch(() => {});
            }
          }

          const stable = genRow?.id
            ? `/api/generations/${encodeURIComponent(String(genRow.id))}/download?kind=original&proxy=1`
            : null;
          return NextResponse.json({
            success: true,
            jobId,
            status: "completed",
            progress: 100,
            resultUrl: stable,
            videoUrl: stable,
            results: stable ? [{ id: jobId, url: stable }] : [],
            kind: "video",
            provider: "laozhang",
          });
        }
        if (status === "failed") {
          return NextResponse.json({
            success: false,
            jobId,
            status: "failed",
            error: (task as any)?.error || "LaoZhang generation failed",
            kind: "video",
            provider: "laozhang",
          });
        }
        return NextResponse.json({
          success: true,
          jobId,
          status: "processing",
          progress: 15,
          results: [],
          kind: "video",
          provider: "laozhang",
        });
      } catch (e: any) {
        const errBody = typeof e?.body === "string" ? e.body : "";
        const httpStatus = typeof e?.status === "number" ? e.status : null;
        // task_not_exist: upstream can't find the task yet.
        // For newly created tasks, this is a race condition — keep polling for up to 2 minutes.
        if (httpStatus === 400 && errBody.includes("task_not_exist")) {
          const ageMs = genRow?.id ? Date.now() - new Date(String(genRow?.created_at || 0)).getTime() : Infinity;
          if (ageMs < 120_000) {
            return NextResponse.json({
              success: true, jobId, status: "processing", progress: 5,
              results: [], kind: "video", provider: "laozhang",
            });
          }
          return NextResponse.json({
            success: false, jobId, status: "failed",
            error: "Task not found — generation may have failed to start",
            kind: "video", provider: "laozhang",
          });
        }
        // If LaoZhang is temporarily unavailable, keep polling.
        return NextResponse.json({
          success: true,
          jobId,
          status: "processing",
          progress: 10,
          results: [],
          kind: "video",
          provider: "laozhang",
        });
      }
    }

    // === FAL PROVIDER (Kling video models, e.g. O1/O3) ===
    if (effectiveProvider === 'fal') {
      try {
        const supabase = getSupabaseAdmin();
        const { data: dbGen } = await supabase
          .from("generations")
          .select("id, user_id, status, credits_used, type")
          .eq("task_id", jobId)
          .maybeSingle();

        const falClient = getFalClient();
        const falStatus = await JOB_SF.run(`fal:status:${jobId}`, async () =>
          falClient.queryKlingVideoStatus(jobId)
        );
        
        if (falStatus.status === 'COMPLETED') {
          // Fetch the actual result from response endpoint
          let videoUrl: string | null = null;
          let contentType: string | null = null;
          try {
            const resultResponse = await JOB_SF.run(`fal:result:${jobId}`, async () =>
              fetchWithTimeout(`https://queue.fal.run/fal-ai/kling-video/requests/${jobId}`, {
                timeout: 15_000,
                headers: { Authorization: `Key ${process.env.FAL_KEY}` },
              })
            );
            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              videoUrl = resultData.video?.url || null;
              contentType = resultData.video?.content_type || null;
            }
          } catch (resultErr) {
            console.error('[API] Failed to get FAL result:', resultErr);
          }

          // Persist result to DB + storage so Library can display it.
          let finalUrl: string | null = videoUrl;
          let storagePath: string | null = null;
          if (videoUrl && dbGen?.user_id) {
            try {
              const dl = await fetchWithTimeout(videoUrl!, { timeout: 90_000 });
              if (!dl.ok) throw new Error(`Failed to download FAL video: ${dl.status}`);

              const arrayBuf = await dl.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              const ext = (contentType || "").includes("quicktime") ? "mov" : "mp4";
              const ct = contentType || (ext === "mov" ? "video/quicktime" : "video/mp4");
              storagePath = `${dbGen.user_id}/fal_${jobId}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from("generations")
                .upload(storagePath, buffer, { contentType: ct, upsert: true });
              if (uploadError) throw uploadError;

              const { data: pub } = supabase.storage.from("generations").getPublicUrl(storagePath);
              finalUrl = pub.publicUrl;
            } catch (e) {
              console.error("[API] Failed to store FAL video, falling back to provider URL:", e);
              finalUrl = videoUrl;
              storagePath = null;
            }

            try {
              await supabase
                .from("generations")
                .update({
                  status: "success",
                  result_urls: finalUrl ? [finalUrl] : [],
                  original_path: storagePath,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", dbGen.id);
            } catch (e) {
              console.error("[API] Failed to update generations for FAL completion:", e);
            }
          }
          
          return NextResponse.json({
            success: true,
            jobId,
            status: 'completed',
            progress: 100,
            results: finalUrl ? [{
              id: jobId,
              url: finalUrl,
            }] : [],
            kind: 'video',
            provider: 'fal',
          });
        }
        
        if (falStatus.status === 'FAILED') {
          // Try to get error details
          let errorDetail = 'FAL generation failed';
          try {
            const resultResponse = await fetchWithTimeout(
              `https://queue.fal.run/fal-ai/kling-video/requests/${jobId}`,
              {
                timeout: 15_000,
                headers: {
                  'Authorization': `Key ${process.env.FAL_KEY}`,
                },
              }
            );
            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              if (resultData.detail) {
                errorDetail = Array.isArray(resultData.detail) 
                  ? resultData.detail[0]?.msg || errorDetail
                  : resultData.detail;
              }
            }
          } catch {}

          // Persist failure and refund (best-effort).
          if (dbGen?.id) {
            try {
              await supabase
                .from("generations")
                .update({
                  status: "failed",
                  error: errorDetail,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", dbGen.id);
            } catch (e) {
              console.error("[API] Failed to update generations for FAL failure:", e);
            }

            const beforeStatus = String(dbGen.status || "").toLowerCase();
            const isAlreadyTerminal = beforeStatus === "success" || beforeStatus === "failed" || beforeStatus === "completed";
            const creditsToRefund = Number(dbGen.credits_used || 0);
            if (!isAlreadyTerminal && creditsToRefund > 0 && dbGen.user_id) {
              try {
                await refundCredits(supabase, String(dbGen.user_id), String(dbGen.id), creditsToRefund, "fal_generation_failed", {
                  jobId,
                  error: errorDetail,
                });
              } catch (e) {
                console.error("[API] Failed to refund credits for FAL failure:", e);
              }
            }
          }
          
          return NextResponse.json({
            success: false,
            jobId,
            status: 'failed',
            error: errorDetail,
            kind: 'video',
            provider: 'fal',
          });
        }
        
        // Still processing (IN_QUEUE, IN_PROGRESS)
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          progress: falStatus.status === 'IN_PROGRESS' ? 50 : 10,
          results: [],
          kind: 'video',
          provider: 'fal',
        });
      } catch (falErr: any) {
        console.error('[API] FAL status error:', falErr);
        return NextResponse.json({
          success: false,
          jobId,
          status: 'failed',
          error: falErr.message || 'Failed to get FAL job status',
          provider: 'fal',
        }, { status: 500 });
      }
    }

    // === KIE PROVIDER ===
    // First check if we have the result in DB (from webhook or previous sync)
    // Schema-compatible selection: some prod DBs may not have optional columns (metadata/original_path/etc).
    const fieldsLegacy = "id,user_id,model_id,task_id,status,result_url,result_urls,error,type,created_at,updated_at,credits_used";
    const fieldsV2 = `${fieldsLegacy},metadata`;
    const fieldsV3 = `${fieldsV2},original_path`;

    let dbGen: any = null;
    for (const fields of [fieldsV3, fieldsV2, fieldsLegacy]) {
      const r = await supabase.from("generations").select(fields).eq("task_id", jobId).maybeSingle();
      if (!r.error) {
        dbGen = r.data;
        break;
      }
      const errCode = String((r.error as any)?.code || "");
      const errMsg = String((r.error as any)?.message || "");
      // Missing column errors: retry with smaller field set.
      if (errCode === "PGRST204" || errCode === "42703" || /does not exist/i.test(errMsg)) continue;
      // Any other error: break and proceed with dbGen=null (we'll fail gracefully below).
      break;
    }

    // === LAOZHANG PROVIDER (Veo/Sora via laozhang.ai) ===
    const modelId = dbGen?.model_id ? String((dbGen as any).model_id) : "";
    const modelInfo = modelId ? (getModelById(modelId) as any) : null;
    const isLaoZhang = effectiveProvider === "laozhang" || String(modelInfo?.provider || "").toLowerCase() === "laozhang";
    if (isLaoZhang) {
      try {
        const { getLaoZhangClient } = await import("@/lib/api/laozhang-client");
        const lz = getLaoZhangClient();

        // If DB already has a terminal result, return it (prefer our download proxy for expirable URLs).
        if (dbGen?.id && String(dbGen.status || "").toLowerCase() === "success") {
          const stable = `/api/generations/${encodeURIComponent(String(dbGen.id))}/download?kind=original&proxy=1`;
          return NextResponse.json({
            success: true,
            jobId,
            status: "completed",
            progress: 100,
            resultUrl: stable,
            videoUrl: stable,
            results: [{ id: jobId, url: stable }],
            kind: "video",
            provider: "laozhang",
          });
        }

        const task = await JOB_SF.run(`laozhang:status:${jobId}`, async () => lz.getVideoTask(jobId));
        const status = String(task.status || "processing").toLowerCase();

        if (status === "completed") {
          // Download video from LaoZhang and store in Supabase Storage (same as FAL provider).
          // LaoZhang /videos/:id/content requires auth and URLs may expire — persisting to our
          // own storage guarantees the video remains available for playback and "My Works".
          const upstreamContentUrl = `https://api.laozhang.ai/v1/videos/${encodeURIComponent(jobId)}/content`;
          let finalUrl: string | null = upstreamContentUrl;
          let storagePath: string | null = null;

          if (dbGen?.id && (dbGen as any)?.user_id) {
            try {
              // Fetch video content from LaoZhang (may return raw bytes or JSON {url})
              let videoResponse = await lz.fetchVideoContent(jobId);
              if (!videoResponse.ok) {
                console.error("[API] LaoZhang content fetch failed:", videoResponse.status);
                throw new Error(`LaoZhang content fetch failed: ${videoResponse.status}`);
              }

              let contentType = videoResponse.headers.get("content-type") || "video/mp4";

              // Some LaoZhang deployments return JSON { url } from /content — resolve to actual video
              if (contentType.toLowerCase().includes("application/json")) {
                const j = await videoResponse.json().catch(() => null);
                const u = j?.url || j?.video_url || j?.videoUrl;
                if (typeof u === "string" && u.startsWith("http")) {
                  videoResponse = await fetchWithTimeout(u, { timeout: 90_000 });
                  if (!videoResponse.ok) throw new Error(`Nested video fetch failed: ${videoResponse.status}`);
                  contentType = videoResponse.headers.get("content-type") || "video/mp4";
                }
              }

              const arrayBuf = await videoResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              const ext = contentType.includes("webm") ? "webm" : "mp4";
              const ct = ext === "webm" ? "video/webm" : "video/mp4";
              storagePath = `${(dbGen as any).user_id}/laozhang_${jobId}.${ext}`;

              const { error: uploadError } = await supabase.storage
                .from("generations")
                .upload(storagePath, buffer, { contentType: ct, upsert: true });
              if (uploadError) throw uploadError;

              const { data: pub } = supabase.storage.from("generations").getPublicUrl(storagePath);
              finalUrl = pub.publicUrl;
              console.log("[API] LaoZhang video stored in Supabase Storage:", storagePath);
            } catch (storeErr) {
              console.error("[API] Failed to store LaoZhang video, falling back to content URL proxy:", storeErr);
              // Fallback: keep using upstream content URL via our proxy
              finalUrl = upstreamContentUrl;
              storagePath = null;
            }

            try {
              await supabase
                .from("generations")
                .update({
                  status: "success",
                  asset_url: finalUrl,
                  result_url: finalUrl,
                  result_urls: [finalUrl],
                  ...(storagePath ? { original_path: storagePath } : {}),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", dbGen.id);
            } catch (e) {
              console.error("[API] Failed to persist LaoZhang completion to DB:", e);
            }
          }

          const stable = dbGen?.id
            ? `/api/generations/${encodeURIComponent(String(dbGen.id))}/download?kind=original&proxy=1`
            : null;

          return NextResponse.json({
            success: true,
            jobId,
            status: "completed",
            progress: 100,
            resultUrl: stable,
            videoUrl: stable,
            results: stable ? [{ id: jobId, url: stable }] : [],
            kind: "video",
            provider: "laozhang",
          });
        }

        if (status === "failed") {
          const errorDetail = (task as any)?.error || "LaoZhang generation failed";

          if (dbGen?.id) {
            try {
              await supabase
                .from("generations")
                .update({
                  status: "failed",
                  error: errorDetail,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", dbGen.id);
            } catch (e) {
              console.error("[API] Failed to persist LaoZhang failure to DB:", e);
            }

            const beforeStatus = String(dbGen.status || "").toLowerCase();
            const isAlreadyTerminal = beforeStatus === "success" || beforeStatus === "failed" || beforeStatus === "completed";
            const creditsToRefund = Number((dbGen as any).credits_used || 0);
            const uid = (dbGen as any).user_id ? String((dbGen as any).user_id) : "";
            if (!isAlreadyTerminal && creditsToRefund > 0 && uid) {
              try {
                await refundCredits(
                  supabase,
                  uid,
                  String(dbGen.id),
                  creditsToRefund,
                  "laozhang_generation_failed",
                  { jobId, error: errorDetail }
                );
              } catch (e) {
                console.error("[API] Failed to refund credits for LaoZhang failure:", e);
              }
            }
          }

          return NextResponse.json(
            {
              success: false,
              jobId,
              status: "failed",
              error: errorDetail,
              kind: "video",
              provider: "laozhang",
            },
            { status: 200 }
          );
        }

        return NextResponse.json({
          success: true,
          jobId,
          status: "processing",
          progress: 20,
          results: [],
          kind: "video",
          provider: "laozhang",
        });
      } catch (e: any) {
        console.error("[API] LaoZhang status error:", e);
        const httpStatus = typeof e?.status === "number" ? e.status : null;
        const errBody = typeof e?.body === "string" ? e.body : "";

        // task_not_exist: upstream can't find the task yet.
        // For recently created tasks this is a race condition — keep polling for up to 2 min.
        if (httpStatus === 400 && errBody.includes("task_not_exist")) {
          const createdAt = (dbGen as any)?.created_at;
          const ageMs = createdAt ? Date.now() - new Date(String(createdAt)).getTime() : Infinity;
          if (ageMs < 120_000) {
            return NextResponse.json({
              success: true, jobId, status: "processing", progress: 5,
              results: [], kind: "video", provider: "laozhang",
            });
          }
          return NextResponse.json(
            { success: false, jobId, status: "failed", error: "Task not found — generation may have failed to start", kind: "video", provider: "laozhang" },
            { status: 200 }
          );
        }

        // Polling should be resilient: transient errors shouldn't kill the job on the client.
        if (e instanceof FetchTimeoutError || httpStatus === 404 || httpStatus === 429 || (httpStatus != null && httpStatus >= 500)) {
          return NextResponse.json({
            success: true,
            jobId,
            status: "processing",
            progress: 15,
            results: [],
            kind: "video",
            provider: "laozhang",
          });
        }
        const msg = e?.message || "Failed to get LaoZhang job status";
        return NextResponse.json(
          { success: false, jobId, status: "failed", error: msg, kind: "video", provider: "laozhang" },
          { status: 500 }
        );
      }
    }

    const scope = (() => {
      const meta = (dbGen as any)?.metadata || {};
      const raw = String(meta?.kie_key_scope || "").toLowerCase();
      if (raw === "photo" || raw === "video") return raw;
      const t = String((dbGen as any)?.type || kind || "").toLowerCase();
      if (t === "video") return "video";
      if (t === "photo" || t === "image") return "photo";
      return "default";
    })();

    const slot = (() => {
      const meta = (dbGen as any)?.metadata || {};
      const n = Number(meta?.kie_key_slot);
      return Number.isFinite(n) ? n : null;
    })();

    let kieClient: any;
    try {
      kieClient = getKieClient({ scope: scope as any, slot });
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
      ]);
    }

    // If we don't have a DB record yet, don't fail the client polling with a 500.
    // This can happen when DB schema is missing optional columns or the insert/update is delayed.
    if (!dbGen) {
      return NextResponse.json({
        success: true,
        jobId,
        status: "processing",
        progress: 5,
        results: [],
        kind: kind || "video",
      });
    }

    if (dbGen) {
      if (String(dbGen.status || "").toLowerCase() === "cancelled") {
        return NextResponse.json({
          success: true,
          jobId,
          status: "cancelled",
          progress: 0,
          results: [],
          error: dbGen.error || "Cancelled",
          kind: dbGen.type || kind,
        });
      }
      if (dbGen.status === 'success' && dbGen.result_urls?.length) {
        return NextResponse.json({
          success: true,
          jobId,
          status: 'completed',
          progress: 100,
          results: dbGen.result_urls.map((url: string, i: number) => ({
            id: `${jobId}_${i}`,
            url,
          })),
          kind: dbGen.type || kind,
        });
      }
      
      if (dbGen.status === 'failed') {
        return NextResponse.json({
          success: true,
          jobId,
          status: 'failed',
          error: dbGen.error || 'Generation failed',
          kind: dbGen.type || kind,
        });
      }
      
      // Still processing - try sync-task for more reliable result
      if (dbGen.status === 'generating' || dbGen.status === 'queued' || dbGen.status === 'pending') {
        // Throttle aggressive polling (protects upstream APIs and Node event loop).
        // If DB was updated very recently, return a processing response without hitting upstream.
        try {
          const updatedAt = (dbGen as any)?.updated_at ? Date.parse(String((dbGen as any).updated_at)) : 0;
          if (updatedAt && Date.now() - updatedAt < 2500) {
            return NextResponse.json({
              success: true,
              jobId,
              status: "processing",
              progress: 25,
              results: [],
              kind: (dbGen as any).type || kind,
              provider: effectiveProvider || null,
            });
          }
        } catch {
          // ignore
        }
        try {
          const syncResult = await JOB_SF.run(`kie:sync:${jobId}`, async () =>
            syncKieTaskToDb({ supabase, taskId: dbGen.task_id })
          );
          if (syncResult.ok && syncResult.status === 'success') {
            // Re-fetch to get updated URLs
            const { data: updated } = await supabase
              .from('generations')
              .select('result_urls')
              .eq('id', dbGen.id)
              .single();
            
            if (updated?.result_urls?.length) {
              return NextResponse.json({
                success: true,
                jobId,
                status: 'completed',
                progress: 100,
                results: updated.result_urls.map((url: string, i: number) => ({
                  id: `${jobId}_${i}`,
                  url,
                })),
                kind: dbGen.type || kind,
              });
            }
          }
          
          if (syncResult.status === 'failed') {
            return NextResponse.json({
              success: true,
              jobId,
              status: 'failed',
              error: syncResult.error || 'Generation failed',
              kind: dbGen.type || kind,
            });
          }
        } catch (syncErr) {
          console.warn('[API] Job sync-task failed, falling back to direct API:', syncErr);
        }
      }
    }

    // Fallback to direct KIE API call
    let status: any;

    try {
      if (kind === "video" || effectiveProvider === "kie_veo") {
        status = await JOB_SF.run(`kie:status:${jobId}:${provider || "video"}`, async () =>
          kieClient.getVideoGenerationStatus(jobId, provider)
        );
      } else if (kind === "image") {
        status = await JOB_SF.run(`kie:status:${jobId}:image`, async () =>
          kieClient.getGenerationStatus(jobId)
        );
      } else {
        try {
          status = await JOB_SF.run(`kie:status:${jobId}:auto:image`, async () =>
            kieClient.getGenerationStatus(jobId)
          );
        } catch (e1) {
          try {
            status = await JOB_SF.run(`kie:status:${jobId}:auto:video`, async () =>
              kieClient.getVideoGenerationStatus(jobId)
            );
          } catch (e2) {
            status = await JOB_SF.run(`kie:status:${jobId}:auto:veo`, async () =>
              kieClient.getVideoGenerationStatus(jobId, "kie_veo")
            );
          }
        }
      }
    } catch (kieErr: any) {
      // If KIE API fails transiently, return "processing" so the UI does not break.
      const msg = String(kieErr?.message || "");
      const isTransient =
        kieErr instanceof FetchTimeoutError ||
        /timeout/i.test(msg) ||
        /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i.test(msg) ||
        msg.includes("Circuit is open") ||
        msg.includes("JSON") ||
        msg.includes("Unterminated");
      if (isTransient) {
        console.warn('[API] KIE transient error, returning processing status:', msg);
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          progress: 50,
          results: [],
          kind: kind || null,
          provider: effectiveProvider || null,
        });
      }
      throw kieErr;
    }

    // Transform outputs to results format expected by frontend
    const results =
      status.outputs?.map((output: any, index: number) => {
        const o: any = output;
        return {
          id: `${jobId}_${index}`,
          url: o.url,
          thumbnailUrl: o.thumbnailUrl,
          prompt: "",
          model: "",
          width: o.width,
          height: o.height,
          duration: o.duration,
        };
      }) || [];

    return NextResponse.json({
      success: true,
      jobId,
      status: status.status,
      progress: status.progress || 0,
      results: results,
      outputs: status.outputs, // Keep for backward compatibility
      error: status.error,
      kind: kind || null,
      provider: effectiveProvider || null,
    });
  } catch (error: any) {
    console.error("[API] Job status error:", {
      message: error?.message,
      code: error?.code,
      errorCode: error?.errorCode,
      stack: error?.stack?.substring(0, 500),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: message,
        status: "failed",
        details: error?.code || error?.errorCode,
      },
      { status: 500 }
    );
  }
}

// POST - Cancel a job (best-effort)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId) return NextResponse.json({ error: "Job ID is required" }, { status: 400 });

    // Auth: prefer role-based auth, fallback to Telegram session
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch {
      const telegramSession = await getSession();
      if (!telegramSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = (await getAuthUserId(telegramSession)) || "";
      if (!userId) return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data: gen } = await supabase
      .from("generations")
      .select("id,user_id,status,credits_used,result_urls,asset_url,type")
      .eq("task_id", jobId)
      .maybeSingle();

    if (!gen) return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    if (String(gen.user_id) !== String(userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const st = String(gen.status || "").toLowerCase();
    const hasResult = Array.isArray((gen as any).result_urls) && (gen as any).result_urls.length > 0;
    const hasAsset = !!(gen as any).asset_url;
    const isTerminal = st === "success" || st === "failed" || st === "completed" || st === "cancelled";

    if (isTerminal && (hasResult || hasAsset)) {
      return NextResponse.json({ success: true, jobId, status: st });
    }

    // NOTE: KIE/LaoZhang don't expose a reliable public cancel API in our current integration.
    // Best-effort: mark as cancelled + prevent webhook/sync overrides.
    await supabase
      .from("generations")
      .update({
        status: "cancelled",
        error: "cancelled_by_user",
        updated_at: new Date().toISOString(),
      })
      .eq("id", gen.id);

    // Refund credits on cancel (best-effort). Safe if webhook/sync respects cancelled.
    const creditsToRefund = Number((gen as any).credits_used || 0);
    if (creditsToRefund > 0) {
      try {
        await refundCredits(supabase, String(userId), String(gen.id), creditsToRefund, "user_cancelled", {
          jobId,
          type: gen.type,
        });
      } catch (e) {
        console.error("[API] Failed to refund credits on cancel:", e);
      }
    }

    return NextResponse.json({ success: true, jobId, status: "cancelled" });
  } catch (error: any) {
    console.error("[API] Cancel job error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
