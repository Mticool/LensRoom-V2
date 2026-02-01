import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { getCreditBalance, deductCredits } from '@/lib/credits/split-credits';

export async function POST(request: NextRequest) {
  console.log('[Voice Clone] POST request received');
  try {
    let userId: string;
    let skipCredits = false;

    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
      skipCredits = auth.role === "manager" || auth.role === "admin";
    } catch {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = await getAuthUserId(session) || "";
      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { audioFile, voiceName } = body;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const creditCost = 15;

    if (!skipCredits) {
      const balance = await getCreditBalance(supabase, userId);
      if (balance.totalBalance < creditCost) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: creditCost,
          available: balance.totalBalance,
        }, { status: 402 });
      }

      const deductResult = await deductCredits(supabase, userId, creditCost);
      if (!deductResult.success) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }
    }

    // Clone voice via Qwen 3 TTS on Fal.ai  
    const { fal } = await import('@fal-ai/client');
    
    if (!process.env.FAL_KEY) {
      console.error('[Voice Clone] FAL_KEY is missing!');
      throw new Error('FAL_KEY not configured');
    }
    
    console.log('[Voice Clone] FAL_KEY exists:', process.env.FAL_KEY.substring(0, 10) + '...');
    fal.config({ credentials: process.env.FAL_KEY });
    
    // Strip data URI prefix if present
    let base64Data = audioFile;
    if (audioFile.includes(',')) {
      base64Data = audioFile.split(',')[1];
    }
    
    // Detect mime type from base64 magic bytes
    let mimeType = 'audio/wav';
    let ext = 'wav';
    const prefix = base64Data.substring(0, 10);
    
    if (prefix.startsWith('SUQ') || prefix.startsWith('/+N') || prefix.startsWith('//u')) { 
      // ID3 tag (MP3) or MPEG frame sync
      mimeType = 'audio/mpeg'; ext = 'mp3'; 
    } else if (prefix.startsWith('UklG')) { 
      // RIFF header (WAV)
      mimeType = 'audio/wav'; ext = 'wav'; 
    } else if (prefix.startsWith('T2dn')) { 
      // OggS header
      mimeType = 'audio/ogg'; ext = 'ogg'; 
    } else if (prefix.startsWith('AAAA') || prefix.startsWith('AAAF') || prefix.startsWith('AAAAGG')) { 
      // ftyp box (M4A/AAC)
      mimeType = 'audio/mp4'; ext = 'm4a'; 
    }
    
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log('[Voice Clone] Audio:', audioBuffer.length, 'bytes,', mimeType, ext, 'prefix:', prefix);
    
    if (audioBuffer.length < 10000) {
      throw new Error('Файл слишком маленький. Нужно минимум 5 секунд речи.');
    }
    
    // 1) Upload file to fal.storage
    const file = new File([audioBuffer], `voice.${ext}`, { type: mimeType });
    console.log('[Voice Clone] File created:', file.name, file.type, file.size);
    console.log('[Voice Clone] Uploading to fal.storage...');
    
    let audioUrl: string;
    try {
      audioUrl = await fal.storage.upload(file);
      console.log('[Voice Clone] Upload result:', audioUrl);
    } catch (uploadError: any) {
      console.error('[Voice Clone] Upload error:', uploadError?.message, uploadError);
      throw new Error(`Failed to upload to fal.storage: ${uploadError?.message}`);
    }
    
    if (!audioUrl) {
      console.error('[Voice Clone] audioUrl is undefined/empty');
      throw new Error('Upload returned empty URL');
    }

    // 2) Clone voice via Qwen 3 TTS
    console.log('[Voice Clone] Calling fal-ai/qwen-3-tts/clone-voice/1.7b with audio_url:', audioUrl);
    const result = await fal.subscribe('fal-ai/qwen-3-tts/clone-voice/1.7b', {
      input: {
        audio_url: audioUrl,
        language: 'ru',  // ОБЯЗАТЕЛЬНО для Qwen 3 TTS
      },
      logs: true,
    });
    
    console.log('[Voice Clone] Result:', JSON.stringify(result.data));
    
    // Extract speaker_embedding.url (not voice_embedding_url!)
    const speakerEmbedding = (result.data as any)?.speaker_embedding;
    const embeddingUrl = speakerEmbedding?.url;

    if (!embeddingUrl) {
      console.error('[Voice Clone] Missing speaker_embedding.url in:', result.data);
      throw new Error('No speaker_embedding returned from fal.ai');
    }

    console.log('[Voice Clone] Success! Embedding URL:', embeddingUrl);

    // Save to DB (voice_id stores the embedding URL)
    await supabase.from('user_voices').insert({
      user_id: userId,
      voice_id: embeddingUrl,
      voice_name: voiceName || 'Клонированный голос',
      provider: 'qwen3',
    });

    if (!skipCredits) {
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -creditCost,
        type: 'deduction',
        description: 'Клонирование голоса',
      });
    }

    return NextResponse.json({
      success: true,
      voice_id: embeddingUrl,
      voice_name: voiceName || 'Клонированный голос',
    });

  } catch (error: any) {
    console.error('[Voice Clone Error]:', error?.message, error?.body);
    
    // Refund credits on error
    try {
      const supabase = getSupabaseAdmin();
      // Get userId from earlier in the flow
      const session = await getSession();
      if (session) {
        const userId = await getAuthUserId(session);
        if (userId) {
          await deductCredits(supabase, userId, -15); // Refund
          console.log('[Voice Clone] Refunded 15 credits to', userId);
        }
      }
    } catch (refundError) {
      console.error('[Voice Clone] Refund failed:', refundError);
    }
    
    // User-friendly error message
    let errorMessage = 'Ошибка клонирования голоса';
    if (error?.status === 500) {
      errorMessage = 'Не удалось обработать аудио. Попробуйте другой файл (MP3/WAV, 5-30 сек чистой речи).';
    } else if (error?.message?.includes('too small')) {
      errorMessage = 'Файл слишком маленький. Загрузите аудио минимум 5 секунд.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
