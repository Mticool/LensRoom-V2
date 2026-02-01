import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    // Create user_voices table
    const { error } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS public.user_voices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          voice_id TEXT NOT NULL,
          voice_name TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'qwen',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS user_voices_user_id_idx ON public.user_voices(user_id);
        CREATE INDEX IF NOT EXISTS user_voices_voice_id_idx ON public.user_voices(voice_id);

        ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own voices" ON public.user_voices;
        CREATE POLICY "Users can view their own voices"
          ON public.user_voices FOR SELECT
          USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own voices" ON public.user_voices;
        CREATE POLICY "Users can insert their own voices"
          ON public.user_voices FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own voices" ON public.user_voices;
        CREATE POLICY "Users can update their own voices"
          ON public.user_voices FOR UPDATE
          USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own voices" ON public.user_voices;
        CREATE POLICY "Users can delete their own voices"
          ON public.user_voices FOR DELETE
          USING (auth.uid() = user_id);
      `
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Migration applied' });
  } catch (error) {
    console.error('[Migration Error]:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
