import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { REGISTRATION_BONUS } from '@/config/pricing';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    });

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && sessionData?.user) {
      // Ensure registration bonus for new users (Google auth)
      const userId = sessionData.user.id;
      
      try {
        const supabaseAdmin = getSupabaseAdmin() as any;
        
        console.log(`[Google Auth] Processing user ${userId}`);
        
        // Check if credits already exist
        const { data: existingCredits, error: creditsError } = await supabaseAdmin
          .from('credits')
          .select('id, package_stars, subscription_stars, amount')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (creditsError) {
          console.error('[Google Auth] Error checking credits:', creditsError);
        }
        
        // Calculate current total
        const currentTotal = existingCredits 
          ? (existingCredits.package_stars || 0) + (existingCredits.subscription_stars || 0) + (existingCredits.amount || 0)
          : 0;
        
        console.log(`[Google Auth] Current balance for ${userId}: ${currentTotal}⭐`);
        
        // Give bonus if no credits exist OR if total is 0
        if (!existingCredits || currentTotal === 0) {
          const { error: upsertError } = await supabaseAdmin
            .from('credits')
            .upsert({
              user_id: userId,
              amount: REGISTRATION_BONUS,
              package_stars: REGISTRATION_BONUS,
              subscription_stars: 0,
            }, { onConflict: 'user_id' });
          
          if (upsertError) {
            console.error('[Google Auth] Failed to create credits:', upsertError);
          } else {
            console.log(`[Google Auth] ✅ Successfully created credits with ${REGISTRATION_BONUS}⭐ bonus for ${userId}`);
          }
        } else {
          console.log(`[Google Auth] User ${userId} already has ${currentTotal}⭐, skipping bonus`);
        }
      } catch (bonusError) {
        console.error('[Google Auth] Registration bonus error:', bonusError);
        // Continue even if bonus fails - user can still use the app
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to home page
  return NextResponse.redirect(`${origin}${next}`);
}
