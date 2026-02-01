import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { refundCredits } from '@/lib/credits/refund';
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
  // ElevenLabs V3 Text-to-Dialogue
  'elevenlabs': 'elevenlabs/text-to-dialogue-v3',
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
    let { 
      prompt, // Используется как lyrics в кастомном режиме
      model = 'suno',
      generation_type = 'generate',
      threadId: threadIdRaw,
      
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
      
      // ElevenLabs V3 settings
      dialogue,           // Text or array of dialogue lines
      stability = 0.5,    // Voice stability 0-1
      language_code = 'auto', // Language code (auto, ru, en, etc.)
      voice_id,           // Voice ID for cloned voices
    } = body;

    // Validate required fields
    const isElevenLabs = model === 'elevenlabs/text-to-dialogue-v3' || generation_type === 'elevenlabs';
    
    if (isElevenLabs) {
      // ElevenLabs requires dialogue text
      if (!dialogue && !prompt) {
        return NextResponse.json(
          { error: 'Dialogue text is required for ElevenLabs generation' }, 
          { status: 400 }
        );
      }
    } else if (generation_type === 'generate' && !prompt && !lyrics) {
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
    // For ElevenLabs speech: credits will be deducted AFTER generation (1 sec = 1 star)
    // For music: deduct credits upfront
    const shouldDeferCreditDeduction = isElevenLabs;
    const creditCost = shouldDeferCreditDeduction ? 0 : calculateAudioPrice(model, { generation_type });
    const minimumBalance = isElevenLabs ? 5 : creditCost; // Require minimum 5 stars for speech

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

    // Optional: validate threadId/project and ensure it belongs to user.
    // NOTE: Projects are shared across Photo/Video/Motion/Music.
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

    // Check credits
    if (!skipCredits) {
      const balance = await getCreditBalance(supabase, userId);
      if (balance.totalBalance < minimumBalance) {
        const message = isElevenLabs 
          ? `Недостаточно звёзд. Минимум ${minimumBalance}⭐ для генерации речи (списание по факту: 1 сек = 1⭐)`
          : `Нужно ${creditCost} ⭐, у вас ${balance.totalBalance} ⭐`;
        
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            required: minimumBalance,
            available: balance.totalBalance,
            message,
          },
          { status: 402 }
        );
      }

      // Deduct credits ONLY for music (not for speech)
      if (!shouldDeferCreditDeduction && creditCost > 0) {
        const deductResult = await deductCredits(supabase, userId, creditCost);
        if (!deductResult.success) {
          return NextResponse.json(
            { error: 'Failed to deduct credits' },
            { status: 500 }
          );
        }
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
    const modelName = isElevenLabs ? 'ElevenLabs V3' : `Suno ${suno_model}`;
    const promptText = isElevenLabs ? (dialogue || prompt) : (prompt || lyrics || title || 'Audio generation');
    
    // Standard insert - Supabase schema cache may complain about metadata, but insert should work
    const insertData: any = {
      user_id: userId,
      type: "audio",
      model_id: model,
      model_name: modelName,
      prompt: promptText,
      credits_used: creditCost,
      status: "queued",
      thread_id: threadId || null,
    };
    
    console.log('[API] Inserting generation:', insertData);
    const { data: genData, error: genError } = await supabase
      .from("generations")
      .insert(insertData)
      .select()
      .single();
    
    console.log('[API] Insert result:', { genData: genData?.id || 'null', genError: genError?.code || 'none' });
    
    generation = genData;
    
    // If error is about metadata column (schema cache issue), try to continue anyway
    if (genError) {
      const isMetadataCacheError = genError.code === 'PGRST204' && (genError.message?.includes('metadata') || genError.message?.includes('Metadata') || genError.message?.includes('completed_at'));
      console.log('[API] genError check:', { code: genError.code, message: genError.message, isMetadataCacheError });
      if (isMetadataCacheError) {
        console.warn('[API] Schema cache error (non-critical), attempting to fetch created generation');
        // Try to fetch the last created generation for this user
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit for DB to commit
        const { data: lastGen, error: fetchError } = await supabase
          .from("generations")
          .select("*")
          .eq("user_id", userId)
          .eq("type", "audio")
          .eq("status", "queued")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        console.log('[API] Recovery fetch result:', { lastGen: lastGen?.id || 'null', fetchError: fetchError?.code || 'none' });
        if (lastGen) {
          generation = lastGen;
          console.log('[API] Recovered generation from DB:', generation.id);
        } else {
          console.error("[API] Failed to save generation and could not recover:", JSON.stringify(genError, null, 2));
          return NextResponse.json({
            error: 'Ошибка сохранения генерации. Попробуйте позже.'
          }, { status: 500 });
        }
      } else {
        console.error("[API] Failed to save generation:", JSON.stringify(genError, null, 2));
        console.error("[API] genData:", genData);
        return NextResponse.json({
          error: 'Ошибка сохранения генерации. Попробуйте позже.'
        }, { status: 500 });
      }
    }
    
    if (!generation || !generation.id) {
      console.error("[API] Generation is null or missing id after insert/recovery");
      console.error("[API] genData:", genData);
      return NextResponse.json({
        error: 'Ошибка сохранения генерации. Попробуйте позже.'
      }, { status: 500 });
    }
    
    console.log('[API] Generation created:', generation.id, 'status:', generation.status);

    // Record transaction (only for music, not for speech)
    if (!skipCredits && generation?.id && creditCost > 0 && !shouldDeferCreditDeduction) {
      try {
        const transactionDesc = `Генерация музыки: Suno ${generation_type}`;
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -creditCost,
          type: 'deduction',
          description: transactionDesc,
          generation_id: generation.id,
        });
      } catch (e) {
        console.error('[API] Failed to record transaction:', e);
      }
    }

    // Handle TTS via Fal.ai (Qwen for cloned voices, ElevenLabs for preset)
    if (isElevenLabs) {
      const { getFalClient } = await import('@/lib/api/fal-client');
      const falClient = getFalClient();
      
      if (!voice_id) {
        voice_id = 'Liam';
      }
      
      const dialogueText = dialogue || prompt;
      const PRESET_VOICES = ['Liam', 'Alice', 'Adam', 'Jessica', 'Charlie', 'Emily'];
      // Cloned voices are URLs (https://v3b.fal.media/files/...)
      const isPreset = PRESET_VOICES.includes(voice_id) && !voice_id.startsWith('http');
      
      try {
        if (!generation || !generation.id) {
          throw new Error('Generation not created - cannot proceed with TTS');
        }

        console.log('[API] Starting TTS generation:', { generationId: generation.id, voice_id, isPreset });

        const result = await falClient.generateTTS({
          text: dialogueText,
          voice_id: voice_id,
          language: language_code || 'ru',
          useElevenLabs: isPreset, // Use ElevenLabs for preset, Qwen for cloned
        });

        const audioUrl = result.audio?.url;
        const durationSec = Math.ceil(result.duration_seconds || 0);

        if (!audioUrl) {
          throw new Error('No audio URL returned');
        }

        console.log('[API] TTS result received:', { audioUrl, durationSec, generationId: generation.id });

        // Deduct credits immediately (synchronous)
        const starsToDeduct = durationSec || 1;
        await deductCredits(supabase, userId, starsToDeduct);

        // Update generation
        const { error: updateError } = await supabase.from('generations').update({
          status: 'success',
          result_url: audioUrl,
          duration_sec: durationSec,
          actual_stars_spent: starsToDeduct,
        }).eq('id', generation.id);
        
        if (updateError) {
          console.error('[API] Failed to update generation status:', updateError);
        } else {
          console.log('[API] Generation status updated to success:', generation.id);
        }

        // Record transaction
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -starsToDeduct,
          type: 'deduction',
          description: `TTS: ${isPreset ? 'ElevenLabs' : 'Qwen'} (${voice_id})`,
          generation_id: generation.id,
        });

        console.log('[API] TTS generated:', { audioUrl, durationSec, voice_id, isPreset });

        return NextResponse.json({
          success: true,
          generation_id: generation.id,
          jobId: generation.id, // For frontend polling
          audio_url: audioUrl,
          duration_sec: durationSec,
          stars_spent: starsToDeduct,
        });
      } catch (apiError) {
        console.error('[API] TTS error:', apiError);
        console.error('[API] Generation state:', { generation: generation?.id || 'null' });
        
        if (!skipCredits && !shouldDeferCreditDeduction && creditCost > 0 && generation?.id) {
          try {
            await refundCredits(supabase, userId, generation.id, creditCost, 'audio_generation_failed');
          } catch {}
        }

        return NextResponse.json({
          error: 'Ошибка генерации. Попробуйте позже.'
        }, { status: 500 });
      }
    }

    // Handle Suno via KIE.ai
    const kieClient = getKieClient();
    let apiEndpoint: string;
    let apiPayload: Record<string, any> = {};

    if (true) { // was: else {
      apiEndpoint = GENERATION_ENDPOINTS[generation_type] || GENERATION_ENDPOINTS['generate'];

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
    }

    console.log('[API] Audio generation request:', {
      endpoint: apiEndpoint,
      generation_type: isElevenLabs ? 'elevenlabs' : generation_type,
      model: isElevenLabs ? 'elevenlabs-v3' : suno_model,
      isElevenLabs,
    });

    // Call KIE API - build proper request structure
    try {
      const response = await kieClient.createTask({
        model: apiEndpoint,
        input: apiPayload,
      });

      // Update generation with task ID
      const taskId = response.data?.taskId;
      if (generation?.id && taskId) {
        await supabase
          .from('generations')
          .update({ task_id: taskId, status: 'generating' })
          .eq('id', generation.id);
      }

      return NextResponse.json({
        success: true,
        jobId: taskId,
        status: 'queued',
        estimatedTime: isElevenLabs ? 15 : 60,
        creditCost: creditCost,
        generationId: generation?.id,
        kind: "audio",
      });
    } catch (apiError) {
      console.error('[API] KIE API error:', apiError);
      
      // Refund credits if they were deducted
      if (!skipCredits && !shouldDeferCreditDeduction && creditCost > 0 && generation?.id) {
        try {
          await refundCredits(
            supabase,
            userId,
            generation.id,
            creditCost,
            'audio_generation_failed'
          );
        } catch {}
      }
      
      // User-friendly error message
      let userMessage = 'Ошибка при генерации аудио. Попробуйте позже.';
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
      
      if (errorMsg.includes('model name')) {
        userMessage = 'Ошибка конфигурации модели. Обратитесь в поддержку.';
      } else if (errorMsg.includes('voice')) {
        userMessage = 'Ошибка с выбранным голосом. Попробуйте другой голос.';
      } else if (errorMsg.includes('insufficient')) {
        userMessage = 'Недостаточно кредитов для генерации.';
      }
      
      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Audio generation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации аудио. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
