-- Ensure split-credits RPC helpers exist in production.
-- This fixes concurrent deductions (e.g. Studio 4/4 parallel generations).

-- Atomic deduction: subscription first, then package. Updates legacy `amount` too.
CREATE OR REPLACE FUNCTION public.deduct_stars(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(
  success BOOLEAN,
  new_subscription_stars INTEGER,
  new_package_stars INTEGER,
  total_balance INTEGER
) AS $$
DECLARE
  v_sub_stars INTEGER;
  v_pkg_stars INTEGER;
  v_total INTEGER;
  v_from_sub INTEGER;
  v_from_pkg INTEGER;
BEGIN
  INSERT INTO public.credits (user_id, subscription_stars, package_stars, amount)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(subscription_stars, 0), COALESCE(package_stars, 0)
  INTO v_sub_stars, v_pkg_stars
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_total := v_sub_stars + v_pkg_stars;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT TRUE, v_sub_stars, v_pkg_stars, v_total;
    RETURN;
  END IF;

  IF v_total < p_amount THEN
    RETURN QUERY SELECT FALSE, v_sub_stars, v_pkg_stars, v_total;
    RETURN;
  END IF;

  v_from_sub := LEAST(v_sub_stars, p_amount);
  v_from_pkg := p_amount - v_from_sub;

  UPDATE public.credits
  SET subscription_stars = v_sub_stars - v_from_sub,
      package_stars = v_pkg_stars - v_from_pkg,
      amount = (v_sub_stars - v_from_sub) + (v_pkg_stars - v_from_pkg),
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    TRUE,
    v_sub_stars - v_from_sub,
    v_pkg_stars - v_from_pkg,
    v_total - p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.deduct_stars(UUID, INTEGER) TO anon, authenticated, service_role;

-- Add package stars (refunds / purchases). Keeps legacy `amount` synced.
CREATE OR REPLACE FUNCTION public.add_package_stars(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(new_subscription_stars INTEGER, new_package_stars INTEGER, total_balance INTEGER) AS $$
BEGIN
  INSERT INTO public.credits (user_id, subscription_stars, package_stars, amount)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.credits c
  SET package_stars = COALESCE(c.package_stars, 0) + GREATEST(COALESCE(p_amount, 0), 0),
      amount = COALESCE(c.subscription_stars, 0) + (COALESCE(c.package_stars, 0) + GREATEST(COALESCE(p_amount, 0), 0)),
      updated_at = NOW()
  WHERE c.user_id = p_user_id;

  RETURN QUERY
  SELECT
    COALESCE(c.subscription_stars, 0),
    COALESCE(c.package_stars, 0),
    COALESCE(c.subscription_stars, 0) + COALESCE(c.package_stars, 0)
  FROM public.credits c
  WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_package_stars(UUID, INTEGER) TO anon, authenticated, service_role;

