-- =====================================================
-- Migration: Affiliate recurring commission percent + extra audit fields
-- Adds:
--   - affiliate_tiers.recurring_percent (percent for renewals / repeat purchases)
--   - affiliate_earnings.is_first_purchase + buyer_payment_index + prior_payments_count
--   - safer affiliate_earnings_summary view based on telegram_profiles (no dependency on profiles table)
-- =====================================================

-- 1) affiliate_tiers: add recurring_percent (2-5% passive by default)
ALTER TABLE public.affiliate_tiers
  ADD COLUMN IF NOT EXISTS recurring_percent integer NOT NULL DEFAULT 0
  CHECK (recurring_percent >= 0 AND recurring_percent <= 100);

COMMENT ON COLUMN public.affiliate_tiers.recurring_percent IS 'Процент комиссии на повторные покупки/продления (пассивный доход, обычно 2-5%). 0 = выключено';

-- 2) affiliate_earnings: add audit fields to understand why % was applied
ALTER TABLE public.affiliate_earnings
  ADD COLUMN IF NOT EXISTS is_first_purchase boolean;

ALTER TABLE public.affiliate_earnings
  ADD COLUMN IF NOT EXISTS buyer_payment_index integer;

ALTER TABLE public.affiliate_earnings
  ADD COLUMN IF NOT EXISTS prior_payments_count integer;

COMMENT ON COLUMN public.affiliate_earnings.is_first_purchase IS 'TRUE если это первая оплаченная покупка реферала';
COMMENT ON COLUMN public.affiliate_earnings.buyer_payment_index IS 'Номер оплаченной покупки у реферала (1 = первая)';
COMMENT ON COLUMN public.affiliate_earnings.prior_payments_count IS 'Сколько было completed платежей ДО текущего (для диагностики)';

CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_is_first ON public.affiliate_earnings(is_first_purchase);

-- 3) Admin summary view (optional): make it resilient (telegram_profiles exists in this project)
-- If it already exists, replace it; if it doesn't, create it.
CREATE OR REPLACE VIEW public.affiliate_earnings_summary AS
SELECT
  ae.affiliate_user_id,
  COALESCE(
    NULLIF(TRIM(CONCAT_WS(' ', tp.first_name, tp.last_name)), ''),
    tp.telegram_username,
    ae.affiliate_user_id::text
  ) AS display_name,
  tp.telegram_username AS username,
  at.tier,
  at.percent,
  at.recurring_percent,
  COUNT(*) AS total_referrals,
  SUM(ae.amount_rub) AS total_sales_rub,
  SUM(ae.commission_rub) AS total_commission_rub,
  SUM(CASE WHEN ae.status = 'pending' THEN ae.commission_rub ELSE 0 END) AS pending_rub,
  SUM(CASE WHEN ae.status = 'paid' THEN ae.commission_rub ELSE 0 END) AS paid_rub,
  MAX(ae.created_at) AS last_sale_at
FROM public.affiliate_earnings ae
LEFT JOIN public.telegram_profiles tp ON tp.auth_user_id = ae.affiliate_user_id
LEFT JOIN public.affiliate_tiers at ON at.user_id = ae.affiliate_user_id
GROUP BY ae.affiliate_user_id, tp.first_name, tp.last_name, tp.telegram_username, at.tier, at.percent, at.recurring_percent;

COMMENT ON VIEW public.affiliate_earnings_summary IS 'Сводка по заработку партнёров (first/recurring rates supported)';


