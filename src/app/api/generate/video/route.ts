/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient, pickKieKeySlot } from '@/lib/api/kie-client';
import { getFalClient } from '@/lib/api/fal-client';
import { getModelById, VIDEO_MODELS, type VideoModelConfig } from '@/config/models';
import { getSkuFromRequest, calculateTotalStars, PRICING_VERSION, type PricingOptions } from "@/lib/pricing/pricing";
import { integrationNotConfigured } from "@/lib/http/integration-error";
import { 
  type MotionControlResolution 
} from '@/lib/pricing/pricing';
import { calcMotionControlCredits, validateMotionControlSeconds, type MotionCharacterOrientation } from '@/lib/videoModels/motion-control';
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { preparePromptForVeo, getSafePrompt } from '@/lib/prompt-moderation';
import { requireAuth } from "@/lib/auth/requireRole";
import { getCreditBalance, deductCredits } from "@/lib/credits/split-credits";
import { refundCredits } from "@/lib/credits/refund";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';
import { resolveVideoAspectRatio, logVideoAspectRatioResolution } from '@/lib/api/aspect-ratio-utils';
import { VideoGenerationRequestSchema, validateAgainstCapability } from '@/lib/videoModels/schema';
import { getModelCapability } from '@/lib/videoModels/capabilities';
import { validateCapabilityDataUrl } from '@/lib/videoModels/file-validation';
import { buildKieVideoPayload } from '@/lib/providers/kie/video';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/api/fetch-with-timeout';
import { CircuitOpenError } from "@/lib/server/circuit-breaker";
import { env } from '@/lib/env';
import { isRetryableLaoZhangSubmissionError } from '@/lib/api/upstream-retry';
import { getMediaDurationFromDataUrl, getMediaDurationFromUrl } from '@/lib/media/ffprobe-duration';

// Увеличиваем лимит размера тела запроса до 50MB для больших изображений
// Настройка в next.config.ts: experimental.middlewareClientMaxBodySize = '50mb'
// Note: Veo/LaoZhang video generation can take >60s; keep this high enough to avoid platform-level 504s.
export const maxDuration = 300; // seconds
export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type KlingO3MultiPromptElement = {
  prompt: string;
  duration: number;
};

function normalizeKlingO3MultiPrompt(
  raw: unknown,
  fallbackDurationSec: number
): KlingO3MultiPromptElement[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const normalized = raw
    .map((item): KlingO3MultiPromptElement | null => {
      if (typeof item === 'string') {
        const prompt = item.trim();
        if (!prompt) return null;
        return {
          prompt,
          duration: Math.max(1, Math.min(15, fallbackDurationSec)),
        };
      }
      if (!item || typeof item !== 'object') return null;

      const prompt = String((item as any).prompt || '').trim();
      if (!prompt) return null;

      const parsedDuration = Number((item as any).duration);
      const duration = Number.isFinite(parsedDuration)
        ? Math.max(1, Math.min(15, Math.round(parsedDuration)))
        : Math.max(1, Math.min(15, fallbackDurationSec));

      return { prompt, duration };
    })
    .filter((entry): entry is KlingO3MultiPromptElement => entry !== null)
    .slice(0, 4);

  return normalized.length > 0 ? normalized : undefined;
}

