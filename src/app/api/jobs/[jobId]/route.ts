import { NextRequest, NextResponse } from "next/server";
import { kieClient } from "@/lib/api/kie-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const status = await kieClient.getGenerationStatus(jobId);

    // Transform outputs to results format expected by frontend
    const results = status.outputs?.map((output, index) => ({
      id: `${jobId}_${index}`,
      url: output.url,
      prompt: '',
      model: '',
      width: output.width,
      height: output.height,
    })) || [];

    return NextResponse.json({
      success: true,
      jobId,
      status: status.status,
      progress: status.progress || 0,
      results: results,
      outputs: status.outputs, // Keep for backward compatibility
      error: status.error,
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