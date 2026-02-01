import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient } from '@/lib/api/kie-client';
import { getModelById } from '@/config/models';
import { getSkuFromRequest, calculateTotalStars, PRICING_VERSION } from '@/lib/pricing/pricing';
import { integrationNotConfigured } from '@/lib/http/integration-error';
import { ensureProfileExists } from '@/lib/supabase/ensure-profile';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { refundCredits } from '@/lib/credits/refund';
import { getAudioDurationFromUrl } from '@/lib/audio/get-duration';

export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// Маппинг model id → KIE API model
const API_MODEL_MAP: Record<string, string> = {
  'kling-ai-avatar': 'kling/ai-avatar-standard',
  'infinitalk-480p': 'infinitalk/from-audio',
  'infinitalk-720p': 'infinitalk/from-audio',
};

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    // Получить сессию
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    const userId = (await getAuthUserId(session)) || session.profileId;
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found', message: 'Учётная запись не найдена' },
        { status: 404 }
      );
    }

    // Парсинг body
    const body = await request.json();
    const {
      model,
      imageUrl,
      audioUrl,
      prompt,
      seed,
      resolution,
    } = body;

    // Валидация обязательных полей
    if (!model) {
      return NextResponse.json(
        { error: 'Missing model', message: 'Модель не указана' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl', message: 'Изображение не загружено' },
        { status: 400 }
      );
    }

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Missing audioUrl', message: 'Аудио не загружено' },
        { status: 400 }
      );
    }

    // Проверить модель
    const modelInfo = getModelById(model);
    if (!modelInfo) {
      return NextResponse.json(
        { error: 'Invalid model', message: `Модель ${model} не найдена` },
        { status: 400 }
      );
    }

    const apiModel = API_MODEL_MAP[model];
    if (!apiModel) {
      return NextResponse.json(
        { error: 'Unsupported model', message: `Модель ${model} не поддерживается для lip sync` },
        { status: 400 }
      );
    }

    // Получить длительность аудио
    let audioDuration: number | undefined;
    try {
      audioDuration = await getAudioDurationFromUrl(audioUrl);
      console.log('[Lip Sync] Audio duration:', audioDuration, 'seconds');
    } catch (error) {
      console.warn('[Lip Sync] Failed to get audio duration:', error);
      // Продолжаем без длительности, но для InfiniteTalk это может быть проблема
    }

    // Валидация длительности для InfiniteTalk
    if (model.includes('infinitalk')) {
      if (!audioDuration) {
        return NextResponse.json(
          { error: 'AUDIO_DURATION_UNKNOWN', message: 'Не удалось определить длительность аудио' },
          { status: 400 }
        );
      }

      if (audioDuration > 15) {
        return NextResponse.json(
          {
            error: 'AUDIO_TOO_LONG',
            message: `InfiniteTalk поддерживает аудио до 15 секунд. Ваше аудио: ${audioDuration.toFixed(1)}с`,
          },
          { status: 400 }
        );
      }
    }

    // Определить resolution для InfiniteTalk
    let finalResolution: '480p' | '720p' | undefined;
    if (model === 'infinitalk-480p') {
      finalResolution = '480p';
    } else if (model === 'infinitalk-720p') {
      finalResolution = '720p';
    }

    // Рассчитать стоимость
    const sku = getSkuFromRequest(model, { audioDurationSec: audioDuration });
    const creditCost = calculateTotalStars(sku, audioDuration);

    console.log('[Lip Sync] Pricing:', {
      model,
      sku,
      audioDuration,
      creditCost,
    });

    // Проверить баланс
    const balance = await getCreditBalance(supabase, userId);
    if (balance.totalBalance < creditCost) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_CREDITS',
          message: `Недостаточно кредитов. Нужно ${creditCost} ⭐, у вас ${balance.totalBalance} ⭐`,
          required: creditCost,
          available: balance.totalBalance,
        },
        { status: 400 }
      );
    }

    // Убедиться что профиль существует
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error('[Lip Sync] Failed to ensure profile exists:', e);
    }

    // Вставить запись в generations
    let generation: any = null;
    let genError: any = null;

    const insertOnce = async () => {
      const r = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          type: 'video',
          model_id: model,
          model_name: modelInfo.name,
          section: 'voice',
          status: 'queued',
          image_url: imageUrl,
          audio_url: audioUrl,
          audio_duration: audioDuration,
          resolution: finalResolution,
          credits_used: creditCost,
          charged_stars: creditCost,
          sku: sku,
          pricing_version: PRICING_VERSION,
          metadata: {
            prompt: prompt || null,
            seed: seed || null,
          },
        })
        .select()
        .single();

      generation = r.data;
      genError = r.error;
    };

    await insertOnce();
    if (genError) {
      const code = genError?.code ? String(genError.code) : '';
      const msg = genError?.message ? String(genError.message) : String(genError);
      if (code === '23503' || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          await insertOnce();
        } catch (e) {
          console.error('[Lip Sync] Retry after ensureProfileExists failed:', e);
        }
      }
    }

    if (genError || !generation) {
      console.error('[Lip Sync] Failed to save generation:', JSON.stringify(genError, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to create generation record',
          details: genError?.message || String(genError),
        },
        { status: 500 }
      );
    }

    // Списать кредиты
    const deductResult = await deductCredits(supabase, userId, creditCost);
    if (!deductResult.success) {
      console.error('[Lip Sync] Failed to deduct credits');

      // Удалить generation запись
      await supabase.from('generations').delete().eq('id', generation.id);

      return NextResponse.json(
        { error: 'Failed to deduct credits', message: 'Не удалось списать кредиты' },
        { status: 500 }
      );
    }

    console.log('[Lip Sync] Credits deducted:', {
      userId,
      amount: creditCost,
      newBalance: deductResult.totalBalance,
    });

    // Получить KIE client
    let kieClient: any;
    try {
      kieClient = getKieClient();
    } catch (error) {
      console.error('[Lip Sync] KIE client error:', error);

      // Refund кредиты
      await refundCredits(supabase, userId, generation.id, creditCost, 'kie_unavailable', {
        error: String(error),
      });

      // Обновить статус
      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'KIE API недоступен' })
        .eq('id', generation.id);

      return integrationNotConfigured('kie', ['KIE_API_KEY', 'KIE_CALLBACK_SECRET', 'KIE_CALLBACK_URL']);
    }

    // Подготовить KIE request
    const callbackSecret = process.env.KIE_CALLBACK_SECRET;
    const callbackBase = process.env.KIE_CALLBACK_URL || process.env.NEXT_PUBLIC_BASE_URL;
    let callbackUrl: string | undefined;

    if (callbackBase && callbackSecret) {
      callbackUrl = `${callbackBase}/api/webhooks/kie?secret=${encodeURIComponent(callbackSecret)}`;
    }

    console.log('[Lip Sync] Calling KIE API:', {
      model: apiModel,
      imageUrl: imageUrl.substring(0, 50) + '...',
      audioUrl: audioUrl.substring(0, 50) + '...',
      resolution: finalResolution,
      seed,
      hasCallback: !!callbackUrl,
    });

    // Вызвать KIE API
    let kieResponse: any;
    try {
      kieResponse = await kieClient.lipSyncVideo({
        model: apiModel,
        imageUrl,
        audioUrl,
        prompt,
        resolution: finalResolution,
        seed,
        callbackUrl,
      });
    } catch (error: any) {
      console.error('[Lip Sync] KIE API error:', error);

      // Refund кредиты
      await refundCredits(supabase, userId, generation.id, creditCost, 'kie_error', {
        error: error?.message || String(error),
      });

      // Обновить статус
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: error?.message || 'Ошибка вызова KIE API',
        })
        .eq('id', generation.id);

      return NextResponse.json(
        {
          error: 'KIE API error',
          message: error?.message || 'Не удалось запустить генерацию',
        },
        { status: 500 }
      );
    }

    const taskId = kieResponse.data?.taskId;
    if (!taskId) {
      console.error('[Lip Sync] KIE response missing taskId:', kieResponse);

      // Refund кредиты
      await refundCredits(supabase, userId, generation.id, creditCost, 'no_task_id', {
        response: JSON.stringify(kieResponse),
      });

      // Обновить статус
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: 'KIE API не вернул taskId',
        })
        .eq('id', generation.id);

      return NextResponse.json(
        {
          error: 'Invalid KIE response',
          message: 'Не удалось получить task ID от KIE',
        },
        { status: 500 }
      );
    }

    // Обновить generation с task_id
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        task_id: taskId,
        status: 'generating',
      })
      .eq('id', generation.id);

    if (updateError) {
      console.error('[Lip Sync] Failed to update generation with taskId:', updateError);
    }

    console.log('[Lip Sync] Success:', {
      generationId: generation.id,
      taskId,
      creditCost,
    });

    // Логирование generation run
    try {
      await supabase.from('generation_runs').insert({
        generation_id: generation.id,
        user_id: userId,
        provider: 'lipsync',
        provider_model: apiModel,
        variant_key: model,
        stars_charged: creditCost,
        status: 'queued',
      });
    } catch (logError) {
      console.error('[Lip Sync] Failed to log generation run:', logError);
    }

    // Вернуть результат
    return NextResponse.json({
      success: true,
      jobId: taskId,
      taskId,
      generationId: generation.id,
      status: 'queued',
      creditCost,
      sku,
      estimatedTime: model.includes('infinitalk') ? 120 : 180, // InfiniteTalk быстрее
    });
  } catch (error: any) {
    console.error('[Lip Sync] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Внутренняя ошибка сервера',
      },
      { status: 500 }
    );
  }
}
