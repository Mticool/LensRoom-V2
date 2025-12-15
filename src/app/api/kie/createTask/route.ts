import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getKieModel, validateModelInput } from '@/config/kieModels';

const KIE_API_KEY = process.env.KIE_API_KEY;
const KIE_MARKET_BASE_URL = process.env.KIE_MARKET_BASE_URL || 'https://api.kie.ai';
const KIE_UPLOAD_BASE_URL = process.env.KIE_UPLOAD_BASE_URL || 'https://kieai.redpandaai.co';
const KIE_CALLBACK_SECRET = process.env.KIE_CALLBACK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lensroom.ru';

if (!KIE_API_KEY) {
  console.error('[KIE createTask] Missing KIE_API_KEY');
}

if (!KIE_CALLBACK_SECRET) {
  console.warn('[KIE createTask] Missing KIE_CALLBACK_SECRET - callbacks will not be secure');
}

// ===== TYPES =====

interface CreateTaskRequestBody {
  modelKey: string; // our internal model ID
  prompt: string;
  options?: Record<string, unknown>;
  assets?: {
    imageUrl?: string;
    imageBase64?: string;
  };
}

interface KieUploadResponse {
  code: number;
  message: string;
  data?: {
    url?: string;
    fileUrl?: string;
  };
}

// ===== HELPERS =====

async function uploadImageToKie(imageData: { url?: string; base64?: string }): Promise<string> {
  if (!KIE_API_KEY) {
    throw new Error('KIE_API_KEY not configured');
  }

  try {
    // If we have URL, use url-upload endpoint
    if (imageData.url) {
      const response = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-url-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageData.url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KIE Upload] URL upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data: KieUploadResponse = await response.json();
      if (data.code !== 0 || !data.data?.url) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.data.url;
    }

    // If we have base64, use base64-upload endpoint
    if (imageData.base64) {
      const response = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-base64-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: imageData.base64 }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[KIE Upload] Base64 upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data: KieUploadResponse = await response.json();
      if (data.code !== 0 || !data.data?.fileUrl) {
        throw new Error(data.message || 'Upload failed');
      }

      return data.data.fileUrl;
    }

    throw new Error('No image data provided');
  } catch (error) {
    console.error('[KIE Upload] Error:', error);
    throw error;
  }
}

// ===== MAIN HANDLER =====

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Parse request
    const body: CreateTaskRequestBody = await request.json();
    const { modelKey, prompt, options = {}, assets } = body;

    console.log(`[KIE createTask] Starting for model: ${modelKey}`);

    // 2. Validate model
    const model = getKieModel(modelKey);
    if (!model) {
      return NextResponse.json(
        { error: `Model ${modelKey} not found` },
        { status: 400 }
      );
    }

    // 3. Check auth
    const telegramSession = await getSession();
    if (!telegramSession) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = await getAuthUserId(telegramSession);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Check credits
    const supabase = getSupabaseAdmin();
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

    if (creditsData.amount < model.starsCost) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: model.starsCost,
          available: creditsData.amount,
        },
        { status: 402 }
      );
    }

    // 5. Prepare input for KIE API
    let kieInput: Record<string, unknown> = {
      prompt,
      ...options,
    };

    // 6. Upload image if needed (for i2v models)
    if (model.mode === 'i2v' && assets) {
      try {
        const uploadedUrl = await uploadImageToKie({
          url: assets.imageUrl,
          base64: assets.imageBase64,
        });
        kieInput.imageUrl = uploadedUrl;
        console.log(`[KIE createTask] Image uploaded: ${uploadedUrl}`);
      } catch (uploadError) {
        console.error('[KIE createTask] Image upload failed:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload image', details: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // 7. Apply model-specific transformations
    // For Kling: duration must be string
    if (model.apiModel.includes('kling') && kieInput.duration !== undefined) {
      kieInput.duration = String(kieInput.duration);
    }

    // For FLUX.2 Pro: ensure resolution and aspectRatio
    if (model.apiModel.includes('flux-2')) {
      if (!kieInput.resolution) kieInput.resolution = '2K';
      if (!kieInput.aspectRatio) kieInput.aspectRatio = '16:9';
    }

    // 8. Validate input
    const validation = validateModelInput(modelKey, kieInput);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.errors },
        { status: 400 }
      );
    }

    // 9. Prepare callback URL
    const callBackUrl = KIE_CALLBACK_SECRET 
      ? `${APP_URL}/api/kie/callback?secret=${KIE_CALLBACK_SECRET}`
      : undefined;

    // 10. Create task in Market API
    const kiePayload = {
      model: model.apiModel,
      callBackUrl,
      input: kieInput,
    };

    console.log(`[KIE createTask] Calling Market API with:`, JSON.stringify(kiePayload, null, 2));

    const response = await fetch(`${KIE_MARKET_BASE_URL}/api/v1/jobs/createTask`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(kiePayload),
    });

    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[KIE createTask] Failed to parse response:', responseText);
      return NextResponse.json(
        { error: 'Invalid response from KIE API', details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    if (!response.ok || responseData.code !== 0) {
      console.error('[KIE createTask] API error:', {
        status: response.status,
        code: responseData.code,
        message: responseData.message || responseData.msg,
        data: responseData.data,
      });

      return NextResponse.json(
        { 
          error: responseData.message || responseData.msg || 'KIE API error',
          code: responseData.code,
          details: responseData.data,
        },
        { status: response.status }
      );
    }

    const taskId = responseData.data?.taskId;
    if (!taskId) {
      return NextResponse.json(
        { error: 'No taskId in response', response: responseData },
        { status: 500 }
      );
    }

    console.log(`[KIE createTask] Task created: ${taskId}`);

    // 11. Deduct credits
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: model.starsCost,
    });

    if (deductError) {
      console.error('[KIE createTask] Failed to deduct credits:', deductError);
      // Continue anyway - task is already created
    }

    // 12. Save to database (CRITICAL: always insert before callback arrives)
    const { error: insertError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        kind: model.kind,
        model_key: modelKey,
        provider: 'kie',
        task_id: taskId,
        status: 'generating',
        prompt,
        options: kieInput,
        result_urls: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[KIE createTask] Failed to save generation:', insertError);
      // This is critical - if DB insert fails, callback will fail too
      return NextResponse.json(
        { error: 'Failed to save generation to database', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`[KIE createTask] Saved to database with status=generating`);

    const elapsed = Date.now() - startTime;
    console.log(`[KIE createTask] Success in ${elapsed}ms`);

    // 13. Return success
    return NextResponse.json({
      success: true,
      taskId,
      model: model.name,
      starsCost: model.starsCost,
      callbackEnabled: !!callBackUrl,
    });

  } catch (error) {
    console.error('[KIE createTask] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
