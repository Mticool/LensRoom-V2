import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { integrationNotConfigured } from "@/lib/http/integration-error";

// Try different model ID formats from KIE.ai
const MODELS_TO_TEST = [
  // Known working
  { id: "nano-banana-pro", category: "photo" as const, name: "Nano Banana Pro" },
  
  // Photo models - try different naming conventions
  { id: "seedream-3.0", category: "photo" as const, name: "Seedream 3.0" },
  { id: "seedream-3", category: "photo" as const, name: "Seedream 3" },
  { id: "seedream", category: "photo" as const, name: "Seedream" },
  { id: "flux-pro", category: "photo" as const, name: "FLUX Pro" },
  { id: "flux-1-pro", category: "photo" as const, name: "FLUX 1 Pro" },
  { id: "flux", category: "photo" as const, name: "FLUX" },
  { id: "ideogram", category: "photo" as const, name: "Ideogram" },
  { id: "ideogram-2", category: "photo" as const, name: "Ideogram 2" },
  { id: "midjourney", category: "photo" as const, name: "Midjourney" },
  { id: "dall-e-3", category: "photo" as const, name: "DALL-E 3" },
  { id: "stable-diffusion-xl", category: "photo" as const, name: "Stable Diffusion XL" },
  { id: "sdxl", category: "photo" as const, name: "SDXL" },
  
  // Video models
  { id: "kling", category: "video" as const, name: "Kling" },
  { id: "kling-1.5", category: "video" as const, name: "Kling 1.5" },
  { id: "kling-1.6", category: "video" as const, name: "Kling 1.6" },
  { id: "runway", category: "video" as const, name: "Runway" },
  { id: "runway-gen3", category: "video" as const, name: "Runway Gen-3" },
  { id: "gen-3", category: "video" as const, name: "Gen-3" },
  { id: "luma", category: "video" as const, name: "Luma" },
  { id: "luma-dream-machine", category: "video" as const, name: "Luma Dream Machine" },
  { id: "sora", category: "video" as const, name: "Sora" },
  { id: "pika", category: "video" as const, name: "Pika" },
  { id: "haiper", category: "video" as const, name: "Haiper" },
  { id: "minimax", category: "video" as const, name: "MiniMax" },
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
  const onlyWorking = searchParams.get("working") === "true";
  
  const apiKey = env.optional("KIE_API_KEY");
  const callbackSecret = env.optional("KIE_CALLBACK_SECRET");
  const callbackUrlBase = env.optional("KIE_CALLBACK_URL");
  const baseUrl = env.optional("NEXT_PUBLIC_KIE_API_URL") || "https://api.kie.ai";
  
  if (!apiKey) {
    return integrationNotConfigured("kie", ["KIE_API_KEY"]);
  }

  const missingForRealGenerations: string[] = [];
  if (!apiKey) missingForRealGenerations.push("KIE_API_KEY");
  if (!callbackSecret) missingForRealGenerations.push("KIE_CALLBACK_SECRET");
  if (!callbackUrlBase) missingForRealGenerations.push("KIE_CALLBACK_URL");

  const results: TestResult[] = [];
  const modelsToTest = singleModel 
    ? MODELS_TO_TEST.filter(m => m.id === singleModel)
    : MODELS_TO_TEST;

  for (const model of modelsToTest) {
    const startTime = Date.now();
    try {
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
          message: `✅ Task created`,
          responseTime,
        });
      } else {
        if (!onlyWorking) {
          results.push({
            model: model.id,
            name: model.name,
            category: model.category,
            status: "error",
            message: `❌ ${data.message || data.msg || `Code: ${data.code}`}`,
            responseTime,
          });
        }
      }
    } catch (error) {
      if (!onlyWorking) {
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
  }

  const workingModels = results.filter(r => r.status === "success");
  
  return NextResponse.json({
    mockMode: false,
    apiUrl: baseUrl,
    apiKeyConfigured: true,
    callbackConfigured: !!callbackSecret && !!callbackUrlBase,
    missingForRealGenerations: missingForRealGenerations.length ? missingForRealGenerations : [],
    summary: {
      total: modelsToTest.length,
      tested: results.length,
      working: workingModels.length,
      workingModels: workingModels.map(r => ({ id: r.model, name: r.name, category: r.category })),
    },
    results: onlyWorking ? workingModels : results,
    timestamp: new Date().toISOString(),
  });
}

// Check task status
export async function POST(request: Request) {
  const apiKey = env.optional("KIE_API_KEY");
  const callbackSecret = env.optional("KIE_CALLBACK_SECRET");
  const callbackUrlBase = env.optional("KIE_CALLBACK_URL");
  const baseUrl = env.optional("NEXT_PUBLIC_KIE_API_URL") || "https://api.kie.ai";
  
  if (!apiKey) {
    return integrationNotConfigured("kie", ["KIE_API_KEY"]);
  }

  try {
    const { taskId } = await request.json();
    
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

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
      callbackConfigured: !!callbackSecret && !!callbackUrlBase,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
