# Полный деплой выполнен

## Что сделано

1. **Исправлена авторизация**
   - `src/app/api/upload/voice-assets/route.ts` — используется `getSession` и `getAuthUserId` из `@/lib/telegram/auth`, `getSupabaseAdmin` из `@/lib/supabase/admin`
   - `src/app/api/generate/lipsync/route.ts` — корректное получение `userId` через `getAuthUserId(session)`

2. **Исправлены ошибки TypeScript**
   - В `PricingOptions` добавлено поле `audioDurationSec`
   - В lipsync route: `balance.totalBalance`, `deductResult.success`, `deductResult.totalBalance`
   - В `VideoModelConfig`: в `modelTag` добавлены значения `'AVATAR' | 'HD'`, убрано поле `shortDescription` у lip sync моделей

3. **Type-check и build** — пройдены успешно

4. **Деплой на Vercel** — выполнен
   - Production: https://lensroom-v2-qnxge75z4-marat-s-projects-cad982a1.vercel.app
   - Inspect: https://vercel.com/marat-s-projects-cad982a1/lensroom-v2/g38HYmmiuSm2JmzWS5VSkzaKsA2g

## Обязательно: миграция БД (Lip Sync)

Чтобы секция «Озвучка» работала с сохранением в БД, нужно применить миграцию:

1. Откройте **Supabase Dashboard** → ваш проект → **SQL Editor**
2. Скопируйте содержимое файла `supabase/migrations/20260129_lipsync_support.sql`
3. Вставьте в редактор и нажмите **Run**

Или выполните SQL вручную:

```sql
ALTER TABLE generations 
  ADD COLUMN IF NOT EXISTS section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration FLOAT,
  ADD COLUMN IF NOT EXISTS resolution VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_generations_section ON generations(section);
CREATE INDEX IF NOT EXISTS idx_generations_user_section ON generations(user_id, section);
```

## Скрипты для следующих деплоев

- **Полный деплой (type-check + build + Vercel):**
  ```bash
  cd lensroom-v2 && bash scripts/deploy-full.sh
  ```

- **Только напомнить про миграцию:**
  ```bash
  node scripts/apply-lipsync-migration.mjs
  ```

## Проверка после деплоя

1. Сайт: https://lensroom.ru (или ваш production URL)
2. Озвучка: https://lensroom.ru/create/studio?section=voice
3. Убедитесь, что в Vercel заданы переменные: `KIE_API_KEY`, `KIE_CALLBACK_SECRET`, `KIE_CALLBACK_URL`
