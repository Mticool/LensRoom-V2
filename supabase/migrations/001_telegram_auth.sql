-- =====================================================
-- LensRoom Telegram Auth + Waitlist Schema
-- =====================================================

-- Ensure required extension for gen_random_uuid (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES TABLE (may already exist in Supabase projects)
-- If it exists, we ALTER it to add Telegram fields.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if profiles already existed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure uniqueness for ON CONFLICT (allows multiple NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_telegram_id_key'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_telegram_id_key UNIQUE (telegram_id);
  END IF;
END$$;

-- Index for faster lookups (safe now that column exists)
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);

-- 2. TELEGRAM BOT LINKS TABLE
-- Tracks whether a user has started the bot (can receive notifications)
CREATE TABLE IF NOT EXISTS telegram_bot_links (
  telegram_id BIGINT PRIMARY KEY,
  can_notify BOOLEAN DEFAULT FALSE,
  chat_id BIGINT, -- Store chat_id for sending messages
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WAITLIST SUBSCRIPTIONS TABLE
-- Tracks user subscriptions to various waitlists
CREATE TABLE IF NOT EXISTS waitlist_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'academy', 'feature_video_ads', 'feature_lifestyle', 'feature_ab_covers'
  source TEXT, -- 'home', 'create_products', 'pricing', etc.
  status TEXT DEFAULT 'active', -- 'active', 'notified', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  
  -- Prevent duplicate subscriptions
  UNIQUE(profile_id, type)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_waitlist_type_status ON waitlist_subscriptions(type, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_profile ON waitlist_subscriptions(profile_id);

-- 4. ROW LEVEL SECURITY
-- Disable direct client access - all operations through server with service role

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_bot_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_subscriptions ENABLE ROW LEVEL SECURITY;

-- No policies = no direct client access (service role bypasses RLS)

-- 5. HELPER FUNCTIONS

-- Function to update last_login_at on profile
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for telegram_bot_links
DROP TRIGGER IF EXISTS trg_telegram_bot_links_updated ON telegram_bot_links;
CREATE TRIGGER trg_telegram_bot_links_updated
  BEFORE UPDATE ON telegram_bot_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
