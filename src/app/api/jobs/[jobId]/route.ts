import { NextRequest, NextResponse } from "next/server";
import { getKieClient } from "@/lib/api/kie-client";
import { getFalClient } from "@/lib/api/fal-client";
import type { KieProvider } from "@/config/models";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";
import { refundCredits } from "@/lib/credits/refund";
import { requireAuth } from "@/lib/auth/requireRole";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";
import { Semaphore, SemaphoreTimeoutError } from "@/lib/server/semaphore";
import { SingleFlight } from "@/lib/server/singleflight";

const JOB_KIE_SEM = new Semaphore(Number(process.env.JOB_STATUS_KIE_CONCURRENCY || "8"), "jobs:kie");
const JOB_FAL_SEM = new Semaphore(Number(process.env.JOB_STATUS_FAL_CONCURRENCY || "8"), "jobs:fal");
const JOB_SF = new SingleFlight();

async function runBounded<T>(sem: Semaphore, key: string, fn: () => Promise<T>): Promise<T> {
  const release = await sem.acquire({ timeoutMs: 3_000, label: key });
  try {
    return await fn();
  } finally {
    release();
  }
}

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

    // === FAL PROVIDER (Kling O1) ===
    if (provider === 'fal') {
      try {
        const supabase = getSupabaseAdmin();
        const { data: dbGen } = await supabase
          .from("generations")
          .select("id, user_id, status, credits_used, type")
          .eq("task_id", jobId)
          .maybeSingle();

        const falClient = getFalClient();
        const falStatus = await JOB_SF.run(`fal:status:${jobId}`, async () =>
          runBounded(JOB_FAL_SEM, `fal:status:${jobId}`, async () => falClient.queryKlingO1I2VStatus(jobId))
        );
        
        if (falStatus.status === 'COMPLETED') {
          // Fetch the actual result from response endpoint
          let videoUrl: string | null = null;
          let contentType: string | null = null;
          try {
            const resultResponse = await JOB_SF.run(`fal:result:${jobId}`, async () =>
              runBounded(JOB_FAL_SEM, `fal:result:${jobId}`, async () =>
                fetchWithTimeout(`https://queue.fal.run/fal-ai/kling-video/requests/${jobId}`, {
                  timeout: 15_000,
                  headers: { Authorization: `Key ${process.env.FAL_KEY}` },
                })
              )
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
              const dl = await runBounded(JOB_FAL_SEM, `fal:download:${jobId}`, async () =>
                fetchWithTimeout(videoUrl!, { timeout: 90_000 })
              );
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
        if (falErr instanceof SemaphoreTimeoutError) {
          // Do not fail polling: return "processing" so UI keeps working even under load.
          return NextResponse.json({
            success: true,
            jobId,
            status: "processing",
            progress: 10,
            results: [],
            kind: "video",
            provider: "fal",
            busy: true,
          });
        }
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
    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
      ]);
    }

    // First check if we have the result in DB (from webhook or previous sync)
    const supabase = getSupabaseAdmin();
    const { data: dbGen } = await supabase
      .from('generations')
      .select('id, status, result_urls, error, type')
      .eq('task_id', jobId)
      .single();
    
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
        try {
          const syncResult = await JOB_SF.run(`kie:sync:${jobId}`, async () =>
            runBounded(JOB_KIE_SEM, `kie:sync:${jobId}`, async () =>
              syncKieTaskToDb({ supabase, taskId: dbGen.task_id })
            )
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
          if (syncErr instanceof SemaphoreTimeoutError) {
            return NextResponse.json({
              success: true,
              jobId,
              status: "processing",
              progress: 50,
              results: [],
              kind: dbGen.type || kind,
              provider: provider || null,
              busy: true,
            });
          }
          console.warn('[API] Job sync-task failed, falling back to direct API:', syncErr);
        }
      }
    }

    // Fallback to direct KIE API call
    let status: any;

    try {
      if (kind === "video" || provider === "kie_veo") {
        status = await JOB_SF.run(`kie:status:${jobId}:${provider || "video"}`, async () =>
          runBounded(JOB_KIE_SEM, `kie:status:${jobId}`, async () =>
            kieClient.getVideoGenerationStatus(jobId, provider)
          )
        );
      } else if (kind === "image") {
        status = await JOB_SF.run(`kie:status:${jobId}:image`, async () =>
          runBounded(JOB_KIE_SEM, `kie:status:${jobId}`, async () => kieClient.getGenerationStatus(jobId))
        );
      } else {
        try {
          status = await JOB_SF.run(`kie:status:${jobId}:auto:image`, async () =>
            runBounded(JOB_KIE_SEM, `kie:status:${jobId}`, async () => kieClient.getGenerationStatus(jobId))
          );
        } catch (e1) {
          try {
            status = await JOB_SF.run(`kie:status:${jobId}:auto:video`, async () =>
              runBounded(JOB_KIE_SEM, `kie:status:${jobId}`, async () => kieClient.getVideoGenerationStatus(jobId))
            );
          } catch (e2) {
            status = await JOB_SF.run(`kie:status:${jobId}:auto:veo`, async () =>
              runBounded(JOB_KIE_SEM, `kie:status:${jobId}`, async () =>
                kieClient.getVideoGenerationStatus(jobId, "kie_veo")
              )
            );
          }
        }
      }
    } catch (kieErr: any) {
      if (kieErr instanceof SemaphoreTimeoutError) {
        return NextResponse.json({
          success: true,
          jobId,
          status: "processing",
          progress: 50,
          results: [],
          kind: kind || null,
          provider: provider || null,
          busy: true,
        });
      }
      // If KIE API fails with JSON error, return "processing" status
      if (kieErr?.message?.includes('JSON') || kieErr?.message?.includes('Unterminated')) {
        console.warn('[API] KIE returned truncated JSON, returning processing status');
        return NextResponse.json({
          success: true,
          jobId,
          status: 'processing',
          progress: 50,
          results: [],
          kind: kind || null,
          provider: provider || null,
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
      provider: provider || null,
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
