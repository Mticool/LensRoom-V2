-- Effects Gallery Table
-- Stores all effect presets for the gallery section

CREATE TABLE IF NOT EXISTS effects_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video')),
  model_key TEXT NOT NULL,
  tile_ratio TEXT NOT NULL DEFAULT '1:1' CHECK (tile_ratio IN ('9:16', '1:1', '16:9')),
  cost_stars INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 't2i',
  variant_id TEXT DEFAULT 'default',
  preview_image TEXT,
  template_prompt TEXT,
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_effects_gallery_content_type ON effects_gallery(content_type);
CREATE INDEX IF NOT EXISTS idx_effects_gallery_published ON effects_gallery(published);
CREATE INDEX IF NOT EXISTS idx_effects_gallery_featured ON effects_gallery(featured);
CREATE INDEX IF NOT EXISTS idx_effects_gallery_order ON effects_gallery(display_order);

-- Add role column to telegram_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'telegram_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE telegram_profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin'));
  END IF;
END $$;

-- RLS Policies
ALTER TABLE effects_gallery ENABLE ROW LEVEL SECURITY;

-- Public can read published effects
CREATE POLICY "Public can read published effects" ON effects_gallery
  FOR SELECT
  USING (published = TRUE);

-- Admins and managers can do everything
CREATE POLICY "Admins can manage all effects" ON effects_gallery
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM telegram_profiles
      WHERE telegram_profiles.id = auth.uid()
      AND (telegram_profiles.is_admin = TRUE OR telegram_profiles.role IN ('admin', 'manager'))
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_effects_gallery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_effects_gallery_updated_at ON effects_gallery;
CREATE TRIGGER trigger_effects_gallery_updated_at
  BEFORE UPDATE ON effects_gallery
  FOR EACH ROW
  EXECUTE FUNCTION update_effects_gallery_updated_at();

-- Insert initial effects from config (optional - can be done via admin panel)
-- This seeds the database with default effects
