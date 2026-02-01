import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';

/**
 * GET /api/audio/voices
 * Получить список голосов пользователя (включая клонированные)
 */
export async function GET(request: NextRequest) {
  try {
    // Check auth
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch (error) {
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    // Получить клонированные голоса пользователя из БД
    const { data: clonedVoices, error } = await supabase
      .from('user_voices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Failed to fetch user voices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch voices' },
        { status: 500 }
      );
    }

    // Предустановленные голоса ElevenLabs (для Kie.ai)
    const PRESET_VOICES = [
      { id: 'Liam', name: '🎙 Liam (мужской)', is_preset: true },
      { id: 'Alice', name: '🎙 Alice (женский)', is_preset: true },
      { id: 'Adam', name: '🎙 Adam (мужской)', is_preset: true },
      { id: 'Jessica', name: '🎙 Jessica (женский)', is_preset: true },
      { id: 'Charlie', name: '🎙 Charlie (мужской)', is_preset: true },
      { id: 'Emily', name: '🎙 Emily (женский)', is_preset: true },
    ];

    // Форматировать список голосов
    const voices = [
      // Предустановленные голоса
      ...PRESET_VOICES,
      // Клонированные голоса
      ...(clonedVoices || []).map((v: any) => ({
        id: v.voice_id,
        name: `🧬 ${v.voice_name || `Клонированный голос #${v.id}`}`,
        is_cloned: true,
        created_at: v.created_at,
      })),
    ];

    return NextResponse.json({
      success: true,
      voices,
    });

  } catch (error) {
    console.error('[API] Voices fetch error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
