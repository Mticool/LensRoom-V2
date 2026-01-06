-- =====================================================
-- Таблица подписок пользователей
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL, -- creator, creator_plus, business
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  
  -- Период подписки
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  
  -- Robokassa данные
  external_subscription_id TEXT, -- ID подписки в Robokassa
  external_customer_email TEXT, -- Email для рекуррентных платежей
  
  -- Метаданные
  stars_per_period INTEGER NOT NULL DEFAULT 0, -- Сколько звёзд даётся за период
  price_per_period INTEGER NOT NULL DEFAULT 0, -- Цена за период в рублях
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  
  -- Даты
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  
  -- Уникальность: один активный план на пользователя
  CONSTRAINT unique_active_subscription UNIQUE (user_id, plan_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_email ON public.subscriptions(external_customer_email);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions
  FOR ALL USING (true);

-- Триггер updated_at
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

-- Функция: получить активную подписку пользователя
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  stars_per_period INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.plan_id,
    s.status,
    s.current_period_end,
    s.stars_per_period
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.current_period_end > NOW()
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Функция: активировать/продлить подписку
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_stars INTEGER,
  p_price INTEGER,
  p_period TEXT DEFAULT 'monthly',
  p_external_id TEXT DEFAULT NULL,
  p_external_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_period_interval INTERVAL;
BEGIN
  -- Определить интервал
  v_period_interval := CASE p_period
    WHEN 'yearly' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  -- Upsert подписки
  INSERT INTO subscriptions (
    user_id, plan_id, status,
    current_period_start, current_period_end,
    stars_per_period, price_per_period, billing_period,
    external_subscription_id, external_customer_email
  ) VALUES (
    p_user_id, p_plan_id, 'active',
    NOW(), NOW() + v_period_interval,
    p_stars, p_price, p_period,
    p_external_id, p_external_email
  )
  ON CONFLICT (user_id, plan_id) DO UPDATE SET
    status = 'active',
    current_period_start = NOW(),
    current_period_end = NOW() + v_period_interval,
    stars_per_period = p_stars,
    price_per_period = p_price,
    billing_period = p_period,
    external_subscription_id = COALESCE(p_external_id, subscriptions.external_subscription_id),
    external_customer_email = COALESCE(p_external_email, subscriptions.external_customer_email),
    cancelled_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Начислить звёзды подписки
  PERFORM add_subscription_stars(p_user_id, p_stars);

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: отменить подписку
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID, p_plan_id TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (p_plan_id IS NULL OR plan_id = p_plan_id);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON TABLE public.subscriptions IS 'Подписки пользователей (Creator, Creator+, Business)';
COMMENT ON COLUMN public.subscriptions.status IS 'Статус: active, cancelled, expired, past_due';
COMMENT ON COLUMN public.subscriptions.stars_per_period IS 'Количество звёзд за период подписки';

-- Готово
SELECT 'Subscriptions table created' AS result;

