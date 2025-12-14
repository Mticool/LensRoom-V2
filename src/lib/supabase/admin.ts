import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client
 * Uses SERVICE_ROLE_KEY for server-side operations
 * NEVER expose this client to the browser
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceKey) {
  console.warn('[Supabase Admin] Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Create admin client (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Get admin client or throw if not configured
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Check environment variables.');
  }
  return supabaseAdmin;
}
