import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { resetSubscriptionStars } from '@/lib/credits/split-credits';

/**
 * CRON: Reset subscription stars for expired subscriptions
 * 
 * This endpoint should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 * to reset subscription_stars to 0 for users whose subscription period has ended.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Schedule: Daily at 00:05 UTC
 * Cron expression: 5 0 * * *
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Find all active subscriptions where the current period has ended
    const { data: expiredSubscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_id, current_period_end, credits_per_month')
      .eq('status', 'active')
      .lt('current_period_end', now);

    if (fetchError) {
      console.error('[Cron] Error fetching expired subscriptions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      console.log('[Cron] No expired subscriptions found');
      return NextResponse.json({ 
        success: true, 
        message: 'No expired subscriptions',
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${expiredSubscriptions.length} expired subscriptions`);

    const results: Array<{
      userId: string;
      expiredStars: number;
      remainingPackageStars: number;
      action: 'reset' | 'error';
    }> = [];

    for (const subscription of expiredSubscriptions) {
      try {
        // Reset subscription stars to 0
        const result = await resetSubscriptionStars(supabase, subscription.user_id);
        
        results.push({
          userId: subscription.user_id,
          expiredStars: result.expiredStars,
          remainingPackageStars: result.remainingPackageStars,
          action: 'reset',
        });

        // Mark subscription as expired or pending renewal
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: now,
          })
          .eq('user_id', subscription.user_id);

        // Log the expiration
        await supabase.from('credit_transactions').insert({
          user_id: subscription.user_id,
          amount: -result.expiredStars,
          type: 'subscription_expired',
          description: `Подписка истекла: ${result.expiredStars} ⭐ сгорело`,
          metadata: {
            plan_id: subscription.plan_id,
            period_end: subscription.current_period_end,
            remaining_package_stars: result.remainingPackageStars,
          },
        });

        console.log(`[Cron] Reset ${result.expiredStars} subscription stars for user ${subscription.user_id}`);

      } catch (error) {
        console.error(`[Cron] Error resetting stars for user ${subscription.user_id}:`, error);
        results.push({
          userId: subscription.user_id,
          expiredStars: 0,
          remainingPackageStars: 0,
          action: 'error',
        });
      }
    }

    const totalExpired = results.reduce((sum, r) => sum + r.expiredStars, 0);
    const successCount = results.filter(r => r.action === 'reset').length;
    const errorCount = results.filter(r => r.action === 'error').length;

    console.log(`[Cron] Completed: ${successCount} users processed, ${totalExpired} stars expired, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      errorCount,
      totalExpiredStars: totalExpired,
      results,
    });

  } catch (error) {
    console.error('[Cron] Unexpected error:', error);
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







