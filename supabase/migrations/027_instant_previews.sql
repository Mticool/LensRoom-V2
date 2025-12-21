-- =====================================================
-- INSTANT PREVIEWS SYSTEM
-- Migration: 027_instant_previews.sql
-- =====================================================
-- Normalizes asset sources and ensures Library is never empty
-- after successful generation.
--
-- Changes:
-- 1. Add original_path column for storage path preference
-- 2. Backfill original_path from existing URLs
-- 3. Ensure preview_status defaults correctly
-- 4. Add index for faster preview worker queries

BEGIN;

-- 1) Add original_path column (preferred source for assets)
ALTER TABLE public.generations 
  ADD COLUMN IF NOT EXISTS original_path text;

COMMENT ON COLUMN public.generations.original_path IS 
  'Storage path (not URL) for original asset: {userId}/{type}/{id}_{timestamp}.{ext}. Preferred over original_url.';

-- 2) Backfill original_path from existing asset_url/original_url
-- Extract path from Supabase Storage URLs like:
-- https://<project>.supabase.co/storage/v1/object/public/generations/<path>
UPDATE public.generations
SET original_path = CASE
  WHEN asset_url IS NOT NULL 
    AND asset_url ~ '/storage/v1/object/public/generations/'
  THEN regexp_replace(asset_url, '^.*/storage/v1/object/public/generations/', '')
  ELSE NULL
END
WHERE original_path IS NULL
  AND asset_url IS NOT NULL
  AND asset_url ~ '/storage/v1/object/public/generations/';

-- 3) Fix NULL preview_status for existing success generations
-- This ensures worker picks them up correctly
UPDATE public.generations
SET preview_status = 'none'
WHERE status IN ('success', 'completed', 'succeeded')
  AND preview_status IS NULL;

-- 4) Reset stuck 'processing' status (older than 5 minutes)
UPDATE public.generations
SET preview_status = 'none'
WHERE preview_status = 'processing'
  AND updated_at < NOW() - INTERVAL '5 minutes';

-- 5) Create optimized index for preview worker queries
DROP INDEX IF EXISTS idx_generations_preview_worker;
CREATE INDEX idx_generations_preview_worker 
  ON public.generations(status, preview_status, created_at DESC)
  WHERE status IN ('success', 'completed', 'succeeded')
    AND (preview_status IS NULL OR preview_status IN ('none', 'failed'));

-- 6) Index for original_path lookups
CREATE INDEX IF NOT EXISTS idx_generations_original_path 
  ON public.generations(original_path)
  WHERE original_path IS NOT NULL;

COMMIT;
