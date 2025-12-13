import { NextRequest, NextResponse } from "next/server";
import { kieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, negativePrompt, aspectRatio, variants } = body;

    // Validate required fields
    if (!model || !prompt) {
      return NextResponse.json(
        { error: "Model and prompt are required" },
        { status: 400 }
      );
    }

    // Find model info
    const modelInfo = PHOTO_MODELS.find((m) => m.id === model);
    if (!modelInfo) {
      return NextResponse.json(
        { error: "Invalid model", availableModels: PHOTO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    // Map aspect ratio to KIE format
    const aspectRatioMap: Record<string, string> = {
      "1:1": "1:1",
      "16:9": "16:9",
      "9:16": "9:16",
      "4:3": "4:3",
      "3:4": "3:4",
    };

    // Generate image
    const response = await kieClient.generateImage({
      model: modelInfo.apiId || model,
      prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
      aspectRatio: aspectRatioMap[aspectRatio] || "1:1",
      resolution: "1K",
      outputFormat: "png",
    });

    return NextResponse.json({
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 30,
      creditCost: (modelInfo.creditCost || 5) * (variants || 1),
    });
  } catch (error) {
    console.error("[API] Photo generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
