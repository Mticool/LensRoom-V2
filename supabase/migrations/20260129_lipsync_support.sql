-- Migration: Add Lip Sync support columns (2026-01-29)
-- Adds columns for the new Lip Sync feature (Kling AI Avatar + InfiniteTalk)

-- Add lip sync columns to generations table
ALTER TABLE generations 
  ADD COLUMN IF NOT EXISTS section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration FLOAT,
  ADD COLUMN IF NOT EXISTS resolution VARCHAR(20);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generations_section ON generations(section);
CREATE INDEX IF NOT EXISTS idx_generations_user_section ON generations(user_id, section);

-- Add comments
COMMENT ON COLUMN generations.section IS 'Generation section: photo, video, motion, music, voice (lip sync)';
COMMENT ON COLUMN generations.image_url IS 'Source image URL (for lip sync and other features requiring image input)';
COMMENT ON COLUMN generations.audio_url IS 'Source audio URL (for lip sync and audio-based features)';
COMMENT ON COLUMN generations.audio_duration IS 'Audio duration in seconds (for per-second billing)';
COMMENT ON COLUMN generations.resolution IS 'Video resolution (480p, 720p, 1080p)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added lip sync support columns (section, image_url, audio_url, audio_duration, resolution) to generations table';
END $$;
