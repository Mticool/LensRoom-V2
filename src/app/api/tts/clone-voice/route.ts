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
    const { file_id, language = 'ru' } = body || {};

    if (!file_id) {
      return NextResponse.json({ error: 'file_id is required' }, { status: 400 });
    }

    // Ensure file_id is a number as required by MiniMax API
    const fileIdNumber = typeof file_id === 'number' ? file_id : Number(file_id);
    if (isNaN(fileIdNumber)) {
      return NextResponse.json({ error: 'file_id must be a valid number' }, { status: 400 });
    }

    const minimax = getMiniMaxClient();
    const languageBoost = language === 'ru' ? 'Russian' : language === 'en' ? 'English' : 'auto';
    const result = await minimax.cloneVoice({ file_id: fileIdNumber, language_boost: languageBoost });
    const voiceId = result.voice_id;

    if (!voiceId) {
      return NextResponse.json({ error: 'No voice_id returned' }, { status: 500 });
    }

    console.log('[TTS Clone] MiniMax voice_id:', voiceId);

    const supabase = getSupabaseAdmin();
    const { data: embedding, error } = await supabase
      .from('voices')
      .insert({
        user_id: userId,
        minimax_voice_id: voiceId,
        language,
      })
      .select()
      .single();

    if (error) {
      console.error('[TTS Clone] Failed to save embedding:', error);
      return NextResponse.json({ error: 'Failed to save embedding' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      voice_id: embedding.id,
      minimax_voice_id: embedding.minimax_voice_id,
    });
  } catch (error) {
    console.error('[TTS Clone] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}