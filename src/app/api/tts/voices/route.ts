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
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = (await getAuthUserId(telegramSession)) || '';
      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const supabase = getSupabaseAdmin();
    const { data: voices, error } = await supabase
      .from('voices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TTS Voices] Failed to fetch voices:', error);
      return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
    }

    const mappedVoices = (voices || []).map((voice: any) => ({
      id: voice.id,
      minimax_voice_id: voice.minimax_voice_id,
      name: voice.name || `Голос #${voice.id.slice(0, 6)}`,
      is_cloned: voice.is_cloned !== false, // Default to true for cloned voices
      created_at: voice.created_at,
      language: voice.language || 'ru',
    }));

    console.log('[TTS Voices] Returning', mappedVoices.length, 'voices for user:', userId);
    return NextResponse.json({ success: true, voices: mappedVoices });
  } catch (error) {
    console.error('[TTS Voices] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}