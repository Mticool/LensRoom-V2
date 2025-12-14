import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { kieAPI } from '@/lib/kie-api';
import { getModelById, VIDEO_MODELS } from '@/lib/models-config';

// Declare global type for pending generations
declare global {
  // eslint-disable-next-line no-var
  var pendingGenerations: Map<string, {
    userId: string;
    model: string;
    prompt: string;
    creditsUsed: number;
    type?: string;
  }> | undefined;
}

interface VideoRequestBody {
  model: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  negativePrompt?: string;
  numImages?: number;
  firstFrame?: string;
  lastFrame?: string;
  cameraMovement?: string;
  cameraSpeed?: number;
  scenes?: unknown[];
  quality?: string;
}

export async function POST(request: NextRequest) {
  try {
    let model: string;
    let prompt: string;
    let aspectRatio: string = '16:9';
    let duration: number = 5;
    let firstFrameUrl: string | undefined;
    let lastFrameUrl: string | undefined;
    let cameraMovement: string | undefined;
    let cameraSpeed: number | undefined;
    let scenes: unknown[] | null = null;
    let quality: string | undefined;

    // Check Content-Type and parse accordingly
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Parse JSON body
      const body: VideoRequestBody = await request.json();
      model = body.model;
      prompt = body.prompt;
      aspectRatio = body.aspectRatio || '16:9';
      duration = body.duration || 5;
      firstFrameUrl = body.firstFrame;
      lastFrameUrl = body.lastFrame;
      cameraMovement = body.cameraMovement;
      cameraSpeed = body.cameraSpeed;
      scenes = body.scenes || null;
      quality = body.quality;
    } else {
      // Parse FormData
      const formData = await request.formData();
      
      model = formData.get('model') as string;
      prompt = formData.get('prompt') as string;
      aspectRatio = (formData.get('aspectRatio') as string) || '16:9';
      duration = parseInt(formData.get('duration') as string || '5');
      cameraMovement = formData.get('cameraMovement') as string | undefined;
      cameraSpeed = formData.get('cameraSpeed') ? parseInt(formData.get('cameraSpeed') as string) : undefined;
      quality = formData.get('quality') as string | undefined;
      
      // Handle file uploads
      const firstFrameFile = formData.get('firstFrame') as File | null;
      const lastFrameFile = formData.get('lastFrame') as File | null;
      const scenesJson = formData.get('scenes') as string | null;

      if (firstFrameFile && firstFrameFile.size > 0) {
        const uploadResult = await kieAPI.uploadImage(firstFrameFile);
        if (uploadResult.success && uploadResult.url) {
          firstFrameUrl = uploadResult.url;
        }
      }

      if (lastFrameFile && lastFrameFile.size > 0) {
        const uploadResult = await kieAPI.uploadImage(lastFrameFile);
        if (uploadResult.success && uploadResult.url) {
          lastFrameUrl = uploadResult.url;
        }
      }

      if (scenesJson) {
        try {
          scenes = JSON.parse(scenesJson);
        } catch {
          console.error('Failed to parse scenes JSON');
        }
      }
    }

    // Validate required fields
    if (!model || !prompt) {
      return NextResponse.json(
        { error: 'Model and prompt are required' },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get model config
    const modelConfig = getModelById(model);
    if (!modelConfig || modelConfig.type !== 'video') {
      return NextResponse.json({ 
        error: 'Invalid video model',
        availableModels: VIDEO_MODELS.map(m => m.id),
      }, { status: 400 });
    }

    const creditsNeeded = modelConfig.credits;

    // Check credits
    const { data: creditsData, error: creditsError } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !creditsData) {
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }

    if (creditsData.amount < creditsNeeded) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: creditsNeeded,
        current: creditsData.amount,
        message: `Нужно ${creditsNeeded} кредитов, у вас ${creditsData.amount}`,
      }, { status: 402 });
    }

    // Prepare camera control if provided
    let cameraControl: { movement: string; speed: number } | undefined;
    if (cameraMovement) {
      cameraControl = {
        movement: cameraMovement,
        speed: cameraSpeed || 50,
      };
    }

    // Generate video
    const result = await kieAPI.generateVideo({
      model,
      prompt,
      aspectRatio,
      duration,
      firstFrame: firstFrameUrl,
      lastFrame: lastFrameUrl,
      cameraControl,
      quality,
    });

    if (!result.success || !result.taskId) {
      throw new Error(result.error || 'Generation failed');
    }

    // Deduct credits
    const { error: deductError } = await supabase
      .from('credits')
      .update({ 
        amount: creditsData.amount - creditsNeeded,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Failed to deduct credits:', deductError);
    }

    // Store generation info for later saving (when completed)
    if (!global.pendingGenerations) {
      global.pendingGenerations = new Map();
    }
    global.pendingGenerations.set(result.taskId, {
      userId: user.id,
      model,
      prompt,
      creditsUsed: creditsNeeded,
      type: 'video',
    });

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      creditsUsed: creditsNeeded,
      remainingCredits: creditsData.amount - creditsNeeded,
      estimatedTime: result.estimatedTime,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Video generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
