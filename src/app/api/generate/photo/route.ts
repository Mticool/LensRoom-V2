import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { kieAPI } from '@/lib/kie-api';
import { getModelById, PHOTO_MODELS } from '@/lib/models-config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      model,
      prompt,
      negativePrompt,
      aspectRatio,
      numImages = 1,
      seed,
      styleReference,
      characterReference,
      sourceImage,
    } = body;

    // Validate required fields
    if (!model || !prompt) {
      return NextResponse.json(
        { error: 'Model and prompt are required' },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get model config
    const modelConfig = getModelById(model);
    if (!modelConfig) {
      return NextResponse.json({ 
        error: 'Invalid model',
        availableModels: PHOTO_MODELS.map(m => m.id),
      }, { status: 400 });
    }

    // Calculate credits needed
    const creditsNeeded = modelConfig.credits * numImages;

    // Check credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !creditsData) {
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    if (creditsData.amount < creditsNeeded) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: creditsNeeded,
        current: creditsData.amount,
        message: `Нужно ${creditsNeeded} кредитов, у вас ${creditsData.amount}`,
      }, { status: 402 });
    }

    // Upload reference images if provided (base64 strings)
    let uploadedStyleRef: string | undefined;
    let uploadedCharRefs: string[] | undefined;
    let uploadedSourceImage: string | undefined;

    if (styleReference) {
      const uploadResult = await kieAPI.uploadBase64(styleReference, 'style-ref.png');
      if (uploadResult.success && uploadResult.url) {
        uploadedStyleRef = uploadResult.url;
      }
    }

    if (characterReference && characterReference.length > 0) {
      const uploads = await Promise.all(
        characterReference.map((ref: string, i: number) => 
          kieAPI.uploadBase64(ref, `char-ref-${i}.png`)
        )
      );
      uploadedCharRefs = uploads
        .filter(u => u.success && u.url)
        .map(u => u.url!);
    }

    if (sourceImage) {
      const uploadResult = await kieAPI.uploadBase64(sourceImage, 'source.png');
      if (uploadResult.success && uploadResult.url) {
        uploadedSourceImage = uploadResult.url;
      }
    }

    // Generate image
    const result = await kieAPI.generateImage({
      model,
      prompt,
      negativePrompt,
      aspectRatio: aspectRatio || '1:1',
      numImages,
      seed,
      styleReference: uploadedStyleRef,
      characterReference: uploadedCharRefs,
      sourceImage: uploadedSourceImage,
    });

    if (!result.success || !result.taskId) {
      throw new Error(result.error || 'Generation failed');
    }

    // Deduct credits
    const { error: deductError } = await supabase
      .from('credits')
      .update({ 
        amount: creditsData.amount - creditsNeeded,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
      // Don't fail the request, credits will be reconciled later
    }

    // Store generation info for later saving (when completed)
    // We'll save to DB when status API returns completed
    const generationInfo = {
      userId: user.id,
      model,
      prompt,
      creditsUsed: creditsNeeded,
    };

    // Store in global map for status API to use
    if (!global.pendingGenerations) {
      global.pendingGenerations = new Map();
    }
    global.pendingGenerations.set(result.taskId, generationInfo);

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      creditsUsed: creditsNeeded,
      remainingCredits: creditsData.amount - creditsNeeded,
      estimatedTime: result.estimatedTime,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Photo generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
