import { NextRequest, NextResponse } from 'next/server';
import { getKieClient } from '@/lib/api/kie-client';
import { env } from '@/lib/env';

/**
 * Test endpoint for ElevenLabs V3 Text-to-Dialogue API
 * 
 * POST /api/test/elevenlabs
 * Body: { text: "Hello world", language?: "en", stability?: 0.5 }
 * 
 * This endpoint is for testing purposes only and bypasses authentication.
 * Should be disabled in production or protected by admin-only access.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if KIE API key is configured
    const apiKey = env.optional("KIE_API_KEY");
    if (!apiKey) {
      return NextResponse.json(
        { error: 'KIE_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      text = "Привет! Это тестовое сообщение от ElevenLabs V3.",
      language = "auto",
      stability = 0.5,
    } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('[TEST] ElevenLabs V3 test request:', {
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      language,
      stability,
    });

    // Get KIE client
    const kieClient = getKieClient();

    // Build API request for ElevenLabs V3 Text-to-Dialogue
    const apiPayload = {
      dialogue: [{ text }], // ElevenLabs expects array of dialogue objects
      stability: typeof stability === 'number' ? stability : parseFloat(stability) || 0.5,
      language_code: language || 'auto',
    };

    console.log('[TEST] Calling KIE API with payload:', apiPayload);

    // Call KIE API
    const response = await kieClient.createTask({
      model: 'elevenlabs/text-to-dialogue-v3',
      input: apiPayload,
    });

    console.log('[TEST] KIE API response:', response);

    const taskId = response.data?.taskId;

    if (!taskId) {
      return NextResponse.json(
        { 
          error: 'Failed to get taskId from KIE API',
          response: response,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ElevenLabs V3 task created successfully',
      taskId: taskId,
      pollUrl: `/api/jobs/${taskId}`,
      input: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        language,
        stability,
      },
      nextSteps: [
        `Poll status: GET /api/jobs/${taskId}`,
        'Wait for successFlag === 1',
        'Get audio URL from response.data.response.resultUrls',
      ],
    });

  } catch (error) {
    console.error('[TEST] ElevenLabs V3 test error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check API status
 */
export async function GET() {
  const apiKey = env.optional("KIE_API_KEY");
  
  return NextResponse.json({
    status: apiKey ? 'configured' : 'not_configured',
    endpoint: 'elevenlabs/text-to-dialogue-v3',
    documentation: 'https://kie.ai/elevenlabs/text-to-dialogue-v3',
    usage: {
      method: 'POST',
      body: {
        text: 'Your text to convert to speech',
        language: 'auto | ru | en | de | fr | es | ja | zh | ...',
        stability: '0.0 - 1.0 (default: 0.5)',
      },
    },
    audioTags: [
      '[whispers] - шёпот',
      '[laughs] - смех',
      '[sighs] - вздох',
      '[excited] - возбуждённо',
      '[sarcastic] - саркастично',
    ],
    tips: [
      'Используйте эллипсы (...) для пауз',
      'Используйте тире (—) для прерываний',
      'Генерируйте несколько вариантов и выбирайте лучший',
    ],
  });
}
