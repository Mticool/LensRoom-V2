import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const { voiceId } = await params;
    console.log('[Delete Voice] Request for voiceId:', voiceId);

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

    // Verify the voice belongs to the user
    const { data: voice, error: fetchError } = await supabase
      .from('voices')
      .select('id, user_id')
      .eq('id', voiceId)
      .single();

    if (fetchError || !voice) {
      console.error('[Delete Voice] Voice not found:', fetchError);
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
    }

    if (voice.user_id !== userId) {
      console.error('[Delete Voice] Unauthorized - voice belongs to different user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the voice
    const { error: deleteError } = await supabase
      .from('voices')
      .delete()
      .eq('id', voiceId);

    if (deleteError) {
      console.error('[Delete Voice] Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete voice' }, { status: 500 });
    }

    console.log('[Delete Voice] ✅ Voice deleted:', voiceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete Voice] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
