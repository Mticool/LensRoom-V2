# Manual Test Checklist: Preview System

## Предварительные требования

- [ ] База данных: миграция `025_preview_system.sql` применена
- [ ] Зависимости: `sharp`, `ffmpeg`, `fluent-ffmpeg` установлены
- [ ] Environment: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` настроены
- [ ] Build успешен: `npm run build` без ошибок

---

## Тест 1: Новая Фото-Генерация

**Цель:** Убедиться что preview_path создаётся автоматически для новых фото

**Шаги:**
1. [ ] Открыть https://lensroom.ru/create/studio
2. [ ] Создать новую фото-генерацию (любая модель, любой промпт)
3. [ ] Дождаться статуса "success" (проверить в Supabase или через API)
4. [ ] Проверить в БД:
   ```sql
   SELECT id, type, status, preview_path, preview_status 
   FROM generations 
   WHERE type = 'photo' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

**Ожидаемый результат:**
- `status` = `success`
- `preview_path` заполнен (формат: `{userId}/previews/{id}_preview.webp`)
- `preview_status` = `ready`

**Проверка UI:**
- [ ] Открыть https://lensroom.ru/library
- [ ] Фото показывается с оптимизированным превью (быстрая загрузка)
- [ ] При клике открывается полноразмерная версия

---

## Тест 2: Новая Видео-Генерация

**Цель:** Убедиться что poster_path создаётся автоматически для новых видео

