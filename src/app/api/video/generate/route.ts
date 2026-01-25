import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getModelById, type VideoModelConfig } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Unified Video Generator API
// Supports: Veo 3.1 Fast, Kling 2.1/2.5/2.6, Kling Motion Control, Grok Video, Sora 2, WAN 2.6

interface VideoGenerateRequest {
  model: string; // 'veo-3.1-fast', 'kling-2.1', 'kling-2.5', 'kling-2.6', 'kling-motion-control', 'grok-video', 'sora-2', 'wan-2.6'
  provider: string; // 'google', 'kie_market', 'openai'
  mode: string; // 'text_to_video', 'image_to_video', 'video_to_video', 'style_transfer'
  prompt: string;
  reference_images?: string[]; // Up to 3 for Veo
  input_video?: string; // For motion control, v2v
  duration_seconds: number;
  resolution: string; // '720p', '1080p'
  aspect_ratio: string; // '16:9', '9:16', '1:1', 'portrait', 'landscape'
  options?: {
    quality?: string; // 'pro', 'standard', 'master'
    style?: string; // For Grok/WAN
    motion_strength?: number; // 0-100
    camera_motion?: string; // For WAN
    generate_audio?: boolean; // For Kling 2.6
  };
}

interface VideoGenerateResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  provider_job_id?: string;
  eta_seconds?: number;
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`gen:video:${clientIP}`, RATE_LIMITS.generation);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Auth check
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch (error) {
      // Fallback to session auth
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json({ error: 'User account not found' }, { status: 401 });
      }
    }

    const body: VideoGenerateRequest = await request.json();
    const {
      model,
      provider,
      mode,
      prompt,
      reference_images,
      input_video,
      duration_seconds,
      resolution,
      aspect_ratio,
      options = {},
    } = body;

    // Validate required fields
    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }
    if (!prompt && mode !== 'video_to_video') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (!duration_seconds) {
      return NextResponse.json({ error: 'duration_seconds is required' }, { status: 400 });
    }

    // Get model config
    const modelInfo = getModelById(model) as VideoModelConfig | undefined;
    if (!modelInfo || modelInfo.type !== 'video') {
      return NextResponse.json(
        { error: `Invalid video model: ${model}` },
        { status: 400 }
      );
    }

    // Check user balance
    const supabase = getSupabaseAdmin();
    const balance = await getCreditBalance(supabase, userId);

    // Calculate cost
    const costParams = {
      mode: (mode === 'text_to_video' ? 't2v' : mode === 'image_to_video' ? 'i2v' : 't2v') as 't2v' | 'i2v' | 'start_end',
      duration: duration_seconds,
      quality: options.quality || resolution,
      audio: options.generate_audio,
      aspectRatio: aspect_ratio,
    };

    const priceResult = computePrice(model, costParams);
    const cost = priceResult.stars;

    if (balance.totalBalance < cost) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: cost, balance: balance.totalBalance },
        { status: 402 }
      );
    }

    // Deduct credits
    await deductCredits(supabase, userId, cost);

    // Create generation record
    const { data: generation, error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        model_id: model,
        model_name: modelInfo.name,
        prompt,
        status: 'queued',
        type: 'video',
        settings: {
          mode,
          duration_seconds,
          resolution,
          aspect_ratio,
          reference_images,
          input_video,
          ...options,
        },
        cost,
      })
      .select()
      .single();

    if (insertError || !generation) {
      console.error('[VideoGenerate] Failed to create generation:', insertError);
      return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 });
    }

    // Queue job based on provider
    let providerJobId: string | undefined;
    let etaSeconds = 60;

    // TODO: Implement actual provider API calls here
    // For now, just return queued status

    // Update generation with provider job ID
    if (providerJobId) {
      await supabase
        .from('generations')
        .update({ provider_job_id: providerJobId })
        .eq('id', generation.id);
    }

    const response: VideoGenerateResponse = {
      id: generation.id,
      status: 'queued',
      provider_job_id: providerJobId,
      eta_seconds: etaSeconds,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[VideoGenerate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
