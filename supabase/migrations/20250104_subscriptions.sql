-- Migration: Create subscriptions table
-- Date: 2025-01-04

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL, -- creator, creator_plus, business
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  
  -- Billing info
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  
  -- Payment provider info
  provider TEXT DEFAULT 'robokassa', -- robokassa, stripe, etc.
  provider_subscription_id TEXT, -- External subscription ID
  provider_customer_id TEXT,
  
  -- Stars allocation
  stars_per_period INTEGER NOT NULL DEFAULT 0,
  stars_allocated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active ON public.subscriptions(user_id) WHERE status = 'active';

-- 3. RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions
  FOR ALL USING (true);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at_trigger ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at_trigger
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- 5. Helper function: Get user's active subscription
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  stars_per_period INTEGER,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.plan_id,
    s.status,
    s.current_period_end,
    s.stars_per_period,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id 
    AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Helper function: Create or renew subscription
CREATE OR REPLACE FUNCTION create_or_renew_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_stars INTEGER,
  p_provider TEXT DEFAULT 'robokassa',
  p_provider_subscription_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_period_end := NOW() + INTERVAL '1 month';
  
  -- Try to find existing active subscription
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;
  
  IF v_subscription_id IS NOT NULL THEN
    -- Renew existing subscription
    UPDATE subscriptions
    SET 
      plan_id = p_plan_id,
      current_period_start = NOW(),
      current_period_end = v_period_end,
      stars_per_period = p_stars,
      stars_allocated_at = NOW(),
      provider = p_provider,
      provider_subscription_id = COALESCE(p_provider_subscription_id, provider_subscription_id),
      cancel_at_period_end = FALSE,
      updated_at = NOW()
    WHERE id = v_subscription_id;
  ELSE
    -- Create new subscription
    INSERT INTO subscriptions (
      user_id, plan_id, status, 
      current_period_start, current_period_end,
      stars_per_period, stars_allocated_at,
      provider, provider_subscription_id
    ) VALUES (
      p_user_id, p_plan_id, 'active',
      NOW(), v_period_end,
      p_stars, NOW(),
      p_provider, p_provider_subscription_id
    )
    RETURNING id INTO v_subscription_id;
  END IF;
  
  -- Add subscription stars to user
  PERFORM add_subscription_stars(p_user_id, p_stars);
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Helper function: Cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID, p_immediate BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;
  
  IF v_subscription_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_immediate THEN
    -- Immediate cancellation
    UPDATE subscriptions
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_subscription_id;
    
    -- Reset subscription stars
    PERFORM reset_subscription_stars(p_user_id);
  ELSE
    -- Cancel at period end
    UPDATE subscriptions
    SET 
      cancel_at_period_end = TRUE,
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_subscription_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Done







