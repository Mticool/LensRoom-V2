-- =====================================================
-- PREVIEW SYSTEM: Stable Photo/Video Previews
-- Migration: 025_preview_system.sql
-- =====================================================
-- Adds proper preview/poster support with storage paths (not URLs)

BEGIN;

-- 1) Add preview fields to generations table
ALTER TABLE public.generations 
  ADD COLUMN IF NOT EXISTS preview_path text,
  ADD COLUMN IF NOT EXISTS poster_path text,
  ADD COLUMN IF NOT EXISTS preview_status text 
    CHECK (preview_status IN ('none', 'processing', 'ready', 'failed'))
    DEFAULT 'none';

-- 2) Add indexes for preview queries
CREATE INDEX IF NOT EXISTS idx_generations_preview_status 
  ON public.generations(preview_status) 
  WHERE preview_status = 'processing';

-- 3) Migrate existing data: extract storage paths from URLs
-- For photos: if preview_url exists and contains '/storage/v1/object/public/generations/',
-- extract the path portion and store in preview_path
UPDATE public.generations
SET 
  preview_path = CASE 
    WHEN preview_url IS NOT NULL 
      AND preview_url ~ '/storage/v1/object/public/generations/'
    THEN regexp_replace(preview_url, '^.*/storage/v1/object/public/generations/', '')
    ELSE NULL
  END,
  preview_status = CASE
    WHEN preview_url IS NOT NULL AND preview_url != '' THEN 'ready'
    WHEN status = 'success' THEN 'none'
    ELSE 'none'
  END
WHERE type = 'photo' 
  AND preview_path IS NULL
  AND preview_status = 'none';

-- For videos: no automatic migration (posters need to be generated)
-- Just mark status appropriately
UPDATE public.generations
SET preview_status = CASE
  WHEN status = 'success' AND poster_path IS NULL THEN 'none'
  WHEN poster_path IS NOT NULL THEN 'ready'
  ELSE 'none'
END
WHERE type = 'video' 
  AND preview_status = 'none';

-- 4) Add comment for documentation
COMMENT ON COLUMN public.generations.preview_path IS 'Storage path (not URL) for photo preview: {userId}/previews/{id}_preview.webp';
COMMENT ON COLUMN public.generations.poster_path IS 'Storage path (not URL) for video poster: {userId}/posters/{id}_poster.webp';
COMMENT ON COLUMN public.generations.preview_status IS 'Preview generation status: none=not started, processing=generating, ready=available, failed=error';

COMMIT;

