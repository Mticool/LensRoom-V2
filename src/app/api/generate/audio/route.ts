import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient } from '@/lib/api/kie-client';
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";
import { requireAuth } from "@/lib/auth/requireRole";
import { calculateAudioPrice } from '@/config/kie-api-settings';
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitResponse } from '@/lib/rate-limit';

// Маппинг типов генерации на API endpoints
const GENERATION_ENDPOINTS: Record<string, string> = {
  'generate': 'ai-music-api/generate',
  'extend': 'ai-music-api/extend',
  'cover': 'ai-music-api/upload-and-cover-audio',
  'add-vocals': 'ai-music-api/add-vocals',
  'separate': 'ai-music-api/separate-vocals',
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`gen:audio:${clientIP}`, RATE_LIMITS.generation);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { 
      prompt, // Используется как lyrics в кастомном режиме
      model = 'suno',
      generation_type = 'generate',
      
      // Generate settings
      suno_model = 'V4_5PLUS',
      custom_mode = false,
      title,
      style,
      instrumental = false,
      lyrics,
      vocal_gender = 'not_specified',
      negative_tags,
      style_weight,
      weirdness,
      
      // Extend settings
      audio_id,
      continue_prompt,
      default_param_flag = true,
      
      // Cover settings
      cover_prompt,
      audio_weight,
      
      // Separate settings
      separation_type = 'both',
      task_id,
      
      // Uploaded audio file (base64)
      audioFile,
    } = body;

    // Validate required fields
    if (generation_type === 'generate' && !prompt && !lyrics) {
      return NextResponse.json(
        { error: 'Prompt or lyrics is required for music generation' }, 
        { status: 400 }
      );
    }

    if ((generation_type === 'extend' || generation_type === 'separate') && !audio_id) {
      return NextResponse.json(
        { error: 'Audio ID is required for extend/separate operations' }, 
        { status: 400 }
      );
    }

    if ((generation_type === 'cover' || generation_type === 'add-vocals') && !audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required for cover/add-vocals operations' }, 
        { status: 400 }
      );
    }

    // Calculate credit cost
    const creditCost = calculateAudioPrice(model, { generation_type });

    // Check auth
    let userId: string;
    let userRole: "user" | "manager" | "admin" = "user";
    let skipCredits = false;

    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
      userRole = auth.role;
      skipCredits = userRole === "manager" || userRole === "admin";
    } catch (error) {
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json(
          { error: 'Unauthorized. Please log in to generate music.' },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: 'User account not found.' },
          { status: 404 }
        );
      }
    }
    
    const supabase = getSupabaseAdmin();

    // Check credits
    if (!skipCredits) {
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
    }

    // Ensure profile exists
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error("[API] Failed to ensure profile exists:", e);
    }

    // Save generation to history
    let generation: any = null;
    const { data: genData, error: genError } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        type: "audio",
        model_id: model,
        model_name: `Suno ${suno_model}`,
        prompt: prompt || lyrics || title || 'Audio generation',
        credits_used: creditCost,
        status: "queued",
        metadata: {
          generation_type,
          style,
          instrumental,
          vocal_gender,
        }
      })
      .select()
      .single();
    
    generation = genData;
    if (genError) {
      console.error("[API] Failed to save generation:", genError);
    }

    // Record transaction
    if (!skipCredits && generation?.id) {
      try {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -creditCost,
          type: 'deduction',
          description: `Генерация музыки: Suno ${generation_type}`,
          generation_id: generation.id,
        });
      } catch (e) {
        console.error('[API] Failed to record transaction:', e);
      }
    }

    // Get KIE client
    const kieClient = getKieClient();

    // Build API request based on generation type
    let apiEndpoint = GENERATION_ENDPOINTS[generation_type] || GENERATION_ENDPOINTS['generate'];
    let apiPayload: Record<string, any> = {};

    switch (generation_type) {
      case 'generate':
        apiPayload = {
          model: suno_model,
          customMode: custom_mode,
          title: title || undefined,
          style: style || undefined,
          instrumental: instrumental,
          prompt: custom_mode ? (lyrics || prompt) : prompt,
          negativeTags: negative_tags || undefined,
          vocalGender: vocal_gender !== 'not_specified' ? vocal_gender : undefined,
          styleWeight: style_weight ? style_weight / 100 : undefined,
          weirdnessConstraint: weirdness ? weirdness / 100 : undefined,
        };
        break;

      case 'extend':
        apiPayload = {
          model: suno_model,
          audioId: audio_id,
          prompt: continue_prompt || prompt,
          defaultParamFlag: default_param_flag,
        };
        break;

      case 'cover':
        apiPayload = {
          model: suno_model,
          customMode: custom_mode,
          uploadUrl: audioFile, // Base64 or URL
          prompt: cover_prompt || prompt,
          instrumental: instrumental,
          vocalGender: vocal_gender !== 'not_specified' ? vocal_gender : undefined,
          styleWeight: style_weight ? style_weight / 100 : undefined,
          audioWeight: audio_weight ? audio_weight / 100 : undefined,
          negativeTags: negative_tags || undefined,
        };
        break;

      case 'add-vocals':
        apiPayload = {
          uploadUrl: audioFile,
          title: title,
          style: style,
          prompt: lyrics || prompt,
          vocalGender: vocal_gender,
          negativeTags: negative_tags || undefined,
          styleWeight: style_weight ? style_weight / 100 : undefined,
          audioWeight: audio_weight ? audio_weight / 100 : undefined,
        };
        break;

      case 'separate':
        apiPayload = {
          taskId: task_id,
          audioId: audio_id,
          separationType: separation_type,
        };
        break;
    }

    console.log('[API] Audio generation request:', {
      endpoint: apiEndpoint,
      generation_type,
      model: suno_model,
    });

    // Call KIE API - build proper request structure
    const response = await kieClient.createTask({
      model: apiEndpoint,
      input: apiPayload,
    });

    // Update generation with task ID
    const taskId = response.data?.taskId;
    if (generation?.id) {
      await supabase
        .from('generations')
        .update({ task_id: taskId, status: 'generating' })
        .eq('id', generation.id);
    }

    return NextResponse.json({
      success: true,
      jobId: taskId,
      status: 'queued',
      estimatedTime: 60, // Suno обычно ~30-60 секунд
      creditCost: creditCost,
      generationId: generation?.id,
      provider: 'kie_suno',
      kind: "audio",
    });

  } catch (error) {
    console.error('[API] Audio generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