async function updateGenerationWithRetry(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  id: string | number | undefined,
  data: Record<string, unknown>,
  label: string
) {
  if (!id) return;
  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error } = await supabase.from('generations').update(data).eq('id', id);
    if (!error) return;
    lastError = error;
    console.error(`[API] ${label} update attempt ${attempt} failed:`, error);
    await new Promise((r) => setTimeout(r, 250 * attempt));
  }

  if (lastError) {
    console.error(`[API] ${label} update failed after retries:`, lastError);
  }
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableLaoZhangSubmissionError(error);
      if (!shouldRetry || attempt >= maxAttempts) throw error;
      const backoffMs = Math.min(1200 * attempt, 3500);
      console.warn(`[API] ${label} transient error on attempt ${attempt}/${maxAttempts}, retrying in ${backoffMs}ms`, {
        message: error instanceof Error ? error.message : String(error),
      });
      await sleep(backoffMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

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
      motionSeconds, // Motion video duration from client metadata
      keepAudio, // For Kling O1 Edit (FAL): keep original audio
      shots, // For storyboard mode
      characterOrientation, // For motion control: 'image' (max 10s) or 'video' (max 30s)
      // NEW: Extended model capabilities
      style, // Grok Video: 'normal' | 'fun' | 'spicy'
      cameraMotion, // WAN 2.6: 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'orbit' | 'follow'
      stylePreset, // WAN 2.6: 'realistic' | 'anime' | 'cinematic' | 'artistic' | 'vintage' | 'neon'
      motionStrength, // WAN 2.6: 0-100
      qualityTier, // Kling: 'standard' | 'pro' | 'master'
      referenceImages, // Veo 3.1: array of up to 3 reference images
      multiPrompt, // Kling O3: multishot prompts (camelCase)
      multi_prompt: multiPromptSnake, // Kling O3: multishot prompts (snake_case)
      shotType, // Kling O3: single | customize (camelCase)
      shot_type: shotTypeSnake, // Kling O3: single | customize (snake_case)
      generateAudio, // Kling O3: audio toggle (camelCase)
      generate_audio: generateAudioSnake, // Kling O3: audio toggle (snake_case)
      cfgScale, // Kling: 0-20
      cameraControl, // Motion Control: JSON
      // Extend mode
      sourceGenerationId, // ID записи generation для продления
      taskId, // Прямой taskId для extend (если фронт шлёт напрямую)
    } = body;

    const normalizedMultiPromptRaw = multiPrompt ?? multiPromptSnake;
    const normalizedMultiPrompt = normalizeKlingO3MultiPrompt(
      normalizedMultiPromptRaw,
      Math.max(1, Math.min(15, Number(duration || 5)))
    );
    const normalizedShotTypeRaw = String((shotType ?? shotTypeSnake ?? "")).trim().toLowerCase();
    const normalizedShotType =
      normalizedShotTypeRaw === "customize" ? "customize" : normalizedShotTypeRaw === "single" ? "single" : undefined;
    const normalizedGenerateAudio =
      typeof generateAudio === "boolean"
        ? generateAudio
        : typeof generateAudioSnake === "boolean"
          ? generateAudioSnake
          : undefined;
    
    // === NEW: STRICT ZOD + CAPABILITY VALIDATION ===
    // Get capability config (capabilities now use dashed IDs matching UI)
    const capability = getModelCapability(model);

    // Normalize mode from UI format to schema format
    const normalizeMode = (m: string | undefined): string => {
      if (!m) return 't2v';
      const modeMap: Record<string, string> = {
        'text_to_video': 't2v',
        'image_to_video': 'i2v',
        'text-to-video': 't2v',
        'image-to-video': 'i2v',
        'reference-to-video': 'i2v',
        'start-end': 'start_end',
        'video_to_video': 'v2v',
        'extend': 'extend',
      };
      return modeMap[m] || m;
    };
    const normalizedMode = normalizeMode(mode);

    // NEW: Validate with Zod schema if capability exists
    // Skip strict validation for Veo - use legacy path which is more flexible
    const skipStrictValidation = model === 'veo-3.1-fast' || model === 'veo-3.1';
    if (capability && !skipStrictValidation) {
      try {
        const modeKey = normalizedMode;
        const modeAspectRatios = capability.modeAspectRatios?.[modeKey] || capability.supportedAspectRatios;
        const modeDurations = capability.modeDurationsSec?.[modeKey] || capability.supportedDurationsSec;
        // Build validation request object
        const validationRequest = {
          modelId: model,
          mode: normalizedMode,
          prompt: prompt || '',
          negativePrompt,
          aspectRatio: aspectRatioFromBody || modeAspectRatios[0],
          durationSec: duration || modeDurations[0],
          quality: quality,
          resolution: resolution,
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
          cfgScale,
          cameraControl,
          generateAudio: normalizedGenerateAudio,
          multiPrompt: normalizedMultiPrompt,
          shotType: normalizedShotType,
          characterOrientation,
          variants,
          threadId: threadIdRaw,
        };
        
        // Validate with Zod schema
        console.log('[Video API] Validation request:', JSON.stringify(validationRequest, null, 2));
        const parseResult = VideoGenerationRequestSchema.safeParse(validationRequest);
        if (!parseResult.success) {
          const errors = parseResult.error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          console.log('[Video API] Zod validation failed:', JSON.stringify(errors, null, 2));
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
    const rawAspect = typeof aspectRatioFromBody === "string" ? aspectRatioFromBody.trim() : aspectRatioFromBody;
    const useSourceAspect = rawAspect === "source";
    const normalizedAspectFromBody =
      typeof rawAspect === "string" && (rawAspect === "auto" || rawAspect === "source")
        ? undefined
        : rawAspect;

    // Resolve aspect ratio with model-specific default
    const aspectRatio = useSourceAspect ? undefined : resolveVideoAspectRatio(normalizedAspectFromBody, model);
    if (!useSourceAspect) {
      logVideoAspectRatioResolution(aspectRatioFromBody, aspectRatio as string, model, 'Video');
    }

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

    if (model === 'kling-o3-standard' && !env.isKlingO3StandardEnabled()) {
      return NextResponse.json(
        { error: 'Model is disabled by feature flag' },
        { status: 403 }
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
    // Veo 3.1 can use referenceImages array instead of single image
    const hasReferenceInput = referenceImage || startImage || (referenceImages && referenceImages.length > 0);
    if ((mode === "i2v" || mode === "start_end") && !hasReferenceInput) {
      return NextResponse.json(
        { error: "Start image is required for this mode" },
        { status: 400 }
      );
    }

    // Calculate credit cost using pricing system
    const wanSoundPreset = typeof soundPreset === 'string' ? soundPreset.trim() : '';
    const soundEnabled =
      modelInfo.supportsAudio ? (typeof audio === 'boolean' ? audio : true) : false;
    // Validate WAN sound preset (if provided)
    if (model === "wan-2.6" && wanSoundPreset) {
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
      const allowedStyles = ['normal', 'fun', 'spicy'];
      if (!allowedStyles.includes(style)) {
        return NextResponse.json(
          { error: `Invalid style '${style}'. Allowed: ${allowedStyles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 camera motion
    if (model === 'wan-2.6' && cameraMotion) {
      const allowedMotions = ['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'orbit', 'follow'];
      if (!allowedMotions.includes(cameraMotion)) {
        return NextResponse.json(
          { error: `Invalid cameraMotion '${cameraMotion}'. Allowed: ${allowedMotions.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 style preset
    if (model === 'wan-2.6' && stylePreset) {
      const allowedPresets = ['realistic', 'anime', 'cinematic', 'artistic', 'vintage', 'neon'];
      if (!allowedPresets.includes(stylePreset)) {
        return NextResponse.json(
          { error: `Invalid stylePreset '${stylePreset}'. Allowed: ${allowedPresets.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate WAN 2.6 motion strength
    if (model === 'wan-2.6' && motionStrength !== undefined) {
      if (typeof motionStrength !== 'number' || motionStrength < 0 || motionStrength > 100) {
        return NextResponse.json(
          { error: `motionStrength must be a number between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Validate Kling quality tier
    if (model === 'kling-2.1' && qualityTier) {
      const allowedTiers = ['standard', 'pro', 'master'];
      if (!allowedTiers.includes(qualityTier)) {
        return NextResponse.json(
          { error: `Invalid qualityTier '${qualityTier}'. Allowed: ${allowedTiers.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate cfgScale (Kling models)
    if (cfgScale !== undefined) {
      if (typeof cfgScale !== 'number' || cfgScale < 0 || cfgScale > 20) {
        return NextResponse.json(
          { error: 'cfgScale must be a number between 0 and 20' },
          { status: 400 }
        );
      }
    }

    // Validate Veo 3.1 reference images (max 3)
    const isVeo31 = model === 'veo-3.1' || model === 'veo-3.1-fast';
    if (isVeo31 && referenceImages) {
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

    // Validate Kling O3 Standard specifics
    if (model === 'kling-o3-standard') {
      const allowedModes = new Set(['t2v', 'i2v', 'start_end', 'v2v']);
      if (!allowedModes.has(normalizedMode)) {
        return NextResponse.json(
          { error: 'Kling O3 Standard supports only t2v, i2v, start_end, v2v modes' },
          { status: 400 }
        );
      }
      const allowedDurations = new Set([3, 5, 8, 10, 12, 15]);
      const requestedDuration = Number(duration || 5);
      if (!allowedDurations.has(requestedDuration)) {
        return NextResponse.json(
          { error: `Duration '${duration}' is not supported by Kling O3 Standard. Supported: 3, 5, 8, 10, 12, 15` },
          { status: 400 }
        );
      }
      if ((normalizedMode === 'i2v' || normalizedMode === 'start_end') && !referenceImage && !startImage) {
        return NextResponse.json(
          { error: 'referenceImage or startImage is required for Kling O3 Standard i2v/start_end mode' },
          { status: 400 }
        );
      }
      if (normalizedMode === 'v2v' && !v2vVideoUrl) {
        return NextResponse.json(
          { error: 'videoUrl is required for Kling O3 Standard v2v mode' },
          { status: 400 }
        );
      }
      if (normalizedShotType && !['single', 'customize'].includes(normalizedShotType)) {
        return NextResponse.json(
          { error: `Invalid shotType '${normalizedShotType}'. Allowed: single, customize` },
          { status: 400 }
        );
      }
      if (normalizedMultiPrompt && normalizedMultiPrompt.length > 0) {
        if (normalizedMultiPrompt.length > 4) {
          return NextResponse.json(
            { error: 'Kling O3 Standard supports maximum 4 multishot prompts' },
            { status: 400 }
          );
        }
        if (normalizedMultiPrompt.some((entry) => entry.prompt.length === 0)) {
          return NextResponse.json(
            { error: 'multiPrompt cannot contain empty entries' },
            { status: 400 }
          );
        }
        if (normalizedMultiPrompt.some((entry) => !Number.isFinite(entry.duration) || entry.duration <= 0 || entry.duration > 15)) {
          return NextResponse.json(
            { error: 'Each multiPrompt shot must include duration in range 1..15 seconds' },
            { status: 400 }
          );
        }
      }
      if (normalizedShotType === 'customize' && (!normalizedMultiPrompt || normalizedMultiPrompt.length === 0)) {
        return NextResponse.json(
          { error: 'multiPrompt is required when shotType=customize' },
          { status: 400 }
        );
      }
    }

    // === END: Extended model capabilities validation ===

    // === NEW PRICING SYSTEM (2026-01-27) ===
    let creditCost: number;
    let effectiveDuration: number | undefined;
    let sku: string;
    let motionSecondsServer: number | null = null;
    
    if (model === 'kling-motion-control') {
      const mcResolutionRaw = String(resolution || '720p').toLowerCase();
      if (mcResolutionRaw !== '720p' && mcResolutionRaw !== '1080p') {
        return NextResponse.json(
          { error: "Motion Control mode must be '720p' or '1080p'" },
          { status: 400 }
        );
      }
      const mcResolution = mcResolutionRaw as MotionControlResolution;
      const orientationRaw = String(characterOrientation || 'image').toLowerCase();
      if (orientationRaw !== 'image' && orientationRaw !== 'video') {
        return NextResponse.json(
          { error: "characterOrientation must be 'image' or 'video'" },
          { status: 400 }
        );
      }
      const orientation = orientationRaw as MotionCharacterOrientation;
      let rawMotionSeconds = Number(motionSeconds ?? videoDuration ?? 0);
      try {
        if (typeof referenceVideo === 'string' && referenceVideo.trim()) {
          const source = referenceVideo.trim();
          if (source.startsWith('data:')) {
            rawMotionSeconds = await getMediaDurationFromDataUrl(source);
          } else if (/^https?:\/\//i.test(source)) {
            rawMotionSeconds = await getMediaDurationFromUrl(source);
          }
        }
      } catch (durationErr) {
        console.warn('[API] Motion Control duration extraction failed, using fallback seconds:', {
          fallback: rawMotionSeconds,
          error: durationErr instanceof Error ? durationErr.message : String(durationErr),
        });
      }
      motionSecondsServer = rawMotionSeconds;
      const timeValidation = validateMotionControlSeconds(rawMotionSeconds, orientation);
      if (!timeValidation.valid) {
        return NextResponse.json(
          { error: timeValidation.message || 'Invalid motion video duration' },
          { status: 400 }
        );
      }
      const billing = calcMotionControlCredits(rawMotionSeconds, mcResolution, orientation);
      effectiveDuration = billing.billableSeconds;

      try {
        const pricingOptions: PricingOptions = {
          videoQuality: mcResolution,
          duration: effectiveDuration,
          isMotionControl: true,
        };
        sku = getSkuFromRequest('kling-motion-control', pricingOptions);
        creditCost = calculateTotalStars(sku, effectiveDuration);
      } catch (error) {
        console.error('[API] Motion Control pricing error:', error);
        return NextResponse.json(
          { error: 'Invalid parameters for Motion Control pricing' },
          { status: 400 }
        );
      }
      
      console.log('[API] Motion Control pricing (NEW):', {
        modelId: 'kling-motion-control',
        motionSeconds: motionSecondsServer,
        billableSeconds: billing.billableSeconds,
        resolution: mcResolution,
        characterOrientation: orientation,
        creditsPerSecond: billing.creditsPerSecond,
        sku,
        estimatedStars: creditCost,
        pricingVersion: PRICING_VERSION,
      });
    } else {
      // Standard video pricing using new SKU-based system
      try {
        const requiredInputsForMode = capability?.requiredInputsByMode?.[normalizedMode]?.required || [];
        const acceptsResolution = requiredInputsForMode.includes('resolution');
        const supportsQuality = Array.isArray(capability?.supportedQualities) && capability.supportedQualities.length > 0;

        const pricingOptions: PricingOptions = {
          mode: mode as any,
          duration: duration || modelInfo.fixedDuration || 5,
          videoQuality: supportsQuality ? quality : undefined,
          resolution: acceptsResolution ? (resolution || undefined) : undefined,
          audio: model === 'wan-2.6' ? !!wanSoundPreset : (normalizedGenerateAudio ?? soundEnabled),
          modelVariant: modelVariant || undefined,
          qualityTier: qualityTier as any,
        };
        
        sku = getSkuFromRequest(model, pricingOptions);
        creditCost = calculateTotalStars(sku, pricingOptions.duration);
        
        // For variants > 1, multiply the price
        if (variants && variants > 1) {
          creditCost = creditCost * variants;
        }
      } catch (error) {
        console.error('[API] Video pricing error:', {
          model,
          duration,
          quality,
          resolution,
          modelVariant,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          { 
            error: 'Pricing error: No price defined for this model/variant combination',
            details: `Model: ${model}, Duration: ${duration || 'default'}, Quality: ${quality || resolution || 'default'}`,
            modelId: model,
          },
          { status: 500 }
        );
      }
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
    } catch {
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

    const generationIdForAudit = crypto.randomUUID();
    const isDeferredMotionBilling = false;
    const shouldChargeUpfront = true;
    const creditsUsedOnCreate = shouldChargeUpfront ? creditCost : 0;

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

      console.log('[⭐ AUDIT_PRECHARGE]', JSON.stringify({
        model,
        mode,
        duration: model === 'kling-motion-control' ? effectiveDuration : (duration || modelInfo.fixedDuration || null),
        quality: quality || null,
        resolution: resolution || null,
        calculatedStars: creditCost,
        userId,
        generationId: generationIdForAudit,
      }));

      if (shouldChargeUpfront) {
        // Deduct credits (subscription first, then package)
        const deductResult = await deductCredits(supabase, userId, creditCost);
        if (!deductResult.success) {
          return NextResponse.json(
            { error: 'Failed to deduct credits' },
            { status: 500 }
          );
        }
      } else {
        console.log('[⭐ AUDIT_DEFERRED_BILLING]', JSON.stringify({
          userId,
          modelId: model,
          estimatedStars: creditCost,
          willChargeOnSuccess: true,
          timestamp: new Date().toISOString(),
        }));
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

    const omittedCols = new Set<string>();
    const extractMissingColumn = (message: string): string | null => {
      const m = String(message || "").match(/Could not find the '([^']+)' column/i);
      return m ? m[1] : null;
    };

    const insertOnce = async (opts?: { includeMetadata?: boolean }) => {
      const includeMetadata = opts?.includeMetadata !== false && !omittedCols.has("metadata");
      const pool = String(process.env.KIE_API_KEY_VIDEO_POOL || "").trim();
      const poolSize = pool ? pool.split(/[\s,]+/).filter(Boolean).length : 0;
      const kieSlot = pickKieKeySlot("video", poolSize);
      const r = await supabase
        .from("generations")
        .insert({
          id: generationIdForAudit,
          user_id: userId,
          type: "video",
          model_id: model,
          model_name: modelInfo.name,
          prompt: prompt,
          ...(omittedCols.has("negative_prompt") ? {} : { negative_prompt: negativePrompt }),
          ...(omittedCols.has("aspect_ratio") ? {} : { aspect_ratio: aspectRatio }),
          ...(omittedCols.has("thread_id") ? {} : { thread_id: threadId || null }),
          credits_used: creditsUsedOnCreate,
          ...(omittedCols.has("charged_stars") ? {} : { charged_stars: creditsUsedOnCreate }),
          ...(omittedCols.has("sku") ? {} : { sku }),
          ...(omittedCols.has("pricing_version") ? {} : { pricing_version: PRICING_VERSION }),
          status: "queued",
          ...(includeMetadata && (modelInfo.provider === "kie_market" || modelInfo.provider === "kie_veo")
            ? { metadata: {
                kie_key_scope: "video", 
                ...(kieSlot != null ? { kie_key_slot: kieSlot } : {}),
                ...(model === 'kling-motion-control'
                  ? {
                      motion_seconds: Number(motionSecondsServer ?? motionSeconds ?? videoDuration ?? effectiveDuration ?? 0),
                      motion_orientation: characterOrientation || 'image',
                      motion_mode: resolution || '720p',
                      estimated_credits: creditCost,
                    }
                  : {}),
              } }
            : {}),
        })
        .select()
        .single();
      generation = r.data;
      genError = r.error;
    };

    let includeMetadata = true;
    for (let attempt = 1; attempt <= 6; attempt++) {
      await insertOnce({ includeMetadata });
      if (!genError) break;

      const code = genError?.code ? String(genError.code) : "";
      const msg = genError?.message ? String(genError.message) : String(genError);

      if (code === "PGRST204") {
        const missing = extractMissingColumn(msg);
        if (missing && !omittedCols.has(missing)) {
          omittedCols.add(missing);
          continue;
        }
        if (/metadata/i.test(msg) && !omittedCols.has("metadata")) {
          omittedCols.add("metadata");
          continue;
        }
      }

      if (code === "23503" || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          continue;
        } catch (e) {
          console.error("[API] Retry after ensureProfileExists failed:", e);
        }
      }

      break;
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

    // ===== EXTEND MODE (Veo 3.1 продление видео) =====
    if (mode === 'extend') {
      console.log('[API] Extend mode: начало обработки');
      
      // Валидация: модель должна поддерживать extend
      if (model !== 'veo-3.1-fast') {
        return NextResponse.json(
          { error: 'Extend mode is only supported for veo-3.1-fast model' },
          { status: 400 }
        );
      }
      
      // Валидация: наличие sourceGenerationId или taskId
      if (!sourceGenerationId && !taskId) {
        return NextResponse.json(
          { error: 'sourceGenerationId or taskId is required for extend mode' },
          { status: 400 }
        );
      }
      
      // Загрузка исходной generation
      let sourceTaskId: string;
      if (sourceGenerationId) {
        const { data: sourceGen, error: sourceGenError } = await supabase
          .from('generations')
          .select('task_id, status')
          .eq('id', sourceGenerationId)
          .single();
        
        if (sourceGenError || !sourceGen) {
          console.error('[API] Failed to load source generation:', sourceGenError);
          return NextResponse.json(
            { error: 'Source generation not found' },
            { status: 404 }
          );
        }
        
        if (!sourceGen.task_id) {
          return NextResponse.json(
            { 
              error: 'This video cannot be extended (missing task_id). Only videos generated via Veo 3.1 (KIE) can be extended.',
              hint: 'Try generating a new video with Veo 3.1 Fast first'
            },
            { status: 400 }
          );
        }
        
        sourceTaskId = sourceGen.task_id;
        console.log('[API] Extend: source task_id:', sourceTaskId);
      } else {
        sourceTaskId = taskId!;
        console.log('[API] Extend: using provided taskId:', sourceTaskId);
      }
      
      // Вызов KIE veoExtend
      try {
        const slotFromMeta =
          (generation as any)?.metadata && typeof (generation as any).metadata === "object"
            ? Number((generation as any).metadata.kie_key_slot)
            : NaN;
        const slot = Number.isFinite(slotFromMeta) ? slotFromMeta : null;
        const kieClient = getKieClient({ scope: "video", slot });
        
        // Подготовка callback URL (опционально)
        const callbackSecret = process.env.VEO_WEBHOOK_SECRET || process.env.KIE_CALLBACK_SECRET;
        const callbackBase = process.env.KIE_CALLBACK_URL || process.env.NEXT_PUBLIC_BASE_URL;
        let callBackUrl: string | undefined;
        if (callbackBase && callbackSecret) {
          callBackUrl = `${callbackBase}/api/webhooks/veo?secret=${encodeURIComponent(callbackSecret)}`;
        }
        
        console.log('[API] Calling veoExtend:', {
          sourceTaskId,
          prompt: prompt.substring(0, 50),
          hasCallback: !!callBackUrl,
        });
        
        const extendResponse = await kieClient.veoExtend({
          taskId: sourceTaskId,
          prompt: prompt,
          callBackUrl,
        });
        
        const newTaskId = extendResponse.data?.taskId;
        if (!newTaskId) {
          throw new Error('KIE extend response missing taskId');
        }
        
        console.log('[API] Extend successful, new taskId:', newTaskId);
        
        // Обновить generation с новым task_id
        await updateGenerationWithRetry(
          supabase,
          generation?.id,
          {
            task_id: newTaskId,
            status: 'generating',
            metadata: {
              ...(generation?.metadata || {}),
              kie_key_scope: "video",
              extend_from: sourceTaskId,
              extend_source_generation_id: sourceGenerationId,
              provider_task_id: newTaskId,
            },
          },
          'extend_task_id'
        );
        
        // Логирование generation run
        try {
          await supabase.from('generation_runs').insert({
            generation_id: generation?.id,
            user_id: userId,
            provider: 'video',
            provider_model: 'veo-3.1-fast-extend',
            variant_key: 'extend',
            stars_charged: creditCost,
            status: 'queued',
          });
        } catch (logError) {
          console.error('[API] Failed to log generation run:', logError);
        }
        
        // Возврат jobId для polling
        return NextResponse.json({
          success: true,
          jobId: newTaskId,
          status: 'queued',
          estimatedTime: 180, // Veo extend takes similar time as generation
          creditCost: creditCost,
          generationId: generation?.id,
          kind: 'video',
          mode: 'extend',
        });
      } catch (extendError: any) {
        console.error('[API] Veo extend error:', extendError);
        
        // Refund credits
        if (!skipCredits && shouldChargeUpfront) {
          await refundCredits(
            supabase,
            userId,
            generation?.id,
            creditCost,
            'extend_error',
            { error: extendError?.message || String(extendError) }
          );
        }
        
        // Update generation status
        await supabase
          .from('generations')
          .update({ 
            status: 'failed',
            error_message: extendError?.message || String(extendError),
          })
          .eq('id', generation?.id);
        
        return NextResponse.json(
          { 
            error: 'Failed to extend video',
            details: extendError?.message || String(extendError),
          },
          { status: 500 }
        );
      }
    }
    // ===== END EXTEND MODE =====

    // Record credit transaction (only for regular users, not managers/admins)
    if (!skipCredits && shouldChargeUpfront) {
      try {
        const { error: txError } = await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -creditCost,
          type: 'deduction',
          sku: sku, // Track SKU in transaction
          pricing_version: PRICING_VERSION, // Track pricing version
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

    // Basic file validation for data URLs (best-effort)
    const dataUrlErrors: string[] = [];
    const fileChecks: Array<[string | undefined, string]> = [
      [referenceImage, 'inputImage'],
      [startImage, 'startImage'],
      [endImage, 'endImage'],
      [referenceVideo, 'referenceVideo'],
      [v2vVideoUrl, 'referenceVideo'],
    ];
    fileChecks.forEach(([val, key]) => {
      if (val) {
        const err = validateCapabilityDataUrl(val, key, capability);
        if (err) dataUrlErrors.push(err);
      }
    });
    if (dataUrlErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid input file', details: dataUrlErrors },
        { status: 400 }
      );
    }
    
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
      // Inputs can be private. Return a signed URL so providers can fetch it.
      try {
        const { data: signed, error: signErr } = await supabase.storage
          .from("generations")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (!signErr && signed?.signedUrl) return signed.signedUrl;
      } catch {
        // ignore
      }
      const { data: pub } = supabase.storage.from("generations").getPublicUrl(path);
      return pub.publicUrl;
    };

    if (mode === 'i2v') {
      if (referenceImage) {
        imageUrl = await uploadDataUrlToStorage(referenceImage, 'i2v');
      } else if (startImage) {
        imageUrl = await uploadDataUrlToStorage(startImage, 'ref');
      }
      // Kling 2.5: optional tail image in i2v
      if (endImage && model === 'kling-2.5') {
        lastFrameUrl = await uploadDataUrlToStorage(endImage, 'tail');
      }
    } else if (mode === 'start_end') {
      if (startImage) imageUrl = await uploadDataUrlToStorage(startImage, 'start');
      if (endImage) lastFrameUrl = await uploadDataUrlToStorage(endImage, 'end');
    } else if (startImage) {
      // Fallback: use startImage as reference for i2v modes
      imageUrl = await uploadDataUrlToStorage(startImage, 'ref');
    }
    
    // Handle Veo 3.1 reference images (array)
    // Upload to storage for logging/other use; for LaoZhang pass base64 when available (API works better, no URL fetch)
    let referenceImageUrls: string[] | undefined;
    let referenceImagesForLaoZhang: string[] | undefined; // base64 when from body, else URLs
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      const validReferenceImages = referenceImages.filter(img => img && typeof img === 'string' && img.trim() !== '');
      if (validReferenceImages.length > 0) {
        const maxRefs = 3;
        const imagesToUpload = validReferenceImages.slice(0, maxRefs);
        referenceImageUrls = [];
        const allDataUrls = imagesToUpload.every((img) => img.startsWith('data:'));
        for (let i = 0; i < imagesToUpload.length; i++) {
          const img = imagesToUpload[i];
          if (img.startsWith('data:')) {
            const uploadedUrl = await uploadDataUrlToStorage(img, `veo_ref_${i}`);
            referenceImageUrls.push(uploadedUrl);
          } else if (img.trim() !== '') {
            referenceImageUrls.push(img);
          }
        }
        referenceImagesForLaoZhang = allDataUrls ? imagesToUpload : referenceImageUrls;
        console.log('[API] Veo reference images:', {
          total: referenceImages.length,
          using: referenceImageUrls.length,
          formatForLaoZhang: allDataUrls ? 'base64' : 'HTTP URLs',
        });
      }
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
        characterOrientation: characterOrientation || 'image',
        motionSecondsClient: Number(motionSeconds ?? videoDuration ?? 0) || null,
        imageUrlSample: imageUrl?.substring(0, 64) || null,
        videoUrlSample: videoUrl?.substring(0, 64) || null,
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

      // Verify uploaded URLs are accessible before sending to KIE
      for (const [label, url] of [['character image', imageUrl], ['motion video', videoUrl]] as const) {
        if (url) {
          try {
            const headRes = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            if (!headRes.ok) {
              console.error(`[API] Motion Control ${label} URL not accessible:`, { url: url.substring(0, 80), status: headRes.status });
              return NextResponse.json(
                { error: `Не удалось проверить загруженный файл (${label}). Попробуйте загрузить заново.`, errorCode: 'FILE_NOT_ACCESSIBLE' },
                { status: 400 }
              );
            }
          } catch (e) {
            console.warn(`[API] Motion Control ${label} URL HEAD check failed (non-fatal):`, e);
          }
        }
      }
    }

    // Handle Kling O3 Edit (now via KIE Market)
    if (model === 'kling-o1-edit') {
      // Video for editing (required) — comes via v2vVideoUrl or referenceVideo
      if (v2vVideoUrl) {
        videoUrl = await uploadDataUrlToStorage(v2vVideoUrl, 'kling_o3_edit');
      } else if (referenceVideo) {
        videoUrl = await uploadDataUrlToStorage(referenceVideo, 'kling_o3_edit');
      }
      // Optional reference image
      if (startImage) {
        imageUrl = await uploadDataUrlToStorage(startImage, 'kling_o3_edit_ref');
      } else if (referenceImage) {
        imageUrl = await uploadDataUrlToStorage(referenceImage, 'kling_o3_edit_ref');
      }
      if (!videoUrl) {
        return NextResponse.json(
          { error: 'Video URL is required for Kling O3 Edit' },
          { status: 400 }
        );
      }
      console.log('[API] Kling O3 Edit inputs:', {
        hasVideoUrl: !!videoUrl,
        hasImageUrl: !!imageUrl,
        duration,
      });
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

    // Kling 2.1: map quality tier to specific API model IDs
    if (model === 'kling-2.1') {
      const tier = (qualityTier || 'standard').toLowerCase();
      if (tier === 'standard' || tier === 'pro' || tier === 'master') {
        apiModelId =
          mode === 'i2v'
            ? `kling/v2-1-${tier}-image-to-video`
            : `kling/v2-1-${tier}-text-to-video`;
      }
    }

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
      resolution: resolution,
      sound: audio,
      // Reference assets
      hasReferenceImage: !!imageUrl,
      hasReferenceImages: !!referenceImageUrls,
      referenceImagesCount: referenceImageUrls?.length || 0,
      referenceImagesFormat: referenceImageUrls ? 'HTTP URLs' : 'none',
      hasStartImage: !!imageUrl && mode === 'start_end',
      hasEndImage: !!lastFrameUrl,
      hasReferenceVideo: !!videoUrl && (mode === 'start_end' || model === 'kling-motion-control'),
      // Advanced settings
      style: style || 'not set',
      cameraMotion: cameraMotion || 'not set',
      stylePreset: stylePreset || 'not set',
      motionStrength: motionStrength || 'not set',
      motionSeconds: model === 'kling-motion-control' ? Number(motionSecondsServer ?? motionSeconds ?? videoDuration ?? effectiveDuration ?? 0) : undefined,
      characterOrientation: model === 'kling-motion-control' ? (characterOrientation || 'image') : undefined,
      motionMode: model === 'kling-motion-control' ? (resolution || '720p') : undefined,
      estimatedStars: creditCost,
      motionCreditsPerSecond:
        model === 'kling-motion-control'
          ? ((String(resolution || '720p').toLowerCase() === '1080p') ? 9 : 6)
          : undefined,
      // URLs/data (redacted)
      referenceImageSample: referenceImageUrls?.[0]?.substring(0, 60) || 'none',
      imageUrlSample: imageUrl?.substring(0, 50) || 'none',
      videoUrlSample: videoUrl?.substring(0, 50) || 'none',
      hasImageUrl: !!imageUrl,
      hasVideoUrl: !!videoUrl,
      durationClient:
        model === 'kling-motion-control'
          ? Number(motionSeconds ?? videoDuration ?? 0) || null
          : null,
      durationServer:
        model === 'kling-motion-control'
          ? Number(motionSecondsServer ?? 0) || null
          : null,
    });

    // Call KIE API with provider info
    let kieClient: any;
    try {
      const slotFromMeta =
        (generation as any)?.metadata && typeof (generation as any).metadata === "object"
          ? Number((generation as any).metadata.kie_key_slot)
          : NaN;
      const slot = Number.isFinite(slotFromMeta) ? slotFromMeta : null;
      kieClient = getKieClient({ scope: "video", slot });
    } catch {
      return integrationNotConfigured("kie", [
        "KIE_API_KEY",
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
        
        // Select the right model based on aspect ratio, quality and resolution
        // resolution can be: '720p', '1080p', '4k', etc.
        const videoModelId = getLaoZhangVideoModelId(model, aspectRatio, quality, duration, resolution);
        
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
          hasReferenceImages: !!referenceImageUrls,
          referenceImagesCount: referenceImageUrls?.length || 0,
          referenceImagesFormat: referenceImageUrls ? 'HTTP URLs' : 'none',
          prompt: fullPrompt.substring(0, 50),
          userId,
          generationId: generation?.id,
        });
        
        // For production stability: avoid long-running synchronous requests where possible.
        // LaoZhang async API (/v1/videos) is reliable for text-to-video, and returns an expiring URL via /content.
        // Multi-reference (-fl) and start/end frames are handled via chat/completions (sync) for feature parity.
        const refsForLaoZhang = referenceImagesForLaoZhang ?? referenceImageUrls;
        const hasRefs = Array.isArray(refsForLaoZhang) && refsForLaoZhang.length > 0;
        const hasFrames = !!startImageUrlForVideo || !!endImageUrlForVideo;

        // Use raw data URLs when available (avoids fetching signed storage URLs just to re-upload).
        const startForLaoZhang =
          startImage && typeof startImage === "string" && startImage.startsWith("data:")
            ? startImage
            : startImageUrlForVideo;
        const endForLaoZhang =
          endImage && typeof endImage === "string" && endImage.startsWith("data:")
            ? endImage
            : endImageUrlForVideo;

        // Async path: text-to-video, reference frames, or multi-reference images.
        // For start/end frames, LaoZhang async endpoint needs -fl model suffix.
        // For reference images (i2v), the async endpoint uses input_reference form fields
        // with the BASE model (no -fl suffix) — -fl is a chat/completions convention only.
        const frameUrls = [startForLaoZhang, endForLaoZhang].filter(Boolean) as string[];
        const refUrls = hasRefs ? (refsForLaoZhang as string[]) : [];
        const imageUrlsForAsync = [...frameUrls, ...refUrls].filter(Boolean) as string[];
        const asyncModelId = (() => {
          // No images: use model as-is (text-to-video)
          if (!imageUrlsForAsync.length) return videoModelId;
          // Reference images only (i2v): use base model WITHOUT -fl suffix.
          // The -fl suffix is for chat/completions; async /v1/videos uses input_reference form fields.
          if (refUrls.length > 0 && frameUrls.length === 0) return videoModelId;
          // Start/end frames: need -fl suffix for async endpoint
          if (videoModelId.includes("-fl")) return videoModelId;
          const isLandscape = videoModelId.includes("landscape");
          const isFast = videoModelId.includes("fast");
          if (isLandscape && isFast) return "veo-3.1-landscape-fast-fl";
          if (isLandscape) return "veo-3.1-landscape-fl";
          if (isFast) return "veo-3.1-fast-fl";
          return "veo-3.1-fl";
        })();
        const task = await withRetry(
          'laozhang_async_submit',
          () => videoClient.createVideoTask({
            model: asyncModelId,
            prompt: fullPrompt,
            imageUrls: imageUrlsForAsync,
          }),
        );

        response = {
          id: task.id,
          status: task.status || 'queued',
          estimatedTime: 120,
          provider: 'laozhang',
        };

        // Persist some LaoZhang metadata for polling/debugging.
        await updateGenerationWithRetry(
          supabase,
          generation?.id,
          {
            metadata: {
              ...(generation?.metadata || {}),
              provider: 'laozhang',
              provider_model: videoModelId,
              provider_task_id: task.id,
            },
            updated_at: new Date().toISOString(),
          },
          'laozhang_task_meta'
        );

        // Keep local copy in sync so the generic "task_id" update below doesn't clobber metadata.
        if (generation && typeof generation === "object") {
          generation.metadata = {
            ...(generation.metadata || {}),
            provider: "laozhang",
            provider_model: videoModelId,
            provider_task_id: task.id,
          };
        }
      } catch (videoError: any) {
        console.error('[API] Video generation failed:', videoError);
        const isTransientLaoZhangError = isRetryableLaoZhangSubmissionError(videoError);
        
        // Refund credits on error (best-effort, idempotent)
        if (generation?.id && !skipCredits && shouldChargeUpfront && creditCost > 0) {
          try {
            await refundCredits(
              supabase,
              userId,
              generation.id,
              creditCost,
              'laozhang_api_error',
              { error: videoError?.message || String(videoError), model }
            );
          } catch (e) {
            console.error('[API] LaoZhang refund failed:', e);
          }
        }
        
        // Update generation status
        await supabase
          .from('generations')
          .update({
            status: 'failed',
            error: videoError.message || 'Video generation error',
            error_message: videoError.message || 'Video generation error',
          })
          .eq('id', generation?.id);
        
        return NextResponse.json(
          {
            error: isTransientLaoZhangError
              ? 'Сервис генерации временно перегружен. Попробуйте позже.'
              : (videoError.message || 'Failed to generate video'),
            details: isTransientLaoZhangError ? (videoError.message || String(videoError)) : undefined,
            errorCode: isTransientLaoZhangError ? 'UPSTREAM_UNAVAILABLE' : 'INTERNAL_ERROR',
          },
          { status: isTransientLaoZhangError ? 503 : 500 }
        );
      }
    }

    // === FAL.ai PROVIDER ===
    if (response) {
      // LaoZhang already produced a response — skip FAL/KIE providers entirely.
      console.log('[API] Skipping FAL/KIE — response already set by LaoZhang, taskId:', response.id);
    } else if (modelInfo.provider === 'fal') {
      console.log('[API] Using FAL.ai provider for model:', model);
      try {
        console.log('[API] FAL_KEY exists:', !!process.env.FAL_KEY);
        const falClient = getFalClient();
        console.log('[API] FAL client created successfully');
        
        // Kling O1 Standard (I2V+start_end / V2V reference)
        if (model === 'kling-o1') {
          const durationSec = Number(duration || 5);
          const o1Duration = String(durationSec) as '5' | '10';
          const o1Aspect = (aspectRatio as '16:9' | '9:16' | '1:1') || '16:9';

          let falResponse: { request_id: string; status_url: string };
          if (normalizedMode === 'v2v') {
            if (!v2vVideoUrl) {
              return NextResponse.json(
                { error: 'videoUrl is required for Kling O1 v2v mode' },
                { status: 400 }
              );
            }
            let sourceVideoUrl = v2vVideoUrl;
            let sourceImageUrl = referenceImage || startImage || undefined;
            if (sourceVideoUrl.startsWith('data:')) {
              sourceVideoUrl = await uploadDataUrlToStorage(sourceVideoUrl, 'kling_o1_v2v');
            }
            if (sourceImageUrl && sourceImageUrl.startsWith('data:')) {
              sourceImageUrl = await uploadDataUrlToStorage(sourceImageUrl, 'kling_o1_v2v_ref');
            }
            falResponse = await falClient.submitKlingO1VideoToVideoReference({
              prompt: fullPrompt,
              video_url: sourceVideoUrl,
              image_url: sourceImageUrl,
              duration: o1Duration,
              aspect_ratio: o1Aspect,
            });
          } else {
            const sourceImage = referenceImage || startImage;
            if (!sourceImage) {
              return NextResponse.json(
                { error: 'referenceImage or startImage is required for Kling O1 i2v mode' },
                { status: 400 }
              );
            }
            let startImageUrl = sourceImage;
            let endImageUrl = endImage;
            if (startImageUrl.startsWith('data:')) {
              startImageUrl = await uploadDataUrlToStorage(startImageUrl, 'kling_o1_start');
            }
            if (endImageUrl && endImageUrl.startsWith('data:')) {
              endImageUrl = await uploadDataUrlToStorage(endImageUrl, 'kling_o1_end');
            }
            falResponse = await falClient.submitKlingO1ImageToVideo({
              prompt: fullPrompt,
              start_image_url: startImageUrl,
              end_image_url: endImageUrl || undefined,
              duration: o1Duration,
              aspect_ratio: o1Aspect,
            });
          }

          response = {
            id: falResponse.request_id,
            status: 'queued',
            estimatedTime: durationSec === 10 ? 180 : 120,
          };
        }
        // Kling O3 Standard (T2V / I2V / V2V Reference)
        else if (model === 'kling-o3-standard') {
          const durationSec = Number(duration || 5);
          const payloadShotType =
            normalizedMultiPrompt?.length || normalizedShotType === 'customize'
              ? 'customize'
              : undefined;
          const o3Duration = String(durationSec) as '3' | '5' | '8' | '10' | '12' | '15';
          const o3Aspect = (aspectRatio as '16:9' | '9:16' | '1:1') || '16:9';

          let falResponse: { request_id: string; status_url: string };
          if (normalizedMode === 't2v') {
            falResponse = await falClient.submitKlingO3StandardTextToVideo({
              prompt: fullPrompt,
              duration: o3Duration,
              aspect_ratio: o3Aspect,
              generate_audio: normalizedGenerateAudio ?? soundEnabled,
              negative_prompt: negativePrompt || undefined,
              multi_prompt: normalizedMultiPrompt && normalizedMultiPrompt.length > 0 ? normalizedMultiPrompt : undefined,
              shot_type: payloadShotType,
            });
          } else if (normalizedMode === 'v2v') {
            if (!v2vVideoUrl) {
              return NextResponse.json(
                { error: 'videoUrl is required for Kling O3 Standard v2v mode' },
                { status: 400 }
              );
            }
            let sourceVideoUrl = v2vVideoUrl;
            let sourceImageUrl = referenceImage || startImage || undefined;
            if (sourceVideoUrl.startsWith('data:')) {
              sourceVideoUrl = await uploadDataUrlToStorage(sourceVideoUrl, 'kling_o3_v2v');
            }
            if (sourceImageUrl && sourceImageUrl.startsWith('data:')) {
              sourceImageUrl = await uploadDataUrlToStorage(sourceImageUrl, 'kling_o3_v2v_ref');
            }

            falResponse = await falClient.submitKlingO3StandardVideoToVideoReference({
              prompt: fullPrompt,
              video_url: sourceVideoUrl,
              image_url: sourceImageUrl,
              duration: o3Duration,
              aspect_ratio: o3Aspect,
              generate_audio: normalizedGenerateAudio ?? soundEnabled,
              negative_prompt: negativePrompt || undefined,
              multi_prompt: normalizedMultiPrompt && normalizedMultiPrompt.length > 0 ? normalizedMultiPrompt : undefined,
              shot_type: payloadShotType,
            });
          } else {
            const sourceImage = referenceImage || startImage;
            if (!sourceImage) {
              return NextResponse.json(
                { error: 'referenceImage or startImage is required for Kling O3 Standard i2v/start_end mode' },
                { status: 400 }
              );
            }
            let sourceImageUrl = sourceImage;
            let endImageUrl = endImage;
            if (sourceImage.startsWith('data:')) {
              sourceImageUrl = await uploadDataUrlToStorage(sourceImage, 'kling_o3_start');
            }
            if (endImage && endImage.startsWith('data:')) {
              endImageUrl = await uploadDataUrlToStorage(endImage, 'kling_o3_end');
            }

            falResponse = await falClient.submitKlingO3StandardImageToVideo({
              prompt: fullPrompt,
              image_url: sourceImageUrl,
              end_image_url: endImageUrl || undefined,
              duration: o3Duration,
              aspect_ratio: o3Aspect,
              generate_audio: normalizedGenerateAudio ?? soundEnabled,
              negative_prompt: negativePrompt || undefined,
              multi_prompt: normalizedMultiPrompt && normalizedMultiPrompt.length > 0 ? normalizedMultiPrompt : undefined,
              shot_type: payloadShotType,
            });
          }

          response = {
            id: falResponse.request_id,
            status: 'queued',
            estimatedTime: durationSec >= 10 ? 180 : 120,
          };
        }
        else {
          return NextResponse.json(
            { error: `Unsupported FAL model '${model}'` },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error('[API] FAL.ai error:', error);

        // Refund credits for failed generation
        if (generation?.id && !skipCredits && shouldChargeUpfront) {
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
        // Final validation: filter out any empty URL strings before passing to KIE client
        const safeImageUrl = imageUrl && imageUrl.trim() !== '' ? imageUrl : undefined;
        const safeLastFrameUrl = lastFrameUrl && lastFrameUrl.trim() !== '' ? lastFrameUrl : undefined;
        const safeVideoUrl = videoUrl && videoUrl.trim() !== '' ? videoUrl : undefined;
        const safeReferenceImageUrls = referenceImageUrls?.filter(url => url && url.trim() !== '');

        const kiePayload = buildKieVideoPayload({
          modelId: model,
          mode: (model === 'kling-motion-control' ? 'motion_control' : model === 'kling-o1-edit' ? 'v2v_edit' : mode) as any,
          prompt: fullPrompt,
          durationSec: duration || modelInfo.fixedDuration || 5,
          aspectRatio: aspectRatio,
          quality: quality,
          resolution: resolution,
          sound: model === 'wan-2.6'
            ? !!wanSoundPreset
            : (model === 'kling-motion-control' || model === 'kling-o1-edit' ? false : soundEnabled),
          inputImageUrl: safeImageUrl,
          endImageUrl: safeLastFrameUrl,
          referenceImages: safeReferenceImageUrls && safeReferenceImageUrls.length > 0 ? safeReferenceImageUrls : undefined,
          referenceVideoUrl: safeVideoUrl,
          characterOrientation: model === 'kling-motion-control' ? (characterOrientation || 'image') : undefined,
          cfgScale: typeof cfgScale === 'number' ? cfgScale : undefined,
          qualityTier: qualityTier,
          style: style,
          shots: shots,
        });

        response = await kieClient.generateVideo(kiePayload);
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        const shouldRefund = Boolean(generation?.id && !skipCredits && shouldChargeUpfront && creditCost > 0);
        const markFailedAndRefund = async (reason: string, httpStatus?: number) => {
          const statusFromError =
            typeof (error as any)?.status === "number" ? Number((error as any).status) : undefined;
          if (generation?.id) {
            try {
              await supabase
                .from("generations")
                .update({
                  status: "failed",
                  error_message: errorMessage,
                  updated_at: new Date().toISOString(),
                  metadata: {
                    ...(generation?.metadata || {}),
                    fail_reason: reason,
                    fail_http_status: httpStatus ?? statusFromError,
                  },
                })
                .eq("id", generation.id);
            } catch (e) {
              console.error("[API] Failed to update generation status on error:", e);
            }
          }

          if (!shouldRefund || !generation?.id) return;
          try {
            const { data: existingRefund } = await supabase
              .from("credit_transactions")
              .select("id")
              .eq("generation_id", generation.id)
              .eq("type", "refund")
              .limit(1);
            if (Array.isArray(existingRefund) && existingRefund.length > 0) return;
          } catch {
            // If we can't check idempotently, still attempt a refund (best-effort).
          }

          await refundCredits(supabase, userId, generation.id, creditCost, reason, {
            error: errorMessage,
            model,
          }).catch((e) => console.error("[API] Refund failed:", e));
        };

        // Обработка ошибки политики контента Google Veo
        const isContentPolicyError =
          errorMessage.includes("content policy") ||
          errorMessage.includes("violating content policies") ||
          errorMessage.includes("Rejected by Google");

        if (isContentPolicyError && modelInfo.provider === "kie_veo") {
          console.warn("[API] Veo content policy error, trying fallback model:", errorMessage);

          // Fallback на Kling 2.6 (более лояльная модерация)
          const fallbackModel = VIDEO_MODELS.find(
            (m) => m.id === "kling" && m.supportsI2v === (mode === "i2v")
          );

          if (fallbackModel) {
            try {
              const fallbackVariant = fallbackModel.modelVariants?.[0] || null;
              const fallbackApiId =
                mode === "i2v" && fallbackVariant?.apiIdI2v
                  ? fallbackVariant.apiIdI2v
                  : fallbackVariant?.apiId || fallbackModel.apiId;

              console.log("[API] Using fallback model:", fallbackModel.name, fallbackApiId);

              response = await kieClient.generateVideo({
                model: fallbackApiId,
                provider: "kie_market",
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
                  .from("generations")
                  .update({
                    model_name: `${modelInfo.name} → ${fallbackModel.name} (fallback)`,
                    metadata: {
                      ...(generation?.metadata || {}),
                      original_model: model,
                      fallback_reason: "content_policy",
                      fallback_model: fallbackModel.id,
                    },
                  })
                  .eq("id", generation.id);
              }
            } catch (fallbackError) {
              console.error("[API] Fallback model also failed:", fallbackError);
              await markFailedAndRefund("content_policy_fallback_failed", 400);
              return NextResponse.json(
                {
                  error:
                    "Промпт был заблокирован политикой контента. Пожалуйста, переформулируйте запрос, избегая насилия, взрослого контента и других запрещённых тем.",
                  errorCode: "CONTENT_POLICY_VIOLATION",
                  suggestion:
                    "Попробуйте описать сцену более нейтрально, без упоминания насилия, оружия или взрослого контента.",
                },
                { status: 400 }
              );
            }
          } else {
            await markFailedAndRefund("content_policy_no_fallback", 400);
            return NextResponse.json(
              {
                error:
                  "Промпт был заблокирован политикой контента. Пожалуйста, переформулируйте запрос.",
                errorCode: "CONTENT_POLICY_VIOLATION",
                suggestion:
                  "Попробуйте описать сцену более нейтрально, избегая запрещённых тем.",
              },
              { status: 400 }
            );
          }
        } else {
          // Любая другая ошибка провайдера: не должна "класть" сайт и не должна оставлять генерацию висеть в queued.
          await markFailedAndRefund("kie_generate_error");

          // Classify error and return a differentiated response instead of re-throwing
          const isCircuit = error instanceof CircuitOpenError;
          const isTimeout = error instanceof FetchTimeoutError;
          const isRateLimited = typeof (error as any)?.status === "number" && Number((error as any).status) === 429;
          const kieStatus = typeof (error as any)?.status === "number" ? Number((error as any).status) : 0;
          const isServerError = kieStatus >= 500;
          const isNetworkErr = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i.test(errorMessage);

          console.error('[API] KIE provider error:', {
            model,
            errorName: error?.name,
            errorMessage,
            errorStatus: kieStatus || undefined,
            isCircuitOpen: isCircuit,
            isTimeout,
            isRateLimited,
            isServerError,
            isNetworkErr,
            resolution,
            characterOrientation,
          });

          let userError: string;
          let errorCode: string;
          let httpStatus: number;

          if (isCircuit) {
            userError = "Сервис временно перегружен. Подождите 1-2 минуты и повторите.";
            errorCode = "CIRCUIT_OPEN";
            httpStatus = 503;
          } else if (isTimeout) {
            userError = "Превышено время ожидания от сервиса генерации.";
            errorCode = "UPSTREAM_TIMEOUT";
            httpStatus = 504;
          } else if (isRateLimited) {
            userError = "Слишком много запросов. Подождите и попробуйте снова.";
            errorCode = "UPSTREAM_RATE_LIMIT";
            httpStatus = 429;
          } else if (isServerError) {
            userError = "Сервис генерации временно недоступен. Попробуйте позже.";
            errorCode = "UPSTREAM_UNAVAILABLE";
            httpStatus = 503;
          } else if (isNetworkErr) {
            userError = "Ошибка сети при подключении к сервису генерации.";
            errorCode = "NETWORK_ERROR";
            httpStatus = 502;
          } else {
            userError = errorMessage || "Ошибка генерации видео";
            errorCode = "INTERNAL_ERROR";
            httpStatus = 500;
          }

          return NextResponse.json(
            {
              error: userError,
              details: errorMessage !== userError ? errorMessage : undefined,
              errorCode,
            },
            { status: httpStatus }
          );
        }
      }
    } // Close else block for KIE provider

    // Update generation with task ID (must be resilient to older DB schemas missing columns like metadata).
    if (generation?.id) {
      try {
        const baseUpdate: any = {
          task_id: response.id,
          status: 'generating',
          updated_at: new Date().toISOString(),
        };

        const withMeta: any = {
          ...baseUpdate,
          metadata: {
            ...(generation?.metadata || {}),
            provider_task_id: response.id,
          },
        };

        // First try with metadata; if schema doesn't have metadata, retry without it so task_id is still saved.
        let { error } = await supabase.from("generations").update(withMeta).eq("id", generation.id);
        if (error) {
          const code = String((error as any)?.code || "");
          const msg = String((error as any)?.message || error);
          const missingMeta = code === "PGRST204" && /metadata/i.test(msg);
          if (missingMeta) {
            ({ error } = await supabase.from("generations").update(baseUpdate).eq("id", generation.id));
          }
        }

        if (error) {
          console.error("[API] task_id update failed (non-fatal):", error);
        }
      } catch (e) {
        // Task may already exist upstream; do not fail the whole request because DB update glitched.
        console.error("[API] Failed to set task_id after task creation (non-fatal):", e);
      }
    }

    const finalResp = {
      success: true,
      jobId: response.id,
      status: response.status,
      estimatedTime: response.estimatedTime || 120,
      creditCost: creditCost,
      generationId: generation?.id,
      kind: "video",
      warning: promptWarning,
      usedFallback: usedFallback,
    };
    console.log("[API] Returning generate/video response:", JSON.stringify({ jobId: finalResp.jobId, status: finalResp.status, provider: (response as any)?.provider }));
    return NextResponse.json(finalResp);
  } catch (error) {
    console.error('[API] Video generation error (outer catch):', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = error instanceof FetchTimeoutError;
    const isCircuit = error instanceof CircuitOpenError;
    const isRateLimited = typeof (error as any)?.status === "number" && Number((error as any).status) === 429;
    const kieStatus = typeof (error as any)?.status === "number" ? Number((error as any).status) : 0;
    const isServerError = kieStatus >= 500;
    const isNetworkErr = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i.test(String(message));

    let userError: string;
    let errorCode: string;
    let httpStatus: number;

    if (isCircuit) {
      userError = "Сервис временно перегружен. Подождите 1-2 минуты и повторите.";
      errorCode = "CIRCUIT_OPEN";
      httpStatus = 503;
    } else if (isTimeout) {
      userError = "Превышено время ожидания от сервиса генерации.";
      errorCode = "UPSTREAM_TIMEOUT";
      httpStatus = 504;
    } else if (isRateLimited) {
      userError = "Слишком много запросов. Подождите и попробуйте снова.";
      errorCode = "UPSTREAM_RATE_LIMIT";
      httpStatus = 429;
    } else if (isServerError) {
      userError = "Сервис генерации временно недоступен. Попробуйте позже.";
      errorCode = "UPSTREAM_UNAVAILABLE";
      httpStatus = 503;
    } else if (isNetworkErr) {
      userError = "Ошибка сети при подключении к сервису генерации.";
      errorCode = "NETWORK_ERROR";
      httpStatus = 502;
    } else {
      userError = message;
      errorCode = "INTERNAL_ERROR";
      httpStatus = 500;
    }

    return NextResponse.json(
      {
        error: userError,
        details: message !== userError ? message : undefined,
        errorCode,
      },
      { status: httpStatus }
    );
  }
}
