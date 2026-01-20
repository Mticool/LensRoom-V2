import { NextRequest, NextResponse } from 'next/server';
import { getModelById } from '@/config/models';

/**
 * GET /api/models/[modelId]/capabilities
 * Возвращает capabilities модели (aspect ratios, quality options, поддержка variants)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;

  // Получить модель из конфига
  const model = getModelById(modelId);

  if (!model || model.type !== 'photo') {
    return NextResponse.json(
      { error: 'Model not found or not a photo model' },
      { status: 404 }
    );
  }

  // Вернуть capabilities
  const isToolModel = modelId === 'topaz-image-upscale' || modelId === 'recraft-remove-background';
  const capabilities = {
    aspectRatios: isToolModel ? ['1:1'] : (model.aspectRatios || ['1:1']),
    qualityOptions: model.qualityOptions || [],
    supportsVariants: !isToolModel, // tool-модели ограничиваем 1/1
    maxVariants: isToolModel ? 1 : 4,
    supportsI2i: model.supportsI2i,
    requiresReferenceImage: isToolModel ? true : false,
  };

  return NextResponse.json(capabilities);
}
