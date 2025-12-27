import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getKieClient } from "@/lib/api/kie-client";
import { getModelById } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { requireAuth } from "@/lib/auth/requireRole";

interface BatchImageInput {
  id: string; // ID изображения из клиента
  data: string; // base64 dataURL
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt,
      model: modelId, 
      images, // Array<BatchImageInput>
      quality,
      aspectRatio,
      negativePrompt,
    } = body;

    // Валидация
    if (!prompt || !modelId || !images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, model, images" },
        { status: 400 }
      );
    }

    if (images.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 images per batch" },
        { status: 400 }
      );
    }

    // Проверка auth
    const auth = await requireAuth();
    const userId = auth.authUserId;

    // Получаем модель
    const modelInfo = getModelById(modelId);
    if (!modelInfo || modelInfo.type !== 'photo') {
      return NextResponse.json(
        { error: "Invalid photo model" },
        { status: 400 }
      );
    }

    // Проверка поддержки i2i
    if (!('supportsI2i' in modelInfo) || !modelInfo.supportsI2i) {
      return NextResponse.json(
        { error: "Model does not support image-to-image generation" },
        { status: 400 }
      );
    }

    // Рассчитываем общую стоимость
    const pricePerImage = computePrice(modelId, { quality, variants: 1 }).stars;
    const totalCost = pricePerImage * images.length;

    // Проверяем баланс
    const supabase = getSupabaseAdmin();
    const { data: profile } = await supabase
      .from('profiles')
      .select('stars')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.stars < totalCost) {
      return NextResponse.json(
        { 
          error: "Insufficient credits",
          required: totalCost,
          available: profile?.stars || 0
        },
        { status: 402 }
      );
    }

    // Списываем кредиты сразу
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: totalCost,
    });

    if (deductError) {
      console.error('[Batch API] Failed to deduct credits:', deductError);
      return NextResponse.json(
        { error: "Failed to process payment" },
        { status: 500 }
      );
    }

    // Создаем batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Создаем записи генераций
    const jobs: Array<{ clientId: string; generationId: string }> = [];

    for (const image of images) {
      const { data: generation, error: createError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          type: 'photo',
          model_id: modelId,
          model_name: modelInfo.name,
          prompt,
          negative_prompt: negativePrompt,
          aspect_ratio: aspectRatio,
          status: 'pending',
          credits_used: pricePerImage,
          // Можно добавить поле batch_id если оно есть в схеме
          // batch_id: batchId,
        })
        .select('id')
        .single();

      if (createError || !generation) {
        console.error('[Batch API] Failed to create generation:', createError);
        continue;
      }

      jobs.push({
        clientId: image.id,
        generationId: generation.id,
      });
    }

    // Запускаем обработку асинхронно
    // В продакшене это должно быть через очередь (BullMQ, Redis Queue, etc.)
    processImagesAsync(jobs, images, {
      modelId,
      modelInfo,
      prompt,
      quality,
      aspectRatio,
      negativePrompt,
      userId,
    }).catch(err => {
      console.error('[Batch API] Async processing error:', err);
    });

    return NextResponse.json({
      batchId,
      jobs,
      totalCost,
      status: 'queued',
      message: `Queued ${jobs.length} images for processing`,
    });

  } catch (error) {
    console.error('[Batch API] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Асинхронная обработка (в продакшене использовать очередь)
async function processImagesAsync(
  jobs: Array<{ clientId: string; generationId: string }>,
  images: BatchImageInput[],
  params: any
) {
  const supabase = getSupabaseAdmin();
  const kieClient = getKieClient();

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const image = images.find(img => img.id === job.clientId);
    
    if (!image) continue;

    try {
      // Обновляем статус
      await supabase
        .from('generations')
        .update({ status: 'processing' })
        .eq('id', job.generationId);

      // Отправляем запрос в KIE API
      const response = await kieClient.generateImage({
        model: params.modelId,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        aspectRatio: params.aspectRatio,
        quality: params.quality,
        referenceImage: image.data,
        mode: 'i2i',
      });

      // Обновляем результат
      await supabase
        .from('generations')
        .update({
          status: 'success',
          result_urls: [response.imageUrl],
          asset_url: response.imageUrl,
          preview_url: response.imageUrl,
          task_id: response.taskId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.generationId);

    } catch (error) {
      console.error(`[Batch] Failed to process image ${job.clientId}:`, error);
      
      // Обновляем статус ошибки
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.generationId);
    }

    // Небольшая пауза между запросами
    if (i < jobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// GET - проверить статус batch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const jobIds = searchParams.get('jobIds')?.split(',') || [];

    if (!jobIds.length) {
      return NextResponse.json(
        { error: "Missing jobIds parameter" },
        { status: 400 }
      );
    }

    const auth = await requireAuth();
    const userId = auth.authUserId;
    const supabase = getSupabaseAdmin();

    // Получаем статусы генераций
    const { data: generations, error } = await supabase
      .from('generations')
      .select('id, status, result_urls, error, preview_url')
      .in('id', jobIds)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const results = generations?.map(gen => ({
      generationId: gen.id,
      status: gen.status,
      imageUrl: gen.result_urls?.[0] || gen.preview_url,
      error: gen.error,
    })) || [];

    const pending = results.filter(r => r.status === 'pending' || r.status === 'processing').length;
    const completed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      batchId,
      results,
      summary: {
        total: results.length,
        pending,
        completed,
        failed,
      },
      isComplete: pending === 0,
    });

  } catch (error) {
    console.error('[Batch Status API] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

