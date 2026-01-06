-- Push Subscriptions table for web push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time TIMESTAMPTZ,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
  ON public.push_subscriptions(user_id);

-- Index for endpoint lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
  ON public.push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own push subscriptions" 
  ON public.push_subscriptions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can create push subscriptions" 
  ON public.push_subscriptions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions" 
  ON public.push_subscriptions
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE public.push_subscriptions IS 'Web Push notification subscriptions for users';







