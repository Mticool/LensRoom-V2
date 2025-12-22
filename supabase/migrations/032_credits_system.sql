-- =====================================================
-- Миграция: Система кредитов (звёзд)
-- Безопасно создаёт/обновляет таблицы
-- =====================================================

-- =====================================================
-- 1. ТАБЛИЦА БАЛАНСОВ (credits)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credits_user_id_idx ON public.credits(user_id);

-- Триггер updated_at
CREATE OR REPLACE FUNCTION public.update_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credits_updated_at_trigger ON public.credits;
CREATE TRIGGER credits_updated_at_trigger
  BEFORE UPDATE ON public.credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credits_updated_at();

-- RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;
CREATE POLICY "Users can view own credits" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access credits" ON public.credits;
CREATE POLICY "Service role full access credits" ON public.credits
  FOR ALL USING (true);

-- =====================================================
-- 2. ТАБЛИЦА ИСТОРИИ ТРАНЗАКЦИЙ (credit_transactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Добавляем колонки безопасно (внутри DO блока)
DO $$
BEGIN
  -- payment_id
  BEGIN
    ALTER TABLE public.credit_transactions ADD COLUMN payment_id UUID;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;
  
  -- generation_id
  BEGIN
    ALTER TABLE public.credit_transactions ADD COLUMN generation_id UUID;
  EXCEPTION WHEN duplicate_column THEN
    NULL;
  END;
END $$;

-- Индексы
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_type_idx ON public.credit_transactions(type);

-- RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access transactions" ON public.credit_transactions;
CREATE POLICY "Service role full access transactions" ON public.credit_transactions
  FOR ALL USING (true);

-- =====================================================
-- 3. ФУНКЦИИ
-- =====================================================

CREATE OR REPLACE FUNCTION public.adjust_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.credits (user_id, amount)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT amount INTO v_current_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  v_new_balance := v_current_balance + p_amount;
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID;
    RETURN;
  END IF;
  
  UPDATE public.credits
  SET amount = v_new_balance, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, type, description, metadata)
  VALUES (p_user_id, p_amount, p_type, p_description, p_metadata)
  RETURNING id INTO v_transaction_id;
  
  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(amount, 0) INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Готово
SELECT '✅ Credits system ready!' as status;

