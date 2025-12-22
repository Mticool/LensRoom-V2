-- Promocodes System
-- Система промокодов с разными типами бонусов

-- Типы бонусов:
-- 'bonus_stars' - бонусные звёзды при активации
-- 'percent_discount' - процент скидки на пакет
-- 'fixed_discount' - фиксированная скидка в рублях
-- 'multiplier' - множитель звёзд при покупке (1.5 = +50%)
-- 'free_pack' - бесплатный пакет звёзд

CREATE TYPE promocode_bonus_type AS ENUM (
  'bonus_stars',
  'percent_discount', 
  'fixed_discount',
  'multiplier',
  'free_pack'
);

-- Таблица промокодов
CREATE TABLE IF NOT EXISTS public.promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Основные поля
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  bonus_type promocode_bonus_type NOT NULL,
  bonus_value NUMERIC NOT NULL, -- звёзды, проценты, рубли или множитель
  
  -- Для free_pack - какой пакет даётся
  free_pack_id TEXT, -- ID пакета из конфига (например 'pack_100')
  
  -- Ограничения
  max_uses INTEGER, -- NULL = безлимит
  max_uses_per_user INTEGER DEFAULT 1, -- сколько раз один юзер может использовать
  min_purchase_amount INTEGER, -- минимальная сумма покупки для скидок (в рублях)
  applicable_packs TEXT[], -- к каким пакетам применяется (NULL = ко всем)
  
  -- Период действия
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = бессрочно
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  -- Статистика
  times_used INTEGER DEFAULT 0,
  total_bonus_given NUMERIC DEFAULT 0, -- сколько всего бонусов выдано
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Таблица использований промокодов
CREATE TABLE IF NOT EXISTS public.promocode_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promocode_id UUID NOT NULL REFERENCES public.promocodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Что получил пользователь
  bonus_type promocode_bonus_type NOT NULL,
  bonus_value NUMERIC NOT NULL,
  
  -- Контекст использования
  payment_id UUID REFERENCES public.payments(id), -- если применён к покупке
  pack_id TEXT, -- к какому пакету применён
  
  -- Когда использован
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_promocodes_code ON public.promocodes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promocodes_active ON public.promocodes(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_promocode_usages_user ON public.promocode_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_promocode_usages_promo ON public.promocode_usages(promocode_id);

-- Комментарии
COMMENT ON TABLE public.promocodes IS 'Промокоды с разными типами бонусов';
COMMENT ON COLUMN public.promocodes.bonus_type IS 'Тип бонуса: bonus_stars, percent_discount, fixed_discount, multiplier, free_pack';
COMMENT ON COLUMN public.promocodes.bonus_value IS 'Значение: количество звёзд, процент (0-100), рубли, или множитель (1.5 = +50%)';
COMMENT ON COLUMN public.promocodes.applicable_packs IS 'К каким пакетам применяется скидка (NULL = ко всем)';

-- RLS
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocode_usages ENABLE ROW LEVEL SECURITY;

-- Промокоды могут читать все (для проверки), но управлять только админы
CREATE POLICY "Anyone can read active promocodes"
  ON public.promocodes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promocodes"
  ON public.promocodes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.telegram_profiles tp
      WHERE tp.auth_user_id = auth.uid()
      AND tp.role IN ('admin', 'manager')
    )
  );

-- Использования видит только сам пользователь и админы
CREATE POLICY "Users can see own usages"
  ON public.promocode_usages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can see all usages"
  ON public.promocode_usages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telegram_profiles tp
      WHERE tp.auth_user_id = auth.uid()
      AND tp.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert usages"
  ON public.promocode_usages FOR INSERT
  WITH CHECK (true);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_promocodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promocodes_updated_at ON public.promocodes;
CREATE TRIGGER promocodes_updated_at
  BEFORE UPDATE ON public.promocodes
  FOR EACH ROW
  EXECUTE FUNCTION update_promocodes_updated_at();

