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
import { refundCredits } from "@/lib/credits/refund";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { resolveVideoAspectRatio, logVideoAspectRatioResolution } from '@/lib/api/aspect-ratio-utils';
import { VideoGenerationRequestSchema, validateAgainstCapability } from '@/lib/videoModels/schema';
import { getModelCapability } from '@/lib/videoModels/capabilities';
import { z } from 'zod';

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
      threadId: threadIdRaw,
      modelVariant, // For unified models like Kling
      duration,
      mode = 't2v',
      quality,
      resolution,
      audio, // ignored: we always enable sound when model supports it
      soundPreset, // WAN sound presets (string)
      variants = 1,
      aspectRatio: aspectRatioFromBody,
      negativePrompt,
      referenceImage,
      startImage,
      endImage,
      referenceVideo, // For motion control: video with movements to transfer
      videoUrl: v2vVideoUrl, // For WAN v2v: reference video URL
      videoDuration, // Duration of reference video in seconds
      autoTrim = true, // Auto-trim videos > 30s
      keepAudio, // For Kling O1 Edit (FAL): keep original audio
      shots, // For storyboard mode
      characterOrientation, // For motion control: 'image' (max 10s) or 'video' (max 30s)
      // NEW: Extended model capabilities
      style, // Grok Video: 'realistic' | 'fantasy' | 'sci-fi' | 'cinematic' | 'anime' | 'cartoon'
      cameraMotion, // WAN 2.6: 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'orbit' | 'follow'
      stylePreset, // WAN 2.6: 'realistic' | 'anime' | 'cinematic' | 'artistic' | 'vintage' | 'neon'
      motionStrength, // WAN 2.6: 0-100
      qualityTier, // Kling: 'standard' | 'pro' | 'master'
      referenceImages, // Veo 3.1: array of up to 3 reference images
    } = body;
    
    // === NEW: STRICT ZOD + CAPABILITY VALIDATION ===    
    // Get capability config (capabilities now use dashed IDs matching UI)
    const capability = getModelCapability(model);
    
    // NEW: Validate with Zod schema if capability exists
    if (capability) {
      try {
        // Build validation request object
        const validationRequest = {
          modelId: model,
          mode: mode,
          prompt: prompt || '',
          negativePrompt,
          aspectRatio: aspectRatioFromBody || capability.supportedAspectRatios[0],
          durationSec: duration || capability.supportedDurationsSec[0],
          quality: quality || resolution,
          inputImage: referenceImage || startImage,
          referenceImages,
          referenceVideo: referenceVideo || v2vVideoUrl,
          startImage,
          endImage,
          sound: audio,
          soundPreset,
          style,
          cameraMotion,
          stylePreset,
          motionStrength,
          qualityTier,
          variants,
          threadId: threadIdRaw,
        };
        
        // Validate with Zod schema
        const parseResult = VideoGenerationRequestSchema.safeParse(validationRequest);
        if (!parseResult.success) {
          const errors = parseResult.error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          return NextResponse.json(
            {
              error: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: errors,
            },
            { status: 400 }
          );
        }
        
        // Validate against capability constraints
        const capabilityValidation = validateAgainstCapability(parseResult.data, capability);
        if (!capabilityValidation.valid) {
          return NextResponse.json(
            {
              error: 'VALIDATION_ERROR',
              message: 'Request does not match model capabilities',
              details: capabilityValidation.errors,
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('[Video API] Capability validation error:', error);
        // Continue with legacy validation if capability validation fails
      }
    }
    // === END NEW VALIDATION ===
    
    // Normalize aspect ratio: UI may send "auto" which should mean "use model default"
    const normalizedAspectFromBody =
      typeof aspectRatioFromBody === "string" && aspectRatioFromBody.trim() === "auto"
        ? undefined
        : aspectRatioFromBody;

    // Resolve aspect ratio with model-specific default
    const aspectRatio = resolveVideoAspectRatio(normalizedAspectFromBody, model);
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

    // Validate modelVariant (if provided)
    const activeVariant = modelVariant && Array.isArray(modelInfo.modelVariants)
      ? modelInfo.modelVariants.find((v) => v.id === modelVariant) || null
      : null;
    if (modelVariant && Array.isArray(modelInfo.modelVariants) && !activeVariant) {
      return NextResponse.json(
        { error: `Invalid modelVariant '${modelVariant}' for ${modelInfo.id}` },
        { status: 400 }
      );
    }

    // Validate duration/resolution/quality/aspect vs model capabilities (best-effort)
    const allowedDurations =
      typeof modelInfo.fixedDuration === "number"
        ? [String(modelInfo.fixedDuration)]
        : (activeVariant?.durationOptions || modelInfo.durationOptions || []).map((d) => String(d));
    if (duration !== undefined && allowedDurations.length && !allowedDurations.includes(String(duration))) {
      return NextResponse.json(
        { error: `Duration '${duration}' is not supported by ${modelInfo.name}. Supported: ${allowedDurations.join(", ")}` },
        { status: 400 }
      );
    }

    const allowedResolutions = (activeVariant?.resolutionOptions || modelInfo.resolutionOptions || []).map(String);
    if (resolution && allowedResolutions.length && !allowedResolutions.includes(String(resolution))) {
      return NextResponse.json(
        { error: `Resolution '${resolution}' is not supported by ${modelInfo.name}. Supported: ${allowedResolutions.join(", ")}` },
        { status: 400 }
      );
    }

    const allowedQualities = (modelInfo.qualityOptions || []).map(String);
    if (quality && allowedQualities.length && !allowedQualities.includes(String(quality))) {
      return NextResponse.json(
        { error: `Quality '${quality}' is not supported by ${modelInfo.name}. Supported: ${allowedQualities.join(", ")}` },
        { status: 400 }
      );
    }

    const allowedAspects = (activeVariant?.aspectRatios || modelInfo.aspectRatios || []).map(String);
    if (normalizedAspectFromBody && allowedAspects.length && !allowedAspects.includes(String(normalizedAspectFromBody))) {
      return NextResponse.json(
        { error: `Aspect ratio '${normalizedAspectFromBody}' is not supported by ${modelInfo.name}. Supported: ${allowedAspects.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate start/end frames support
    if ((startImage || endImage) && !modelInfo.supportsFirstLastFrame) {
      return NextResponse.json(
        { error: `Model '${modelInfo.name}' does not support start/end frames` },
        { status: 400 }
      );
    }

    // Require start image for i2v/start_end (for models that expose those modes)
    if ((mode === "i2v" || mode === "start_end") && !referenceImage && !startImage) {
      return NextResponse.json(
        { error: "Start image is required for this mode" },
        { status: 400 }
      );
    }

    // Calculate credit cost using pricing system
    const wanSoundPreset = typeof soundPreset === 'string' ? soundPreset.trim() : '';
    const soundEnabled =
      modelInfo.supportsAudio ? (typeof audio === 'boolean' ? audio : true) : false;
    const audioForParams = model === "wan" ? !!wanSoundPreset : soundEnabled;

    // Validate WAN sound preset (if provided)
    if (model === "wan" && wanSoundPreset) {
      const allowedSound = (activeVariant?.soundOptions || []).map(String);
      if (allowedSound.length && !allowedSound.includes(wanSoundPreset)) {
        return NextResponse.json(
          { error: `Invalid soundPreset '${wanSoundPreset}' for WAN. Supported: ${allowedSound.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // === NEW: Validate extended model capabilities ===

    // Validate Grok Video style
    if (model === 'grok-video' && style) {
      const allowedStyles = ['realistic', 'fantasy', 'sci-fi', 'cinematic', 'anime', 'cartoon'];
      if (!allowedStyles.includes(style)) {
        return NextResponse.json(
          { error: `Invalid style '${style}'. Allowed: ${allowedStyles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 camera motion
    if (model === 'wan' && cameraMotion) {
      const allowedMotions = ['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'orbit', 'follow'];
      if (!allowedMotions.includes(cameraMotion)) {
        return NextResponse.json(
          { error: `Invalid cameraMotion '${cameraMotion}'. Allowed: ${allowedMotions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 style preset
    if (model === 'wan' && stylePreset) {
      const allowedPresets = ['realistic', 'anime', 'cinematic', 'artistic', 'vintage', 'neon'];
      if (!allowedPresets.includes(stylePreset)) {
        return NextResponse.json(
          { error: `Invalid stylePreset '${stylePreset}'. Allowed: ${allowedPresets.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 motion strength
    if (model === 'wan' && motionStrength !== undefined) {
      if (typeof motionStrength !== 'number' || motionStrength < 0 || motionStrength > 100) {
        return NextResponse.json(
          { error: `motionStrength must be a number between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Validate Kling quality tier
    if (model === 'kling' && qualityTier) {
      const allowedTiers = ['standard', 'pro', 'master'];
      if (!allowedTiers.includes(qualityTier)) {
        return NextResponse.json(
          { error: `Invalid qualityTier '${qualityTier}'. Allowed: ${allowedTiers.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate Veo 3.1 reference images (max 3)
    if (model === 'veo-3.1' && referenceImages) {
      if (!Array.isArray(referenceImages)) {
        return NextResponse.json(
          { error: 'referenceImages must be an array' },
          { status: 400 }
        );
      }
      if (referenceImages.length > 3) {
        return NextResponse.json(
          { error: 'Veo 3.1 supports maximum 3 reference images' },
          { status: 400 }
        );
      }
    }

    // === END: Extended model capabilities validation ===

    // Special pricing for Motion Control (per-second dynamic pricing)
    let creditCost: number;
    let effectiveDuration: number | undefined;
    
    if (model === 'kling-motion-control') {
      // Motion Control uses dynamic per-second pricing
      const mcResolution = (resolution || '720p') as MotionControlResolution;
      const mcDuration = videoDuration || 0;
      
      // Validate character_orientation (default: 'image')
      // 'image' = use orientation from reference image (max 10s video)
      // 'video' = use orientation from reference video (max 30s video)
      const orientation = characterOrientation || 'image';
      const maxDurationForOrientation = orientation === 'image' ? 10 : 30;
      
      if (mcDuration > maxDurationForOrientation) {
        return NextResponse.json(
          { 
            error: `Для режима "${orientation}" максимальная длительность видео ${maxDurationForOrientation} секунд. Ваше видео: ${mcDuration.toFixed(1)} сек.`,
            maxDuration: maxDurationForOrientation,
            actualDuration: mcDuration,
            orientation,
          },
          { status: 400 }
        );
      }
      
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
        modelId: 'kling-motion-control',
        videoDuration: mcDuration,
        autoTrim,
        effectiveDuration,
        resolution: mcResolution,
        characterOrientation: orientation,
        maxDurationForOrientation,
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
        audio: model === 'wan' ? !!wanSoundPreset : soundEnabled,
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

    // Optional: validate threadId/project and ensure it belongs to user.
    // NOTE: Projects are shared across Photo/Video/Motion/Music, so we do NOT enforce model_id match.
    const threadId = threadIdRaw ? String(threadIdRaw).trim() : "";
    if (threadId) {
      try {
        const { data: thread, error: threadErr } = await supabase
          .from("studio_threads")
          .select("id,user_id")
          .eq("id", threadId)
          .eq("user_id", userId)
          .single();
        if (threadErr || !thread) {
          return NextResponse.json({ error: "Invalid threadId" }, { status: 400 });
        }
      } catch (e) {
        console.error("[API] threadId validation error:", e);
        return NextResponse.json({ error: "Failed to validate threadId" }, { status: 500 });
      }
    }

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
          ? `kling-motion-control_${resolution || '720p'}`
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
          audio: soundEnabled,
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
          aspect_ratio: aspectRatio,
          thread_id: threadId || null,
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
      let mime = match[1];
      const b64 = match[2];
      let buffer: Buffer = Buffer.from(b64, 'base64') as unknown as Buffer;
      
      // Normalize HEIC/HEIF images to JPEG for compatibility (providers rarely accept HEIC URLs).
      if (mime.includes('heic') || mime.includes('heif')) {
        const sharp = (await import('sharp')).default;
        buffer = (await sharp(buffer).jpeg({ quality: 92 }).toBuffer()) as unknown as Buffer;
        mime = 'image/jpeg';
      }
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
    
    // Handle Veo 3.1 reference images (array)
    // Keep as Base64 data URLs - required by Veo API
    let referenceImageBase64s: string[] | undefined;
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      // Limit to 2 images for stability (Veo supports up to 3, but 2 is recommended)
      const maxRefs = 2;
      referenceImageBase64s = referenceImages.slice(0, maxRefs);
      console.log('[API] Veo reference images:', {
        total: referenceImages.length,
        using: referenceImageBase64s.length,
        format: 'base64 data URLs',
        limited: referenceImages.length > maxRefs,
      });
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

    // Handle V2V reference video URL (WAN 2.6)
    if (mode === 'v2v') {
      if (!v2vVideoUrl) {
        return NextResponse.json(
          { error: 'Reference video URL is required for video-to-video mode' },
          { status: 400 }
        );
      }
      // Accept either direct URL or data URL
      videoUrl = await uploadDataUrlToStorage(v2vVideoUrl, 'v2v_ref');
    }

    // Select correct API model ID based on mode and variant
    // If modelVariant is specified (for unified models like Kling), use variant's apiId
    let apiModelId = modelInfo.apiId;
    if (modelVariant && modelInfo.modelVariants) {
      const variant = modelInfo.modelVariants.find(v => v.id === modelVariant);
      if (variant) {
        if (mode === 'v2v' && variant.apiIdV2v) {
          apiModelId = variant.apiIdV2v;
        } else if ((mode === 'i2v' || mode === 'start_end') && variant.apiIdI2v) {
          apiModelId = variant.apiIdI2v;
        } else {
          apiModelId = variant.apiId;
        }
      }
    } else if (mode === 'v2v' && modelInfo.apiIdV2v) {
      apiModelId = modelInfo.apiIdV2v;
    } else if ((mode === 'i2v' || mode === 'start_end') && modelInfo.apiIdI2v) {
      apiModelId = modelInfo.apiIdI2v;
    }

    console.log('[API] 🔍 PROVIDER PAYLOAD AUDIT:', {
      model: model,
      apiModelId: apiModelId,
      provider: modelInfo.provider,
      mode: mode,
      aspectRatio: aspectRatio,
      duration: duration,
      quality: quality || resolution,
      sound: audio,
      // Reference assets
      hasReferenceImage: !!imageUrl,
      hasReferenceImages: !!referenceImageBase64s,
      referenceImagesCount: referenceImageBase64s?.length || 0,
      referenceImagesFormat: referenceImageBase64s ? 'base64 data URLs' : 'none',
      hasStartImage: !!imageUrl && mode === 'start_end',
      hasEndImage: !!lastFrameUrl,
      hasReferenceVideo: !!videoUrl && (mode === 'ref2v' || model === 'kling-motion-control'),
      // Advanced settings
      style: style || 'not set',
      cameraMotion: cameraMotion || 'not set',
      stylePreset: stylePreset || 'not set',
      motionStrength: motionStrength || 'not set',
      // URLs/data (redacted)
      referenceImageSample: referenceImageBase64s?.[0]?.substring(0, 60) || 'none',
      imageUrlSample: imageUrl?.substring(0, 50) || 'none',
      videoUrlSample: videoUrl?.substring(0, 50) || 'none',
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
    
    // === LAOZHANG PROVIDER (Veo 3.1, Sora 2, Nano Banana) ===
    if (modelInfo.provider === 'laozhang') {
      console.log('[API] Using LaoZhang provider for model:', model);
      
      try {
        const { getLaoZhangClient, getLaoZhangVideoModelId } = await import("@/lib/api/laozhang-client");
        const videoClient = getLaoZhangClient();
        
        // Select the right model based on aspect ratio and quality
        const videoModelId = getLaoZhangVideoModelId(model, aspectRatio, quality, duration);
        
        // Prepare image URLs for i2v / start_end modes
        let startImageUrlForVideo: string | undefined;
        let endImageUrlForVideo: string | undefined;
        
        // Handle i2v mode (single reference image)
        if (mode === 'i2v' && imageUrl) {
          startImageUrlForVideo = imageUrl;
          console.log('[API] Video i2v mode with reference image');
        }
        // Handle start_end mode (first + last frame)
        else if (mode === 'start_end') {
          if (imageUrl) startImageUrlForVideo = imageUrl;
          if (lastFrameUrl) endImageUrlForVideo = lastFrameUrl;
          console.log('[API] Video start_end mode:', {
            hasStart: !!startImageUrlForVideo,
            hasEnd: !!endImageUrlForVideo
          });
        }
        
        console.log('[API] Video generation request to LaoZhang:', {
          provider: 'laozhang',
          model: videoModelId,
          originalModel: model,
          aspectRatio,
          quality,
          duration,
          mode,
          hasStartImage: !!startImageUrlForVideo,
          hasEndImage: !!endImageUrlForVideo,
          hasReferenceImages: !!referenceImageBase64s,
          referenceImagesCount: referenceImageBase64s?.length || 0,
          referenceImagesFormat: referenceImageBase64s ? 'base64 data URLs' : 'none',
          prompt: fullPrompt.substring(0, 50),
          userId,
          generationId: generation?.id,
        });
        
        // Generate video (sync - returns URL directly)
        // Supports t2v, i2v (with startImageUrl), start_end (with both images), ref2v (with referenceImages)
        const videoGenResponse = await videoClient.generateVideo({
          model: videoModelId,
          prompt: fullPrompt,
          startImageUrl: startImageUrlForVideo,
          endImageUrl: endImageUrlForVideo,
          referenceImages: referenceImageBase64s, // Pass reference images as Base64 data URLs
        });
        
        // Upload video to Supabase Storage for permanent storage
        console.log('[API] Video generation successful from LaoZhang');
        console.log('[API] Video URL from provider:', videoGenResponse.videoUrl);
        console.log('[API] Downloading video for storage upload...');
        
        // Download video and upload to our storage
        const videoResponse = await fetch(videoGenResponse.videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.status}`);
        }
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const fileName = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
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
        
        const finalVideoUrl = uploadError ? videoGenResponse.videoUrl : publicUrlData.publicUrl;
        
        console.log('[API] Video storage upload:', {
          success: !uploadError,
          storagePath: uploadError ? 'failed' : storagePath,
          finalUrl: finalVideoUrl.substring(0, 100),
          fallbackToProviderUrl: !!uploadError,
        });
        
        // Update generation record with success
        console.log('[API] Updating generation record:', {
          generationId: generation?.id,
          status: 'success',
          resultUrl: finalVideoUrl.substring(0, 100),
        });
        
        const { error: updateError } = await supabase
          .from('generations')
          .update({
            status: 'success',
            result_urls: [finalVideoUrl],
            updated_at: new Date().toISOString(),
          })
          .eq('id', generation?.id);
        
        if (updateError) {
          console.error('[API] ❌ CRITICAL: Failed to update generation to success:', {
            generationId: generation?.id,
            error: updateError,
            errorCode: updateError.code,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
          });
          // Don't fail the request - video was generated successfully
          // But log prominently so we can debug RLS/permissions
        } else {
          console.log('[API] ✅ Generation record updated successfully:', generation?.id);
        }
        
        // Log generation run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'video',
            provider_model: videoModelId,
            variant_key: `${quality || 'default'}_${aspectRatio || '16:9'}`,
            stars_charged: creditCost,
            status: 'success',
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Return completed status (no polling needed)
        return NextResponse.json({
          success: true,
          jobId: generation?.id,
          status: 'completed',
          generationId: generation?.id,
          provider: 'video',
          kind: 'video',
          creditCost: creditCost,
          resultUrl: finalVideoUrl,
          videoUrl: finalVideoUrl,
          results: [{ url: finalVideoUrl }],
        });
      } catch (videoError: any) {
        console.error('[API] Video generation failed:', videoError);
        
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
            error: videoError.message || 'Video generation error',
          })
          .eq('id', generation?.id);
        
        return NextResponse.json(
          { error: videoError.message || 'Failed to generate video' },
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
            start_image_url: startImageUrl,
            end_image_url: endImageUrl || undefined,
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
          if (!v2vVideoUrl) {
            return NextResponse.json(
              { error: 'Video URL is required for Kling O1 Edit' },
              { status: 400 }
            );
          }
          
          // Upload video/images if they are data URLs
          let videoUrl = v2vVideoUrl;
          let imageUrls = startImage ? [startImage] : undefined;
          
          if (v2vVideoUrl.startsWith('data:')) {
            videoUrl = await uploadDataUrlToStorage(v2vVideoUrl, 'video');
          }
          
          if (startImage && startImage.startsWith('data:')) {
            const uploadedImage = await uploadDataUrlToStorage(startImage, 'ref');
            imageUrls = [uploadedImage];
          }
          
          const falResponse = await falClient.submitKlingO1Job({
            prompt: fullPrompt,
            video_url: videoUrl,
            image_urls: imageUrls,
            keep_audio: typeof keepAudio === "boolean" ? keepAudio : true,
          });
          
          response = {
            id: falResponse.request_id,
            status: 'queued',
            estimatedTime: 120,
          };
        }
      } catch (error: any) {
        console.error('[API] FAL.ai error:', error);

        // Refund credits for failed generation
        if (generation?.id && !skipCredits) {
          console.log(`[API] Refunding ${creditCost}⭐ for failed FAL.ai generation ${generation.id}`);
          await refundCredits(
            supabase,
            userId,
            generation.id,
            creditCost,
            'fal_api_error',
            { error: error?.message || String(error), model: model }
          );

          // Update generation status to failed
          await supabase
            .from('generations')
            .update({ status: 'failed', error_message: error?.message || String(error) })
            .eq('id', generation.id);
        }

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
          sound: model === 'wan' ? (wanSoundPreset || false) : (model === 'kling-motion-control' ? false : soundEnabled),
          mode: model === 'kling-motion-control' ? 'motion_control' : mode,
          resolution: resolution,
          quality: quality,
          shots: shots, // For storyboard mode
          characterOrientation: model === 'kling-motion-control' ? (characterOrientation || 'image') : undefined,
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