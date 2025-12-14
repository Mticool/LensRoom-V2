import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PRODUCT_TEMPLATES, PRODUCT_SCENES, getTemplateById, getSceneById } from '@/lib/products-config';

// Модели для продуктов с ценами
const PRODUCT_MODELS: Record<string, { credits: number; name: string }> = {
  'flux-2': { credits: 8, name: 'FLUX.2' },
  'seedream-4.5': { credits: 5, name: 'Seedream 4.5' },
  'imagen-4-ultra': { credits: 12, name: 'Imagen 4 Ultra' },
  'nano-banana-pro': { credits: 3, name: 'Nano Banana Pro' },
};

const DEFAULT_MODEL = 'flux-2';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const productImage = formData.get('productImage') as File | null;
    const productName = formData.get('productName') as string;
    const scene = formData.get('scene') as string;
    const templateId = formData.get('templateId') as string | null;
    const aspectRatio = (formData.get('aspectRatio') as string) || '1:1';
    const model = (formData.get('model') as string) || DEFAULT_MODEL;

    // Get model config
    const modelConfig = PRODUCT_MODELS[model] || PRODUCT_MODELS[DEFAULT_MODEL];
    const creditsNeeded = modelConfig.credits;

    // Validate required fields
    if (!productImage) {
      return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    }

    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (!scene) {
      return NextResponse.json({ error: 'Scene is required' }, { status: 400 });
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check credits
    const { data: creditsData } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', user.id)
      .single();

    if (!creditsData || creditsData.amount < creditsNeeded) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: creditsNeeded,
        current: creditsData?.amount || 0,
      }, { status: 402 });
    }

    // Convert image to base64
    const imageBuffer = await productImage.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const mimeType = productImage.type || 'image/png';

    // Build prompt based on scene and template
    const prompt = buildProductPrompt(productName, scene, templateId);
    const negativePrompt = buildNegativePrompt(templateId);

    // Call kie.ai API
    const kieApiUrl = process.env.NEXT_PUBLIC_KIE_API_URL;
    const kieApiKey = process.env.KIE_API_KEY;

    if (!kieApiUrl || !kieApiKey) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${kieApiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${kieApiKey}`,
      },
      body: JSON.stringify({
        model: model,
        prompt,
        negative_prompt: negativePrompt,
        image: `data:${mimeType};base64,${imageBase64}`,
        aspect_ratio: aspectRatio,
        num_images: 1,
        guidance_scale: 7.5,
        num_inference_steps: 30,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create generation task');
    }

    const result = await response.json();

    if (!result.taskId) {
      throw new Error('Failed to create generation task');
    }

    // Deduct credits
    await supabase
      .from('credits')
      .update({ 
        amount: creditsData.amount - creditsNeeded,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Save generation to history
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'product',
      model: model,
      prompt,
      credits_used: creditsNeeded,
      status: 'processing',
      task_id: result.taskId,
      metadata: {
        productName,
        scene,
        templateId,
        aspectRatio,
        negativePrompt,
        modelName: modelConfig.name,
      },
    });

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      creditsUsed: creditsNeeded,
      remainingCredits: creditsData.amount - creditsNeeded,
      model: model,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Product generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Build product prompt based on template or scene
 */
function buildProductPrompt(productName: string, scene: string, templateId: string | null): string {
  // Try to use template first
  if (templateId) {
    const template = getTemplateById(templateId);
    if (template) {
      return template.prompt.replace('{product}', productName);
    }
  }

  // Fallback to scene-based prompt
  const sceneData = getSceneById(scene);
  if (sceneData) {
    return `${productName}, ${sceneData.prompt}`;
  }

  // Default prompt
  return `${productName}, professional product photography, high quality, studio lighting, clean background`;
}

/**
 * Build negative prompt from template
 */
function buildNegativePrompt(templateId: string | null): string {
  if (templateId) {
    const template = getTemplateById(templateId);
    if (template?.negativePrompt) {
      return template.negativePrompt;
    }
  }

  // Default negative prompt for products
  return 'blurry, low quality, distorted, watermark, text, logo, bad lighting, shadows, dirty, damaged';
}

