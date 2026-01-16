-- Add aspect_ratio column to generations table
-- This allows storing the selected aspect ratio for each generation

ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;

-- Create index for filtering by aspect ratio
CREATE INDEX IF NOT EXISTS idx_generations_aspect_ratio 
ON generations(aspect_ratio);

-- Add comment to column
COMMENT ON COLUMN generations.aspect_ratio IS 'Aspect ratio selected for this generation (e.g., 1:1, 16:9, 9:16, 4:3, 3:4)';
