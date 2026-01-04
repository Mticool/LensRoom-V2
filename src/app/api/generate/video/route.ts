import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient } from '@/lib/api/kie-client';
import { getFalClient } from '@/lib/api/fal-client';
import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { preparePromptForVeo, getSafePrompt } from '@/lib/prompt-moderation';
import { requireAuth } from "@/lib/auth/requireRole";
import { getCreditBalance, deductCredits } from "@/lib/credits/split-credits";

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

    // Check auth and get user role
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
          { error: 'Unauthorized. Please log in to generate videos.' },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: 'User account not found. Please contact support.' },
          { status: 404 }
        );
      }
    }
    
    // Use admin client for DB operations
    const supabase = getSupabaseAdmin();

    // Skip credit check for managers/admins
    if (!skipCredits) {
      // Get user credits (split: subscription + package)
      const creditBalance = await getCreditBalance(supabase, userId);

      // Check if enough credits
      if (creditBalance.totalBalance < creditCost) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits', 
            required: creditCost, 
            available: creditBalance.totalBalance,
            subscriptionStars: creditBalance.subscriptionStars,
            packageStars: creditBalance.packageStars,
            message: `Нужно ${creditCost} ⭐, у вас ${creditBalance.totalBalance} ⭐ (${creditBalance.subscriptionStars} подписка + ${creditBalance.packageStars} пакет)`
          },
          { status: 402 }
        );
      }

      // Deduct credits (subscription first, then package)
      const deductResult = await deductCredits(supabase, userId, creditCost);
      
      // 🔍 AUDIT LOG: Star deduction (dev-only)
      if (process.env.NODE_ENV === 'development' || process.env.AUDIT_STARS === 'true') {
        console.log('[⭐ AUDIT] Video generation:', JSON.stringify({
          userId,
          modelId: model,
          modelVariant: modelVariant || 'default',
          mode,
          duration: duration || modelInfo.fixedDuration || 5,
          quality: quality || 'default',
          resolution: resolution || 'default',
          audio: !!modelInfo.supportsAudio,
          priceStars: creditCost,
          deductedFromSubscription: deductResult.deductedFromSubscription,
          deductedFromPackage: deductResult.deductedFromPackage,
          balanceBefore: creditBalance.totalBalance,
          balanceAfter: deductResult.totalBalance,
          timestamp: new Date().toISOString(),
        }));
      }
      
      if (!deductResult.success) {
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        );
      }
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

    // Record credit transaction (only for regular users, not managers/admins)
    if (!skipCredits) {
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

    if ((mode === 'i2v' || mode === 'ref') && referenceImage) {
      imageUrl = await uploadDataUrlToStorage(referenceImage, 'i2v');
    } else if (mode === 'start_end') {
      if (startImage) imageUrl = await uploadDataUrlToStorage(startImage, 'start');
      if (endImage) lastFrameUrl = await uploadDataUrlToStorage(endImage, 'end');
    } else if (startImage) {
      // Fallback: use startImage as reference for i2v modes
      imageUrl = await uploadDataUrlToStorage(startImage, 'ref');
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

    // Подготовка промпта (модерация и очистка для всех моделей)
    let finalPrompt = prompt;
    let promptWarning: string | undefined;
    
    // Применяем модерацию для ВСЕХ моделей (KIE API отклоняет насильственный контент)
    const moderationResult = preparePromptForVeo(prompt, {
      strict: false,
      autoFix: true, // Автоматически исправлять проблемные слова
    });
    
    if (moderationResult.needsModeration) {
      promptWarning = moderationResult.warning;
      // Используем очищенную версию
      finalPrompt = moderationResult.cleaned || getSafePrompt(prompt);
      console.log('[API] Prompt moderated:', {
        model: model,
        original: prompt.substring(0, 100),
        cleaned: finalPrompt.substring(0, 100),
      });
    }
    
    const fullPrompt = negativePrompt 
      ? `${finalPrompt}. Avoid: ${negativePrompt}` 
      : finalPrompt;

    // Попытка генерации с обработкой ошибок политики контента
    let response: any;
    let usedFallback = false;
    
    // === FAL.ai PROVIDER (Kling O1) ===
    if (modelInfo.provider === 'fal') {
      try {
        const falClient = getFalClient();
        
        // Kling O1 Image-to-Video (First/Last Frame)
        if (model === 'kling-o1') {
          if (!startImage) {
            return NextResponse.json(
              { error: 'Start image is required for Kling O1' },
              { status: 400 }
            );
          }
          
          const falResponse = await falClient.submitKlingO1ImageToVideo({
            prompt: fullPrompt,
            start_image_url: startImage,
            end_image_url: endImage || undefined, // Optional last frame
            duration: String(duration || 5) as '5' | '10',
          });
          
          response = {
            id: falResponse.request_id,
            status: 'queued',
            estimatedTime: duration === 10 ? 180 : 120,
          };
        }
        // Kling O1 Video-to-Video Edit
        else if (model === 'kling-o1-edit') {
          if (!referenceImage) { // referenceImage используется как video_url
            return NextResponse.json(
              { error: 'Video URL is required for Kling O1 Edit' },
              { status: 400 }
            );
          }
          
          const falResponse = await falClient.submitKlingO1Job({
            prompt: fullPrompt,
            video_url: referenceImage,
            image_urls: startImage ? [startImage] : undefined,
          });
          
          response = {
            id: falResponse.request_id,
            status: 'queued',
            estimatedTime: 120,
          };
        }
      } catch (error: any) {
        console.error('[API] FAL.ai error:', error);
        throw error;
      }
    }
    // === KIE.ai PROVIDER ===
    else {
      try {
        response = await kieClient.generateVideo({
          model: apiModelId,
          provider: modelInfo.provider,
          prompt: fullPrompt,
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
      } catch (error: any) {
      // Обработка ошибки политики контента Google Veo
      const errorMessage = error?.message || String(error);
      const isContentPolicyError = 
        errorMessage.includes('content policy') ||
        errorMessage.includes('violating content policies') ||
        errorMessage.includes('Rejected by Google');
      
      if (isContentPolicyError && modelInfo.provider === 'kie_veo') {
        console.warn('[API] Veo content policy error, trying fallback model:', errorMessage);
        
        // Fallback на Kling 2.6 (более лояльная модерация)
        const fallbackModel = VIDEO_MODELS.find(m => 
          m.id === 'kling' && m.supportsI2v === (mode === 'i2v')
        );
        
        if (fallbackModel) {
          try {
            const fallbackVariant = fallbackModel.modelVariants?.[0] || null;
            const fallbackApiId = (mode === 'i2v' && fallbackVariant?.apiIdI2v) 
              ? fallbackVariant.apiIdI2v 
              : fallbackVariant?.apiId || fallbackModel.apiId;
            
            console.log('[API] Using fallback model:', fallbackModel.name, fallbackApiId);
            
            response = await kieClient.generateVideo({
              model: fallbackApiId,
              provider: 'kie_market',
              prompt: fullPrompt,
              imageUrl: imageUrl,
              duration: duration || 5,
              aspectRatio: aspectRatio,
              sound: false,
              mode: mode,
            });
            
            usedFallback = true;
            
            // Обновить запись в БД с информацией о fallback
            if (generation?.id) {
              await supabase
                .from('generations')
                .update({ 
                  model_name: `${modelInfo.name} → ${fallbackModel.name} (fallback)`,
                  metadata: { 
                    original_model: model,
                    fallback_reason: 'content_policy',
                    fallback_model: fallbackModel.id,
                  }
                })
                .eq('id', generation.id);
            }
          } catch (fallbackError) {
            // Если fallback тоже не сработал, возвращаем ошибку
            console.error('[API] Fallback model also failed:', fallbackError);
            return NextResponse.json(
              { 
                error: 'Промпт был заблокирован политикой контента. Пожалуйста, переформулируйте запрос, избегая насилия, взрослого контента и других запрещённых тем.',
                errorCode: 'CONTENT_POLICY_VIOLATION',
                suggestion: 'Попробуйте описать сцену более нейтрально, без упоминания насилия, оружия или взрослого контента.',
              },
              { status: 400 }
            );
          }
        } else {
          // Нет доступного fallback
          return NextResponse.json(
            { 
              error: 'Промпт был заблокирован политикой контента. Пожалуйста, переформулируйте запрос.',
              errorCode: 'CONTENT_POLICY_VIOLATION',
              suggestion: 'Попробуйте описать сцену более нейтрально, избегая запрещённых тем.',
            },
            { status: 400 }
          );
        }
      } else {
        // Другая ошибка - пробрасываем дальше
        throw error;
      }
    }
    } // Close else block for KIE provider

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
      provider: usedFallback ? 'kie_market' : modelInfo.provider,
      kind: "video",
      warning: promptWarning,
      usedFallback: usedFallback,
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
