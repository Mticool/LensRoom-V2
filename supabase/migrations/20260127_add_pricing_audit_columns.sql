-- Migration: Add pricing audit columns for SKU-based pricing system (2026-01-27)
-- Adds tracking columns for the new atomic pricing system

-- Add pricing columns to generations table
ALTER TABLE generations 
  ADD COLUMN IF NOT EXISTS charged_stars INTEGER,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pricing_version VARCHAR(50);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_generations_sku ON generations(sku);
CREATE INDEX IF NOT EXISTS idx_generations_pricing_version ON generations(pricing_version);

-- Add comment
COMMENT ON COLUMN generations.charged_stars IS 'Actual stars charged (may be 0 if included in plan)';
COMMENT ON COLUMN generations.sku IS 'SKU identifier for pricing (e.g., "nano_banana_pro:2k", "kling_2_6:5s:720p:audio")';
COMMENT ON COLUMN generations.pricing_version IS 'Pricing version used (e.g., "2026-01-27")';

-- Add pricing columns to credit_transactions table
ALTER TABLE credit_transactions 
  ADD COLUMN IF NOT EXISTS sku VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pricing_version VARCHAR(50);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_credit_transactions_sku ON credit_transactions(sku);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_pricing_version ON credit_transactions(pricing_version);

-- Add comment
COMMENT ON COLUMN credit_transactions.sku IS 'SKU identifier for pricing (e.g., "nano_banana_pro:2k", "kling_2_6:5s:720p:audio")';
COMMENT ON COLUMN credit_transactions.pricing_version IS 'Pricing version used (e.g., "2026-01-27")';

-- Optional: Update RLS policies if needed (generations and credit_transactions already have RLS)
-- RLS policies should continue to work as-is since we're only adding columns

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Added pricing audit columns (charged_stars, sku, pricing_version) to generations and credit_transactions tables';
END $$;
