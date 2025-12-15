-- Fix aspect_ratio column issue
-- Refresh Supabase schema cache by re-adding the column if needed

DO $$ 
BEGIN
    -- Check if aspect_ratio exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'generations' 
        AND column_name = 'aspect_ratio'
    ) THEN
        -- Add column if missing
        ALTER TABLE public.generations 
        ADD COLUMN aspect_ratio TEXT DEFAULT '1:1';
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
