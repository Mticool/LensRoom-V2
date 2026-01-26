# Проверка потока генерации видео

## Чеклист для ручного тестирования

### 1. Подготовка

- [ ] Убедиться, что `LAOZHANG_API_KEY` установлен в `.env.local`
- [ ] Убедиться, что сервер запущен (`npm run dev`)
- [ ] Открыть DevTools → Network tab
- [ ] Открыть консоль сервера для просмотра логов

### 2. Тест Veo 3.1 Fast

#### Шаг 1: Открыть видео генератор
- [ ] Перейти на страницу генерации видео
- [ ] Убедиться, что модель "Veo 3.1 Fast" доступна

#### Шаг 2: Заполнить форму
- [ ] Промпт: "A cat walking on the street"
- [ ] Модель: Veo 3.1 Fast
- [ ] Aspect Ratio: 16:9
- [ ] Duration: 8s
- [ ] Quality: fast

#### Шаг 3: Отправить запрос
- [ ] Нажать "Создать"
- [ ] Проверить в Network tab:
  - [ ] Запрос уходит на `POST /api/generate/video`
  - [ ] Request payload содержит правильные параметры:
    ```json
    {
      "prompt": "A cat walking on the street",
      "model": "veo-3.1-fast",
      "aspectRatio": "16:9",
      "duration": 8,
      "quality": "fast",
      "mode": "t2v"
    }
    ```

#### Шаг 4: Проверить логи сервера
В консоли сервера должны быть логи:
- [ ] `[API] Using video provider for model: veo-3.1-fast`
- [ ] `[API] Video generation request:` с правильными параметрами
- [ ] `[Video API] Request:` с правильным model ID
- [ ] `[Video API] Response status: 200`
- [ ] `[Video API] Got video URL: <url>`
- [ ] `[API] Video generation URL: <url>`
- [ ] `[API] Video uploaded to storage: <path>`

#### Шаг 5: Проверить базу данных
Выполнить скрипт:
```bash
tsx scripts/check-video-generation-db.ts --recent 1
```

Проверить:
- [ ] Запись создана с `type: "video"`
- [ ] `model_id: "veo-3.1-fast"`
- [ ] `status: "success"`
- [ ] `result_urls` содержит URL видео
- [ ] `provider` в generation_runs = "laozhang"

#### Шаг 6: Проверить библиотеку
- [ ] Перейти на `/library`
- [ ] Видео отображается в списке
- [ ] Видео проигрывается при клике
- [ ] URL видео доступен и работает

### 3. Тест Sora 2

Повторить шаги 1-6 с параметрами:
- Модель: Sora 2
- Промпт: "A beautiful sunset over mountains"
- Aspect Ratio: portrait
- Duration: 10s

### 4. Проверка критических точек

#### Конфигурация провайдеров
```bash
# Проверить models.ts
grep -A 5 "veo-3.1-fast" src/config/models.ts | grep provider
# Должно быть: provider: 'laozhang'

grep -A 5 "sora-2" src/config/models.ts | grep provider
# Должно быть: provider: 'laozhang'
```

#### API клиент
```bash
# Проверить baseUrl
grep "baseUrl.*laozhang" src/lib/api/laozhang-client.ts
# Должно быть: this.baseUrl = "https://api.laozhang.ai/v1"
```

#### Маппинг моделей
```bash
# Запустить тест
tsx scripts/test-video-generation-flow.ts veo
tsx scripts/test-video-generation-flow.ts sora
```

### 5. Ожидаемые результаты

#### Успешная генерация
- ✅ Статус в БД: `success`
- ✅ `result_urls` содержит публичный URL
- ✅ Видео доступно по URL
- ✅ Видео проигрывается в браузере

#### Отображение в библиотеке
- ✅ Видео появляется в списке "Мои работы"
- ✅ Правильный превью/постер
- ✅ Клик открывает полноэкранный просмотр

#### Логи
- ✅ Все этапы логируются
- ✅ Нет ошибок 401/403/500
- ✅ Видео успешно загружено в storage

### 6. Потенциальные проблемы

#### Проблема: Неправильный провайдер
**Симптом:** Запрос идет на KIE API вместо LaoZhang
**Решение:** Проверить `src/config/models.ts`, убедиться что `provider: 'laozhang'`

#### Проблема: Отсутствие API ключа
**Симптом:** Ошибка "LAOZHANG_API_KEY is not configured"
**Решение:** Добавить `LAOZHANG_API_KEY` в `.env.local`

#### Проблема: Неправильный URL модели
**Симптом:** Ошибка от LaoZhang API "model not found"
**Решение:** Проверить `getLaoZhangVideoModelId` в `laozhang-client.ts`

#### Проблема: Проблемы с storage
**Симптом:** Видео не загружается в Supabase Storage
**Решение:** Проверить права на bucket `generations`, убедиться что service role key правильный

#### Проблема: Парсинг ответа
**Симптом:** "No video URL in response"
**Решение:** Проверить формат ответа от LaoZhang, возможно изменился формат `[download video](URL)`
