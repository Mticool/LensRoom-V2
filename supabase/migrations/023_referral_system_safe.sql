-- =====================================================
-- REFERRAL SYSTEM + AFFILIATE PROGRAM (SAFE VERSION)
-- Migration: 023_referral_system_safe.sql
-- Idempotent: safe to run multiple times
-- =====================================================

-- 1) referral_codes: хранит уникальный код для каждого пользователя
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

COMMENT ON TABLE public.referral_codes IS 'Уникальные реферальные коды для пользователей';

-- 2) referral_attributions: закрепление invitee за referrer (first-touch)
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  invitee_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON public.referral_attributions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_code ON public.referral_attributions(code);

COMMENT ON TABLE public.referral_attributions IS 'Привязка приглашённого к пригласившему (first-touch атрибуция)';

-- 3) referral_events: события для начисления наград (идемпотентность через event_key)
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_key text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_invitee ON public.referral_events(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON public.referral_events(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_events_key ON public.referral_events(event_key);

COMMENT ON TABLE public.referral_events IS 'События реферальной системы (signup, first_generation и т.д.)';

-- 4) referral_rewards: начисленные награды
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL DEFAULT 'stars',
  amount integer NOT NULL,
  reason text NOT NULL,
  event_id uuid REFERENCES public.referral_events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_event ON public.referral_rewards(event_id);

COMMENT ON TABLE public.referral_rewards IS 'Начисленные награды за реферальные события';

-- 5) affiliate_applications: заявки на партнёрство
CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_url text NOT NULL,
  followers integer,
  proof_text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_applications_user ON public.affiliate_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_applications_status ON public.affiliate_applications(status);

COMMENT ON TABLE public.affiliate_applications IS 'Заявки на партнёрскую программу (инфлюенсеры)';

-- 6) affiliate_tiers: уровни партнёров (classic/pro) и процент комиссии
CREATE TABLE IF NOT EXISTS public.affiliate_tiers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'classic' CHECK (tier IN ('classic', 'pro')),
  percent integer NOT NULL DEFAULT 30 CHECK (percent >= 0 AND percent <= 100),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_tier ON public.affiliate_tiers(tier);

COMMENT ON TABLE public.affiliate_tiers IS 'Уровни партнёров и процент комиссии';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS referral_codes_select_own ON public.referral_codes;
DROP POLICY IF EXISTS referral_attributions_select_own ON public.referral_attributions;
DROP POLICY IF EXISTS referral_events_select_involved ON public.referral_events;
DROP POLICY IF EXISTS referral_rewards_select_own ON public.referral_rewards;
DROP POLICY IF EXISTS affiliate_applications_select_own ON public.affiliate_applications;
DROP POLICY IF EXISTS affiliate_applications_insert_own ON public.affiliate_applications;
DROP POLICY IF EXISTS affiliate_tiers_select_own ON public.affiliate_tiers;

-- Create policies
CREATE POLICY referral_codes_select_own ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY referral_attributions_select_own ON public.referral_attributions
  FOR SELECT USING (
    auth.uid() = invitee_user_id OR auth.uid() = referrer_user_id
  );

CREATE POLICY referral_events_select_involved ON public.referral_events
  FOR SELECT USING (
    auth.uid() = invitee_user_id OR auth.uid() = referrer_user_id
  );

CREATE POLICY referral_rewards_select_own ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY affiliate_applications_select_own ON public.affiliate_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY affiliate_applications_insert_own ON public.affiliate_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY affiliate_tiers_select_own ON public.affiliate_tiers
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Функция для генерации уникального реферального кода
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    -- Генерируем 8-символьный код из букв и цифр
    v_code := upper(substr(md5(random()::text || p_user_id::text), 1, 8));
    
    -- Проверяем уникальность
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Функция для автоматического создания реферального кода при создании профиля
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
BEGIN
  -- Генерируем код
  v_code := public.generate_referral_code(NEW.id);
  
  -- Вставляем в таблицу
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, v_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Триггер: создавать referral_code при создании профиля
DROP TRIGGER IF EXISTS create_referral_code_trigger ON public.profiles;

CREATE TRIGGER create_referral_code_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_code_for_user();

COMMENT ON FUNCTION public.generate_referral_code IS 'Генерирует уникальный 8-символьный реферальный код';
COMMENT ON FUNCTION public.create_referral_code_for_user IS 'Автоматически создаёт реферальный код при создании профиля';
