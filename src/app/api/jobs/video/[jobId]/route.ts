import { NextRequest, NextResponse } from "next/server";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === "true";

// Store mock job progress
const mockJobProgress: Record<string, { progress: number; startTime: number }> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Mock mode
    if (MOCK_MODE || jobId.startsWith("video-mock-") || jobId.startsWith("video-")) {
      // Initialize job if not exists
      if (!mockJobProgress[jobId]) {
        mockJobProgress[jobId] = { progress: 0, startTime: Date.now() };
      }

      const job = mockJobProgress[jobId];
      const elapsed = (Date.now() - job.startTime) / 1000;

      // Simulate progress over ~15 seconds
      const simulatedProgress = Math.min(100, Math.floor((elapsed / 15) * 100));
      job.progress = simulatedProgress;

      if (simulatedProgress >= 100) {
        // Clean up
        delete mockJobProgress[jobId];

        return NextResponse.json({
          jobId,
          status: "completed",
          progress: 100,
          result: {
            id: jobId,
            url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            thumbnailUrl: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400",
            duration: 5,
            resolution: "1280x720",
            width: 1280,
            height: 720,
          },
          error: null,
        });
      }

      return NextResponse.json({
        jobId,
        status: "processing",
        progress: simulatedProgress,
        result: null,
        error: null,
      });
    }

    // Real API call would go here
    // const response = await kieClient.getVideoGenerationStatus(jobId);

    return NextResponse.json({
      jobId,
      status: "processing",
      progress: 0,
      result: null,
      error: null,
    });
  } catch (error: unknown) {
    console.error("Get video job status error:", error);
    const message = error instanceof Error ? error.message : "Failed to get job status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

