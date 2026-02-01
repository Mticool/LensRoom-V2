-- Create user_voices table for storing cloned voices
CREATE TABLE IF NOT EXISTS public.user_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'qwen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_voices_user_id_idx ON public.user_voices(user_id);
CREATE INDEX IF NOT EXISTS user_voices_voice_id_idx ON public.user_voices(voice_id);

-- Enable RLS
ALTER TABLE public.user_voices ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see and manage their own voices
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
