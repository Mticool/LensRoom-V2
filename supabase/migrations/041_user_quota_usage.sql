-- User Quota Usage table for tracking monthly included generations
-- Used for Nano Banana Pro fair use limits

CREATE TABLE IF NOT EXISTS public.user_quota_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM' for easy grouping
  model_key TEXT NOT NULL, -- e.g., 'nano-banana-pro'
  variant_key TEXT NOT NULL, -- e.g., '1k_2k', '4k'
  used_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_quota_usage_unique'
  ) THEN
    ALTER TABLE public.user_quota_usage 
    ADD CONSTRAINT user_quota_usage_unique UNIQUE (user_id, month, model_key, variant_key);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS user_quota_usage_user_id_idx ON public.user_quota_usage(user_id);
CREATE INDEX IF NOT EXISTS user_quota_usage_month_idx ON public.user_quota_usage(month);
CREATE INDEX IF NOT EXISTS user_quota_usage_lookup_idx ON public.user_quota_usage(user_id, month, model_key, variant_key);

-- RLS policies
ALTER TABLE public.user_quota_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own quota usage" ON public.user_quota_usage;
DROP POLICY IF EXISTS "Service role full access quota" ON public.user_quota_usage;

-- Users can view their own usage
CREATE POLICY "Users can view own quota usage"
  ON public.user_quota_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for API)
CREATE POLICY "Service role full access quota"
  ON public.user_quota_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.user_quota_usage TO authenticated;
GRANT ALL ON public.user_quota_usage TO service_role;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_quota_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_quota_usage_updated_at ON public.user_quota_usage;
CREATE TRIGGER update_user_quota_usage_updated_at
  BEFORE UPDATE ON public.user_quota_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_quota_usage_updated_at();

-- Function to atomically increment quota usage and return new count
-- Returns -1 if insert failed (shouldn't happen with UPSERT)
CREATE OR REPLACE FUNCTION public.increment_quota_usage(
  p_user_id UUID,
  p_month TEXT,
  p_model_key TEXT,
  p_variant_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.user_quota_usage (user_id, month, model_key, variant_key, used_count)
  VALUES (p_user_id, p_month, p_model_key, p_variant_key, 1)
  ON CONFLICT (user_id, month, model_key, variant_key)
  DO UPDATE SET used_count = user_quota_usage.used_count + 1, updated_at = NOW()
  RETURNING used_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Function to get current quota usage
CREATE OR REPLACE FUNCTION public.get_quota_usage(
  p_user_id UUID,
  p_month TEXT,
  p_model_key TEXT,
  p_variant_key TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT used_count INTO v_count
  FROM public.user_quota_usage
  WHERE user_id = p_user_id
    AND month = p_month
    AND model_key = p_model_key
    AND variant_key = p_variant_key;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Add included_by_plan column to generation_runs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generation_runs' 
    AND column_name = 'included_by_plan'
  ) THEN
    ALTER TABLE public.generation_runs ADD COLUMN included_by_plan BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Comment
COMMENT ON TABLE public.user_quota_usage IS 'Tracks monthly usage of included model generations per plan (e.g., Nano Banana Pro fair use)';
