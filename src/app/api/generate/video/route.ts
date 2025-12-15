import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getModelById } from '@/config/models';
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
      audio,
      variants = 1,
      aspectRatio = '16:9',
      negativePrompt,
      referenceImage,
      startImage,
      endImage,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    // Find model info
    const modelInfo = getModelById(model);
    if (!modelInfo || modelInfo.type !== 'video') {
      return NextResponse.json(
        { error: 'Invalid video model' },
        { status: 400 }
      );
    }

    // Calculate credit cost using new pricing system
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

    // Use Telegram profile ID as user_id
    const userId = telegramSession.profileId;
    
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
        aspect_ratio: aspectRatio,
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
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -creditCost, // Negative for deduction
      type: 'deduction',
      description: `Генерация видео: ${modelInfo.name} (${duration || modelInfo.fixedDuration || 5}с, ${variants} вариант${variants > 1 ? 'а' : ''})`,
      metadata: {
        model_id: model,
        model_name: modelInfo.name,
        type: 'video',
        mode: mode,
        duration: duration || modelInfo.fixedDuration || 5,
        quality: quality,
        audio: audio,
        variants: variants,
      },
      generation_id: generation?.id,
    });

    // Generate video (mock for now, but structure is ready)
    const jobId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Video generation started',
      creditCost: creditCost,
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


