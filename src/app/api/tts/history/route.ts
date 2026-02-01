import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseAdmin();
    const { data: history, error } = await supabase
      .from('tts_jobs')
      .select('id, user_id, voice_id, text, language, audio_url, audio_data, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TTS History] Failed to fetch history:', error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Map audio_url: if audio_data exists but audio_url is null, generate endpoint URL
    const mappedHistory = (history || []).map((item: any) => ({
      ...item,
      audio_url: item.audio_data ? `/api/tts/audio/${item.id}` : item.audio_url,
      audio_data: undefined, // Don't send raw audio data to frontend
    }));

    return NextResponse.json({ success: true, history: mappedHistory });
  } catch (error) {
    console.error('[TTS History] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const { error } = await supabase
      .from('tts_jobs')
      .delete()
      .eq('id', history_id)
      .eq('user_id', userId);

    if (error) {
      console.error('[TTS History] Failed to delete:', error);
      return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TTS History] Delete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}