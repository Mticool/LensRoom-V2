# 🔧 Быстрая настройка админ панели

## Проблемы сейчас:
1. ❌ Таблица `user_roles` не создана
2. ❌ Отсутствует колонка `profiles.display_name`
3. ❌ Нет админа в системе

---

## ✅ Решение (выполни в Supabase SQL Editor):

### 1️⃣ Создай таблицу ролей:

```sql
-- Создать таблицу ролей
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'manager', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Включить RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Создать функцию проверки роли
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role = ANY(roles)
  );
$$;
```

---

### 2️⃣ Добавь колонку display_name в profiles:

```sql
-- Добавить колонку display_name если её нет
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text;

-- Заполнить существующие записи
UPDATE public.profiles 
SET display_name = COALESCE(full_name, email, 'User')
WHERE display_name IS NULL;
```

---

### 3️⃣ Найди свой User ID и сделай себя админом:

```sql
-- Шаг 1: Найти свой auth.users.id
-- (замени на свой email или telegram username)
SELECT 
  auth.users.id as user_id,
  auth.users.email,
  profiles.full_name
FROM auth.users
LEFT JOIN public.profiles ON profiles.id = auth.users.id
WHERE auth.users.email ILIKE '%твой_email%'
  OR profiles.full_name ILIKE '%твоё_имя%'
LIMIT 5;

-- Шаг 2: Сделать себя админом (вставь свой user_id из шага 1)
INSERT INTO public.user_roles (user_id, role)
VALUES ('ТВОЙ_USER_ID_UUID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

### 4️⃣ Проверка:

```sql
-- Проверить что роль назначена
SELECT 
  ur.user_id,
  ur.role,
  p.full_name,
  p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role IN ('admin', 'manager');
```

---

## 🧪 После настройки:

1. **Перезайди на сайт**: https://lensroom.ru
2. **Открой админ панель**: https://lensroom.ru/admin
3. **Проверь все вкладки**:
   - ✅ Обзор - статистика
   - ✅ Стили - управление галереей
   - ✅ Контент - управление контентом
   - ✅ Менеджеры - назначение ролей
   - ✅ Пользователи - список пользователей
   - ✅ Продажи - статистика продаж
   - ✅ Рефералы - реферальная программа

---

## 📋 Альтернатива: Telegram ID

Если авторизуешься через Telegram:

```sql
-- Найти по Telegram ID
SELECT 
  tp.auth_user_id,
  tp.telegram_username,
  tp.telegram_first_name
FROM public.telegram_profiles tp
WHERE tp.telegram_id = ТВОЙ_TELEGRAM_ID;

-- Сделать админом
INSERT INTO public.user_roles (user_id, role)
VALUES ('AUTH_USER_ID_ИЗ_ЗАПРОСА_ВЫШЕ', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

## 🆘 Если нужна помощь:

1. Открой Supabase Dashboard → SQL Editor
2. Скопируй и выполни SQL запросы по порядку
3. Если ошибка - напиши какую именно
