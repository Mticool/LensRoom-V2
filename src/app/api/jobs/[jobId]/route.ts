import { NextRequest, NextResponse } from "next/server";
import { kieClient } from "@/lib/api/kie-client";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Mock режим для разработки
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK === "true") {
      // Simulate progress
      const mockProgress = Math.min(100, Math.random() * 100);
      const isComplete = mockProgress > 80;

      if (isComplete) {
        return NextResponse.json({
          jobId,
          status: "completed",
          progress: 100,
          results: [
            {
              id: `${jobId}-1`,
              url: `https://picsum.photos/1024/1024?random=${Date.now()}`,
              thumbnail: `https://picsum.photos/256/256?random=${Date.now()}`,
              width: 1024,
              height: 1024,
              seed: Math.floor(Math.random() * 1000000),
            },
          ],
        });
      }

      return NextResponse.json({
        jobId,
        status: "processing",
        progress: Math.round(mockProgress),
      });
    }

    // Получить статус из kie.ai
    const response = await kieClient.getGenerationStatus(jobId);

    return NextResponse.json({
      jobId: response.id,
      status: response.status,
      progress: response.progress || 0,
      results: response.outputs?.map((output) => ({
        id: `${response.id}-${output.seed}`,
        url: output.url,
        thumbnail: output.url,
        width: output.width,
        height: output.height,
        seed: output.seed,
      })),
      error: response.error,
    });
  } catch (error: unknown) {
    console.error("Get job status error:", error);
    
    const message = error instanceof Error ? error.message : "Failed to get job status";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

