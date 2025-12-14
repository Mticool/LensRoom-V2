import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { kieAPI } from '@/lib/kie-api';

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
      .select('id, status, result_url, metadata')
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
        images: Array.isArray(generation.result_url) 
          ? generation.result_url 
          : [generation.result_url],
        progress: 100,
      });
    }

    // If failed, return error
    if (generation.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: (generation.metadata as Record<string, unknown>)?.error || 'Generation failed',
        progress: 0,
      });
    }

    // Check status from KIE API
    const status = await kieAPI.checkStatus(taskId);

    // Update generation record if completed
    if (status.status === 'completed' && status.results) {
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          result_url: status.results,
          completed_at: new Date().toISOString(),
        })
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      return NextResponse.json({
        status: 'completed',
        images: status.results,
        progress: 100,
      });
    }

    // Update if failed
    if (status.status === 'failed') {
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          metadata: {
            ...(generation.metadata as Record<string, unknown>),
            error: status.error,
          },
        })
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      return NextResponse.json({
        status: 'failed',
        error: status.error || 'Generation failed',
        progress: 0,
      });
    }

    // Still processing
    return NextResponse.json({
      status: status.status,
      progress: status.progress || 0,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Status check error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

