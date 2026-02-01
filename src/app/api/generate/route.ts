import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
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

    // NOTE: Do NOT deduct credits here. Specific generators handle billing.
    // This avoids double-deduction when delegating to /api/generate/photo|video|audio.

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
          // No DB write here; use specific generator endpoints for persistence.
          break;

        case 'audio':
          // Mock audio generation (implement actual API call)
          status = 'processing';
          jobId = `audio_${Date.now()}`;
          break;
      }

      // Update generation with job ID
      // Specific generators manage their own persistence.

    } catch (serviceError) {
      console.error('[Generate API] Service error:', serviceError);
      return NextResponse.json(
        {
          status: 'failed' as const,
          error: 'Generation service unavailable',
          costStars,
        },
        { status: 200 } // Return 200 but with failed status
      );
    }

    return NextResponse.json({
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
