import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';
import { requireAuth } from '@/lib/auth/requireRole';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface VideoStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
  progress?: number; // 0-100
  eta_seconds?: number;
  created_at?: string;
  completed_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    let userId: string;
    try {
      const auth = await requireAuth();
      userId = auth.authUserId;
    } catch (error) {
      // Fallback to session auth
      const telegramSession = await getSession();
      if (!telegramSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = await getAuthUserId(telegramSession) || "";
      if (!userId) {
        return NextResponse.json({ error: 'User account not found' }, { status: 401 });
      }
    }

    // Get job ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get generation record
    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Map database status to API response
    const response: VideoStatusResponse = {
      id: generation.id,
      status: generation.status,
      video_url: generation.result_url || undefined,
      thumbnail_url: generation.thumbnail_url || undefined,
      error: generation.error || undefined,
      progress: generation.progress || 0,
      created_at: generation.created_at,
      completed_at: generation.completed_at || undefined,
    };

    // Calculate ETA if still processing
    if (generation.status === 'queued' || generation.status === 'processing') {
      const createdAt = new Date(generation.created_at).getTime();
      const now = Date.now();
      const elapsed = (now - createdAt) / 1000; // seconds

      // Estimate based on duration and model
      const durationSec = generation.settings?.duration_seconds || 5;
      const baseEta = durationSec * 10; // Rough estimate: 10s per 1s of video
      const remaining = Math.max(0, baseEta - elapsed);

      response.eta_seconds = Math.round(remaining);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[VideoStatus] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