**Шаги:**
1. [ ] Открыть https://lensroom.ru/create/video
2. [ ] Создать новую видео-генерацию (Kling, Veo или другая модель)
3. [ ] Дождаться статуса "success" (может занять 1-5 минут)
4. [ ] Проверить в БД:
   ```sql
   SELECT id, type, status, poster_path, preview_status 
   FROM generations 
   WHERE type = 'video' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

**Ожидаемый результат:**
- `status` = `success`
- `poster_path` заполнен (формат: `{userId}/posters/{id}_poster.webp`)
- `preview_status` = `ready`

**Проверка UI:**
- [ ] Открыть https://lensroom.ru/library
- [ ] Видео показывается с постер-изображением (не чёрная плитка)
- [ ] При клике запускается воспроизведение видео

---

## Тест 3: Backfill для Старых Генераций

**Цель:** Убедиться что старые success-генерации без превью можно обработать

**Шаги:**
1. [ ] Найти старую success-генерацию без preview/poster:
   ```sql
   SELECT id, type, status, preview_path, poster_path, preview_status 
   FROM generations 
   WHERE status = 'success' 
     AND preview_status != 'ready'
     AND (preview_path IS NULL OR poster_path IS NULL)
   LIMIT 5;
   ```

2. [ ] Если таких нет, создать тестовую запись:
   ```sql
   -- Найти существующую success-генерацию
   UPDATE generations 
   SET preview_path = NULL, 
       poster_path = NULL, 
       preview_status = 'none'
   WHERE id = '{копировать ID из предыдущего запроса}'
     AND status = 'success';
   ```

3. [ ] Запустить backfill:
   ```bash
   cd /path/to/lensroom-v2
   npm run backfill:previews -- --limit=10 --concurrency=2
   ```

4. [ ] Дождаться завершения (30-60 секунд)

5. [ ] Проверить результат в БД:
   ```sql
   SELECT id, type, preview_path, poster_path, preview_status 
   FROM generations 
   WHERE id IN ({IDs из шага 1});
   ```

**Ожидаемый результат:**
- Backfill нашёл генерации
- Поставил их в очередь (лог: `📸 Queuing photo preview for...`)
- После обработки:
  - `preview_path` или `poster_path` заполнены
  - `preview_status` = `ready`

**Проверка UI:**
- [ ] Открыть https://lensroom.ru/library
- [ ] Старые генерации теперь показывают превью

---

## Тест 4: Webhook Синхронизация

**Цель:** Убедиться что webhook от KIE запускает превью

**Предварительные требования:**
- [ ] Webhook настроен в KIE.ai dashboard (см. `setup-webhook.sh`)
- [ ] `KIE_CALLBACK_SECRET` добавлен в `.env.local`

**Шаги:**
1. [ ] Создать новую генерацию
2. [ ] Дождаться webhook callback (проверить логи):
   ```bash
   pm2 logs lensroom | grep "\[Webhook\]\|\[Sync\]\|\[Preview\]"
   ```

3. [ ] Убедиться что логи содержат:
   ```
   [Webhook] Received callback for task: {taskId}
   [Sync ENTRY] taskId=..., status=success, preview_status=none
   [Preview] Queued generationId=... reason=needsPreview
   [Preview] Ready generationId=... type=photo path=...
   ```

**Ожидаемый результат:**
- Webhook вызвал `syncKieTaskToDb`
- Sync обнаружил необходимость превью
- Превью сгенерировано и статус обновлён

---

## Тест 5: Идемпотентность

**Цель:** Убедиться что повторный sync не создаёт дубли

**Шаги:**
1. [ ] Найти генерацию с готовым превью:
   ```sql
   SELECT id, task_id, preview_status, preview_path 
   FROM generations 
   WHERE preview_status = 'ready' 
     AND preview_path IS NOT NULL 
   LIMIT 1;
   ```

2. [ ] Запустить ручной sync:
   ```bash
   curl -X POST "http://localhost:3002/api/kie/sync?taskId={taskId}"
   # или на проде:
   curl -X POST "https://lensroom.ru/api/kie/sync?taskId={taskId}"
   ```

3. [ ] Проверить логи:
   ```bash
   pm2 logs lensroom --lines 50 | grep -E "Queued|Ready"
   ```

4. [ ] Проверить БД (preview_path не должен измениться):
   ```sql
   SELECT preview_path, preview_status, updated_at 
   FROM generations 
   WHERE id = '{id из шага 1}';
   ```

**Ожидаемый результат:**
- Логи НЕ содержат `[Preview] Queued` для этой генерации
- Логи содержат `[Sync DEBUG] ... needsPreview=false`
- `preview_path` и `preview_status` не изменились

---

## Тест 6: Обработка Ошибок

**Цель:** Убедиться что ошибки preview не роняют весь sync

**Шаги:**
1. [ ] Создать генерацию с невалидным asset_url (для теста):
   ```sql
   INSERT INTO generations (user_id, type, status, asset_url, task_id)
   VALUES (
     '{valid_user_id}', 
     'photo', 
     'success', 
     'https://invalid-url-that-will-404.example.com/test.jpg',
     'test-error-' || gen_random_uuid()
   );
   ```

2. [ ] Запустить sync для этой задачи

3. [ ] Проверить логи:
   ```bash
   pm2 logs lensroom --lines 50 | grep "Preview.*failed"
   ```

4. [ ] Проверить БД:
   ```sql
   SELECT preview_status, error 
   FROM generations 
   WHERE task_id LIKE 'test-error-%';
   ```

**Ожидаемый результат:**
- Логи содержат `[Preview] ❌ Failed for ...`
- `preview_status` = `failed`
- `error` содержит описание ошибки
- Sync завершился успешно (не crashed)

**Очистка:**
```sql
DELETE FROM generations WHERE task_id LIKE 'test-error-%';
```

---

## Тест 7: Cron Job (Производство)

**Цель:** Убедиться что автоматический cron работает

**Применимо только для production с установленным cron**

**Шаги:**
1. [ ] Проверить что cron активен:
   ```bash
   ssh root@lensroom.ru
   crontab -l | grep sync-cron
   ```

2. [ ] Проверить логи cron:
   ```bash
   tail -50 /var/log/lensroom-sync.log
   ```

3. [ ] Создать генерацию и дождаться завершения (status=success)

4. [ ] Подождать 5-10 минут (время следующего cron запуска)

5. [ ] Проверить что превью создалось:
   ```sql
   SELECT id, preview_path, preview_status, updated_at 
   FROM generations 
   WHERE id = '{id из шага 3}';
   ```

**Ожидаемый результат:**
- Cron запустился (лог: `[{timestamp}] Syncing: {taskId}`)
- Preview создался автоматически
- `preview_status` = `ready`

---

## Логи для Отладки

### Успешная генерация превью:
```
[Sync ENTRY] taskId=xxx, genId=yyy, status=success, type=photo, preview_status=none
[Sync DEBUG] status=success, type=photo, preview_status=none, needsPreview=true
[Preview] Queued generationId=yyy reason=needsPreview type=photo status=success
[Preview] Ready generationId=yyy type=photo path=user123/previews/yyy_preview.webp
```

### Превью уже готово (идемпотентность):
```
[Sync ENTRY] taskId=xxx, genId=yyy, status=success, preview_status=ready
[Sync DEBUG] status=success, preview_status=ready, needsPreview=false
```

### Ошибка генерации:
```
[Preview] Queued generationId=yyy ...
[Preview] ❌ Failed for yyy: Download failed: 404
```

---

## Build & Deployment Check

После любых изменений в коде:

1. [ ] Локальный build:
   ```bash
   cd /path/to/lensroom-v2
   npm run build
   ```

2. [ ] Проверка environment usage:
   ```bash
   bash scripts/audit-env-usage.sh
   ```

3. [ ] Деплой на production:
   ```bash
   bash DEPLOY_TO_PRODUCTION.sh
   ```

4. [ ] Проверка health:
   ```bash
   curl https://lensroom.ru/api/health
   ```

**Ожидаемый результат:**
- Build успешен
- Нет import-time env reads
- Health check возвращает `{"status":"ok"}`

---

## Acceptance Criteria

✅ **Все тесты пройдены если:**

1. Новые генерации (фото и видео) автоматически получают preview/poster
2. Статус `preview_status` корректно переходит: `none` → `processing` → `ready`
3. Backfill обрабатывает старые генерации без дублей
4. Повторный sync не создаёт новые превью для уже готовых
5. Ошибки превью не ломают основной sync
6. Library показывает все превью корректно
7. Build проходит без ошибок

---

## Troubleshooting

### Превью не создаются
```bash
# Проверить логи
pm2 logs lensroom --lines 100 | grep -E "Sync|Preview"

# Проверить статусы в БД
psql $DATABASE_URL -c "SELECT status, preview_status, type FROM generations ORDER BY created_at DESC LIMIT 10;"

# Запустить ручной sync
curl -X POST "https://lensroom.ru/api/kie/sync?taskId={taskId}"
```

### Backfill не работает
```bash
# Проверить environment
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Запустить с debug
node scripts/backfill-previews.js --limit=5 --concurrency=1
```

### Cron не запускается
```bash
# Проверить cron daemon
systemctl status cron

# Проверить синтаксис скрипта
bash -n /opt/lensroom/sync-cron.sh

# Запустить вручную
/opt/lensroom/sync-cron.sh
tail -20 /var/log/lensroom-sync.log
```

