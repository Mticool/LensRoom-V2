-- ===== ОТСЛЕЖИВАНИЕ ЛИМИТОВ И UPSELL =====
-- Миграция для проверки лимитов Free тарифа и предложения апгрейда

-- Функция: Получить количество генераций пользователя за сегодня
CREATE OR REPLACE FUNCTION get_daily_usage(user_uuid UUID)
RETURNS TABLE (
  nano_banana_count BIGINT,
  nano_pro_count BIGINT,
  tools_count BIGINT,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE model_id IN ('nano-banana', 'google/nano-banana')) AS nano_banana_count,
    COUNT(*) FILTER (WHERE model_id IN ('nano-banana-pro', 'google/nano-banana-pro')) AS nano_pro_count,
    COUNT(*) FILTER (WHERE type = 'tool' OR model_id LIKE '%upscale%' OR model_id LIKE '%remove-bg%') AS tools_count,
    COUNT(*) AS total_count
  FROM generations
  WHERE 
    user_id = user_uuid
    AND created_at >= CURRENT_DATE -- Только сегодняшние
    AND status IN ('success', 'generating', 'queued') -- Не считаем failed
  ;
END;
$$;

-- Функция: Проверить лимиты пользователя
CREATE OR REPLACE FUNCTION check_user_limits(user_uuid UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  subscription_tier TEXT,
  nano_banana_used BIGINT,
  nano_banana_limit TEXT,
  nano_banana_available BOOLEAN,
  nano_pro_used BIGINT,
  nano_pro_limit TEXT,
  nano_pro_available BOOLEAN,
  tools_used BIGINT,
  tools_limit TEXT,
  tools_available BOOLEAN,
  should_upsell BOOLEAN,
  upsell_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_sub BOOLEAN;
  v_tier TEXT;
  v_nano_used BIGINT;
  v_pro_used BIGINT;
  v_tools_used BIGINT;
  v_total_used BIGINT;
BEGIN
  -- Получить данные о подписке пользователя
  SELECT 
    COALESCE(s.status = 'active', false),
    COALESCE(s.plan_id, 'free')
  INTO v_has_sub, v_tier
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  WHERE p.id = user_uuid;

  -- Получить использование за сегодня
  SELECT nano_banana_count, nano_pro_count, tools_count, total_count
  INTO v_nano_used, v_pro_used, v_tools_used, v_total_used
  FROM get_daily_usage(user_uuid);

  -- Если нет подписки или free тариф - применяем лимиты
  IF NOT v_has_sub OR v_tier = 'free' THEN
    RETURN QUERY SELECT
      false AS has_subscription,
      'free'::TEXT AS subscription_tier,
      v_nano_used AS nano_banana_used,
      '5'::TEXT AS nano_banana_limit,
      (v_nano_used < 5) AS nano_banana_available,
      v_pro_used AS nano_pro_used,
      '0'::TEXT AS nano_pro_limit,
      false AS nano_pro_available,
      v_tools_used AS tools_used,
      '5'::TEXT AS tools_limit,
      (v_tools_used < 5) AS tools_available,
      (v_nano_used >= 5 OR v_tools_used >= 5) AS should_upsell,
      CASE 
        WHEN v_nano_used >= 5 THEN 'Достигнут дневной лимит Nano Banana (5/день)'
        WHEN v_tools_used >= 5 THEN 'Достигнут дневной лимит инструментов (5/день)'
        ELSE NULL
      END AS upsell_reason;
  
  -- Если есть активная подписка
  ELSE
    RETURN QUERY SELECT
      true AS has_subscription,
      v_tier AS subscription_tier,
      v_nano_used AS nano_banana_used,
      'unlimited'::TEXT AS nano_banana_limit,
      true AS nano_banana_available,
      v_pro_used AS nano_pro_used,
      CASE v_tier
        WHEN 'lite' THEN '0'
        WHEN 'creator' THEN '30'
        WHEN 'creator-pro' THEN '150'
        WHEN 'studio' THEN '300'
        WHEN 'agency' THEN '500'
        ELSE '0'
      END AS nano_pro_limit,
      true AS nano_pro_available, -- Упрощенно, можно добавить проверку месячного лимита
      v_tools_used AS tools_used,
      CASE v_tier
        WHEN 'lite' THEN '50'
        WHEN 'creator' THEN '100'
        WHEN 'creator-pro' THEN '300'
        WHEN 'studio' THEN '500'
        WHEN 'agency' THEN '1000'
        ELSE '0'
      END AS tools_limit,
      true AS tools_available,
      false AS should_upsell,
      NULL AS upsell_reason;
  END IF;
END;
$$;

-- Индекс для быстрого подсчета генераций за день
CREATE INDEX IF NOT EXISTS idx_generations_user_today 
ON generations (user_id, created_at, status) 
WHERE created_at >= CURRENT_DATE;

-- Комментарии
COMMENT ON FUNCTION get_daily_usage IS 'Получить количество генераций пользователя за сегодня';
COMMENT ON FUNCTION check_user_limits IS 'Проверить лимиты пользователя и определить нужен ли upsell';


