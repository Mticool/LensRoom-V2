import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { getMiniMaxClient } from '@/lib/api/minimax-client';

export async function POST(request: NextRequest) {
  try {
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = (await getAuthUserId(session)) || '';
      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { text, voice_id, voice_db_id } = body || {};

    // STRICT VALIDATION: Trim and check text
    const trimmedText = String(text || '').trim();
    if (!trimmedText || trimmedText.length === 0) {
      console.error('[TTS Generate] Validation failed: empty text');
      return NextResponse.json({ error: 'Text is required and cannot be empty' }, { status: 400 });
    }

    if (!voice_id) {
      console.error('[TTS Generate] Validation failed: missing voice_id');
      return NextResponse.json({ error: 'voice_id is required' }, { status: 400 });
    }

    // STRICT VALIDATION: Verify voice_id exists in database
    const supabase = getSupabaseAdmin();
    let resolvedVoiceId = voice_id as string;
    if (voice_db_id) {
      const { data: voiceExists } = await supabase
        .from('voices')
        .select('id, minimax_voice_id')
        .eq('id', voice_db_id)
        .eq('user_id', userId)
        .single();

      if (!voiceExists) {
        console.error('[TTS Generate] Validation failed: voice_id not found in database');
        return NextResponse.json({ error: 'Voice not found or does not belong to user' }, { status: 404 });
      }

      // Ensure we use the correct minimax_voice_id from database
      if (voiceExists.minimax_voice_id && voiceExists.minimax_voice_id !== voice_id) {
        console.warn('[TTS Generate] voice_id mismatch, using database value:', voiceExists.minimax_voice_id);
        resolvedVoiceId = voiceExists.minimax_voice_id;
      }
    }

    console.log('[TTS Generate] Validation passed. Text length:', trimmedText.length, 'voice_id:', resolvedVoiceId);

    const minimax = getMiniMaxClient();
    
    // STRICT: Use only minimal payload (no optional parameters)
    const ttsResult = await minimax.generateTTS({
      text: trimmedText,
      voice_id: resolvedVoiceId,
    });

    // STRICT: generateTTS now throws if no audio, so this line is unreachable if audio is missing
    const rawAudioUrl = ttsResult.audio_url;
    let finalAudioUrl = rawAudioUrl || null;

    console.log('[TTS Generate] Raw audio_url:', rawAudioUrl);
    console.log('[TTS Generate] Has audio_file:', !!ttsResult.audio_file, ttsResult.audio_file ? `(${ttsResult.audio_file.length} chars)` : '');

    // Save to database FIRST to get job ID
    const { data: history, error } = await supabase
      .from('tts_jobs')
      .insert({
        user_id: userId,
        voice_id: voice_db_id || null,
        text: trimmedText,
        language: 'ru',
        audio_data: ttsResult.audio_file || null,
        audio_url: rawAudioUrl || null,
        status: (ttsResult.audio_file || rawAudioUrl) ? 'success' : 'processing',
      })
      .select()
      .single();

    if (error) {
      console.error('[TTS Generate] Failed to save history:', error);
      return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
    }

    // Generate URL to our endpoint
    if (ttsResult.audio_file) {
      finalAudioUrl = `/api/tts/audio/${history.id}`;
      console.log('[TTS Generate] ✅ Using endpoint URL:', finalAudioUrl);
    } else if (rawAudioUrl) {
      finalAudioUrl = rawAudioUrl;
      console.log('[TTS Generate] Using MiniMax URL:', rawAudioUrl);
    }

    console.log('[TTS Generate] ✅ Saved to DB! Job ID:', history.id);
    console.log('[TTS Generate] Returning response with audio_url:', finalAudioUrl);

    return NextResponse.json({
      success: true,
      audio_url: finalAudioUrl,
      job_id: history.id,
    });
  } catch (error) {
    console.error('[TTS Generate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}