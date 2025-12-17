import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getKieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS, getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, prompt, negativePrompt, aspectRatio, variants = 1, mode = 't2i', referenceImage } = body;

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

    // Get auth.users.id from Telegram session
    const userId = await getAuthUserId(telegramSession);
    
    if (!userId) {
      return NextResponse.json(
        { error: "User account not found. Please contact support." },
        { status: 404 }
      );
    }
    
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

    // Ensure `profiles` row exists (generations.user_id may FK to profiles.id)
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error("[API] Failed to ensure profile exists:", e);
    }

    // Save generation to history (admin client bypasses RLS; FK can still fail if profile row missing)
    console.log("[API] Creating generation for user:", userId, "model:", model);
    let generation: any = null;
    let genError: any = null;

    const insertOnce = async () => {
      const r = await supabase
        .from("generations")
        .insert({
          user_id: userId,
          type: "photo",
          model_id: model,
          model_name: modelInfo.name,
          prompt: prompt,
          negative_prompt: negativePrompt,
          credits_used: creditCost,
          status: "queued",
        })
        .select()
        .single();
      generation = r.data;
      genError = r.error;
    };

    await insertOnce();
    if (genError) {
      const code = genError?.code ? String(genError.code) : "";
      const msg = genError?.message ? String(genError.message) : String(genError);

      // Common root cause: FK violation to profiles.id (23503). Retry after ensuring profile.
      if (code === "23503" || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          await insertOnce();
        } catch (e) {
          // keep original error below if still failing
          console.error("[API] Retry after ensureProfileExists failed:", e);
        }
      }
    }

    if (genError) {
      console.error("[API] Failed to save generation:", JSON.stringify(genError, null, 2));
      console.error("[API] Generation data:", { userId, model, prompt: prompt.substring(0, 50) });
      return NextResponse.json(
        {
          error: "Failed to create generation record",
          details: genError?.message || String(genError),
          hint: "Likely missing profiles row or FK/RLS issue on `generations.user_id`",
        },
        { status: 500 }
      );
    }

    console.log("[API] Generation created:", generation?.id);

    // Record credit transaction (avoid columns missing on prod, like metadata)
    try {
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -creditCost, // Negative for deduction
        type: 'deduction',
        description: `Генерация фото: ${modelInfo.name} (${variants} вариант${variants > 1 ? 'а' : ''})`,
        generation_id: generation?.id,
      });
    } catch (e) {
      console.error('[API] Failed to record transaction:', e);
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
    const uploadDataUrlToStorage = async (dataUrl: string, suffix: string) => {
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) return dataUrl; // already a URL
      const mime = match[1];
      const b64 = match[2];
      const buffer = Buffer.from(b64, 'base64');
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const path = `${userId}/inputs/${Date.now()}_${suffix}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('generations')
        .upload(path, buffer, { contentType: mime, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('generations').getPublicUrl(path);
      return pub.publicUrl;
    };

    let imageInputs: string[] | undefined = undefined;
    if (mode === 'i2i') {
      if (!referenceImage) {
        return NextResponse.json({ error: "referenceImage is required for i2i" }, { status: 400 });
      }
      const url = await uploadDataUrlToStorage(referenceImage, 'i2i');
      imageInputs = [url];
    }

    const resolutionForKie =
      typeof resolution === 'string'
        ? (resolution as any)
        : quality === '2k'
          ? '2K'
          : '1K';

    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (e) {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
        "KIE_CALLBACK_SECRET",
        "KIE_CALLBACK_URL",
      ]);
    }

    const response = await kieClient.generateImage({
      model: modelInfo.apiId,
      prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
      aspectRatio: aspectRatioMap[aspectRatio] || "1:1",
      resolution: resolutionForKie,
      outputFormat: "png",
      quality,
      imageInputs,
    });

    // Attach task_id to DB record so callbacks / sync can find it reliably
    if (generation?.id) {
      try {
        await supabase
          .from("generations")
          .update({ task_id: response.id, status: "generating" })
          .eq("id", generation.id);
      } catch (e) {
        console.warn("[API] Failed to set task_id on generation:", e);
      }
    }

    return NextResponse.json({
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 30,
      creditCost: creditCost,
      generationId: generation?.id,
      provider: modelInfo.provider,
      kind: "image",
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