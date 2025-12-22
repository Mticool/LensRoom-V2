-- =====================================================
-- Миграция: Таблица платежей (payments)
-- Создаёт таблицу для хранения информации о покупках
-- =====================================================

-- Таблица платежей
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Тип платежа
  type TEXT NOT NULL DEFAULT 'stars_purchase', -- stars_purchase, subscription, etc.
  
  -- Пакет звёзд (если это покупка пакета)
  package_id TEXT, -- starter, basic, pro, business, agency
  
  -- Суммы
  amount INTEGER NOT NULL DEFAULT 0, -- сумма в рублях
  credits INTEGER NOT NULL DEFAULT 0, -- количество звёзд
  
  -- Статус платежа
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  
  -- Платёжная система
  provider TEXT, -- robokassa, payform, telegram_stars, prodamus
  external_id TEXT, -- ID транзакции в платёжной системе
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ -- когда платёж был завершён
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);
CREATE INDEX IF NOT EXISTS payments_user_created_idx ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON public.payments(provider);
CREATE INDEX IF NOT EXISTS payments_external_id_idx ON public.payments(external_id);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at_trigger ON public.payments;
CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payments_updated_at();

-- RLS политики
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои платежи
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Сервис может всё
DROP POLICY IF EXISTS "Service role full access" ON public.payments;
CREATE POLICY "Service role full access" ON public.payments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Комментарии
COMMENT ON TABLE public.payments IS 'История платежей пользователей';
COMMENT ON COLUMN public.payments.type IS 'Тип платежа: stars_purchase, subscription';
COMMENT ON COLUMN public.payments.package_id IS 'ID пакета звёзд: starter, basic, pro, business, agency';
COMMENT ON COLUMN public.payments.amount IS 'Сумма в рублях';
COMMENT ON COLUMN public.payments.credits IS 'Количество начисленных звёзд';
COMMENT ON COLUMN public.payments.status IS 'Статус: pending, completed, failed, refunded';
COMMENT ON COLUMN public.payments.provider IS 'Платёжная система: robokassa, payform, telegram_stars, prodamus';


