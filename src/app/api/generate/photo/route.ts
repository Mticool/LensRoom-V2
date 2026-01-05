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
import { requireAuth } from "@/lib/auth/requireRole";
import { getCreditBalance, deductCredits } from "@/lib/credits/split-credits";
import {
  isNanoBananaPro,
  calculateNBPCost,
  incrementQuotaUsage,
  recordGenerationRun,
  refundStars,
  NBP_MODEL_KEY,
} from "@/lib/quota/nano-banana-pro";

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
        : legacyQuality || undefined;
    const resolution =
      resolvedParams?.resolution && resolvedParams.resolution !== "default"
        ? String(resolvedParams.resolution)
        : legacyResolution || quality || undefined;

    // If variant payload was used, enforce stars from variant registry (server-side).
    // Otherwise fall back to computePrice for legacy payload.
    const priceOptions: any = { variants };
    if (quality) priceOptions.quality = quality;
    if (resolution) priceOptions.resolution = resolution;
    
    const computedPrice = computePrice(effectiveModelId, priceOptions);
    const creditCost = resolvedVariantStars !== null ? resolvedVariantStars : computedPrice.stars;
    
    if (!Number.isFinite(creditCost) || creditCost <= 0) {
      console.error('[API] Price computation failed:', {
        modelId: effectiveModelId,
        quality,
        resolution,
        variants,
        computedPrice,
        resolvedVariantStars,
      });
      return NextResponse.json({ 
        error: "Invalid price for selected model/variant",
        details: `Model: ${effectiveModelId}, Quality: ${quality || 'default'}, Resolution: ${resolution || 'default'}`,
      }, { status: 400 });
    }

    // Check Telegram auth and get user role
    let userId: string;
    let userRole: "user" | "manager" | "admin" = "user";
    let skipCredits = false;

    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
      userRole = auth.role;
      // Managers and admins don't pay credits when generating content for gallery
      skipCredits = userRole === "manager" || userRole === "admin";
    } catch (error) {
      // Fallback to old auth method
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json(
          { error: "Unauthorized. Please log in to generate images." },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: "User account not found. Please contact support." },
          { status: 404 }
        );
      }
    }
    
    // Check credits using admin client
    const supabase = getSupabaseAdmin();

    // === NANO BANANA PRO QUOTA LOGIC ===
    // For NBP, determine actual cost based on plan entitlements
    let actualCreditCost = creditCost;
    let isIncludedByPlan = false;
    let nbpVariantKey: string | null = null;
    let nbpPlanId: string | null = null;
    
    if (!skipCredits && isNanoBananaPro(effectiveModelId)) {
      const nbpCost = await calculateNBPCost(supabase, userId, quality);
      actualCreditCost = nbpCost.stars;
      isIncludedByPlan = nbpCost.isIncluded;
      nbpVariantKey = nbpCost.variantKey;
      nbpPlanId = nbpCost.planId;
      
      console.log('[API] NBP quota check:', {
        userId,
        variantKey: nbpVariantKey,
        planId: nbpPlanId,
        usedThisMonth: nbpCost.usedThisMonth,
        isIncluded: isIncludedByPlan,
        actualCost: actualCreditCost,
        originalCost: creditCost,
      });
    }

    // Skip credit check for managers/admins
    if (!skipCredits) {
      // Get user credits (split: subscription + package)
      const creditBalance = await getCreditBalance(supabase, userId);

      // Check if enough credits (only if not included by plan)
      if (!isIncludedByPlan && creditBalance.totalBalance < actualCreditCost) {
        return NextResponse.json(
          { 
            error: "Insufficient credits", 
            required: actualCreditCost, 
            available: creditBalance.totalBalance,
            subscriptionStars: creditBalance.subscriptionStars,
            packageStars: creditBalance.packageStars,
            message: `Нужно ${actualCreditCost} ⭐, у вас ${creditBalance.totalBalance} ⭐ (${creditBalance.subscriptionStars} подписка + ${creditBalance.packageStars} пакет)`
          },
          { status: 402 } // Payment Required
        );
      }

      // Deduct credits (only if not included by plan)
      // Priority: subscription stars first (use before they expire), then package stars
      if (!isIncludedByPlan && actualCreditCost > 0) {
        const deductResult = await deductCredits(supabase, userId, actualCreditCost);
        
        // 🔍 AUDIT LOG: Star deduction (dev-only)
        if (process.env.NODE_ENV === 'development' || process.env.AUDIT_STARS === 'true') {
          console.log('[⭐ AUDIT] Photo generation:', JSON.stringify({
            userId,
            modelId: effectiveModelId,
            variantId: resolvedVariantId || 'default',
            quality: quality || 'default',
            resolution: resolution || 'default',
            priceStars: actualCreditCost,
            deductedFromSubscription: deductResult.deductedFromSubscription,
            deductedFromPackage: deductResult.deductedFromPackage,
            balanceBefore: creditBalance.totalBalance,
            balanceAfter: deductResult.totalBalance,
            timestamp: new Date().toISOString(),
          }));
        }
        
        if (!deductResult.success) {
          return NextResponse.json(
            { error: "Failed to deduct credits" },
            { status: 500 }
          );
        }
      }
      
      // Increment quota usage for NBP included generations
      if (isIncludedByPlan && nbpVariantKey) {
        try {
          await incrementQuotaUsage(supabase, userId, NBP_MODEL_KEY, nbpVariantKey);
        } catch (e) {
          console.error('[API] Failed to increment quota usage:', e);
        }
      }
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

    // Record credit transaction (only for regular users, not managers/admins, and only if charged)
    if (!skipCredits && !isIncludedByPlan && actualCreditCost > 0) {
      try {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -actualCreditCost, // Negative for deduction
          type: 'deduction',
          description: `Генерация фото: ${(baseTitle || modelInfo.name)}${resolvedVariantId ? ` • ${resolvedVariantId}` : ""}${nbpVariantKey ? ` (${nbpVariantKey})` : ""}`,
          generation_id: generation?.id,
        });
      } catch (e) {
        console.error('[API] Failed to record transaction:', e);
      }
    }
    
    // Record generation run for analytics (always, even if 0 stars charged)
    if (!skipCredits && isNanoBananaPro(effectiveModelId)) {
      await recordGenerationRun(supabase, {
        generationId: generation?.id,
        userId,
        provider: modelInfo.provider,
        providerModel: modelInfo.apiId,
        variantKey: nbpVariantKey || '1k_2k',
        starsCharged: actualCreditCost,
        includedByPlan: isIncludedByPlan,
        status: 'pending',
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
    const r = String(resolution || '').toLowerCase();
    
    // Map quality/resolution to KIE API format
    // Nano Banana Pro uses: 1K, 2K, 4K
    let resolutionForKie: string;
    if (fixed) {
      resolutionForKie = fixed;
    } else if (r === '1k_2k' || q === '1k_2k') {
      // Nano Banana Pro: 1k_2k -> 2K (default to higher quality in this tier)
      resolutionForKie = '2K';
    } else if (r === '4k' || q === '4k') {
      resolutionForKie = '4K';
    } else if (r === '8k' || q === '8k') {
      resolutionForKie = '8K';
    } else if (r === '2k' || q === '2k') {
      resolutionForKie = '2K';
    } else if (r === '1k' || q === '1k') {
      resolutionForKie = '1K';
    } else if (typeof resolution === 'string' && resolution && !resolution.includes('_')) {
      // Other explicit resolution values (uppercase them)
      resolutionForKie = resolution.toUpperCase();
    } else {
      // Default fallback
      resolutionForKie = '1K';
    }

    let response: any;
    
    // Handle OpenAI provider (GPT Image)
    if (modelInfo.provider === 'openai') {
      const { getOpenAIClient, getOpenAIProviderCost, aspectRatioToOpenAISize } = await import("@/lib/api/openai-client");
      
      // Get quality from variant params or request quality parameter
      // Variants pass quality as resolvedParams.quality (e.g., "medium", "high")
      let openaiQuality: 'medium' | 'high' = 'medium';
      if (resolvedParams?.quality) {
        openaiQuality = resolvedParams.quality === 'high' ? 'high' : 'medium';
      } else if (quality) {
        openaiQuality = quality === 'high' ? 'high' : 'medium';
      }
      
      // Get size from aspect ratio (user selection)
      const openaiSize = aspectRatioToOpenAISize(aspectRatio || '1:1');
      
      try {
        const openaiClient = getOpenAIClient();
        
        // Prepare request parameters
        // Note: gpt-image-1 does NOT support response_format
        const openaiRequest: any = {
          model: modelInfo.apiId,
          prompt: prompt,
          n: 1,
          quality: openaiQuality,
          size: openaiSize,
        };
        
        console.log('[API] OpenAI request:', { model: openaiRequest.model, quality: openaiRequest.quality, size: openaiRequest.size, aspectRatio });
        
        const openaiResponse = await openaiClient.generateImage(openaiRequest);
        
        // Log full response structure for debugging
        console.log('[API] OpenAI response structure:', JSON.stringify({
          hasData: !!openaiResponse.data,
          dataLength: openaiResponse.data?.length,
          firstItem: openaiResponse.data?.[0] ? {
            hasUrl: !!openaiResponse.data[0].url,
            hasB64: !!openaiResponse.data[0].b64_json,
            urlPreview: openaiResponse.data[0].url?.substring(0, 100),
          } : null
        }));
        
        // Extract image - check both URL and base64
        let imageUrl = openaiResponse.data[0]?.url;
        const b64Json = openaiResponse.data[0]?.b64_json;
        
        // If we got base64, upload to Supabase storage
        if (!imageUrl && b64Json) {
          console.log('[API] OpenAI returned base64, uploading to storage...');
          const imageBuffer = Buffer.from(b64Json, 'base64');
          const fileName = `openai_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          const storagePath = `${userId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('generations')
            .upload(storagePath, imageBuffer, {
              contentType: 'image/png',
              upsert: true
            });
          
          if (uploadError) {
            console.error('[API] Failed to upload base64 image:', uploadError);
            throw new Error(`Failed to save generated image: ${uploadError.message}`);
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('generations')
            .getPublicUrl(storagePath);
          
          imageUrl = publicUrlData.publicUrl;
          console.log('[API] Uploaded base64 image to:', imageUrl);
        }
        
        if (!imageUrl) {
          console.error('[API] OpenAI response has no image:', JSON.stringify(openaiResponse));
          throw new Error('No image URL in OpenAI response');
        }
        
        // Update generation record with success
        await supabase
          .from('generations')
          .update({
            status: 'success',
            result_urls: [imageUrl],
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation?.id);
        
        // Log provider cost for analytics
        const providerCostUsd = getOpenAIProviderCost(openaiQuality, openaiSize);
        const { getUsdRubRate } = await import('@/config/exchange-rates');
        const usdRubRate = getUsdRubRate();
        const providerCostRub = providerCostUsd * usdRubRate;
        
        // Log generation run for unit economics
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'openai',
            provider_model: modelInfo.apiId,
            variant_key: `${openaiQuality}_${openaiSize}`,
            stars_charged: creditCost,
            status: 'success',
            provider_cost_usd: providerCostUsd,
            provider_cost_rub: providerCostRub,
            usd_rub_rate_at_time: usdRubRate,
            rub_per_star_at_time: providerCostRub / creditCost,
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return in same format as KIE but with completed status
        // so that StudioRuntime knows no polling is needed
        return NextResponse.json({
          success: true,
          jobId: generation?.id, // Use generation ID as jobId
          status: 'completed', // Mark as completed immediately
          generationId: generation?.id,
          provider: 'openai',
          kind: 'image',
          creditCost: creditCost,
          // Include results directly so polling can be skipped
          results: [{ url: imageUrl }],
        });
      } catch (openaiError: any) {
        console.error('[API] OpenAI generation failed:', openaiError);
        
        // Refund credits on error
        await supabase.rpc('adjust_credits', {
          p_user_id: userId,
          p_amount: creditCost,
        });
        
        // Update generation status
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: openaiError.message || 'OpenAI API error',
          })
          .eq('id', generation?.id);
        
        // Log failed run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'openai',
            provider_model: modelInfo.apiId,
            variant_key: `${openaiQuality}_${openaiSize}`,
            stars_charged: 0, // Refunded
            status: 'refunded',
          });
        } catch (logError) {
          console.error('[API] Failed to log failed run:', logError);
        }
        
        return NextResponse.json(
          { error: openaiError.message || 'Failed to generate image' },
          { status: 500 }
        );
      }
    }

    // Handle KIE providers
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
      const generateParams: any = {
        model: modelInfo.apiId,
        prompt: negativePrompt ? `${prompt}. Avoid: ${negativePrompt}` : prompt,
        aspectRatio: aspectRatioMap[aspectRatio] || (String(aspectRatio || "1:1") as any),
        resolution: resolutionForKie,
        outputFormat: "png", // Always PNG for photos
      };
      
      // Add quality only if it's a valid quality option (not resolution-based)
      // For Nano Banana Pro, quality is '1k_2k' or '4k', which we map to resolution
      // So we don't pass quality separately for models that use resolution
      if (quality && !['1k_2k', '4k', '1k', '2k', '8k'].includes(quality.toLowerCase())) {
        generateParams.quality = quality;
      }
      
      if (imageInputs && imageInputs.length > 0) {
        generateParams.imageInputs = imageInputs;
      }
      
      console.log('[API] Generating image with params:', {
        model: generateParams.model,
        resolution: generateParams.resolution,
        quality: generateParams.quality,
        aspectRatio: generateParams.aspectRatio,
      });
      
      try {
        response = await kieClient.generateImage(generateParams);
      } catch (kieError: any) {
        console.error('[API] KIE generateImage error:', {
          message: kieError?.message,
          code: kieError?.code,
          errorCode: kieError?.errorCode,
        });
        throw kieError;
      }
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