import { createBrowserClient } from '@supabase/ssr';

function getSupabaseUrl() {
  // Keep static access so Next can inline NEXT_PUBLIC_ vars into client bundle.
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  // Keep static access so Next can inline NEXT_PUBLIC_ vars into client bundle.
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build time
    return null as any;
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
