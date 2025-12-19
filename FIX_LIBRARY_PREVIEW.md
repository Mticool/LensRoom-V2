# 🖼️ Исправление превью в Library

## Проблема:
На странице `/library` не отображаются превью фото и видео. Показывается "Нет превью".

---

## ✅ Решение - Проверь в Supabase:

### 1️⃣ Убедись что есть все колонки в таблице `generations`:

**SQL Editor → New Query:**

```sql
-- Проверить структуру таблицы
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Добавить недостающие колонки если их нет:
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS asset_url text;

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS preview_url text;

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS result_urls text[];
```

---

### 2️⃣ Создай Storage Bucket "generations":

**Storage → Create a new bucket:**

- **Name**: `generations`
- **Public bucket**: ✅ YES (check this!)
- **Allowed MIME types**: `image/*`, `video/*`
- **File size limit**: `50MB`

**Policies для bucket:**

```sql
-- Политика для загрузки (только авторизованные пользователи)
CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Политика для публичного чтения (все могут скачивать)
CREATE POLICY "Public can read generations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generations');

-- Политика для удаления (только свои файлы)
CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

### 3️⃣ Проверь webhook настройки в KIE:

**Если используешь KIE API:**

1. Зайди в https://kie.ai (свой аккаунт)
2. Settings → Webhooks
3. Добавь webhook URL:
   ```
   https://lensroom.ru/api/webhooks/kie
   ```
4. Secret: `67a89ce39c4cd9cb6c15679f3b2663f962bad825052e9ca722bd2b2617b61b49`
   (это `KIE_CALLBACK_SECRET` из .env)

---

### 4️⃣ Проверь текущие генерации:

```sql
-- Посмотреть последние генерации
SELECT 
  id,
  user_id,
  type,
  status,
  task_id,
  asset_url,
  preview_url,
  result_urls,
  created_at
FROM public.generations
ORDER BY created_at DESC
LIMIT 10;

-- Если есть генерации со status='success' но без asset_url,
-- нужно их пересинхронизировать
```

---

### 5️⃣ Пересинхронизируй старые генерации (если нужно):

```sql
-- Найти генерации которые успешны но без превью
SELECT id, task_id, status, asset_url
FROM public.generations
WHERE status IN ('success', 'completed')
  AND asset_url IS NULL
  AND task_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

Если такие есть - можно вызвать sync API вручную для каждой:

```bash
# В терминале на сервере
curl -X POST "https://lensroom.ru/api/sync-task?taskId=TASK_ID_HERE"
```

---

## 🧪 Тестирование:

### После настройки:

1. **Создай новую генерацию фото**:
   - Зайди на https://lensroom.ru/create/studio
   - Сгенерируй фото
   - Дождись завершения

2. **Проверь Library**:
   - Открой https://lensroom.ru/library
   - Должно появиться превью ✅

3. **Проверь в БД**:
   ```sql
   SELECT id, status, asset_url, preview_url
   FROM generations
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - `asset_url` должен быть заполнен! ✅

---

## 🔧 Альтернативное решение (если webhook не работает):

### Включи fallback синхронизацию:

На сервере в `.env.local`:

```bash
NEXT_PUBLIC_KIE_FALLBACK_SYNC=true
```

Это включит синхронизацию при каждом открытии Library (медленнее, но надежнее).

---

## 📋 Checklist:

- [ ] Колонки `asset_url`, `preview_url`, `thumbnail_url` добавлены
- [ ] Storage bucket `generations` создан и публичный
- [ ] Webhook настроен в KIE (если используется)
- [ ] Новые генерации показывают превью
- [ ] Старые генерации пересинхронизированы (опционально)

---

**После всех настроек - создай тестовую генерацию и скажи работает ли превью!** 🎉
