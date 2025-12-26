-- Generation Runs table for unit economics analytics
-- Tracks provider costs, stars charged, and profit/loss per generation

CREATE TABLE IF NOT EXISTS public.generation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider info
  provider TEXT NOT NULL, -- 'kie_market', 'kie_veo', 'openai'
  provider_model TEXT NOT NULL, -- e.g., 'gpt-image-1.5', 'veo3', 'midjourney/text-to-image'
  variant_key TEXT, -- e.g., 'medium_1024x1024', 'high_1024x1536', 'kling-2.6_5s_720p'
  
  -- Billing
  stars_charged INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  
  -- Provider costs (for profit/loss analytics)
  provider_cost_usd NUMERIC(10, 4), -- Cost in USD
  provider_cost_rub NUMERIC(10, 2), -- Cost in RUB
  usd_rub_rate_at_time NUMERIC(10, 4), -- Exchange rate used
  rub_per_star_at_time NUMERIC(10, 4), -- Revenue per star at time of generation
  
  -- Request tracking
  provider_request_id TEXT, -- External provider request/task ID
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS generation_runs_user_id_idx ON public.generation_runs(user_id);
CREATE INDEX IF NOT EXISTS generation_runs_provider_idx ON public.generation_runs(provider);
CREATE INDEX IF NOT EXISTS generation_runs_status_idx ON public.generation_runs(status);
CREATE INDEX IF NOT EXISTS generation_runs_created_at_idx ON public.generation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS generation_runs_generation_id_idx ON public.generation_runs(generation_id);

-- RLS policies
ALTER TABLE public.generation_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own runs
CREATE POLICY "Users can view own generation runs"
  ON public.generation_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for API and admin)
CREATE POLICY "Service role full access"
  ON public.generation_runs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.generation_runs TO authenticated;
GRANT ALL ON public.generation_runs TO service_role;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_generation_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_runs_updated_at
  BEFORE UPDATE ON public.generation_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generation_runs_updated_at();

