import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { kieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS } from "@/lib/models";

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
    const modelInfo = PHOTO_MODELS.find((m) => m.id === model);
    if (!modelInfo) {
      return NextResponse.json(
        { error: "Invalid model", availableModels: PHOTO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    // Calculate credit cost
    const creditCost = (modelInfo.creditCost || 5) * variants;

    // Check auth and credits
    const supabase = await createServerSupabaseClient();
    
    if (supabase) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: "Unauthorized. Please log in to generate images." },
          { status: 401 }
        );
      }

      // Get user credits
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', user.id)
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
        .eq('user_id', user.id);

      if (deductError) {
        return NextResponse.json(
          { error: "Failed to deduct credits" },
          { status: 500 }
        );
      }

      // Save generation to history
      await supabase.from('generations').insert({
        user_id: user.id,
        type: 'photo',
        model: model,
        prompt: prompt,
        negative_prompt: negativePrompt,
        settings: { aspectRatio, variants },
        credits_used: creditCost,
        status: 'processing',
      });
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
