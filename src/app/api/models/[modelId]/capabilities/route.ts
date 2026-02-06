import { NextRequest, NextResponse } from 'next/server';
import { getImageModelCapability } from '@/lib/imageModels/capabilities';

/**
 * GET /api/models/[modelId]/capabilities
 * Возвращает capabilities модели (aspect ratios, quality options, поддержка variants)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;

  const capability = getImageModelCapability(modelId);
  if (!capability) {
    return NextResponse.json(
      { error: 'Model not found or not a photo model' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    modelId: capability.id,
    modes: capability.modes,
    aspectRatios: capability.supportedAspectRatios || ['1:1'],
    qualityOptions: capability.supportedQualities || [],
    resolutionOptions: capability.supportedResolutions || [],
    supportsVariants: !(capability.isTool || false),
    maxVariants: capability.requestVariants?.max ?? 1,
    supportsI2i: capability.supportsReferenceImages || false,
    requiresReferenceImage: capability.requiredInputsByMode?.i2i?.required?.includes('inputImage') || false,
  });
}
