-- Начисление 10000 звезд пользователю @Mticool
-- Использование: выполните этот скрипт в Supabase SQL Editor

-- Шаг 1: Найти пользователя по username
DO $$
DECLARE
    v_user_id UUID;
    v_username TEXT := 'Mticool'; -- можно также попробовать '@Mticool'
    v_stars_to_add INTEGER := 10000;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Ищем пользователя по username (пробуем с @ и без)
    SELECT auth_user_id INTO v_user_id
    FROM public.telegram_profiles
    WHERE LOWER(username) = LOWER(v_username)
       OR LOWER(username) = LOWER('@' || v_username)
    LIMIT 1;
    
    -- Если не нашли, выводим ошибку
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Пользователь с username "%" или "@%" не найден', v_username, v_username;
    END IF;
    
    RAISE NOTICE 'Найден пользователь: user_id = %', v_user_id;
    
    -- Шаг 2: Получить текущий баланс
    SELECT COALESCE(amount, 0) INTO v_current_balance
    FROM public.credits
    WHERE user_id = v_user_id;
    
    -- Если записи нет, создаём её
    IF v_current_balance IS NULL THEN
        INSERT INTO public.credits (user_id, amount, created_at, updated_at)
        VALUES (v_user_id, 0, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        v_current_balance := 0;
    END IF;
    
    -- Шаг 3: Начислить звезды
    v_new_balance := v_current_balance + v_stars_to_add;
    
    UPDATE public.credits
    SET 
        amount = v_new_balance,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Баланс обновлён: было %, стало %', v_current_balance, v_new_balance;
    
    -- Шаг 4: Записать транзакцию в историю
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        created_at
    ) VALUES (
        v_user_id,
        v_stars_to_add,
        'admin_grant', -- тип транзакции
        'Административное начисление: +' || v_stars_to_add || ' ⭐',
        jsonb_build_object(
            'admin_action', true,
            'reason', 'Manual grant by admin',
            'username', v_username
        ),
        NOW()
    );
    
    RAISE NOTICE 'Транзакция записана в историю';
    RAISE NOTICE '✅ Успешно начислено % звезд пользователю @%', v_stars_to_add, v_username;
    RAISE NOTICE 'Новый баланс: % ⭐', v_new_balance;
    
END $$;

-- Проверка результата
SELECT 
    tp.telegram_username as username,
    tp.auth_user_id,
    c.amount as current_balance,
    c.updated_at as last_updated
FROM public.telegram_profiles tp
LEFT JOIN public.credits c ON c.user_id = tp.auth_user_id
WHERE LOWER(tp.telegram_username) IN (LOWER('Mticool'), LOWER('@Mticool'))
LIMIT 1;

