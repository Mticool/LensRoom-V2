import { NextRequest, NextResponse } from "next/server";
import { getKieClient } from "@/lib/api/kie-client";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get("type") || "ping";

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      testType,
      success: false,
    };

    switch (testType) {
      case "ping":
        // Simple availability check
        results.message = "API client initialized";
        results.hasApiKey = !!env.optional("KIE_API_KEY");
        results.baseUrl = env.optional("NEXT_PUBLIC_KIE_API_URL") || "https://api.kie.ai";
        try {
          results.mockMode = getKieClient().isInMockMode();
        } catch {
          results.mockMode = null;
        }
        results.success = true;
        break;

      case "health":
        // Test health endpoint
        const isHealthy = await getKieClient().checkHealth();
        results.healthy = isHealthy;
        results.success = isHealthy;
        break;

      case "image":
        // Test image generation
        console.log("[TEST] Starting image generation test...");
        const imageResponse = await getKieClient().generateImage({
          model: "nano-banana-pro",
          prompt: "a beautiful sunset over mountains, photorealistic, 8k",
          aspectRatio: "1:1",
          resolution: "1K",
          outputFormat: "png",
        });
        results.taskId = imageResponse.id;
        results.status = imageResponse.status;
        results.estimatedTime = imageResponse.estimatedTime;
        results.success = true;
        results.message = "Task created successfully! Use /api/test?type=status&taskId=" + imageResponse.id + " to check status";
        break;

      case "status":
        // Check task status
        const taskId = searchParams.get("taskId");
        if (!taskId) {
          throw new Error("taskId query parameter is required for status test");
        }
        console.log("[TEST] Checking status for task:", taskId);
        const statusResponse = await getKieClient().getGenerationStatus(taskId);
        results.taskId = taskId;
        results.status = statusResponse.status;
        results.progress = statusResponse.progress;
        results.outputs = statusResponse.outputs;
        results.error = statusResponse.error;
        results.success = true;
        break;

      case "video":
        // Test video generation with Kling 2.6 (text-to-video)
        console.log("[TEST] Starting video generation test...");
        const videoResponse = await getKieClient().generateVideo({
          model: "kling-2.6/text-to-video",
          provider: "kie_market",
          prompt: "waves crashing on a beach at sunset, cinematic, slow motion",
          aspectRatio: "16:9",
          duration: 5,
          sound: false,
          mode: "t2v",
        });
        results.taskId = videoResponse.id;
        results.status = videoResponse.status;
        results.estimatedTime = videoResponse.estimatedTime;
        results.success = true;
        results.message = "Video task created! Use /api/test?type=status&taskId=" + videoResponse.id + " to check status";
        break;

      default:
        throw new Error(`Unknown test type: ${testType}. Available: ping, health, image, status, video`);
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TEST] API test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}