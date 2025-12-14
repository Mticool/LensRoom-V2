import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify task belongs to user
    const { data: generation } = await supabase
      .from('generations')
      .select('id, status, result_url')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .single();

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // If already completed, return cached result
    if (generation.status === 'completed' && generation.result_url) {
      return NextResponse.json({
        status: 'completed',
        imageUrl: generation.result_url,
        progress: 100,
      });
    }

    // If failed, return error
    if (generation.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: 'Generation failed',
        progress: 0,
      });
    }

    // Check status from API
    const kieApiUrl = process.env.NEXT_PUBLIC_KIE_API_URL;
    const kieApiKey = process.env.KIE_API_KEY;

    if (!kieApiUrl || !kieApiKey) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    const response = await fetch(`${kieApiUrl}/status/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${kieApiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to check status');
    }

    const result = await response.json();

    // Update generation record if completed
    if (result.status === 'completed' && result.imageUrl) {
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          result_url: result.imageUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('task_id', taskId)
        .eq('user_id', user.id);
    }

    // Update if failed
    if (result.status === 'failed') {
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: result.error || 'Generation failed',
        })
        .eq('task_id', taskId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      status: result.status,
      imageUrl: result.imageUrl,
      progress: result.progress || 0,
      error: result.error,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Status check error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

