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
    const { history_id } = body || {};

    if (!history_id) {
      return NextResponse.json({ error: 'history_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: history, error } = await supabase
      .from('tts_jobs')
      .select('*')
      .eq('id', history_id)
      .eq('user_id', userId)
      .single();

    if (error || !history) {
      return NextResponse.json({ error: 'History item not found' }, { status: 404 });
    }

    if (!history.voice_id) {
      return NextResponse.json({ error: 'voice_id missing in job' }, { status: 400 });
    }

    const minimax = getMiniMaxClient();
    const ttsResult = await minimax.generateTTS({
      text: history.text,
      voice_id: history.voice_id,
    });

    const audioUrl = ttsResult.audio_url;
    if (!audioUrl && !ttsResult.audio_file) {
      return NextResponse.json({ error: 'No audio returned' }, { status: 500 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('tts_jobs')
      .update({ audio_url: audioUrl, status: 'success' })
      .eq('id', history_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[TTS Regenerate] Failed to update history:', updateError);
      return NextResponse.json({ error: 'Failed to update history' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      job_id: updated.id,
    });
  } catch (error) {
    console.error('[TTS Regenerate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}