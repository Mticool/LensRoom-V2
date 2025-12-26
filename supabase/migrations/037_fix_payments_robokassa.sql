-- =====================================================
-- Миграция: Исправление таблицы payments для Robokassa
-- =====================================================

-- Делаем prodamus_order_id необязательным (для Robokassa)
ALTER TABLE IF EXISTS public.payments 
  ALTER COLUMN prodamus_order_id DROP NOT NULL;

-- Добавляем колонку provider если не существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN provider TEXT DEFAULT 'robokassa';
  END IF;
END $$;

-- Добавляем колонку external_id для Robokassa InvId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN external_id TEXT;
  END IF;
END $$;

-- Добавляем колонку package_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'package_id'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN package_id TEXT;
  END IF;
END $$;

-- Добавляем колонку completed_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Создаём индекс по external_id для быстрого поиска
CREATE INDEX IF NOT EXISTS payments_external_id_idx ON public.payments(external_id);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON public.payments(provider);

-- Готово
SELECT '✅ Payments table updated for Robokassa!' as status;

