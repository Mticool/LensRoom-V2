-- Migration: Split credits into subscription_stars and package_stars
-- Date: 2025-01-04
-- Description: Subscription stars expire at end of billing period, package stars persist forever

-- 1. Add new columns to credits table
ALTER TABLE credits 
ADD COLUMN IF NOT EXISTS subscription_stars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS package_stars INTEGER DEFAULT 0;

-- 2. Migrate existing data: all current credits go to package_stars (permanent)
-- This preserves existing user balances as non-expiring
UPDATE credits 
SET package_stars = amount,
    subscription_stars = 0
WHERE package_stars = 0 AND amount > 0;

-- 3. Add comment for documentation
COMMENT ON COLUMN credits.subscription_stars IS 'Stars from monthly subscription - reset at end of billing period';
COMMENT ON COLUMN credits.package_stars IS 'Stars from one-time packages - never expire';

-- 4. Create function to get total balance
CREATE OR REPLACE FUNCTION get_total_stars(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT subscription_stars + package_stars FROM credits WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to deduct stars (subscription first, then package)
CREATE OR REPLACE FUNCTION deduct_stars(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(success BOOLEAN, new_subscription_stars INTEGER, new_package_stars INTEGER, total_balance INTEGER) AS $$
DECLARE
  v_sub_stars INTEGER;
  v_pkg_stars INTEGER;
  v_total INTEGER;
  v_from_sub INTEGER;
  v_from_pkg INTEGER;
BEGIN
  -- Get current balances
  SELECT subscription_stars, package_stars 
  INTO v_sub_stars, v_pkg_stars
  FROM credits WHERE user_id = p_user_id;
  
  IF v_sub_stars IS NULL THEN
    v_sub_stars := 0;
    v_pkg_stars := 0;
  END IF;
  
  v_total := v_sub_stars + v_pkg_stars;
  
  -- Check if enough balance
  IF v_total < p_amount THEN
    RETURN QUERY SELECT FALSE, v_sub_stars, v_pkg_stars, v_total;
    RETURN;
  END IF;
  
  -- Deduct from subscription first (use them before they expire)
  v_from_sub := LEAST(v_sub_stars, p_amount);
  v_from_pkg := p_amount - v_from_sub;
  
  -- Update balances
  UPDATE credits 
  SET subscription_stars = subscription_stars - v_from_sub,
      package_stars = package_stars - v_from_pkg,
      amount = subscription_stars - v_from_sub + package_stars - v_from_pkg,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    v_sub_stars - v_from_sub, 
    v_pkg_stars - v_from_pkg, 
    v_total - p_amount;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to add subscription stars (on subscription payment/renewal)
CREATE OR REPLACE FUNCTION add_subscription_stars(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(new_subscription_stars INTEGER, new_package_stars INTEGER, total_balance INTEGER) AS $$
BEGIN
  -- Upsert credits row
  INSERT INTO credits (user_id, subscription_stars, package_stars, amount, updated_at)
  VALUES (p_user_id, p_amount, 0, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET subscription_stars = credits.subscription_stars + p_amount,
      amount = credits.subscription_stars + p_amount + credits.package_stars,
      updated_at = NOW();
  
  RETURN QUERY SELECT 
    c.subscription_stars, 
    c.package_stars, 
    c.subscription_stars + c.package_stars
  FROM credits c WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to add package stars (on package purchase)
CREATE OR REPLACE FUNCTION add_package_stars(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(new_subscription_stars INTEGER, new_package_stars INTEGER, total_balance INTEGER) AS $$
BEGIN
  -- Upsert credits row
  INSERT INTO credits (user_id, subscription_stars, package_stars, amount, updated_at)
  VALUES (p_user_id, 0, p_amount, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET package_stars = credits.package_stars + p_amount,
      amount = credits.subscription_stars + credits.package_stars + p_amount,
      updated_at = NOW();
  
  RETURN QUERY SELECT 
    c.subscription_stars, 
    c.package_stars, 
    c.subscription_stars + c.package_stars
  FROM credits c WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to reset subscription stars (called at end of billing period)
CREATE OR REPLACE FUNCTION reset_subscription_stars(p_user_id UUID)
RETURNS TABLE(expired_stars INTEGER, remaining_package_stars INTEGER) AS $$
DECLARE
  v_expired INTEGER;
BEGIN
  -- Get current subscription stars before reset
  SELECT subscription_stars INTO v_expired
  FROM credits WHERE user_id = p_user_id;
  
  IF v_expired IS NULL THEN
    v_expired := 0;
  END IF;
  
  -- Reset subscription stars to 0
  UPDATE credits 
  SET subscription_stars = 0,
      amount = package_stars,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT 
    v_expired,
    c.package_stars
  FROM credits c WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Create index for subscription period checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end 
ON subscriptions(current_period_end) 
WHERE status = 'active';







