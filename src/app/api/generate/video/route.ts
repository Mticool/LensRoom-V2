import { NextRequest, NextResponse } from "next/server";
import { VIDEO_MODELS } from "@/lib/models";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === "true";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model,
      mode,
      prompt,
      imageUrl,
      duration,
      cameraMovement,
      motionIntensity,
      fps = 30,
    } = body;

    // Validation
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (mode === "image-to-video" && !imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required for image-to-video mode" },
        { status: 400 }
      );
    }

    // Find model
    const modelData = VIDEO_MODELS.find((m) => m.id === model);
    if (!modelData) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    // Check duration limit
    if (modelData.capabilities.maxDuration && duration > modelData.capabilities.maxDuration) {
      return NextResponse.json(
        {
          error: `Max duration for this model is ${modelData.capabilities.maxDuration}s`,
        },
        { status: 400 }
      );
    }

    // Calculate cost
    const creditsCost = Math.ceil(modelData.creditCost * (duration / 5));

    // Mock mode
    if (MOCK_MODE) {
      const mockJobId = `video-mock-${Date.now()}`;
      return NextResponse.json({
        jobId: mockJobId,
        status: "processing",
        estimatedTime: duration * 4,
        creditsCost,
      });
    }

    // Real API call would go here
    // const response = await kieClient.generateVideo({...});

    const jobId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      jobId,
      status: "processing",
      estimatedTime: duration * 4,
      creditsCost,
    });
  } catch (error: unknown) {
    console.error("Generate video error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

