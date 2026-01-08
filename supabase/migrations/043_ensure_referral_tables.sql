-- Migration: 043_ensure_referral_tables.sql
-- Ensure referral tables exist with correct structure
-- This is idempotent - safe to run multiple times

-- =====================================================
-- REFERRAL CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT referral_codes_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- =====================================================
-- REFERRAL ATTRIBUTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT referral_attributions_invitee_key UNIQUE (invitee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_invitee ON referral_attributions(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON referral_attributions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_code ON referral_attributions(code);

-- =====================================================
-- REFERRAL EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_invitee ON referral_events(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON referral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_events_key ON referral_events(event_key);

-- =====================================================
-- REFERRAL REWARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'stars',
  reason TEXT,
  event_id UUID REFERENCES referral_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_event ON referral_rewards(event_id);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (idempotent)
-- =====================================================

-- Drop old policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access referral_codes" ON referral_codes;
  DROP POLICY IF EXISTS "Service role full access referral_attributions" ON referral_attributions;
  DROP POLICY IF EXISTS "Service role full access referral_events" ON referral_events;
  DROP POLICY IF EXISTS "Service role full access referral_rewards" ON referral_rewards;
  DROP POLICY IF EXISTS "Users can view own referral code" ON referral_codes;
  DROP POLICY IF EXISTS "Users can view related attributions" ON referral_attributions;
  DROP POLICY IF EXISTS "Users can view related events" ON referral_events;
  DROP POLICY IF EXISTS "Users can view own rewards" ON referral_rewards;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Service role full access for API operations
CREATE POLICY "Service role full access referral_codes" ON referral_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referral_attributions" ON referral_attributions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referral_events" ON referral_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access referral_rewards" ON referral_rewards
  FOR ALL USING (true) WITH CHECK (true);

-- Users can see their own data
CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view related attributions" ON referral_attributions
  FOR SELECT USING (auth.uid() = invitee_user_id OR auth.uid() = referrer_user_id);

CREATE POLICY "Users can view related events" ON referral_events
  FOR SELECT USING (auth.uid() = invitee_user_id OR auth.uid() = referrer_user_id);

CREATE POLICY "Users can view own rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS (idempotent)
-- =====================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS ensure_referral_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS claim_referral(TEXT, UUID) CASCADE;

-- Function to ensure referral code exists for a user
CREATE OR REPLACE FUNCTION ensure_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Check if code already exists
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate new code (8 chars, uppercase alphanumeric)
  v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 8));
  
  -- Insert new code
  INSERT INTO referral_codes (user_id, code)
  VALUES (p_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code
  RETURNING code INTO v_code;
  
  RETURN v_code;
END;
$$;

-- Function to claim referral (attach invitee to referrer)
CREATE OR REPLACE FUNCTION claim_referral(p_code TEXT, p_invitee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find referrer by code
  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = upper(p_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Can't refer yourself
  IF v_referrer_id = p_invitee_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if already claimed
  IF EXISTS (SELECT 1 FROM referral_attributions WHERE invitee_user_id = p_invitee_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Create attribution
  INSERT INTO referral_attributions (invitee_user_id, referrer_user_id, code)
  VALUES (p_invitee_id, v_referrer_id, upper(p_code));
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- ADD_STARS FUNCTION (for referral rewards)
-- =====================================================

-- Function to add stars to user balance
CREATE OR REPLACE FUNCTION add_stars(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert into credits table
  INSERT INTO credits (user_id, amount)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET amount = credits.amount + EXCLUDED.amount;
END;
$$;

