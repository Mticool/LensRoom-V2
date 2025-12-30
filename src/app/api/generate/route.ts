import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { computePrice } from '@/lib/pricing/compute-price';
import { VIDEO_MODELS } from '@/config/models';

export const maxDuration = 300; // 5 minutes

interface GenerateRequest {
  type: 'text' | 'image' | 'video' | 'audio';
  model: string;
  prompt: string;
  settings?: {
    quality?: string;
    aspectRatio?: string;
    style?: string;
    duration?: string;
    fps?: string;
    voice?: string;
    speed?: number;
    tone?: string;
    length?: string;
    language?: string;
    [key: string]: any;
  };
  files?: string[]; // Base64 encoded files or URLs
}

/**
 * POST /api/generate
 * Universal generation endpoint for all content types
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const telegramSession = await getSession();
    if (!telegramSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getAuthUserId(telegramSession);
    if (!userId) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // Parse request
    const body: GenerateRequest = await request.json();
    
    if (!body.type || !body.model || !body.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: type, model, prompt' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Calculate cost
    let costStars = 0;
    if (body.type === 'video') {
      const videoModel = VIDEO_MODELS.find(m => m.id === body.model);
      if (videoModel) {
        const duration = parseInt(body.settings?.duration || '10');
        const quality = body.settings?.quality || 'HD';
        const priceResult = computePrice(body.model, {
          duration,
          videoQuality: quality,
          mode: 't2v',
        });
        costStars = priceResult.stars || 100;
      } else {
        costStars = 100; // Default fallback
      }
    } else if (body.type === 'image') {
      // Image cost based on model
      const costMap: Record<string, number> = {
        'nano-banana-pro': 35,
        'flux-2-pro': 10,
        'gpt-image': 42,
        'seedream-4.5': 11,
        'z-image': 2,
      };
      costStars = costMap[body.model] || 20;
    } else if (body.type === 'text') {
      const costMap: Record<string, number> = {
        'chatgpt-4.5': 30,
        'claude-3.5': 35,
        'gemini-advanced': 25,
      };
      costStars = costMap[body.model] || 25;
    } else if (body.type === 'audio') {
      const costMap: Record<string, number> = {
        'elevenlabs': 15,
        'suno': 20,
        'google-tts': 5,
        'azure-tts': 7,
      };
      costStars = costMap[body.model] || 10;
    }

    // Check balance
    const { data: creditsData } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', userId)
      .single();

    const currentBalance = creditsData?.amount || 0;
    if (currentBalance < costStars) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          required: costStars,
          balance: currentBalance,
        },
        { status: 402 }
      );
    }

    // Create generation record
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        type: body.type === 'image' ? 'photo' : body.type,
        model_id: body.model,
        model_name: body.model,
        prompt: body.prompt,
        status: 'pending',
        credits_used: costStars,
      })
      .select()
      .single();

    if (genError) {
      console.error('[Generate API] Error creating generation:', genError);
      return NextResponse.json({ error: genError.message }, { status: 500 });
    }

    // Deduct credits
    const { error: deductError } = await supabase
      .from('credits')
      .update({ amount: currentBalance - costStars })
      .eq('user_id', userId);

    if (deductError) {
      console.error('[Generate API] Error deducting credits:', deductError);
      // Rollback generation
      await supabase.from('generations').delete().eq('id', generation.id);
      return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
    }

    // Route to appropriate generation service
    let jobId: string | null = null;
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending';
    let resultUrl: string | undefined;

    try {
      switch (body.type) {
        case 'image':
          // Delegate to existing photo generation
          const photoRes = await fetch(`${request.nextUrl.origin}/api/generate/photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              generationId: generation.id,
              userId,
            }),
          });
          
          if (photoRes.ok) {
            const photoData = await photoRes.json();
            jobId = photoData.jobId;
            status = 'processing';
          }
          break;

        case 'video':
          // Delegate to existing video generation
          const videoRes = await fetch(`${request.nextUrl.origin}/api/generate/video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              generationId: generation.id,
              userId,
            }),
          });
          
          if (videoRes.ok) {
            const videoData = await videoRes.json();
            jobId = videoData.jobId;
            status = 'processing';
          }
          break;

        case 'text':
          // Mock text generation (implement actual API call)
          status = 'completed';
          resultUrl = 'mock-text-result';
          await supabase
            .from('generations')
            .update({
              status: 'completed',
              asset_url: resultUrl,
            })
            .eq('id', generation.id);
          break;

        case 'audio':
          // Mock audio generation (implement actual API call)
          status = 'processing';
          jobId = `audio_${Date.now()}`;
          break;
      }

      // Update generation with job ID
      if (jobId) {
        await supabase
          .from('generations')
          .update({
            task_id: jobId,
            status,
          })
          .eq('id', generation.id);
      }

    } catch (serviceError) {
      console.error('[Generate API] Service error:', serviceError);
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error: serviceError instanceof Error ? serviceError.message : 'Generation service error',
        })
        .eq('id', generation.id);

      return NextResponse.json(
        {
          generationId: generation.id,
          status: 'failed' as const,
          error: 'Generation service unavailable',
          costStars,
        },
        { status: 200 } // Return 200 but with failed status
      );
    }

    return NextResponse.json({
      generationId: generation.id,
      status,
      jobId,
      resultUrl,
      costStars,
      estimatedTime: body.type === 'video' ? 120 : body.type === 'image' ? 30 : 5,
    });

  } catch (error) {
    console.error('[Generate API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
