import { NextRequest, NextResponse } from "next/server";
import { getKieClient } from "@/lib/api/kie-client";
import { getFalClient } from "@/lib/api/fal-client";
import type { KieProvider } from "@/config/models";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncKieTaskToDb } from "@/lib/kie/sync-task";

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
        const falClient = getFalClient();
        const falStatus = await falClient.queryKlingO1I2VStatus(jobId);
        
        if (falStatus.status === 'COMPLETED') {
          // Fetch the actual result from response endpoint
          let videoUrl: string | null = null;
          try {
            const resultResponse = await fetch(
              `https://queue.fal.run/fal-ai/kling-video/requests/${jobId}`,
              {
                headers: {
                  'Authorization': `Key ${process.env.FAL_KEY}`,
                },
              }
            );
            if (resultResponse.ok) {
              const resultData = await resultResponse.json();
              videoUrl = resultData.video?.url || null;
            }
          } catch (resultErr) {
            console.error('[API] Failed to get FAL result:', resultErr);
          }
          
          return NextResponse.json({
            success: true,
            jobId,
            status: 'completed',
            progress: 100,
            results: videoUrl ? [{
              id: jobId,
              url: videoUrl,
            }] : [],
            kind: 'video',
            provider: 'fal',
          });
        }
        
        if (falStatus.status === 'FAILED') {
          // Try to get error details
          let errorDetail = 'FAL generation failed';
          try {
            const resultResponse = await fetch(
              `https://queue.fal.run/fal-ai/kling-video/requests/${jobId}`,
              {
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
          const syncResult = await syncKieTaskToDb({ supabase, taskId: dbGen.task_id });
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
      if (kind === "video" || provider === "kie_veo") {
        status = await kieClient.getVideoGenerationStatus(jobId, provider);
      } else if (kind === "image") {
        status = await kieClient.getGenerationStatus(jobId);
      } else {
        try {
          status = await kieClient.getGenerationStatus(jobId);
        } catch (e1) {
          try {
            status = await kieClient.getVideoGenerationStatus(jobId);
          } catch (e2) {
            status = await kieClient.getVideoGenerationStatus(jobId, "kie_veo");
          }
        }
      }
    } catch (kieErr: any) {
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