-- =============================================
-- KIE.AI GENERATIONS ENHANCEMENT
-- Adds fields for KIE.ai integration
-- =============================================

-- Add new columns for KIE integration
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('image', 'video')),
ADD COLUMN IF NOT EXISTS model_key TEXT, -- Internal model key (e.g., 'seedream_45_t2i')
ADD COLUMN IF NOT EXISTS result_urls JSONB DEFAULT '[]'::jsonb, -- Array of result URLs
ADD COLUMN IF NOT EXISTS preview_url TEXT, -- Direct preview URL
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}'::jsonb, -- Generation options/input params
ADD COLUMN IF NOT EXISTS error TEXT; -- Error message if failed

-- Create index on task_id for quick lookup during callbacks
CREATE INDEX IF NOT EXISTS idx_generations_task_id ON public.generations(task_id);

-- Create index on model_key
CREATE INDEX IF NOT EXISTS idx_generations_model_key ON public.generations(model_key);

-- Create index on kind
CREATE INDEX IF NOT EXISTS idx_generations_kind ON public.generations(kind);

-- Update status check constraint to include KIE states
ALTER TABLE public.generations 
DROP CONSTRAINT IF EXISTS generations_status_check;

ALTER TABLE public.generations 
ADD CONSTRAINT generations_status_check 
CHECK (status IN ('pending', 'processing', 'generating', 'completed', 'success', 'failed'));

-- Create a service role policy for callback webhook (bypass RLS)
-- This allows our API callback route to update generations
DROP POLICY IF EXISTS "Service can update all generations" ON public.generations;
CREATE POLICY "Service can update all generations" ON public.generations
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- =============================================
-- STORAGE BUCKET FOR GENERATIONS
-- Create if not exists
-- =============================================

-- Create storage bucket for generated content
INSERT INTO storage.buckets (id, name, public)
VALUES ('generations', 'generations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generations bucket

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload own generations" ON storage.objects;
CREATE POLICY "Users can upload own generations" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'generations' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read access to all files in generations bucket
DROP POLICY IF EXISTS "Public read access to generations" ON storage.objects;
CREATE POLICY "Public read access to generations" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'generations');

-- Allow service role to manage all files
DROP POLICY IF EXISTS "Service can manage all generation files" ON storage.objects;
CREATE POLICY "Service can manage all generation files" ON storage.objects
    FOR ALL
    USING (bucket_id = 'generations');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to cleanup old generations (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_failed_generations(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.generations
    WHERE 
        status = 'failed' 
        AND created_at < NOW() - INTERVAL '1 day' * days_old
        AND result_urls = '[]'::jsonb;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_old_failed_generations(INTEGER) TO service_role;

COMMENT ON TABLE public.generations IS 'Stores all user generations from various AI models including KIE.ai';
COMMENT ON COLUMN public.generations.kind IS 'Type of content: image or video (KIE format)';
COMMENT ON COLUMN public.generations.model_key IS 'Internal model identifier (e.g., seedream_45_t2i)';
COMMENT ON COLUMN public.generations.task_id IS 'External API task ID for tracking';
COMMENT ON COLUMN public.generations.result_urls IS 'Array of URLs to generated results';
COMMENT ON COLUMN public.generations.preview_url IS 'Primary preview URL (first result or Supabase Storage URL)';
COMMENT ON COLUMN public.generations.options IS 'Generation input parameters (prompt, settings, etc.)';
COMMENT ON COLUMN public.generations.error IS 'Error message if generation failed';
