-- Add columns for audio duration-based billing
-- Supports: 1 second = 1 star pricing model for TTS

-- Add duration_sec column (actual audio duration in seconds)
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS duration_sec INTEGER DEFAULT NULL;

-- Add actual_stars_spent column (actual stars deducted after generation)
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS actual_stars_spent INTEGER DEFAULT NULL;

-- Add index for queries filtering by duration
CREATE INDEX IF NOT EXISTS idx_generations_duration_sec 
ON public.generations(duration_sec) 
WHERE duration_sec IS NOT NULL;

-- Add index for billing queries
CREATE INDEX IF NOT EXISTS idx_generations_actual_stars_spent 
ON public.generations(actual_stars_spent) 
WHERE actual_stars_spent IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.generations.duration_sec IS 'Actual audio duration in seconds (for TTS: 1 sec = 1 star)';
COMMENT ON COLUMN public.generations.actual_stars_spent IS 'Actual stars deducted after generation completion (for deferred billing)';
