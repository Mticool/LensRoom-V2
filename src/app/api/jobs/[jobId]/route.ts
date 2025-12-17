import { NextRequest, NextResponse } from "next/server";
import { getKieClient } from "@/lib/api/kie-client";
import type { KieProvider } from "@/config/models";
import { integrationNotConfigured } from "@/lib/http/integration-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
        "KIE_CALLBACK_SECRET",
        "KIE_CALLBACK_URL",
      ]);
    }

    const { jobId } = await params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind"); // "image" | "video"
    const provider = (url.searchParams.get("provider") as KieProvider | null) || undefined;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // If caller didn't pass kind/provider, we try to infer by attempting
    // the Market-image status first, then Market-video, then Veo.
    let status: any;

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
  } catch (error) {
    console.error("[API] Job status error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}