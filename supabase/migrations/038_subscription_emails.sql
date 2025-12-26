-- =====================================================
-- Таблица связи email → user для рекуррентных подписок Robokassa
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL, -- star, pro, business
  subscription_id TEXT, -- Robokassa SubscriptionId
  status TEXT DEFAULT 'pending', -- pending, active, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Уникальный индекс по email + plan
CREATE UNIQUE INDEX IF NOT EXISTS subscription_emails_email_plan_idx 
  ON public.subscription_emails(email, plan_id);

-- Индексы для поиска
CREATE INDEX IF NOT EXISTS subscription_emails_user_id_idx ON public.subscription_emails(user_id);
CREATE INDEX IF NOT EXISTS subscription_emails_email_idx ON public.subscription_emails(email);
CREATE INDEX IF NOT EXISTS subscription_emails_subscription_id_idx ON public.subscription_emails(subscription_id);

-- RLS
ALTER TABLE public.subscription_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscription_emails;
CREATE POLICY "Users can view own subscriptions" ON public.subscription_emails
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access" ON public.subscription_emails;
CREATE POLICY "Service role full access" ON public.subscription_emails
  FOR ALL USING (true);

-- Триггер updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_emails_updated_at_trigger ON public.subscription_emails;
CREATE TRIGGER subscription_emails_updated_at_trigger
  BEFORE UPDATE ON public.subscription_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_emails_updated_at();

-- Готово
SELECT '✅ Subscription emails table ready!' as status;

