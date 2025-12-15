import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { kieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS, getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, negativePrompt, aspectRatio, variants = 1 } = body;

    // Validate required fields
    if (!model || !prompt) {
      return NextResponse.json(
        { error: "Model and prompt are required" },
        { status: 400 }
      );
    }

    // Find model info
    const modelInfo = getModelById(model);
    if (!modelInfo || modelInfo.type !== 'photo') {
      return NextResponse.json(
        { error: "Invalid model", availableModels: PHOTO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    // Calculate credit cost using new pricing system
    const { quality, resolution } = body;
    const price = computePrice(model, {
      quality,
      resolution,
      variants,
    });
    const creditCost = price.stars; // Use stars (which is ceil(credits))

    // Check Telegram auth first
    const telegramSession = await getSession();
    
    if (!telegramSession) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to generate images." },
        { status: 401 }
      );
    }

    // Use Telegram profile ID as user_id
    const userId = telegramSession.profileId;
    
    // Check credits using admin client
    const supabase = getSupabaseAdmin();

    // Get user credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();

    if (creditsError || !creditsData) {
      return NextResponse.json(
        { error: "Failed to fetch credits" },
        { status: 500 }
      );
    }

    // Check if enough credits
    if (creditsData.amount < creditCost) {
      return NextResponse.json(
        { 
          error: "Insufficient credits", 
          required: creditCost, 
          available: creditsData.amount,
          message: `Нужно ${creditCost} ⭐, у вас ${creditsData.amount} ⭐`
        },
        { status: 402 } // Payment Required
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
        { error: "Failed to deduct credits" },
        { status: 500 }
      );
    }

    // Save generation to history
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        type: 'photo',
        model_id: model,
        model_name: modelInfo.name,
        prompt: prompt,
        negative_prompt: negativePrompt,
        aspect_ratio: aspectRatio,
        variants: variants,
        credits_used: creditCost,
        status: 'processing',
      })
      .select()
      .single();

    if (genError) {
      console.error('[API] Failed to save generation:', genError);
      // Don't fail the request, but log the error
    }

    // Record credit transaction (deduction)
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -creditCost, // Negative for deduction
      type: 'deduction',
      description: `Генерация фото: ${modelInfo.name} (${variants} вариант${variants > 1 ? 'а' : ''})`,
      metadata: {
        model_id: model,
        model_name: modelInfo.name,
        type: 'photo',
        variants: variants,
        quality: quality,
        resolution: resolution,
      },
      generation_id: generation?.id,
    });

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
      model: modelInfo.apiId,
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
      creditCost: creditCost,
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