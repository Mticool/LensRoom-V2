/**
 * Track first_generation referral event
 * 
 * Should be called when a generation completes successfully for the first time
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { recordReferralEventAndReward } from './referral-helper';

/**
 * Check if user has any completed generations before this one
 * If this is their first, record referral event
 */
export async function trackFirstGenerationEvent(
  userId: string,
  generationId: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if user has any successful generations before this one
    const { data: prevGenerations } = await supabase
      .from('generations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'success')
      .neq('id', generationId)
      .limit(1);
    
    // If user has previous successful generations, this is not their first
    if (prevGenerations && prevGenerations.length > 0) {
      return;
    }
    
    // This is user's first successful generation - record event
    await recordReferralEventAndReward(
      userId,
      'first_generation',
      `first_gen:${generationId}`,
      {
        generation_id: generationId,
        source: 'generation_success',
      }
    );
    
    console.log(`[trackFirstGenerationEvent] Recorded first_generation for user ${userId}, generation ${generationId}`);
    
  } catch (error) {
    // Don't fail generation on referral event error
    console.error('[trackFirstGenerationEvent] Error:', error);
  }
}
