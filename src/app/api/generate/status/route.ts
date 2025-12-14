import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { kieAPI } from '@/lib/kie-api';

// Store task start times for progress simulation
const taskStartTimes = new Map<string, number>();

// Track which tasks have been saved to DB
const savedTasks = new Set<string>();

// Declare global type for pending generations
declare global {
  // eslint-disable-next-line no-var
  var pendingGenerations: Map<string, {
    userId: string;
    model: string;
    prompt: string;
    creditsUsed: number;
    type?: string;
  }> | undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  try {
    // Track when we first saw this task
    if (!taskStartTimes.has(taskId)) {
      taskStartTimes.set(taskId, Date.now());
    }

    // Check status from kie.ai
    const statusResult = await kieAPI.checkStatus(taskId);

    // Calculate simulated progress if not provided
    let progress = statusResult.progress;
    
    if (statusResult.status === 'processing' && !progress) {
      const startTime = taskStartTimes.get(taskId) || Date.now();
      const elapsed = Date.now() - startTime;
      
      // Simulate progress: 
      // - Video takes ~60-120 seconds, simulate up to 95%
      // - Photo takes ~20-40 seconds
      const isVideo = taskId.length === 32 || taskId.includes('veo');
      const maxTime = isVideo ? 90000 : 30000;
      
      const rawProgress = Math.min(elapsed / maxTime, 0.95);
      progress = Math.round(rawProgress * 100);
    }

    if (statusResult.status === 'completed') {
      progress = 100;
      taskStartTimes.delete(taskId);
    }

    if (statusResult.status === 'failed') {
      taskStartTimes.delete(taskId);
    }

    // Save to database when completed (only once per task)
    const primaryTaskId = taskId.split(',')[0].trim();
    
    if (statusResult.status === 'completed' && statusResult.results?.length && !savedTasks.has(primaryTaskId)) {
      try {
        const supabase = await createServerSupabaseClient();
        
        // Get pending generation info
        const genInfo = global.pendingGenerations?.get(primaryTaskId);
        
        if (genInfo) {
          // Save all results as separate entries or single entry
          const results = statusResult.results;
          
          for (const resultUrl of results) {
            const { error: insertError } = await supabase
              .from('generations')
              .insert({
                user_id: genInfo.userId,
                type: genInfo.type || 'image',
                model: genInfo.model,
                prompt: genInfo.prompt,
                result_url: resultUrl,
                credits_used: Math.ceil(genInfo.creditsUsed / results.length),
                status: 'completed',
              });

            if (insertError) {
              console.error('Failed to save generation:', insertError);
            } else {
              console.log('[DB] Saved generation to library:', resultUrl.slice(0, 50));
            }
          }
          
          // Mark as saved and clean up
          savedTasks.add(primaryTaskId);
          global.pendingGenerations?.delete(primaryTaskId);
        }
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return NextResponse.json({
      status: statusResult.status,
      progress: progress || 0,
      results: statusResult.results,
      error: statusResult.error,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Status check error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
