-- =============================================
-- KIE.AI RELIABLE DELIVERY
-- Ensures results are always delivered to UI
-- =============================================

-- Add provider and asset_url columns
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'kie', -- 'kie' | 'replicate' | etc
ADD COLUMN IF NOT EXISTS asset_url TEXT; -- Our Supabase Storage URL (primary for UI)

-- Update status constraint to use consistent states
ALTER TABLE public.generations 
DROP CONSTRAINT IF EXISTS generations_status_check;

ALTER TABLE public.generations 
ADD CONSTRAINT generations_status_check 
CHECK (status IN ('queued', 'generating', 'success', 'failed'));

-- Create index on provider
CREATE INDEX IF NOT EXISTS idx_generations_provider ON public.generations(provider);

-- Create index on asset_url for quick lookups
CREATE INDEX IF NOT EXISTS idx_generations_asset_url ON public.generations(asset_url) WHERE asset_url IS NOT NULL;

-- Add service role policy for INSERT (webhook needs to create if not exists)
DROP POLICY IF EXISTS "Service can insert all generations" ON public.generations;
CREATE POLICY "Service can insert all generations" ON public.generations
    FOR INSERT
    USING (true)
    WITH CHECK (true);

COMMENT ON COLUMN public.generations.provider IS 'AI provider: kie, replicate, etc';
COMMENT ON COLUMN public.generations.asset_url IS 'Primary Supabase Storage URL for UI (guaranteed to work)';
COMMENT ON COLUMN public.generations.result_urls IS 'Original URLs from provider (may expire)';
COMMENT ON COLUMN public.generations.preview_url IS 'Deprecated: use asset_url instead';
