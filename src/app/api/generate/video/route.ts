import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { kieClient } from '@/lib/api/kie-client';
import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      model, 
      duration, 
      mode = 't2v',
      quality,
      resolution,
      audio,
      variants = 1,
      aspectRatio = '16:9',
      negativePrompt,
      referenceImage,
      startImage,
      endImage,
      shots, // For storyboard mode
    } = body;

    if (!prompt && mode !== 'storyboard') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    // Find model info
    const modelInfo = getModelById(model) as VideoModelConfig | undefined;
    if (!modelInfo || modelInfo.type !== 'video') {
      return NextResponse.json(
        { error: 'Invalid video model', availableModels: VIDEO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    // Check if mode is supported by this model
    if (!modelInfo.modes.includes(mode)) {
      return NextResponse.json(
        { error: `Mode '${mode}' is not supported by ${modelInfo.name}. Supported modes: ${modelInfo.modes.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate credit cost using pricing system
    const price = computePrice(model, {
      mode,
      duration: duration || modelInfo.fixedDuration || 5,
      videoQuality: quality,
      audio,
      variants,
    });
    const creditCost = price.stars;

    // Check Telegram auth
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to generate videos.' },
        { status: 401 }
      );
    }

    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User account not found. Please contact support.' },
        { status: 404 }
      );
    }
    
    // Use admin client for DB operations
    const supabase = getSupabaseAdmin();

    // Get user credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();

    if (creditsError || !creditsData) {
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      );
    }

    // Check if enough credits
    if (creditsData.amount < creditCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits', 
          required: creditCost, 
          available: creditsData.amount,
          message: `Нужно ${creditCost} ⭐, у вас ${creditsData.amount} ⭐`
        },
        { status: 402 }
      );
    }

    // Deduct credits
    const newBalance = creditsData.amount - creditCost;
    const { error: deductError } = await supabase
      .from('credits')
      .update({ 
        amount: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (deductError) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    // Save generation to history
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        type: 'video',
        model_id: model,
        model_name: modelInfo.name,
        prompt: prompt,
        negative_prompt: negativePrompt,
        duration: duration || modelInfo.fixedDuration || 5,
        credits_used: creditCost,
        status: 'processing',
      })
      .select()
      .single();

    if (genError) {
      console.error('[API] Failed to save generation:', genError);
    }

    // Record credit transaction (deduction)
    const { error: txError } = await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -creditCost,
      type: 'deduction',
      description: `Генерация видео: ${modelInfo.name} (${duration || modelInfo.fixedDuration || 5}с)`,
      metadata: {
        model_id: model,
        model_name: modelInfo.name,
        type: 'video',
        mode: mode,
        duration: duration || modelInfo.fixedDuration || 5,
        quality: quality,
        audio: audio,
      },
      generation_id: generation?.id,
    });

    if (txError) {
      console.error('[API] Failed to record transaction:', txError);
    }

    // Generate video via KIE API
    // Determine image URL based on mode
    let imageUrl: string | undefined;
    let lastFrameUrl: string | undefined;
    
    if (mode === 'i2v' && referenceImage) {
      imageUrl = referenceImage;
    } else if (mode === 'start_end') {
      if (startImage) imageUrl = startImage;
      if (endImage) lastFrameUrl = endImage;
    }

    // Select correct API model ID based on mode
    // Some models have different endpoints for t2v and i2v
    let apiModelId = modelInfo.apiId;
    if ((mode === 'i2v' || mode === 'start_end') && modelInfo.apiIdI2v) {
      apiModelId = modelInfo.apiIdI2v;
    }

    console.log('[API] Video generation request:', {
      model: model,
      apiModelId: apiModelId,
      provider: modelInfo.provider,
      mode: mode,
      duration: duration,
    });

    // Call KIE API with provider info
    const response = await kieClient.generateVideo({
      model: apiModelId,
      provider: modelInfo.provider,
      prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
      imageUrl: imageUrl,
      lastFrameUrl: lastFrameUrl,
      duration: duration || modelInfo.fixedDuration || 5,
      aspectRatio: aspectRatio,
      sound: audio || false,
      mode: mode,
      resolution: resolution,
      quality: quality,
      shots: shots, // For storyboard mode
    });

    // Update generation with task ID
    if (generation?.id) {
      await supabase
        .from('generations')
        .update({ task_id: response.id })
        .eq('id', generation.id);
    }

    return NextResponse.json({
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 120,
      creditCost: creditCost,
      generationId: generation?.id,
    });
  } catch (error) {
    console.error('[API] Video generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