-- Функция для проверки и применения промокода
CREATE OR REPLACE FUNCTION validate_promocode(
  p_code TEXT,
  p_user_id UUID,
  p_pack_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  promocode_id UUID,
  bonus_type promocode_bonus_type,
  bonus_value NUMERIC,
  free_pack_id TEXT
) AS $$
DECLARE
  v_promo RECORD;
  v_user_uses INTEGER;
BEGIN
  -- Найти промокод
  SELECT * INTO v_promo
  FROM public.promocodes
  WHERE UPPER(code) = UPPER(p_code)
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Промокод не найден'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Проверить период действия
  IF v_promo.starts_at > now() THEN
    RETURN QUERY SELECT false, 'Промокод ещё не активен'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Промокод истёк'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Проверить общий лимит использований
  IF v_promo.max_uses IS NOT NULL AND v_promo.times_used >= v_promo.max_uses THEN
    RETURN QUERY SELECT false, 'Промокод исчерпан'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Проверить лимит для пользователя
  SELECT COUNT(*) INTO v_user_uses
  FROM public.promocode_usages
  WHERE promocode_id = v_promo.id AND user_id = p_user_id;
  
  IF v_promo.max_uses_per_user IS NOT NULL AND v_user_uses >= v_promo.max_uses_per_user THEN
    RETURN QUERY SELECT false, 'Вы уже использовали этот промокод'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Проверить применимость к пакету
  IF p_pack_id IS NOT NULL AND v_promo.applicable_packs IS NOT NULL THEN
    IF NOT (p_pack_id = ANY(v_promo.applicable_packs)) THEN
      RETURN QUERY SELECT false, 'Промокод не применим к этому пакету'::TEXT, NULL::UUID, NULL::promocode_bonus_type, NULL::NUMERIC, NULL::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Всё ок
  RETURN QUERY SELECT 
    true, 
    NULL::TEXT, 
    v_promo.id, 
    v_promo.bonus_type, 
    v_promo.bonus_value,
    v_promo.free_pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для применения промокода (после успешной оплаты или для bonus_stars)
CREATE OR REPLACE FUNCTION apply_promocode(
  p_promocode_id UUID,
  p_user_id UUID,
  p_payment_id UUID DEFAULT NULL,
  p_pack_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_promo RECORD;
BEGIN
  -- Получить промокод
  SELECT * INTO v_promo
  FROM public.promocodes
  WHERE id = p_promocode_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Записать использование
  INSERT INTO public.promocode_usages (
    promocode_id, user_id, bonus_type, bonus_value, payment_id, pack_id
  ) VALUES (
    p_promocode_id, p_user_id, v_promo.bonus_type, v_promo.bonus_value, p_payment_id, p_pack_id
  );
  
  -- Обновить счётчик
  UPDATE public.promocodes
  SET 
    times_used = times_used + 1,
    total_bonus_given = total_bonus_given + v_promo.bonus_value
  WHERE id = p_promocode_id;
  
  -- Если тип bonus_stars - начислить звёзды сразу
  IF v_promo.bonus_type = 'bonus_stars' THEN
    UPDATE public.telegram_profiles
    SET credits = credits + v_promo.bonus_value::INTEGER
    WHERE auth_user_id = p_user_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Тестовые промокоды
INSERT INTO public.promocodes (code, description, bonus_type, bonus_value, max_uses, expires_at)
VALUES 
  ('WELCOME50', 'Приветственный бонус 50 звёзд', 'bonus_stars', 50, 1000, now() + interval '1 year'),
  ('SAVE20', 'Скидка 20% на любой пакет', 'percent_discount', 20, 500, now() + interval '6 months'),
  ('DOUBLE', 'Двойные звёзды при покупке', 'multiplier', 2, 100, now() + interval '1 month')
ON CONFLICT (code) DO NOTHING;

