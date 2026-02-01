import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { refundCredits } from '@/lib/credits/refund';

/**
 * CRON: Cleanup stuck generations and refund credits
 * 
 * This endpoint should be called every 30 minutes by a cron service
 * to detect and cleanup generations that are stuck in non-terminal states.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Schedule: Every 30 minutes
 * Cron expression: 0,30 * * * * (every 30 minutes)
 */

// Timeout thresholds by status (in minutes)
const TIMEOUT_THRESHOLDS: Record<string, number> = {
  pending: 30,      // 30 minutes for pending
  queued: 60,       // 1 hour for queued
  processing: 120,  // 2 hours for processing
  generating: 120,  // 2 hours for generating
};

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    
    const results: Array<{
      id: string;
      userId: string;
      modelId: string;
      status: string;
      creditsRefunded: number;
      action: 'cleaned' | 'error';
    }> = [];

    // Process each status type
    for (const [status, timeoutMinutes] of Object.entries(TIMEOUT_THRESHOLDS)) {
      const cutoffTime = new Date(now.getTime() - timeoutMinutes * 60 * 1000);
      
      // Find stuck generations
      const { data: stuckGenerations, error: fetchError } = await supabase
        .from('generations')
        .select('id, user_id, model_id, credits_used, status, created_at')
        .eq('status', status)
        .lt('created_at', cutoffTime.toISOString())
        .limit(100);

      if (fetchError) {
        console.error(`[Cleanup] Error fetching ${status} generations:`, fetchError);
        continue;
      }

      if (!stuckGenerations || stuckGenerations.length === 0) {
        continue;
      }

      console.log(`[Cleanup] Found ${stuckGenerations.length} stuck ${status} generations`);

      for (const generation of stuckGenerations) {
        try {
          // Mark as failed
          const { error: updateError } = await supabase
            .from('generations')
            .update({
              status: 'failed',
              error: `Timeout: stuck in ${status} for over ${timeoutMinutes} minutes`,
              updated_at: now.toISOString(),
            })
            .eq('id', generation.id);

          if (updateError) {
            console.error(`[Cleanup] Error updating generation ${generation.id}:`, updateError);
            results.push({
              id: generation.id,
              userId: generation.user_id,
              modelId: generation.model_id,
              status: status,
              creditsRefunded: 0,
              action: 'error',
            });
            continue;
          }

          // Refund credits to user (via split-credits)
          const creditsToRefund = generation.credits_used || 0;
          if (creditsToRefund > 0) {
            await refundCredits(
              supabase,
              generation.user_id,
              generation.id,
              creditsToRefund,
              'stuck_generation_cleanup',
              {
                original_status: status,
                timeout_minutes: timeoutMinutes,
                model_id: generation.model_id,
              }
            );
            console.log(`[Cleanup] Refunded ${creditsToRefund} credits to user ${generation.user_id}`);
          }

          results.push({
            id: generation.id,
            userId: generation.user_id,
            modelId: generation.model_id,
            status: status,
            creditsRefunded: creditsToRefund,
            action: 'cleaned',
          });

        } catch (error) {
          console.error(`[Cleanup] Error processing generation ${generation.id}:`, error);
          results.push({
            id: generation.id,
            userId: generation.user_id,
            modelId: generation.model_id,
            status: status,
            creditsRefunded: 0,
            action: 'error',
          });
        }
      }
    }

    const totalCleaned = results.filter(r => r.action === 'cleaned').length;
    const totalRefunded = results.reduce((sum, r) => sum + r.creditsRefunded, 0);
    const totalErrors = results.filter(r => r.action === 'error').length;

    console.log(`[Cleanup] Completed: ${totalCleaned} cleaned, ${totalRefunded} credits refunded, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        totalCleaned,
        totalRefunded,
        totalErrors,
      },
      results: results.length > 0 ? results : 'No stuck generations found',
    });

  } catch (error) {
    console.error('[Cleanup] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
