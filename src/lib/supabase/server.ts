import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from "@/lib/env";

function getSupabaseUrl() {
  return env.optional("NEXT_PUBLIC_SUPABASE_URL");
}

function getSupabaseAnonKey() {
  return env.optional("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export async function createServerSupabaseClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Keep user logged in longer on server side
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Extend cookie maxAge to 30 days (matches refresh token lifetime)
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            maxAge: options.maxAge || 60 * 60 * 24 * 30, // 30 days
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        } catch {
          // Handle cookie errors in middleware
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Handle cookie errors in middleware
        }
      },
    },
  });
}