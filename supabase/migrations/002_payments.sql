-- =============================================
-- LensRoom V2 - Payments & Subscriptions Schema
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Subscriptions table
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  plan_id text NOT NULL,
  prodamus_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'active', -- active, canceled, expired
  credits_per_month integer NOT NULL,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- Payments history
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  prodamus_order_id text UNIQUE NOT NULL,
  type text NOT NULL, -- 'package' | 'subscription'
  amount integer NOT NULL,
  credits integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(prodamus_order_id);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- Credit transactions (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,
  amount integer NOT NULL, -- positive = add, negative = deduct
  type text NOT NULL, -- 'purchase', 'subscription', 'generation', 'bonus', 'refund'
  description text,
  generation_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- Function для начисления кредитов при подписке
-- =============================================
CREATE OR REPLACE FUNCTION renew_subscription_credits()
RETURNS void AS $$
DECLARE
  sub RECORD;
BEGIN
  -- Найти все активные подписки где период закончился
  FOR sub IN 
    SELECT * FROM subscriptions 
    WHERE status = 'active' 
    AND current_period_end <= NOW()
    AND cancel_at_period_end = false
  LOOP
    -- Начислить кредиты
    UPDATE credits 
    SET amount = amount + sub.credits_per_month,
        updated_at = NOW()
    WHERE user_id = sub.user_id;
    
    -- Обновить период подписки
    UPDATE subscriptions
    SET current_period_start = current_period_end,
        current_period_end = current_period_end + INTERVAL '1 month',
        updated_at = NOW()
    WHERE id = sub.id;
    
    -- Записать транзакцию
    INSERT INTO credit_transactions (user_id, amount, type, description)
    VALUES (
      sub.user_id, 
      sub.credits_per_month, 
      'subscription', 
      'Автопродление подписки ' || sub.plan_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Function для отмены просроченных подписок
-- =============================================
CREATE OR REPLACE FUNCTION expire_cancelled_subscriptions()
RETURNS void AS $$
BEGIN
  -- Найти подписки которые должны были отмениться
  UPDATE subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
  AND cancel_at_period_end = true
  AND current_period_end <= NOW();
  
  -- Обновить план пользователя на starter
  UPDATE profiles
  SET plan = 'starter',
      updated_at = NOW()
  WHERE id IN (
    SELECT user_id FROM subscriptions 
    WHERE status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Cron jobs (нужно включить pg_cron в Supabase)
-- Dashboard → Database → Extensions → pg_cron
-- =============================================

-- Раскомментируйте после включения pg_cron:

-- Продление подписок каждый день в полночь
-- SELECT cron.schedule('renew-subscriptions', '0 0 * * *', 'SELECT renew_subscription_credits();');

-- Отмена просроченных подписок каждый час
-- SELECT cron.schedule('expire-subscriptions', '0 * * * *', 'SELECT expire_cancelled_subscriptions();');

-- =============================================
-- Добавляем поле plan в profiles если нет
-- =============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan text DEFAULT 'starter';
  END IF;
END $$;

-- =============================================
-- Grants для service role
-- =============================================
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON payments TO service_role;
GRANT ALL ON credit_transactions TO service_role;
GRANT EXECUTE ON FUNCTION renew_subscription_credits() TO service_role;
GRANT EXECUTE ON FUNCTION expire_cancelled_subscriptions() TO service_role;

