-- Migration: Telegram User Settings & Favorites
-- Date: 2026-02-02
-- Purpose: Persistent state for Telegram bot users

-- ========================================
-- Table: telegram_user_settings
-- Stores user preferences and conversation state
-- ========================================
CREATE TABLE IF NOT EXISTS telegram_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- User preferences
  language VARCHAR(5) DEFAULT 'ru',
  default_photo_model VARCHAR(100) DEFAULT 'nano-banana',
  default_video_model VARCHAR(100) DEFAULT 'veo-3.1-fast',
  default_aspect_ratio VARCHAR(20) DEFAULT '1:1',
  default_quality VARCHAR(50) DEFAULT 'balanced',

  -- Notification settings
  notify_enabled BOOLEAN DEFAULT true,
  notify_success BOOLEAN DEFAULT true,
  notify_error BOOLEAN DEFAULT true,
  notify_promo BOOLEAN DEFAULT false,

  -- Conversation state (for multi-step flows)
  conversation_state JSONB DEFAULT '{}',
  conversation_expires_at TIMESTAMPTZ,
  last_message_id BIGINT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by telegram_id
CREATE INDEX IF NOT EXISTS idx_telegram_user_settings_telegram_id
  ON telegram_user_settings(telegram_id);

-- Index for finding users with active conversations (removed partial index for compatibility)
CREATE INDEX IF NOT EXISTS idx_telegram_user_settings_conversation
  ON telegram_user_settings(conversation_expires_at);

-- ========================================
-- Table: telegram_favorites
-- User's favorite generations in Telegram bot
-- ========================================
CREATE TABLE IF NOT EXISTS telegram_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(telegram_id, generation_id)
);

-- Index for fetching user's favorites
CREATE INDEX IF NOT EXISTS idx_telegram_favorites_telegram_id
  ON telegram_favorites(telegram_id);

-- ========================================
-- Function: Update updated_at timestamp
-- ========================================
CREATE OR REPLACE FUNCTION update_telegram_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_telegram_user_settings_updated_at
  ON telegram_user_settings;

CREATE TRIGGER trigger_update_telegram_user_settings_updated_at
  BEFORE UPDATE ON telegram_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_user_settings_updated_at();

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE telegram_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_favorites ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for webhook handlers)
CREATE POLICY "Service role full access on telegram_user_settings"
  ON telegram_user_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on telegram_favorites"
  ON telegram_favorites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read/write their own settings (if linked)
CREATE POLICY "Users can manage own telegram settings"
  ON telegram_user_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own telegram favorites"
  ON telegram_favorites
  FOR ALL
  TO authenticated
  USING (
    telegram_id IN (
      SELECT telegram_id FROM telegram_profiles
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    telegram_id IN (
      SELECT telegram_id FROM telegram_profiles
      WHERE auth_user_id = auth.uid()
    )
  );
