import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getKieClient, pickKieKeySlot } from '@/lib/api/kie-client';
import { getModelById } from '@/config/models';
import { getSkuFromRequest, calculateTotalStars, PRICING_VERSION } from '@/lib/pricing/pricing';
import { integrationNotConfigured } from '@/lib/http/integration-error';
import { ensureProfileExists } from '@/lib/supabase/ensure-profile';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';
import { refundCredits } from '@/lib/credits/refund';

export const maxDuration = 300; // 5 minutes timeout (video generation can be slow)
export const dynamic = 'force-dynamic';

// Маппинг model id → KIE API model
const API_MODEL_MAP: Record<string, string> = {
  'wan-animate-move': 'wan/2-2-animate-move',
  'wan-animate-replace': 'wan/2-2-animate-replace',
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
      mode,      // 'move' | 'replace'
      imageUrl,
      videoUrl,
      quality,   // '480p' | '580p' | '720p'
      prompt,
      videoDuration, // Длительность видео в секундах (от клиента)
    } = body;

    // Валидация mode
    if (!mode || (mode !== 'move' && mode !== 'replace')) {
      return NextResponse.json(
        { error: 'Invalid mode', message: 'Режим должен быть move или replace' },
        { status: 400 }
      );
    }

    // Определить model id по mode
    const modelId = mode === 'move' ? 'wan-animate-move' : 'wan-animate-replace';

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl', message: 'Изображение не загружено' },
        { status: 400 }
      );
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing videoUrl', message: 'Видео-референс не загружен' },
        { status: 400 }
      );
    }

    // Проверить модель
    const modelInfo = getModelById(modelId);
    if (!modelInfo) {
      return NextResponse.json(
        { error: 'Invalid model', message: `Модель ${modelId} не найдена` },
        { status: 400 }
      );
    }

    const apiModel = API_MODEL_MAP[modelId];
    if (!apiModel) {
      return NextResponse.json(
        { error: 'Unsupported model', message: `Модель ${modelId} не поддерживается для animate` },
        { status: 400 }
      );
    }

    // Валидация quality
    const validQualities = ['480p', '580p', '720p'];
    const finalQuality = quality && validQualities.includes(quality) ? quality : '480p';

    // Длительность видео (от клиента или дефолт)
    const duration = typeof videoDuration === 'number' && videoDuration > 0
      ? Math.ceil(videoDuration)
      : 5; // Дефолт 5 секунд если не указано

    // Валидация длительности (макс 30 секунд по KIE API)
    if (duration > 30) {
      return NextResponse.json(
        {
          error: 'VIDEO_TOO_LONG',
          message: `WAN Animate поддерживает видео до 30 секунд. Ваше видео: ${duration}с`,
        },
        { status: 400 }
      );
    }

    // Рассчитать стоимость (per-second)
    const sku = getSkuFromRequest(modelId, {});
    const creditCost = calculateTotalStars(sku, duration);

    console.log('[Animate] Pricing:', {
      modelId,
      mode,
      sku,
      duration,
      quality: finalQuality,
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
      console.error('[Animate] Failed to ensure profile exists:', e);
    }

    // Вставить запись в generations
    let generation: any = null;
    let genError: any = null;
    const omittedCols = new Set<string>();

    const extractMissingColumn = (message: string): string | null => {
      const m = message.match(/Could not find the '([^']+)' column/i);
      return m ? m[1] : null;
    };

    const insertOnce = async () => {
      const r = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          type: 'video',
          model_id: modelId,
          model_name: modelInfo.name,
          section: 'voice',
          status: 'queued',
          ...(omittedCols.has('image_url') ? {} : { image_url: imageUrl }),
          ...(omittedCols.has('resolution') ? {} : { resolution: finalQuality }),
          credits_used: creditCost,
          ...(omittedCols.has('charged_stars') ? {} : { charged_stars: creditCost }),
          ...(omittedCols.has('sku') ? {} : { sku }),
          ...(omittedCols.has('pricing_version') ? {} : { pricing_version: PRICING_VERSION }),
          ...(omittedCols.has('metadata')
            ? {}
            : {
                metadata: {
                  kie_key_scope: 'video',
                  animate_mode: mode,
                  video_url: videoUrl,
                  video_duration: duration,
                  quality: finalQuality,
                  prompt: prompt || null,
                },
              }),
        })
        .select()
        .single();

      generation = r.data;
      genError = r.error;
    };

    for (let attempt = 1; attempt <= 6; attempt++) {
      await insertOnce();
      if (!genError) break;

      const code = genError?.code ? String(genError.code) : '';
      const msg = genError?.message ? String(genError.message) : String(genError);

      if (code === 'PGRST204') {
        const missing = extractMissingColumn(msg);
        if (missing && !omittedCols.has(missing)) {
          omittedCols.add(missing);
          continue;
        }
        if (/metadata/i.test(msg) && !omittedCols.has('metadata')) {
          omittedCols.add('metadata');
          continue;
        }
        if (/charged_stars/i.test(msg) && !omittedCols.has('charged_stars')) {
          omittedCols.add('charged_stars');
          continue;
        }
        if (/sku/i.test(msg) && !omittedCols.has('sku')) {
          omittedCols.add('sku');
          continue;
        }
        if (/pricing_version/i.test(msg) && !omittedCols.has('pricing_version')) {
          omittedCols.add('pricing_version');
          continue;
        }
      }

      if (code === '23503' || /foreign key/i.test(msg)) {
        try {
          await ensureProfileExists(supabase, userId);
          continue;
        } catch (e) {
          console.error('[Animate] Retry after ensureProfileExists failed:', e);
        }
      }

      break;
    }

    if (genError || !generation) {
      console.error('[Animate] Failed to save generation:', JSON.stringify(genError, null, 2));
      return NextResponse.json(
        {
          error: 'Failed to create generation record',
          details: genError?.message || String(genError),
        },
        { status: 500 }
      );
    }

    // Списать кредиты
    console.log('[⭐ AUDIT_PRECHARGE]', JSON.stringify({
      model: modelId,
      mode: 'animate',
      duration,
      quality: finalQuality,
      calculatedStars: creditCost,
      userId,
      generationId: generation.id,
    }));

    const deductResult = await deductCredits(supabase, userId, creditCost);
    if (!deductResult.success) {
      console.error('[Animate] Failed to deduct credits');

      await supabase.from('generations').delete().eq('id', generation.id);

      return NextResponse.json(
        { error: 'Failed to deduct credits', message: 'Не удалось списать кредиты' },
        { status: 500 }
      );
    }

    console.log('[Animate] Credits deducted:', {
      userId,
      amount: creditCost,
      newBalance: deductResult.totalBalance,
    });

    // Получить KIE client
    let kieClient: any;
    try {
      const pool = String(process.env.KIE_API_KEY_VIDEO_POOL || '').trim();
      const poolSize = pool ? pool.split(/[\s,]+/).filter(Boolean).length : 0;
      const kieSlot = pickKieKeySlot('video', poolSize);
      if (generation?.id && kieSlot != null) {
        await supabase
          .from('generations')
          .update({ metadata: { ...(generation as any).metadata, kie_key_slot: kieSlot } })
          .eq('id', generation.id);
      }
      kieClient = getKieClient({ scope: 'video', slot: kieSlot });
    } catch (error) {
      console.error('[Animate] KIE client error:', error);

      await refundCredits(supabase, userId, generation.id, creditCost, 'kie_unavailable', {
        error: String(error),
      });

      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: 'KIE API недоступен' })
        .eq('id', generation.id);

      return integrationNotConfigured('kie', ['KIE_API_KEY']);
    }

    // Подготовить callback URL
    const callbackSecret = process.env.KIE_CALLBACK_SECRET;
    const callbackBase = process.env.KIE_CALLBACK_URL || process.env.NEXT_PUBLIC_BASE_URL;
    let callbackUrl: string | undefined;

    if (callbackBase && callbackSecret) {
      callbackUrl = `${callbackBase}/api/webhooks/kie?secret=${encodeURIComponent(callbackSecret)}`;
    }

    console.log('[Animate] Calling KIE API:', {
      model: apiModel,
      mode,
      imageUrl: imageUrl.substring(0, 50) + '...',
      videoUrl: videoUrl.substring(0, 50) + '...',
      quality: finalQuality,
      hasCallback: !!callbackUrl,
    });

    // Вызвать KIE API
    let kieResponse: any;
    try {
      kieResponse = await kieClient.animateVideo({
        model: apiModel,
        imageUrl,
        videoUrl,
        quality: finalQuality,
        prompt,
        callbackUrl,
      });
    } catch (error: any) {
      console.error('[Animate] KIE API error:', error);

      await refundCredits(supabase, userId, generation.id, creditCost, 'kie_error', {
        error: error?.message || String(error),
      });

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
      console.error('[Animate] KIE response missing taskId:', kieResponse);

      await refundCredits(supabase, userId, generation.id, creditCost, 'no_task_id', {
        response: JSON.stringify(kieResponse),
      });

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
      console.error('[Animate] Failed to update generation with taskId:', updateError);
    }

    console.log('[Animate] Success:', {
      generationId: generation.id,
      taskId,
      creditCost,
      mode,
    });

    // Логирование generation run
    try {
      await supabase.from('generation_runs').insert({
        generation_id: generation.id,
        user_id: userId,
        provider: 'animate',
        provider_model: apiModel,
        variant_key: modelId,
        stars_charged: creditCost,
        status: 'queued',
      });
    } catch (logError) {
      console.error('[Animate] Failed to log generation run:', logError);
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
      estimatedTime: 180, // ~3 минуты
    });
  } catch (error: any) {
    console.error('[Animate] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error?.message || 'Внутренняя ошибка сервера',
      },
      { status: 500 }
    );
  }
}
