import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient } from '@/lib/api/kie-client';
import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      model, 
      modelVariant, // For unified models like Kling
      duration, 
      mode = 't2v',
      quality,
      resolution,
      audio, // ignored: we always enable sound when model supports it
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
    const alwaysSound = !!modelInfo.supportsAudio;
    const price = computePrice(model, {
      mode,
      duration: duration || modelInfo.fixedDuration || 5,
      videoQuality: quality,
      resolution: resolution || undefined, // For WAN per-second pricing
      audio: alwaysSound,
      modelVariant: modelVariant || undefined,
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

    // Ensure `profiles` row exists (generations.user_id may FK to profiles.id)
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error("[API] Failed to ensure profile exists:", e);
    }

    // Save generation to history
    let generation: any = null;
    let genError: any = null;

    const insertOnce = async () => {
      const r = await supabase
        .from("generations")
        .insert({
          user_id: userId,
          type: "video",
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
      if (code === "23503" || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          await insertOnce();
        } catch (e) {
          console.error("[API] Retry after ensureProfileExists failed:", e);
        }
      }
    }

    if (genError) {
      console.error("[API] Failed to save generation:", JSON.stringify(genError, null, 2));
      return NextResponse.json(
        {
          error: "Failed to create generation record",
          details: genError?.message || String(genError),
          hint: "Likely missing profiles row or FK/RLS issue on `generations.user_id`",
        },
        { status: 500 }
      );
    }

    // Record credit transaction (avoid columns missing on prod, like metadata)
    try {
      const { error: txError } = await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -creditCost,
        type: 'deduction',
        description: `Генерация видео: ${modelInfo.name} (${duration || modelInfo.fixedDuration || 5}с)`,
        generation_id: generation?.id,
      });
      if (txError) console.error('[API] Failed to record transaction:', txError);
    } catch (e) {
      console.error('[API] Failed to record transaction:', e);
    }

    // Generate video via KIE API
    // Determine image URL based on mode (supports base64 data URLs -> upload to Supabase Storage)
    let imageUrl: string | undefined;
    let lastFrameUrl: string | undefined;
    
    const uploadDataUrlToStorage = async (dataUrl: string, suffix: string) => {
      // data:image/png;base64,xxxx
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

    if (mode === 'i2v' && referenceImage) {
      imageUrl = await uploadDataUrlToStorage(referenceImage, 'i2v');
    } else if (mode === 'start_end') {
      if (startImage) imageUrl = await uploadDataUrlToStorage(startImage, 'start');
      if (endImage) lastFrameUrl = await uploadDataUrlToStorage(endImage, 'end');
    }

    // Select correct API model ID based on mode and variant
    // If modelVariant is specified (for unified models like Kling), use variant's apiId
    let apiModelId = modelInfo.apiId;
    if (modelVariant && modelInfo.modelVariants) {
      const variant = modelInfo.modelVariants.find(v => v.id === modelVariant);
      if (variant) {
        if ((mode === 'i2v' || mode === 'start_end') && variant.apiIdI2v) {
          apiModelId = variant.apiIdI2v;
        } else {
          apiModelId = variant.apiId;
        }
      }
    } else if ((mode === 'i2v' || mode === 'start_end') && modelInfo.apiIdI2v) {
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

    const response = await kieClient.generateVideo({
      model: apiModelId,
      provider: modelInfo.provider,
      prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
      imageUrl: imageUrl,
      lastFrameUrl: lastFrameUrl,
      duration: duration || modelInfo.fixedDuration || 5,
      aspectRatio: aspectRatio,
      sound: alwaysSound,
      mode: mode,
      resolution: resolution,
      quality: quality,
      shots: shots, // For storyboard mode
    });

    // Update generation with task ID
    if (generation?.id) {
      await supabase
        .from('generations')
        .update({ task_id: response.id, status: 'generating' })
        .eq('id', generation.id);
    }

    return NextResponse.json({
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 120,
      creditCost: creditCost,
      generationId: generation?.id,
      provider: modelInfo.provider,
      kind: "video",
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
