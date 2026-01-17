-- Add CHECK constraints to prevent negative balances in credits table
-- This prevents race conditions where concurrent deductions could cause negative balance

-- Add constraint: subscription_stars >= 0
ALTER TABLE credits
  ADD CONSTRAINT credits_subscription_stars_non_negative
  CHECK (subscription_stars >= 0);

-- Add constraint: package_stars >= 0
ALTER TABLE credits
  ADD CONSTRAINT credits_package_stars_non_negative
  CHECK (package_stars >= 0);

-- Add constraint: amount (total) >= 0
ALTER TABLE credits
  ADD CONSTRAINT credits_amount_non_negative
  CHECK (amount >= 0);

-- Add index for faster balance queries
CREATE INDEX IF NOT EXISTS idx_credits_user_balance
  ON credits(user_id, subscription_stars, package_stars);

-- Comment explaining the constraints
COMMENT ON CONSTRAINT credits_subscription_stars_non_negative ON credits IS
  'Prevents subscription_stars from going negative during concurrent deductions';

COMMENT ON CONSTRAINT credits_package_stars_non_negative ON credits IS
  'Prevents package_stars from going negative during concurrent deductions';

COMMENT ON CONSTRAINT credits_amount_non_negative ON credits IS
  'Prevents total balance (amount) from going negative during concurrent deductions';
