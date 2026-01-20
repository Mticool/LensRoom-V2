# Env API Keys Map (Photo + Video)

Этот документ описывает **серверные env‑ключи** (env‑only), которые используются LensRoom для генерации фото/видео, и где именно они задействованы.

## KIE.ai (Market API + optional callbacks)

- **KIE_API_KEY** *(required)*: основной ключ для KIE Market API (создание задач + проверка статуса).
  - **Где используется**: `src/lib/api/kie-client.ts` (`Authorization: Bearer ...`)
  - **Что покрывает**: большая часть моделей `provider: kie_market` (и часть видео через KIE Market).
  - **Симптомы отсутствия**: `Integration is not configured` из API хендлеров.

- **KIE_CALLBACK_URL** *(optional)*: base URL вашего сайта (например `https://lensroom.ru`) для callback’ов.
- **KIE_CALLBACK_SECRET** *(optional)*: секрет для защиты webhook `/api/webhooks/kie`.
  - **Где используется**:
    - генерация (передача callback url): `src/lib/api/kie-client.ts`
    - обработка callback: `src/app/api/webhooks/kie/route.ts`
  - **Важно**: если callbacks не настроены, система всё равно работает через polling `/api/jobs/:id` + fallback sync.

- **NEXT_PUBLIC_KIE_API_URL** *(optional)*: override базового URL KIE API (по умолчанию `https://api.kie.ai`).
  - **Где используется**: `src/lib/api/kie-client.ts`

## LaoZhang (Nano Banana / Nano Banana Pro + Veo/Sora в текущей интеграции)

- **LAOZHANG_API_KEY** *(required для моделей provider=laozhang)*: ключ для `https://api.laozhang.ai`.
  - **Где используется**: `src/lib/api/laozhang-client.ts`
  - **Что покрывает**:
    - фото: Nano Banana / Nano Banana Pro (ветка в `POST /api/generate/photo`)
    - видео: Veo 3.1 / Sora 2 (ветка в `POST /api/generate/video`)
  - **Симптомы отсутствия**: ошибки вида `LAOZHANG_API_KEY is not configured` или 5xx при генерации.

## Fal.ai (Kling O1)

- **FAL_KEY** *(required для моделей provider=fal)*: ключ для `https://queue.fal.run`.
  - **Где используется**: `src/lib/api/fal-client.ts`, а также polling `src/app/api/jobs/[jobId]/route.ts` (подтягивание результата).
  - **Что покрывает**: Kling O1 (i2v / start_end).

## OpenAI direct (не основной путь)

- **OPENAI_API_KEY** *(optional / зависит от конфигов моделей)*: ключ для OpenAI `https://api.openai.com/v1`.
  - **Где используется**: `src/lib/api/openai-client.ts`
  - **Примечание**: часть GPT Image моделей уже идёт через KIE (`provider: kie_market`), но код-путь direct OpenAI в проекте присутствует.

## Supabase (косвенно важно для сохранения результатов)

Это не “ключи генерации”, но без них библиотека/хранение результатов не заработают:

- **SUPABASE_URL**, **SUPABASE_ANON_KEY**: клиентские ключи.
- **SUPABASE_SERVICE_ROLE_KEY**: серверный ключ для service-role операций (например, `GET /api/library` и обновления `generations`).

## Быстрая проверка (диагностика)

- **Фото**:
  - UI вызывает `POST /api/generate/photo` (`src/app/api/generate/photo/route.ts`)
  - polling: `GET /api/jobs/:jobId?kind=image[&provider=...]` (`src/app/api/jobs/[jobId]/route.ts`)
  - библиотека: `GET /api/library` (`src/app/api/library/route.ts`)

- **Видео**:
  - UI вызывает `POST /api/generate/video` (`src/app/api/generate/video/route.ts`)
  - polling: `GET /api/jobs/:jobId?kind=video[&provider=...]`

Если при генерации видите `Integration is not configured`, это почти всегда означает отсутствие нужного env‑ключа для выбранного провайдера.

