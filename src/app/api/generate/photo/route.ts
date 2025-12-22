import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getKieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS, getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { getPhotoVariantByIds } from "@/config/photoVariantRegistry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt, aspectRatio, variants = 1, mode = 't2i', referenceImage, outputFormat } = body;
    const legacyModel = body?.model;
    const baseModelId = body?.modelId;
    const variantId = body?.variantId;
    const clientParams = body?.params;

    // Validate required fields
    if ((!legacyModel && !(baseModelId && variantId)) || !prompt) {
      return NextResponse.json(
        { error: "Model (or modelId+variantId) and prompt are required" },
        { status: 400 }
      );
    }

    // Resolve new variant-based payload to an internal model id
    let effectiveModelId: string = String(legacyModel || "");
    let resolvedParams: any = null;
    let baseTitle: string | null = null;
    let resolvedVariantId: string | null = null;
    let resolvedVariantStars: number | null = null;

    if (baseModelId && variantId) {
      // This generator currently only supports 1 image per request for variant pricing.
      if (Number(variants || 1) !== 1) {
        return NextResponse.json({ error: "variants must be 1 for variant-based photo generation" }, { status: 400 });
      }

      const resolved = getPhotoVariantByIds(String(baseModelId), String(variantId));
      if (!resolved) {
        return NextResponse.json({ error: "Invalid modelId/variantId" }, { status: 400 });
      }
      const { base, variant } = resolved;
      if (!variant.enabled) {
        return NextResponse.json({ error: "Selected variant is disabled" }, { status: 400 });
      }

      effectiveModelId = variant.sourceModelId;
      resolvedParams = variant.params || {};
      baseTitle = base.title || null;
      resolvedVariantId = variant.id;
      resolvedVariantStars = Number(variant.stars || 0);

      // Optional: ignore clientParams for pricing/selection safety (we keep it only for logging)
      void clientParams;
    }

    // Find model info
    const modelInfo = getModelById(effectiveModelId);
    if (!modelInfo || modelInfo.type !== 'photo') {
      return NextResponse.json(
        { error: "Invalid model", availableModels: PHOTO_MODELS.map(m => m.id) },
        { status: 400 }
      );
    }

    // Calculate credit cost using new pricing system
    const { quality: legacyQuality, resolution: legacyResolution } = body;
    const quality =
      resolvedParams?.quality && resolvedParams.quality !== "default"
        ? String(resolvedParams.quality)
        : legacyQuality;
    const resolution =
      resolvedParams?.resolution && resolvedParams.resolution !== "default"
        ? String(resolvedParams.resolution)
        : legacyResolution;

    // If variant payload was used, enforce stars from variant registry (server-side).
    // Otherwise fall back to computePrice for legacy payload.
    const creditCost = resolvedVariantStars !== null ? resolvedVariantStars : computePrice(effectiveModelId, { quality, resolution, variants }).stars;
    if (!Number.isFinite(creditCost) || creditCost <= 0) {
      return NextResponse.json({ error: "Invalid price for selected model/variant" }, { status: 400 });
    }

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
    console.log("[API] Creating generation for user:", userId, "model:", effectiveModelId);
    let generation: any = null;
    let genError: any = null;

    const insertOnce = async () => {
      const r = await supabase
        .from("generations")
        .insert({
          user_id: userId,
          type: "photo",
          model_id: effectiveModelId,
          model_name: baseTitle || modelInfo.name,
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
      console.error("[API] Generation data:", { userId, model: effectiveModelId, prompt: prompt.substring(0, 50) });
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
        description: `Генерация фото: ${(baseTitle || modelInfo.name)}${resolvedVariantId ? ` • ${resolvedVariantId}` : ""}`,
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

    const fixed = (modelInfo as any)?.fixedResolution as string | undefined;
    const q = String(quality || '').toLowerCase();
    const resolutionForKie =
      fixed ||
      (typeof resolution === 'string'
        ? (resolution as any)
        : q === '8k'
          ? '8K'
          : q === '4k'
            ? '4K'
            : q === '2k'
              ? '2K'
              : q === '1k'
                ? '1K'
                : '1K');

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

    let response: any;

    // Check if this is Midjourney model - use special method
    if (effectiveModelId === 'midjourney' || modelInfo.apiId.includes('midjourney')) {
      // Extract MJ-specific params from request body
      const mjParams = body.mjSettings || {};
      
      response = await kieClient.generateMidjourney({
        prompt: prompt,
        version: mjParams.version || '7',
        speed: mjParams.speed || 'fast',
        aspectRatio: aspectRatioMap[aspectRatio] || (String(aspectRatio || "1:1")),
        stylization: mjParams.stylization,
        weirdness: mjParams.weirdness,
        variety: mjParams.variety,
        enableTranslation: mjParams.enableTranslation ?? true,
        imageUrl: imageInputs?.[0], // For i2i mode
      });
    } else {
      // Standard photo generation
      response = await kieClient.generateImage({
        model: modelInfo.apiId,
        prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
        aspectRatio: aspectRatioMap[aspectRatio] || (String(aspectRatio || "1:1") as any),
        resolution: resolutionForKie,
        outputFormat: "png", // Always PNG for photos
        quality,
        imageInputs,
      });
    }

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