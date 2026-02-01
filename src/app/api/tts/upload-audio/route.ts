import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getSession } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { getMiniMaxClient } from '@/lib/api/minimax-client';

export async function POST(request: NextRequest) {
  try {
    try {
      await requireAuth();
    } catch {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const userId = await getAuthUserId(session);
      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const minimax = getMiniMaxClient();
    const { file_id } = await minimax.uploadAudio(file);

    if (!file_id) {
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    return NextResponse.json({ success: true, file_id });
  } catch (error) {
    console.error('[TTS Upload] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}