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
    // Get current balance
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('[Refund] Failed to get user balance:', userError);
      return { success: false, creditsRefunded: 0, error: 'User not found' };
    }

    const newBalance = (userData.credits || 0) + creditsToRefund;

    // Update balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newBalance })
      .eq('id', userId);

    if (updateError) {
      console.error('[Refund] Failed to update balance:', updateError);
      return { success: false, creditsRefunded: 0, error: 'Failed to update balance' };
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

