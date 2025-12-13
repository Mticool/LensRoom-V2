import { NextRequest, NextResponse } from "next/server";
import { kieClient, aspectRatioToSize } from "@/lib/api/kie-client";
import { PHOTO_MODELS } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      model,
      prompt,
      negativePrompt,
      aspectRatio = "1:1",
      variants = 1,
      seed,
      cfgScale,
      steps,
    } = body;

    // Валидация prompt
    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Найти модель
    const modelData = PHOTO_MODELS.find((m) => m.id === model);
    if (!modelData) {
      return NextResponse.json(
        { error: "Invalid model" },
        { status: 400 }
      );
    }

    // Проверить поддержку aspectRatio
    if (!modelData.capabilities.aspectRatios.includes(aspectRatio)) {
      return NextResponse.json(
        { error: `Model does not support aspect ratio: ${aspectRatio}` },
        { status: 400 }
      );
    }

    // Валидация variants
    if (variants < 1 || variants > 4) {
      return NextResponse.json(
        { error: "Variants must be between 1 and 4" },
        { status: 400 }
      );
    }

    // Преобразовать aspectRatio в width/height
    const { width, height } = aspectRatioToSize(aspectRatio);

    // Mock режим для разработки
    if (process.env.NEXT_PUBLIC_ENABLE_MOCK === "true") {
      const mockJobId = `mock_${Date.now()}`;
      return NextResponse.json({
        jobId: mockJobId,
        status: "queued",
        estimatedTime: 15,
        creditsCost: modelData.creditCost * variants,
      });
    }

    // Вызов API kie.ai
    const response = await kieClient.generateImage({
      model: modelData.apiId,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim(),
      width,
      height,
      numOutputs: variants,
      steps: steps || modelData.defaultParams.steps,
      cfgScale: cfgScale || modelData.defaultParams.cfgScale,
      seed: seed || undefined,
      sampler: modelData.defaultParams.sampler,
    });

    // Рассчитать стоимость
    const creditsCost = modelData.creditCost * variants;

    return NextResponse.json({
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 30,
      creditsCost,
    });
  } catch (error: unknown) {
    console.error("Generate photo error:", error);
    
    const message = error instanceof Error ? error.message : "Failed to generate image";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

