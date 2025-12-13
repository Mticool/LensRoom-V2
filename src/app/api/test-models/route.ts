import { NextResponse } from "next/server";

// Models available on KIE.ai
const MODELS_TO_TEST = [
  // Photo models
  { id: "nano-banana-pro", category: "photo" as const, name: "Nano Banana Pro" },
  { id: "seedream-3.0", category: "photo" as const, name: "Seedream 3.0" },
  { id: "flux-1.1-pro", category: "photo" as const, name: "FLUX 1.1 Pro" },
  { id: "ideogram-v2", category: "photo" as const, name: "Ideogram V2" },
  // Video models  
  { id: "kling-1.6", category: "video" as const, name: "Kling 1.6" },
  { id: "runway-gen3", category: "video" as const, name: "Runway Gen-3" },
  { id: "luma-dream-machine", category: "video" as const, name: "Luma Dream Machine" },
];

interface TestResult {
  model: string;
  name: string;
  category: "photo" | "video";
  status: "success" | "error";
  taskId?: string;
  message: string;
  responseTime: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const singleModel = searchParams.get("model");
  
  const apiKey = process.env.KIE_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || "https://api.kie.ai";
  
  if (!apiKey) {
    return NextResponse.json({
      error: "KIE_API_KEY not configured",
      mockMode: true,
      hint: "Add KIE_API_KEY to .env.local",
      results: [],
    });
  }

  const results: TestResult[] = [];
  const modelsToTest = singleModel 
    ? MODELS_TO_TEST.filter(m => m.id === singleModel)
    : MODELS_TO_TEST;

  for (const model of modelsToTest) {
    const startTime = Date.now();
    try {
      // Use correct endpoint: POST /api/v1/jobs/createTask
      const response = await fetch(`${baseUrl}/api/v1/jobs/createTask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          input: {
            prompt: model.category === "video" 
              ? "Beautiful ocean waves at sunset, cinematic"
              : "Beautiful mountain landscape at golden hour, photorealistic",
            aspect_ratio: model.category === "video" ? "16:9" : "1:1",
            resolution: "1K",
            output_format: "png",
          },
        }),
      });

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      if (data.code === 200 && data.data?.taskId) {
        results.push({
          model: model.id,
          name: model.name,
          category: model.category,
          status: "success",
          taskId: data.data.taskId,
          message: `✅ Task created: ${data.data.taskId}`,
          responseTime,
        });
      } else {
        results.push({
          model: model.id,
          name: model.name,
          category: model.category,
          status: "error",
          message: `❌ ${data.message || data.msg || `Code: ${data.code}`}`,
          responseTime,
        });
      }
    } catch (error) {
      results.push({
        model: model.id,
        name: model.name,
        category: model.category,
        status: "error",
        message: `❌ ${error instanceof Error ? error.message : "Network error"}`,
        responseTime: Date.now() - startTime,
      });
    }
  }

  // Summary
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === "success").length,
    errors: results.filter(r => r.status === "error").length,
    workingModels: results.filter(r => r.status === "success").map(r => r.id),
    failedModels: results.filter(r => r.status === "error").map(r => ({
      id: r.model,
      reason: r.message,
    })),
  };

  return NextResponse.json({
    mockMode: false,
    apiUrl: baseUrl,
    apiKeyConfigured: true,
    endpoints: {
      createTask: "POST /api/v1/jobs/createTask",
      recordInfo: "GET /api/v1/jobs/recordInfo?taskId=xxx",
    },
    summary,
    results,
    timestamp: new Date().toISOString(),
  });
}

// Test a specific task status
export async function POST(request: Request) {
  const apiKey = process.env.KIE_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_KIE_API_URL || "https://api.kie.ai";
  
  if (!apiKey) {
    return NextResponse.json({ error: "KIE_API_KEY not configured" }, { status: 401 });
  }

  try {
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    // Use correct endpoint: GET /api/v1/jobs/recordInfo
    const response = await fetch(`${baseUrl}/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();
    
    return NextResponse.json({
      endpoint: `/api/v1/jobs/recordInfo?taskId=${taskId}`,
      response: data,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
