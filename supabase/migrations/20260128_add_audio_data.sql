-- Add audio_data column to tts_jobs table for storing base64 audio
ALTER TABLE public.tts_jobs
ADD COLUMN IF NOT EXISTS audio_data TEXT;

-- Add comment
COMMENT ON COLUMN public.tts_jobs.audio_data IS 'Base64-encoded audio data from MiniMax API';
