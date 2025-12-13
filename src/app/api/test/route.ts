import { NextRequest, NextResponse } from "next/server";
import { kieClient } from "@/lib/api/kie-client";

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
        // Простой тест доступности API
        results.message = "API client initialized";
        results.hasApiKey = !!process.env.KIE_API_KEY;
        results.baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL;
        results.mockMode = kieClient.isInMockMode();
        results.success = true;
        break;

      case "health":
        // Тест health endpoint
        const isHealthy = await kieClient.checkHealth();
        results.healthy = isHealthy;
        results.success = isHealthy;
        break;

      case "balance":
        // Тест баланса аккаунта
        const balance = await kieClient.getAccountBalance();
        results.credits = balance.credits;
        results.success = true;
        break;

      case "image":
        // Тест генерации изображения
        console.log("Testing image generation...");
        const imageResponse = await kieClient.generateImage({
          model: "flux-2",
          prompt: "a beautiful sunset over mountains, photorealistic, 8k",
          width: 1024,
          height: 1024,
          numOutputs: 1,
          cfgScale: 7.5,
          steps: 30,
        });
        results.jobId = imageResponse.id;
        results.status = imageResponse.status;
        results.estimatedTime = imageResponse.estimatedTime;
        results.success = true;
        break;

      case "status":
        // Тест проверки статуса изображения
        const imageJobId = searchParams.get("jobId");
        if (!imageJobId) {
          throw new Error("jobId required for status test");
        }
        const statusResponse = await kieClient.getGenerationStatus(imageJobId);
        results.status = statusResponse.status;
        results.progress = statusResponse.progress;
        results.outputs = statusResponse.outputs;
        results.success = true;
        break;

      case "video":
        // Тест генерации видео
        console.log("Testing video generation...");
        const videoResponse = await kieClient.generateVideo({
          model: "sora-2",
          prompt: "waves crashing on a beach at sunset, cinematic, slow motion",
          duration: 5,
          width: 1280,
          height: 720,
          fps: 30,
        });
        results.jobId = videoResponse.id;
        results.status = videoResponse.status;
        results.estimatedTime = videoResponse.estimatedTime;
        results.success = true;
        break;

      case "video-status":
        // Тест проверки статуса видео
        const videoJobId = searchParams.get("jobId");
        if (!videoJobId) {
          throw new Error("jobId required for video status test");
        }
        const videoStatusResponse = await kieClient.getVideoGenerationStatus(videoJobId);
        results.status = videoStatusResponse.status;
        results.progress = videoStatusResponse.progress;
        results.outputs = videoStatusResponse.outputs;
        results.success = true;
        break;

      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("API test error:", error);
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

