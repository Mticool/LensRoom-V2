-- Add name and is_cloned columns to voices table
ALTER TABLE public.voices
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS is_cloned BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.voices.name IS 'Display name for the voice';
COMMENT ON COLUMN public.voices.is_cloned IS 'Whether this is a user-cloned voice (true) or a system preset voice (false)';
