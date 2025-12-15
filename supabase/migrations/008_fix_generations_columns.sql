-- =============================================
-- FIX GENERATIONS TABLE COLUMNS
-- Add missing model_id and model_name columns
-- =============================================

-- Check if 'model' column exists and rename it to 'model_id'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'generations' 
        AND column_name = 'model'
    ) THEN
        ALTER TABLE public.generations RENAME COLUMN model TO model_id;
    END IF;
END $$;

-- Add model_name column if it doesn't exist
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS model_name TEXT;

-- Update model_name from model_id for existing records (if needed)
UPDATE public.generations 
SET model_name = model_id 
WHERE model_name IS NULL;

-- Make model_name NOT NULL after backfill
ALTER TABLE public.generations 
ALTER COLUMN model_name SET NOT NULL;

-- Add model_id if it doesn't exist (in case it was never created)
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS model_id TEXT;

-- Make model_id NOT NULL
ALTER TABLE public.generations 
ALTER COLUMN model_id SET NOT NULL;

COMMENT ON COLUMN public.generations.model_id IS 'Model identifier (e.g., flux-2-pro, sora-2)';
COMMENT ON COLUMN public.generations.model_name IS 'Human-readable model name';
