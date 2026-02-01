import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { MINIMAX_SYSTEM_VOICES } from '@/lib/api/minimax-client';

export async function GET() {
  // Return list of available system voices
  return NextResponse.json({
    success: true,
    voices: MINIMAX_SYSTEM_VOICES,
  });
}

export async function POST(request: NextRequest) {
  console.log('[System Voices] POST request received');
  try {
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
      console.log('[System Voices] Auth via requireAuth, userId:', userId);
    } catch {
      const session = await getSession();
      if (!session) {
        console.log('[System Voices] No session found');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = (await getAuthUserId(session)) || '';
      console.log('[System Voices] Auth via Telegram session, userId:', userId);
      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { voice_ids } = body || {};
    console.log('[System Voices] Adding voices for user:', userId);

    // If no specific voices, add all system voices
    const voicesToAdd = voice_ids && voice_ids.length > 0
      ? MINIMAX_SYSTEM_VOICES.filter(v => voice_ids.includes(v.voice_id))
      : MINIMAX_SYSTEM_VOICES;

    const supabase = getSupabaseAdmin();
    const addedVoices = [];

    for (const voice of voicesToAdd) {
      // Check if voice already exists for this user
      const { data: existing } = await supabase
        .from('voices')
        .select('id')
        .eq('user_id', userId)
        .eq('minimax_voice_id', voice.voice_id)
        .single();

      if (existing) {
        continue; // Skip if already exists
      }

      // Add voice to user's collection
      const { data: newVoice, error } = await supabase
        .from('voices')
        .insert({
          user_id: userId,
          name: voice.name,
          minimax_voice_id: voice.voice_id,
          is_cloned: false,
          language: voice.language || 'ru',
        })
        .select()
        .single();

      if (error) {
        console.error('[System Voices] Insert error for voice:', voice.voice_id, error);
      } else if (newVoice) {
        console.log('[System Voices] Added voice:', voice.name);
        addedVoices.push(newVoice);
      }
    }

    console.log('[System Voices] Total added:', addedVoices.length);
    return NextResponse.json({
      success: true,
      added: addedVoices.length,
      voices: addedVoices,
    });
  } catch (error) {
    console.error('[System Voices] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
