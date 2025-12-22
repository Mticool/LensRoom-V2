-- =====================================================
-- AFFILIATE EARNINGS (Partner Commissions in RUB) - FIXED
-- Migration: 024_affiliate_earnings_fixed.sql
-- =====================================================

-- Таблица для накопления комиссий партнёров в рублях
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id text NOT NULL, -- ID платежа из Robokassa
  amount_rub numeric(10,2) NOT NULL, -- Сумма покупки в рублях
  commission_percent integer NOT NULL, -- Процент комиссии (30 или 50)
  commission_rub numeric(10,2) NOT NULL, -- Начисленная комиссия в рублях
  tariff_name text, -- Название тарифа/пакета
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz, -- Дата выплаты
  paid_by uuid REFERENCES auth.users(id), -- Кто выплатил (admin)
  notes text, -- Примечания админа
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate ON public.affiliate_earnings(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_referral ON public.affiliate_earnings(referral_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_payment ON public.affiliate_earnings(payment_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status ON public.affiliate_earnings(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_created ON public.affiliate_earnings(created_at DESC);

COMMENT ON TABLE public.affiliate_earnings IS 'Комиссии партнёров в рублях (накопление + выплаты)';

-- RLS
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- Партнёры могут видеть только свои комиссии
DROP POLICY IF EXISTS affiliate_earnings_select_own ON public.affiliate_earnings;
CREATE POLICY affiliate_earnings_select_own ON public.affiliate_earnings
  FOR SELECT USING (auth.uid() = affiliate_user_id);

-- Добавляем колонки в profiles если их нет
DO $$
BEGIN
  -- Add display_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name text;
  END IF;

  -- Add username if not exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;
END $$;

-- Представление для админа: общая статистика по партнёрам
CREATE OR REPLACE VIEW public.affiliate_earnings_summary AS
SELECT 
  ae.affiliate_user_id,
  COALESCE(p.display_name, p.username, ae.affiliate_user_id::text) as display_name,
  p.username,
  at.tier,
  at.percent,
  COUNT(*) as total_referrals,
  SUM(ae.amount_rub) as total_sales_rub,
  SUM(ae.commission_rub) as total_commission_rub,
  SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_rub ELSE 0 END) as pending_rub,
  SUM(CASE WHEN ae.status = 'paid' THEN ae.commission_rub ELSE 0 END) as paid_rub,
  MAX(ae.created_at) as last_sale_at
FROM public.affiliate_earnings ae
LEFT JOIN public.profiles p ON p.id = ae.affiliate_user_id
LEFT JOIN public.affiliate_tiers at ON at.user_id = ae.affiliate_user_id
GROUP BY ae.affiliate_user_id, p.display_name, p.username, at.tier, at.percent;

COMMENT ON VIEW public.affiliate_earnings_summary IS 'Сводка по заработку партнёров для админа';

