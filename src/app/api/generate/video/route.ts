import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient } from '@/lib/api/kie-client';
import { getFalClient } from '@/lib/api/fal-client';
import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { 
  calcMotionControlStars, 
  validateMotionControlDuration, 
  MOTION_CONTROL_CONFIG,
  type MotionControlResolution 
} from '@/lib/pricing/motionControl';
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { preparePromptForVeo, getSafePrompt } from '@/lib/prompt-moderation';
import { requireAuth } from "@/lib/auth/requireRole";
import { getCreditBalance, deductCredits } from "@/lib/credits/split-credits";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { resolveVideoAspectRatio, logVideoAspectRatioResolution } from '@/lib/api/aspect-ratio-utils';

// Увеличиваем лимит размера тела запроса до 50MB для больших изображений
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`gen:video:${clientIP}`, RATE_LIMITS.generation);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

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
      aspectRatio: aspectRatioFromBody,
      negativePrompt,
      referenceImage,
      startImage,
      endImage,
      referenceVideo, // For motion control: video with movements to transfer
      videoDuration, // Duration of reference video in seconds
      autoTrim = true, // Auto-trim videos > 30s
      shots, // For storyboard mode
    } = body;
    
    // Resolve aspect ratio with model-specific default
    const aspectRatio = resolveVideoAspectRatio(aspectRatioFromBody, model);
    logVideoAspectRatioResolution(aspectRatioFromBody, aspectRatio, model, 'Video');

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
    
    // Special pricing for Motion Control (per-second dynamic pricing)
    let creditCost: number;
    let effectiveDuration: number | undefined;
    
    if (model === 'kling-motion-control') {
      // Motion Control uses dynamic per-second pricing
      const mcResolution = (resolution || '720p') as MotionControlResolution;
      const mcDuration = videoDuration || 0;
      
      // Validate duration
      const validation = validateMotionControlDuration(mcDuration, autoTrim);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid video duration for Motion Control' },
          { status: 400 }
        );
      }
      
      effectiveDuration = validation.effectiveDuration ?? mcDuration;
      
      const mcPrice = calcMotionControlStars(effectiveDuration as number, mcResolution, true);
      if (mcPrice === null) {
        return NextResponse.json(
          { error: 'Invalid parameters for Motion Control pricing' },
          { status: 400 }
        );
      }
      
      creditCost = mcPrice;
      
      console.log('[API] Motion Control pricing:', {
        modelId: 'kling26_motion_control',
        videoDuration: mcDuration,
        autoTrim,
        effectiveDuration,
        resolution: mcResolution,
        priceStars: creditCost,
        rate: mcResolution === '720p' ? MOTION_CONTROL_CONFIG.RATE_720P : MOTION_CONTROL_CONFIG.RATE_1080P,
      });
    } else {
      // Standard pricing for other models
      const price = computePrice(model, {
        mode,
        duration: duration || modelInfo.fixedDuration || 5,
        videoQuality: quality,
        resolution: resolution || undefined, // For WAN per-second pricing
        audio: alwaysSound,
        modelVariant: modelVariant || undefined,
        variants,
      });
      creditCost = price.stars;
    }

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
        const durationSec = model === 'kling-motion-control' 
          ? effectiveDuration 
          : (duration || modelInfo.fixedDuration || 5);
        const variantKey = model === 'kling-motion-control' 
          ? `kling26_motion_control_${resolution || '720p'}`
          : model === 'kling-o1' 
            ? `kling_o1_${durationSec}s` 
            : (modelVariant || 'default');
        
        console.log('[⭐ AUDIT] Video generation:', JSON.stringify({
          userId,
          modelId: model,
          variantKey,
          provider: modelInfo.provider,
          mode,
          durationSec,
          // Motion Control specific
          ...(model === 'kling-motion-control' && {
            videoDuration,
            autoTrim,
            effectiveDuration,
          }),
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
    let videoUrl: string | undefined; // For motion control reference video
    
    const uploadDataUrlToStorage = async (dataUrl: string, suffix: string) => {
      // data:image/png;base64,xxxx OR data:video/mp4;base64,xxxx
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!match) return dataUrl; // already a URL
      const mime = match[1];
      const b64 = match[2];
      const buffer = Buffer.from(b64, 'base64');
      // Determine extension based on mime type
      let ext = 'bin';
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('jpg') || mime.includes('jpeg')) ext = 'jpg';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('mov') || mime.includes('quicktime')) ext = 'mov';
      else if (mime.includes('webm')) ext = 'webm';
      
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
    
    // Handle motion control reference video
    if (model === 'kling-motion-control') {
      // Character image (required)
      if (referenceImage) {
        imageUrl = await uploadDataUrlToStorage(referenceImage, 'character');
      } else if (startImage) {
        imageUrl = await uploadDataUrlToStorage(startImage, 'character');
      }
      // Reference video with movements (required)
      if (referenceVideo) {
        videoUrl = await uploadDataUrlToStorage(referenceVideo, 'motion_ref');
      }
      
      console.log('[API] Motion Control inputs:', {
        hasCharacterImage: !!imageUrl,
        hasReferenceVideo: !!videoUrl,
        resolution: resolution,
      });
      
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Character image is required for Motion Control' },
          { status: 400 }
        );
      }
      if (!videoUrl) {
        return NextResponse.json(
          { error: 'Reference video is required for Motion Control' },
          { status: 400 }
        );
      }
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
    
    // === LAOZHANG PROVIDER (Veo 3.1, Sora 2) ===
    if (modelInfo.provider === 'laozhang') {
      console.log('[API] Using LaoZhang provider for video model:', model);
      
      try {
        const { getLaoZhangClient, getLaoZhangVideoModelId } = await import("@/lib/api/laozhang-client");
        const laozhangClient = getLaoZhangClient();
        
        // Select the right LaoZhang model based on aspect ratio and quality
        const laozhangModelId = getLaoZhangVideoModelId(model, aspectRatio, quality);
        
        // Prepare image URLs for i2v / start_end modes
        let startImageUrlForLaoZhang: string | undefined;
        let endImageUrlForLaoZhang: string | undefined;
        
        // Handle i2v mode (single reference image)
        if (mode === 'i2v' && imageUrl) {
          startImageUrlForLaoZhang = imageUrl;
          console.log('[API] LaoZhang i2v mode with reference image');
        }
        // Handle start_end mode (first + last frame)
        else if (mode === 'start_end') {
          if (imageUrl) startImageUrlForLaoZhang = imageUrl;
          if (lastFrameUrl) endImageUrlForLaoZhang = lastFrameUrl;
          console.log('[API] LaoZhang start_end mode:', {
            hasStart: !!startImageUrlForLaoZhang,
            hasEnd: !!endImageUrlForLaoZhang
          });
        }
        
        console.log('[API] LaoZhang video request:', {
          model: laozhangModelId,
          originalModel: model,
          aspectRatio,
          quality,
          mode,
          hasStartImage: !!startImageUrlForLaoZhang,
          hasEndImage: !!endImageUrlForLaoZhang,
          prompt: fullPrompt.substring(0, 50),
        });
        
        // Generate video (sync - returns URL directly)
        // Supports t2v, i2v (with startImageUrl), start_end (with both images)
        const laozhangResponse = await laozhangClient.generateVideo({
          model: laozhangModelId,
          prompt: fullPrompt,
          startImageUrl: startImageUrlForLaoZhang,
          endImageUrl: endImageUrlForLaoZhang,
        });
        
        // Upload video to Supabase Storage for permanent storage
        console.log('[API] LaoZhang video URL:', laozhangResponse.videoUrl);
        
        // Download video and upload to our storage
        const videoResponse = await fetch(laozhangResponse.videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const fileName = `laozhang_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
        const storagePath = `${userId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('generations')
          .upload(storagePath, videoBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });
        
        if (uploadError) {
          console.error('[API] Failed to upload video to storage:', uploadError);
          // Use original URL as fallback
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('generations')
          .getPublicUrl(storagePath);
        
        const finalVideoUrl = uploadError ? laozhangResponse.videoUrl : publicUrlData.publicUrl;
        
        // Update generation record with success
        await supabase
          .from('generations')
          .update({
            status: 'success',
            result_urls: [finalVideoUrl],
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation?.id);
        
        // Log generation run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'laozhang',
            provider_model: laozhangModelId,
            variant_key: `${quality || 'default'}_${aspectRatio || '16:9'}`,
            stars_charged: creditCost,
            status: 'success',
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return completed status (no polling needed for LaoZhang)
        return NextResponse.json({
          success: true,
          jobId: generation?.id,
          status: 'completed',
          generationId: generation?.id,
          provider: 'laozhang',
          kind: 'video',
          creditCost: creditCost,
          results: [{ url: finalVideoUrl }],
        });
      } catch (laozhangError: any) {
        console.error('[API] LaoZhang video generation failed:', laozhangError);
        
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
            error: laozhangError.message || 'LaoZhang API error',
          })
          .eq('id', generation?.id);
        
        return NextResponse.json(
          { error: laozhangError.message || 'Failed to generate video' },
          { status: 500 }
        );
      }
    }

    // === FAL.ai PROVIDER (Kling O1) ===
    if (modelInfo.provider === 'fal') {
      console.log('[API] Using FAL.ai provider for model:', model);
      try {
        console.log('[API] FAL_KEY exists:', !!process.env.FAL_KEY);
        const falClient = getFalClient();
        console.log('[API] FAL client created successfully');
        
        // Kling O1 Image-to-Video (First/Last Frame)
        if (model === 'kling-o1') {
          console.log('[API] Kling O1 request, startImage:', !!startImage, 'endImage:', !!endImage);
          
          if (!startImage) {
            console.log('[API] ERROR: startImage is missing');
            return NextResponse.json(
              { error: 'Start image is required for Kling O1' },
              { status: 400 }
            );
          }
          
          // Upload images to storage (FAL requires HTTP URLs, not data URLs)
          let startImageUrl = startImage;
          let endImageUrl = endImage;
          
          // Check if startImage is a data URL and upload it
          if (startImage.startsWith('data:')) {
            console.log('[API] Uploading start image for Kling O1...');
            try {
              startImageUrl = await uploadDataUrlToStorage(startImage, 'start');
              console.log('[API] Start image uploaded:', startImageUrl);
            } catch (uploadErr) {
              console.error('[API] Failed to upload start image:', uploadErr);
              throw uploadErr;
            }
          }
          
          // Check if endImage is a data URL and upload it
          if (endImage && endImage.startsWith('data:')) {
            console.log('[API] Uploading end image for Kling O1...');
            try {
              endImageUrl = await uploadDataUrlToStorage(endImage, 'end');
              console.log('[API] End image uploaded:', endImageUrl);
            } catch (uploadErr) {
              console.error('[API] Failed to upload end image:', uploadErr);
              throw uploadErr;
            }
          }
          
          const durationSec = duration || 5;
          const variantKey = `kling_o1_${durationSec}s`;
          
          console.log('[API] Calling FAL API with:', {
            variantKey,
            provider: 'fal',
            prompt: fullPrompt.substring(0, 50),
            startImageUrl: startImageUrl?.substring(0, 50),
            endImageUrl: endImageUrl?.substring(0, 50),
            durationSec,
            priceStars: creditCost,
          });
          
          const falResponse = await falClient.submitKlingO1ImageToVideo({
            prompt: fullPrompt,
            image_url: startImageUrl,
            duration: String(durationSec) as '5' | '10',
            aspect_ratio: aspectRatio as '16:9' | '9:16' | '1:1' || '16:9',
          });
          
          console.log('[API] FAL response:', falResponse);
          
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
          
          // Upload video/images if they are data URLs
          let videoUrl = referenceImage;
          let imageUrls = startImage ? [startImage] : undefined;
          
          if (referenceImage.startsWith('data:')) {
            videoUrl = await uploadDataUrlToStorage(referenceImage, 'video');
          }
          
          if (startImage && startImage.startsWith('data:')) {
            const uploadedImage = await uploadDataUrlToStorage(startImage, 'ref');
            imageUrls = [uploadedImage];
          }
          
          const falResponse = await falClient.submitKlingO1Job({
            prompt: fullPrompt,
            video_url: videoUrl,
            image_urls: imageUrls,
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
          videoUrl: videoUrl, // For motion control
          duration: duration || modelInfo.fixedDuration || 5,
          aspectRatio: aspectRatio,
          sound: alwaysSound,
          mode: model === 'kling-motion-control' ? 'motion_control' : mode,
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