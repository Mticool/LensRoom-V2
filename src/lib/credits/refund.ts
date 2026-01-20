import type { SupabaseClient } from '@supabase/supabase-js';

export interface RefundResult {
  success: boolean;
  creditsRefunded: number;
  newBalance?: number;
  error?: string;
}

/**
 * Refund credits to a user for a failed generation
 * 
 * @param supabase - Supabase client with admin privileges
 * @param userId - User ID to refund
 * @param generationId - Generation ID (for logging)
 * @param creditsToRefund - Number of credits to refund
 * @param reason - Reason for refund (for transaction log)
 * @param metadata - Additional metadata for transaction log
 */
export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  generationId: string,
  creditsToRefund: number,
  reason: string = 'generation_failed',
  metadata: Record<string, any> = {}
): Promise<RefundResult> {
  if (!userId || creditsToRefund <= 0) {
    return { success: false, creditsRefunded: 0, error: 'Invalid parameters' };
  }

  try {
    // Ensure credits row exists
    try {
      const { error: insErr } = await supabase.from('credits').insert({
        user_id: userId,
        subscription_stars: 0,
        package_stars: 0,
        amount: 0,
        updated_at: new Date().toISOString(),
      } as any);
      if (insErr && String((insErr as any).code || '') !== '23505') {
        console.error('[Refund] ensure credits row insert error:', insErr);
      }
    } catch {
      // ignore
    }

    // Optimistic CAS update: refund into package_stars and keep amount synced.
    const maxAttempts = 10;
    let newBalance: number | undefined = undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: row, error: readErr } = await supabase
        .from('credits')
        .select('subscription_stars,package_stars')
        .eq('user_id', userId)
        .single();
      if (readErr || !row) {
        console.error('[Refund] Failed to get credits balance:', readErr);
        return { success: false, creditsRefunded: 0, error: 'Credits row not found' };
      }

      const sub = Number((row as any).subscription_stars ?? 0) || 0;
      const pkg = Number((row as any).package_stars ?? 0) || 0;
      const nextPkg = pkg + creditsToRefund;
      const nextTotal = sub + nextPkg;

      const { data: upd, error: updErr } = await supabase
        .from('credits')
        .update({
          package_stars: nextPkg,
          amount: nextTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('subscription_stars', sub)
        .eq('package_stars', pkg)
        .select('amount');

      if (updErr) {
        console.error('[Refund] Failed to update credits:', updErr);
        return { success: false, creditsRefunded: 0, error: 'Failed to update balance' };
      }
      const updatedRow = Array.isArray(upd) ? (upd[0] as any) : (upd as any);
      if (updatedRow) {
        newBalance = nextTotal;
        break;
      }
      if (attempt === maxAttempts) {
        console.error('[Refund] CAS retry exhausted');
        return { success: false, creditsRefunded: 0, error: 'Failed to update balance (retry exhausted)' };
      }
    }

    // Log transaction
    try {
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: creditsToRefund,
          type: 'refund',
          description: `Автовозврат: ${reason}`,
          generation_id: generationId,
          metadata: {
            reason,
            ...metadata,
          },
        });
    } catch (err) {
      console.warn('[Refund] Failed to log transaction:', err);
    }

    console.log(`[Refund] ✅ ${creditsToRefund} credits refunded to user ${userId} (generation: ${generationId})`);

    return {
      success: true,
      creditsRefunded: creditsToRefund,
      newBalance,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Refund] Unexpected error:', message);
    return { success: false, creditsRefunded: 0, error: message };
  }
}

/**
 * Refund credits for a generation that failed
 * Fetches generation data and refunds credits_used
 */
export async function refundGenerationCredits(
  supabase: SupabaseClient,
  generationId: string,
  reason: string = 'generation_failed',
  metadata: Record<string, any> = {}
): Promise<RefundResult> {
  try {
    // Get generation data
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .select('user_id, credits_used, model_id')
      .eq('id', generationId)
      .single();

    if (genError || !generation) {
      console.error('[Refund] Generation not found:', generationId);
      return { success: false, creditsRefunded: 0, error: 'Generation not found' };
    }

    const creditsToRefund = generation.credits_used || 0;
    if (creditsToRefund <= 0) {
      console.log('[Refund] No credits to refund for generation:', generationId);
      return { success: true, creditsRefunded: 0 };
    }

    return await refundCredits(
      supabase,
      generation.user_id,
      generationId,
      creditsToRefund,
      reason,
      {
        model_id: generation.model_id,
        ...metadata,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Refund] Unexpected error:', message);
    return { success: false, creditsRefunded: 0, error: message };
  }
}
