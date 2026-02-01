-- Create voices table for storing cloned MiniMax voices
CREATE TABLE IF NOT EXISTS public.voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minimax_voice_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voices_user_id_idx ON public.voices(user_id);

ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own voices" ON public.voices;
CREATE POLICY "Users can view their own voices"
  ON public.voices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own voices" ON public.voices;
CREATE POLICY "Users can insert their own voices"
  ON public.voices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own voices" ON public.voices;
CREATE POLICY "Users can update their own voices"
  ON public.voices FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own voices" ON public.voices;
CREATE POLICY "Users can delete their own voices"
  ON public.voices FOR DELETE
  USING (auth.uid() = user_id);

-- Create tts_jobs table for storing generated audio entries
CREATE TABLE IF NOT EXISTS public.tts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id UUID REFERENCES public.voices(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tts_jobs_user_id_idx ON public.tts_jobs(user_id);
CREATE INDEX IF NOT EXISTS tts_jobs_voice_id_idx ON public.tts_jobs(voice_id);

ALTER TABLE public.tts_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tts jobs" ON public.tts_jobs;
CREATE POLICY "Users can view their own tts jobs"
  ON public.tts_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tts jobs" ON public.tts_jobs;
CREATE POLICY "Users can insert their own tts jobs"
  ON public.tts_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tts jobs" ON public.tts_jobs;
CREATE POLICY "Users can update their own tts jobs"
  ON public.tts_jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tts jobs" ON public.tts_jobs;
CREATE POLICY "Users can delete their own tts jobs"
  ON public.tts_jobs FOR DELETE
  USING (auth.uid() = user_id);