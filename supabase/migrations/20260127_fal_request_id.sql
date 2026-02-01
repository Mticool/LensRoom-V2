-- Add fal_request_id to generations table for Fal.ai integrations
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS fal_request_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generations_fal_request_id 
ON public.generations(fal_request_id) 
WHERE fal_request_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.generations.fal_request_id IS 'Fal.ai request ID for tracking job status';
