import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures `public.profiles` has a row for this user id.
 *
 * Why: `generations.user_id` often has an FK to `profiles.id`. Telegram auth can
 * yield a valid auth user id without a corresponding `profiles` row, causing
 * inserts into `generations` to fail with FK violations.
 */
export async function ensureProfileExists(supabase: SupabaseClient, userId: string) {
  const uid = String(userId || "").trim();
  if (!uid) return;

  try {
    const { data } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
    if ((data as any)?.id) return;
  } catch {
    // ignore and attempt insert below
  }

  const { error } = await supabase.from("profiles").insert({ id: uid } as any);
  if (!error) return;

  const code = (error as any)?.code ? String((error as any).code) : "";
  const msg = (error as any)?.message ? String((error as any).message) : String(error);
  // 23505 = unique_violation (race); treat as success.
  if (code === "23505" || /duplicate key/i.test(msg)) return;

  throw error;
}

