# Результаты проверки генерации видео

## ✅ Выполненные проверки

### 1. Конфигурация провайдеров ✓

**Файл:** `src/config/models.ts`

- ✅ **veo-3.1-fast** (строка 530): `provider: 'laozhang'`
- ✅ **sora-2** (строка 704): `provider: 'laozhang'`

Оба модели правильно настроены для использования LaoZhang API.

### 2. API клиент LaoZhang ✓

**Файл:** `src/lib/api/laozhang-client.ts`

- ✅ **Base URL** (строка 200): `"https://api.laozhang.ai/v1"`
- ✅ **Authorization header**: Использует `Bearer ${LAOZHANG_API_KEY}`
- ✅ **Endpoint для видео** (строка 431): `/chat/completions`
- ✅ **Парсинг ответа** (строки 456-464): Извлекает URL из формата `[download video](URL)`
- ✅ **Маппинг моделей**:
  - `veo-3.1-fast` → `"veo-3.1-fast"` (LAOZHANG_MODELS.VEO_31_FAST)
  - `sora-2` (portrait, 10s) → `"sora-2"` (LAOZHANG_MODELS.SORA_2)
  - `sora-2` (landscape, 15s) → `"sora_video2-15s"` (LAOZHANG_MODELS.SORA_VIDEO2_15S)

### 3. API Route обработка ✓

**Файл:** `src/app/api/generate/video/route.ts`

- ✅ **Проверка провайдера** (строка 701): `if (modelInfo.provider === 'laozhang')`
- ✅ **Создание записи в БД** (строки 463-491):
  - `type: "video"`
  - `model_id: model`
  - `status: "queued"` (изначально)
- ✅ **Вызов LaoZhang API** (строки 743-748): `videoClient.generateVideo()`
- ✅ **Загрузка в Storage** (строки 754-777):
  - Скачивание видео с URL от провайдера
  - Загрузка в bucket `generations`
  - Путь: `${userId}/${fileName}`
- ✅ **Обновление записи** (строки 781-788):
  - `status: 'success'`
  - `result_urls: [finalVideoUrl]`
- ✅ **Логирование** (улучшено):
  - Детальные логи запросов к LaoZhang
  - Логи загрузки в storage
  - Логи обновления БД

### 4. Библиотека и отображение ✓

**Файлы:**
- `src/app/api/library/route.ts` - API для загрузки генераций
- `src/app/library/LibraryClient.tsx` - UI компонент

- ✅ **Загрузка видео** (строка 128): `/api/library` с фильтром `type === 'video'`
- ✅ **Фильтрация** (строка 167): `filtered = items.filter(i => i.type?.toLowerCase() === 'video')`
- ✅ **URL обработка**:
  - Приоритет: signed URL из storage → direct URL → public URL
  - Поддержка preview/poster для видео

## 📝 Созданные инструменты для тестирования

### 1. `scripts/test-video-generation-flow.ts`
Проверяет конфигурацию без реальных API вызовов:
```bash
tsx scripts/test-video-generation-flow.ts veo
tsx scripts/test-video-generation-flow.ts sora
```

### 2. `scripts/check-video-generation-db.ts`
Проверяет записи в базе данных:
```bash
tsx scripts/check-video-generation-db.ts
tsx scripts/check-video-generation-db.ts --model veo-3.1-fast
tsx scripts/check-video-generation-db.ts --recent 5
```

### 3. `scripts/test-complete-video-flow.sh`
Полная автоматическая проверка конфигурации:
```bash
./scripts/test-complete-video-flow.sh
```

### 4. `scripts/verify-video-api-flow.md`
Руководство по ручному тестированию с чеклистом.

## 🔄 Полный поток генерации видео

```
1. UI (VideoGeneratorHiru)
   ↓ POST /api/generate/video
   {
     prompt, model, aspectRatio, duration, quality
   }

2. API Route (route.ts)
   ↓ Проверка кредитов
   ↓ Создание записи в generations (status: "queued")
   ↓ Определение провайдера (laozhang)

3. LaoZhang Client (laozhang-client.ts)
   ↓ POST https://api.laozhang.ai/v1/chat/completions
   {
     model: "veo-3.1-fast" | "sora-2",
     messages: [{ role: "user", content: prompt }]
   }

4. LaoZhang API
   ↓ Синхронный ответ
   {
     choices: [{
       message: {
         content: "[download video](https://...)"
       }
     }]
   }

5. API Route
   ↓ Парсинг URL из ответа
   ↓ Скачивание видео
   ↓ Загрузка в Supabase Storage (bucket: generations)
   ↓ Обновление generations:
      status: "success"
      result_urls: [publicUrl]

6. Library API (/api/library)
   ↓ Загрузка generations для user_id
   ↓ Фильтрация type === "video"
   ↓ Построение signed URLs

7. LibraryClient (UI)
   ↓ Отображение видео в галерее
   ↓ Плеер для просмотра
```

## ⚠️ Требуется ручное тестирование

Следующие тесты требуют реальных API вызовов и авторизации:

### Тест 1: Veo 3.1 Fast
1. Открыть видео генератор
2. Выбрать "Veo 3.1 Fast"
3. Ввести промпт: "A cat walking on the street"
4. Настроить: 16:9, 8s, fast
5. Нажать "Создать"
6. Проверить:
   - Логи сервера показывают запрос к LaoZhang
   - Видео генерируется и сохраняется
   - Появляется в `/library`

### Тест 2: Sora 2
1. Выбрать "Sora 2"
2. Ввести промпт: "A beautiful sunset over mountains"
3. Настроить: portrait, 10s
4. Нажать "Создать"
5. Проверить аналогично Veo

## 🔍 Критические точки для мониторинга

1. **Логи сервера** - должны показывать:
   - `[API] Using video provider for model: veo-3.1-fast`
   - `[Video API] Request to LaoZhang:`
   - `[Video API] Got video URL:`
   - `[API] Video storage upload:`
   - `[API] Updating generation record:`

2. **Network tab** - проверить:
   - POST `/api/generate/video` возвращает 200
   - Ответ содержит `status: "completed"` и `results: [{ url }]`

3. **База данных** - проверить:
   - Запись в `generations` с `status: "success"`
   - `result_urls` содержит валидный URL
   - Запись в `generation_runs` с `provider: "video"`

4. **Storage** - проверить:
   - Файл существует в bucket `generations`
   - Публичный URL работает
   - Видео проигрывается в браузере

## ✅ Итог

Все конфигурационные проверки пройдены успешно:
- ✅ Провайдеры настроены правильно
- ✅ API клиент настроен правильно
- ✅ Обработка запросов корректна
- ✅ Сохранение в БД и Storage реализовано
- ✅ Отображение в библиотеке настроено

**Готово к ручному тестированию с реальными API вызовами.**
