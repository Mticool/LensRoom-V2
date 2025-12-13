import { NextResponse } from "next/server";

// Models to test
const PHOTO_MODELS = [
  "seedream-4.5",
  "flux-2", 
  "nano-banana-pro",
  "z-image",
];

const VIDEO_MODELS = [
  "sora-2",
  "sora-2-pro",
  "kling-2.6",
  "seedance-1.0",
];

interface TestResult {
  model: string;
  category: "photo" | "video";
  status: "success" | "error" | "timeout";
  taskId?: string;
  message: string;
  responseTime: number;
}

export async function GET() {
  const apiKey = process.env.KIE_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || "https://api.kie.ai";
  
  if (!apiKey) {
    return NextResponse.json({
      error: "KIE_API_KEY not configured",
      mockMode: true,
      results: [],
    });
  }

  const results: TestResult[] = [];

  // Test Photo Models
  for (const model of PHOTO_MODELS) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: {
            prompt: "Test image: beautiful landscape",
            aspect_ratio: "1:1",
            resolution: "1K",
          },
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.code === 200 && data.data?.taskId) {
        results.push({
          model,
          category: "photo",
          status: "success",
          taskId: data.data.taskId,
          message: `Task created successfully`,
          responseTime,
        });
      } else {
        results.push({
          model,
          category: "photo",
          status: "error",
          message: data.message || data.msg || `Error code: ${data.code}`,
          responseTime,
        });
      }
    } catch (error) {
      results.push({
        model,
        category: "photo",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      });
    }
  }

  // Test Video Models
  for (const model of VIDEO_MODELS) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: {
            prompt: "Test video: ocean waves",
            aspect_ratio: "16:9",
            duration: 3,
          },
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.code === 200 && data.data?.taskId) {
        results.push({
          model,
          category: "video",
          status: "success",
          taskId: data.data.taskId,
          message: `Task created successfully`,
          responseTime,
        });
      } else {
        results.push({
          model,
          category: "video",
          status: "error",
          message: data.message || data.msg || `Error code: ${data.code}`,
          responseTime,
        });
      }
    } catch (error) {
      results.push({
        model,
        category: "video",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: Date.now() - startTime,
      });
    }
  }

  // Summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === "success").length,
    errors: results.filter(r => r.status === "error").length,
    photoModels: {
      tested: PHOTO_MODELS.length,
      working: results.filter(r => r.category === "photo" && r.status === "success").length,
    },
    videoModels: {
      tested: VIDEO_MODELS.length,
      working: results.filter(r => r.category === "video" && r.status === "success").length,
    },
  };

  return NextResponse.json({
    mockMode: false,
    apiUrl: baseUrl,
    summary,
    results,
    timestamp: new Date().toISOString(),
  });
}

