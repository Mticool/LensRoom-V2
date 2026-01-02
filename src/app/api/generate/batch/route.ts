import { NextRequest, NextResponse } from "next/server";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getKieClient } from "@/lib/api/kie-client";
import { PHOTO_MODELS, getModelById, PhotoModelConfig } from "@/config/models";
import { computePrice } from "@/lib/pricing/compute-price";
import { requireAuth } from "@/lib/auth/requireRole";
import { ensureProfileExists } from "@/lib/supabase/ensure-profile";

// Types
interface BatchImage {
  id: string;        // Client-side ID
  data: string;      // Base64 dataURL
}

interface BatchRequest {
  prompt: string;
  model: string;
  images: BatchImage[];
  quality?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

interface BatchJob {
  clientId: string;
  generationId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  imageUrl?: string;
  error?: string;
}

// Constants
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/generate/batch
 * Create batch generation task
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Batch API] Starting batch generation...');

  try {
    // 1. Parse and validate request
    const body: BatchRequest = await request.json();
    const { prompt, model, images, quality, aspectRatio, negativePrompt } = body;

    // Basic validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ 
        error: `Maximum ${MAX_IMAGES} images allowed`, 
        maxImages: MAX_IMAGES,
        received: images.length 
      }, { status: 400 });
    }

    // Validate each image
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.id || !img.data) {
        return NextResponse.json({ 
          error: `Image ${i + 1} missing id or data`,
          index: i 
        }, { status: 400 });
      }

      // Check base64 format
      if (!img.data.startsWith('data:image/')) {
        return NextResponse.json({ 
          error: `Image ${i + 1} must be base64 dataURL`,
          index: i 
        }, { status: 400 });
      }

      // Check approximate size (base64 is ~33% larger than original)
      const base64Size = img.data.length * 0.75;
      if (base64Size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ 
          error: `Image ${i + 1} exceeds 10MB limit`,
          index: i 
        }, { status: 400 });
      }
    }

    // 2. Validate model
    const modelInfo = getModelById(model) as PhotoModelConfig | undefined;
    if (!modelInfo || modelInfo.type !== 'photo') {
      return NextResponse.json({ 
        error: "Invalid model", 
        availableModels: PHOTO_MODELS.filter(m => m.supportsI2i).map(m => m.id) 
      }, { status: 400 });
    }

    // Check if model supports i2i (image-to-image)
    if (!modelInfo.supportsI2i) {
      return NextResponse.json({ 
        error: `Model ${model} does not support image-to-image mode`,
        hint: "Choose a model that supports i2i" 
      }, { status: 400 });
    }

    // 3. Calculate total price
    const pricePerImage = computePrice(model, { quality }).stars;
    const totalCost = pricePerImage * images.length;

    console.log('[Batch API] Price calculation:', {
      model,
      quality,
      pricePerImage,
      imageCount: images.length,
      totalCost
    });

    // 4. Authenticate user
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
          { error: "Unauthorized. Please log in." },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: "User account not found." },
          { status: 404 }
        );
      }
    }

    console.log('[Batch API] User authenticated:', { userId, userRole, skipCredits });

    const supabase = getSupabaseAdmin();

    // Ensure profile exists
    try {
      await ensureProfileExists(supabase, userId);
    } catch (e) {
      console.error("[Batch API] Failed to ensure profile:", e);
    }

    // 5. Check credits
    if (!skipCredits) {
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', userId)
        .single();

      if (creditsError || !creditsData) {
        return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
      }

      if (creditsData.amount < totalCost) {
        return NextResponse.json({
          error: "Insufficient credits",
          required: totalCost,
          available: creditsData.amount,
          message: `Нужно ${totalCost} ⭐, у вас ${creditsData.amount} ⭐`
        }, { status: 402 });
      }

      // Deduct credits atomically
      const newBalance = creditsData.amount - totalCost;
      const { error: deductError } = await supabase
        .from('credits')
        .update({ 
          amount: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (deductError) {
        console.error('[Batch API] Failed to deduct credits:', deductError);
        return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 });
      }

      console.log('[Batch API] Credits deducted:', { oldBalance: creditsData.amount, newBalance, totalCost });
    }

    // 6. Create batch ID and generation records
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const jobs: BatchJob[] = [];

    console.log('[Batch API] Creating generation records for batch:', batchId);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      
      const { data: genData, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          type: 'photo',
          model_id: model,
          model_name: modelInfo.name,
          prompt: prompt,
          negative_prompt: negativePrompt || null,
          credits_used: pricePerImage,
          status: 'pending',
          metadata: {
            batch_id: batchId,
            batch_index: i,
            client_id: img.id,
            mode: 'i2i',
            quality,
            aspect_ratio: aspectRatio,
          }
        })
        .select('id')
        .single();

      if (genError) {
        console.error(`[Batch API] Failed to create generation ${i + 1}:`, genError);
        jobs.push({
          clientId: img.id,
          generationId: '',
          status: 'failed',
          error: 'Failed to create generation record'
        });
        continue;
      }

      jobs.push({
        clientId: img.id,
        generationId: genData.id,
        status: 'pending'
      });
    }

    // Record transaction
    if (!skipCredits) {
      try {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: -totalCost,
          type: 'deduction',
          description: `Batch генерация: ${images.length} изображений (${model})`,
          metadata: { batch_id: batchId }
        });
      } catch (e) {
        console.error('[Batch API] Failed to record transaction:', e);
      }
    }

    // 7. Start processing images in background
    processImagesInBackground(jobs, images, {
      prompt,
      model,
      modelInfo,
      quality,
      aspectRatio,
      negativePrompt,
      batchId,
      userId
    });

    const elapsed = Date.now() - startTime;
    console.log('[Batch API] Batch queued successfully:', { batchId, jobCount: jobs.length, elapsed });

    return NextResponse.json({
      batchId,
      jobs: jobs.map(j => ({ clientId: j.clientId, generationId: j.generationId })),
      totalCost,
      pricePerImage,
      imageCount: images.length,
      status: 'queued',
      message: `Queued ${jobs.filter(j => j.status !== 'failed').length} images for processing`
    });

  } catch (error) {
    console.error('[Batch API] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/generate/batch
 * Check batch status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobIds = searchParams.get('jobIds');
    const batchId = searchParams.get('batchId');

    if (!jobIds) {
      return NextResponse.json({ error: "jobIds parameter is required" }, { status: 400 });
    }

    // Authenticate
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch (error) {
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    const supabase = getSupabaseAdmin();
    const ids = jobIds.split(',').filter(Boolean);

    // Fetch generation statuses
    const { data: generations, error } = await supabase
      .from('generations')
      .select('id, status, result_urls, asset_url, preview_url, error, metadata')
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      console.error('[Batch API] Failed to fetch generations:', error);
      return NextResponse.json({ error: "Failed to fetch batch status" }, { status: 500 });
    }

    // Map results
    const results = ids.map(id => {
      const gen = generations?.find((g: { id: string }) => g.id === id);
      if (!gen) {
        return { generationId: id, status: 'not_found', imageUrl: null, error: 'Generation not found' };
      }

      let imageUrl = gen.asset_url || gen.preview_url;
      if (!imageUrl && gen.result_urls && Array.isArray(gen.result_urls) && gen.result_urls.length > 0) {
        imageUrl = gen.result_urls[0];
      }

      return {
        generationId: gen.id,
        status: mapStatus(gen.status),
        imageUrl,
        error: gen.error || null,
        clientId: gen.metadata?.client_id || null
      };
    });

    // Calculate summary
    const summary = {
      total: results.length,
      pending: results.filter(r => r.status === 'pending' || r.status === 'processing').length,
      completed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    };

    const isComplete = summary.pending === 0;

    return NextResponse.json({
      batchId: batchId || null,
      results,
      summary,
      isComplete
    });

  } catch (error) {
    console.error('[Batch API GET] Error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper: map DB status to API status
function mapStatus(dbStatus: string): 'pending' | 'processing' | 'success' | 'failed' {
  switch (dbStatus) {
    case 'completed':
    case 'success':
      return 'success';
    case 'failed':
    case 'error':
      return 'failed';
    case 'processing':
    case 'generating':
      return 'processing';
    default:
      return 'pending';
  }
}

// Background processing function
async function processImagesInBackground(
  jobs: BatchJob[],
  images: BatchImage[],
  options: {
    prompt: string;
    model: string;
    modelInfo: PhotoModelConfig;
    quality?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    batchId: string;
    userId: string;
  }
) {
  const { prompt, model, modelInfo, quality, aspectRatio, negativePrompt, batchId, userId } = options;
  const supabase = getSupabaseAdmin();
  
  console.log(`[Batch Worker] Starting background processing for batch ${batchId}`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (job.status === 'failed' || !job.generationId) continue;

    const image = images.find(img => img.id === job.clientId);
    if (!image) {
      console.error(`[Batch Worker] Image not found for clientId: ${job.clientId}`);
      continue;
    }

    try {
      console.log(`[Batch Worker] Processing image ${i + 1}/${jobs.length}: ${job.generationId}`);

      // Update status to processing
      await supabase
        .from('generations')
        .update({ status: 'processing' })
        .eq('id', job.generationId);

      // Get KIE client
      const kieClient = getKieClient();

      // Build API request
      const apiPayload: any = {
        prompt,
        input_image: image.data,
      };

      if (negativePrompt) apiPayload.negative_prompt = negativePrompt;
      if (aspectRatio) apiPayload.aspect_ratio = aspectRatio;

      // Determine API endpoint based on model
      let apiEndpoint = modelInfo.apiId || model;
      if (apiEndpoint.includes('t2i')) {
        apiEndpoint = apiEndpoint.replace('t2i', 'i2i');
      } else if (!apiEndpoint.includes('i2i')) {
        apiEndpoint = `${apiEndpoint}-i2i`;
      }

      console.log(`[Batch Worker] Calling KIE API:`, { endpoint: apiEndpoint, generationId: job.generationId });

      // Create task
      const response = await kieClient.createTask({
        model: apiEndpoint,
        input: apiPayload,
      });

      const taskId = response.data?.taskId;
      if (!taskId) {
        throw new Error('No taskId in response');
      }

      // Update with task ID
      await supabase
        .from('generations')
        .update({ task_id: taskId, status: 'generating' })
        .eq('id', job.generationId);

      // Poll for result
      const result = await pollForResult(kieClient, taskId, job.generationId);

      if (result.success && result.urls && result.urls.length > 0) {
        await supabase
          .from('generations')
          .update({
            status: 'completed',
            result_urls: result.urls,
            asset_url: result.urls[0],
            preview_url: result.urls[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', job.generationId);

        console.log(`[Batch Worker] Image ${i + 1} completed:`, result.urls[0]);
      } else {
        throw new Error(result.error || 'Generation failed');
      }

    } catch (error) {
      console.error(`[Batch Worker] Error processing image ${i + 1}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.generationId);
    }

    // Small delay between requests to avoid rate limiting
    if (i < jobs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[Batch Worker] Batch ${batchId} processing complete`);
}

// Poll KIE API for result
async function pollForResult(
  kieClient: any,
  taskId: string,
  generationId: string,
  maxAttempts = 60,
  pollInterval = 3000
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  console.log(`[Batch Poll] Starting poll for task: ${taskId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await kieClient.queryTask(taskId);
      
      const recordInfo = result?.data?.recordInfo;
      if (!recordInfo) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      const successFlag = recordInfo.successFlag;

      // Success (successFlag === 1)
      if (successFlag === 1) {
        const urls = recordInfo.response?.resultUrls || [];
        if (urls.length > 0) {
          return { success: true, urls };
        }
        // Check for image in different locations
        if (recordInfo.response?.image) {
          return { success: true, urls: [recordInfo.response.image] };
        }
        if (recordInfo.imageUrl) {
          return { success: true, urls: [recordInfo.imageUrl] };
        }
      }

      // Failed (successFlag === 2)
      if (successFlag === 2) {
        const errorMsg = recordInfo.response?.errorMessage || recordInfo.errorMessage || 'Generation failed';
        return { success: false, error: errorMsg };
      }

      // Still processing (successFlag === 0), continue polling
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error(`[Batch Poll] Error on attempt ${attempt + 1}:`, error);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  return { success: false, error: 'Timeout waiting for generation result' };
}
