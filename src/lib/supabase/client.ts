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
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Keep user logged in longer
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Store session in localStorage (persists across tabs/windows)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'x-client-info': 'lensroom-web',
      },
    },
  });
}
