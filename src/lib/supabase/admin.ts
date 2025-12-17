import { createClient } from '@supabase/supabase-js';
import { env } from "@/lib/env";

/**
 * Supabase Admin Client
 * Uses SERVICE_ROLE_KEY for server-side operations
 * NEVER expose this client to the browser
 */

let _supabaseAdmin: any = null;
let _supabaseAdminKey: string | null = null;

/**
 * Get admin client or throw if not configured
 */
export function getSupabaseAdmin(): any {
  const supabaseUrl = env.required("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceKey = env.required("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin client not configured. Check environment variables.");
  }

  const key = `${supabaseUrl}::${supabaseServiceKey}`;
  if (_supabaseAdmin && _supabaseAdminKey === key) return _supabaseAdmin;

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  _supabaseAdminKey = key;
  return _supabaseAdmin;
}



