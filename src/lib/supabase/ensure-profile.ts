import type { SupabaseClient } from "@supabase/supabase-js";
import { recordReferralEventAndReward } from "@/lib/referrals/referral-helper";

/**
 * Ensures `public.profiles` has a row for this user id.
 *
 * Why: `generations.user_id` often has an FK to `profiles.id`. Telegram auth can
 * yield a valid auth user id without a corresponding `profiles` row, causing
 * inserts into `generations` to fail with FK violations.
 * 
 * Also triggers referral signup event if this is a new profile.
 */
export async function ensureProfileExists(supabase: SupabaseClient, userId: string) {
  const uid = String(userId || "").trim();
  if (!uid) return;

  let isNewProfile = false;

  try {
    const { data } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
    if ((data as any)?.id) return; // Profile already exists
  } catch {
    // ignore and attempt insert below
  }

  const { error } = await supabase.from("profiles").insert({ id: uid } as any);
  if (!error) {
    isNewProfile = true;
  } else {
    const code = (error as any)?.code ? String((error as any).code) : "";
    const msg = (error as any)?.message ? String((error as any).message) : String(error);
    // 23505 = unique_violation (race); treat as success but not new
    if (code === "23505" || /duplicate key/i.test(msg)) {
      return;
    }
    throw error;
  }

  // If this is a new profile, trigger referral signup event
  if (isNewProfile) {
    try {
      await recordReferralEventAndReward(
        uid,
        'signup',
        `signup:${uid}`,
        { source: 'profile_creation' }
      );
    } catch (err) {
      // Don't fail profile creation if referral event fails
      console.error('[ensureProfileExists] Failed to record referral signup event:', err);
    }
  }
}

