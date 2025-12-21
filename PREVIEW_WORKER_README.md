# Preview Worker - Background Processing

**Дата:** 20 декабря 2025  
**Назначение:** Быстрое создание превью/постеров (10-60 секунд)

---

## 🎯 Что Это Такое

Background worker (отдельный PM2 процесс), который:
- Запускается каждые **15 секунд**
- Находит генерации со статусом `success` без preview/poster
- Генерирует превью/постер через существующий модуль
- Обновляет `preview_path`/`poster_path` в БД

---

## 🚀 Как Работает

### Архитектура
```
PM2 Process #1: lensroom (Next.js)
PM2 Process #2: lensroom-previews-worker (Background)

Worker Loop (каждые 15 секунд):
1. Найти генерации: status=success + preview_status=none + preview_path=null
2. Взять максимум 20 генераций
3. Обработать с параллелизмом 2 (не более)
4. Обновить preview_status=ready + preview_path/poster_path
```

### Идемпотентность
- Обрабатывает только `preview_status IN ('none', 'failed')`
- Помечает `preview_status=processing` перед обработкой
- Tracking in-memory (Set) чтобы не обрабатывать дважды

### Безопасность по Памяти
- Параллелизм: максимум 2 задачи одновременно
- Лимит запросов: 20 генераций за проход
- Автоматическая очистка temp файлов (в модуле превью)

---

## 📋 Команды

### Проверить Логи Воркера
```bash
# На проде
ssh root@lensroom.ru
pm2 logs lensroom-previews-worker --lines 100

# Искать конкретный generation_id
pm2 logs lensroom-previews-worker | grep "generationId"

# Искать ошибки
pm2 logs lensroom-previews-worker | grep "❌"
```

### Запустить One-Shot (Диагностика)
```bash
# На проде
ssh root@lensroom.ru
cd /opt/lensroom/current

# Один проход и выход
PREVIEWS_WORKER_ONESHOT=1 node scripts/previews-worker.js

# Или через npm script
npm run worker:previews:oneshot
```

**Ожидаемый вывод:**
```
[PreviewWorker] 🚀 Starting...
[PreviewWorker]    Interval: 15000ms
[PreviewWorker]    Concurrency: 2
[PreviewWorker]    One-shot: true
[PreviewWorker] Running in ONE-SHOT mode...

[PreviewWorker] 📋 Found 5 generations needing previews
[PreviewWorker] 📸 Processing photo preview for xxx...
[PreviewWorker] ✅ Photo preview ready: xxx -> user/previews/xxx_preview.webp
[PreviewWorker] 📊 Batch complete: 5 ✅ / 0 ❌ / 0 ⏭️

[PreviewWorker] ✅ One-shot complete. Exiting.
```

### Запустить Локально (Dev)
```bash
cd /Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2

# Установить env
export NEXT_PUBLIC_SUPABASE_URL="https://ndhykojwzazgmgvjaqgt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."

# One-shot для теста
npm run worker:previews:oneshot

# Continuous для локального воркера
npm run worker:previews
```

### Остановить Воркер
```bash
ssh root@lensroom.ru
pm2 stop lensroom-previews-worker
```

### Перезапустить Воркер
```bash
ssh root@lensroom.ru
pm2 restart lensroom-previews-worker --update-env
```

---

## ⚙️ Конфигурация

### Environment Variables

**Обязательные:**
```bash
# REQUIRED: Service role key для полного доступа к БД
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

**Опциональные (есть дефолты):**
```bash
# Включить/выключить воркер
PREVIEWS_WORKER_ENABLED=true

# Интервал между проходами (миллисекунды)
PREVIEWS_WORKER_INTERVAL_MS=15000

# Параллелизм (сколько превью одновременно)
PREVIEWS_WORKER_CONCURRENCY=2

# Debug режим (детальные логи каждый цикл)
PREVIEWS_WORKER_DEBUG=0

# One-shot режим (один проход и exit)
PREVIEWS_WORKER_ONESHOT=0
```

### Изменить Конфигурацию
```bash
ssh root@lensroom.ru
cd /opt/lensroom/current

# Отредактировать .env.local
nano .env.local

# Добавить/изменить:
PREVIEWS_WORKER_INTERVAL_MS=10000  # Проверять каждые 10 секунд
PREVIEWS_WORKER_CONCURRENCY=3      # Больше параллелизма

# Перезапустить с новыми настройками
pm2 restart lensroom-previews-worker --update-env
pm2 save
```

---

## 🔍 Мониторинг

### Проверить Статус
```bash
ssh root@lensroom.ru
pm2 list

# Ожидаемый вывод:
# ┌────┬───────────────────────────┬─────────┬──────┐
# │ 9  │ lensroom                  │ online  │ 0    │
# │ 10 │ lensroom-previews-worker  │ online  │ 0    │
# └────┴───────────────────────────┴─────────┴──────┘
```

### Проверить Память/CPU
```bash
ssh root@lensroom.ru
pm2 monit

# Воркер должен использовать < 100MB памяти
```

### Проверить Restart Count
```bash
ssh root@lensroom.ru
pm2 ls | grep previews-worker

# Если restarts > 10 - есть проблема (crashloop)
```

### Проверить Недавние Логи
```bash
ssh root@lensroom.ru
pm2 logs lensroom-previews-worker --lines 50

# Должны видеть цикл каждые 15 секунд:
# [PreviewWorker] 📋 Found X generations...
# [PreviewWorker] ✅ Photo preview ready...
# [PreviewWorker] 📊 Batch complete...
```

---

## 🐛 Troubleshooting

### Воркер Не Запускается
```bash
# Проверить логи ошибок
ssh root@lensroom.ru
pm2 logs lensroom-previews-worker --err --lines 100

# Проверить env переменные (ВАЖНО: должен быть SERVICE_ROLE_KEY!)
pm2 env lensroom-previews-worker | grep SUPABASE

# Запустить вручную для диагностики
cd /opt/lensroom/current
node scripts/previews-worker.js
```

**Частые проблемы:**
- `FATAL: Missing SUPABASE_SERVICE_ROLE_KEY` → добавить в `.env.local`
- `Cannot find module` → запустить `npm install`
- `ECONNREFUSED` → проблема с Supabase URL

**ВАЖНО:** Воркер теперь ТРЕБУЕТ `SUPABASE_SERVICE_ROLE_KEY` (не anon key!).

### Воркер Крашится
```bash
# Проверить последние логи перед крашем
pm2 logs lensroom-previews-worker --lines 200 --err

# Проверить память
pm2 describe lensroom-previews-worker | grep "memory"

# Уменьшить concurrency если OOM
nano /opt/lensroom/current/.env.local
# Изменить PREVIEWS_WORKER_CONCURRENCY=1
pm2 restart lensroom-previews-worker --update-env
```

### Превью Не Создаются
```bash
# 1. Проверить что воркер запущен
pm2 ls | grep previews-worker

# 2. Включить DEBUG режим для детальных логов
ssh root@lensroom.ru
cd /opt/lensroom/current
echo "PREVIEWS_WORKER_DEBUG=1" >> .env.local
pm2 restart lensroom-previews-worker --update-env

# 3. Смотреть логи с статистикой
pm2 logs lensroom-previews-worker --lines 50
# Должны видеть: "📊 Selection stats" с цифрами

# 4. Запустить one-shot для диагностики
cd /opt/lensroom/current
PREVIEWS_WORKER_DEBUG=1 npm run worker:previews:oneshot

# 5. Проверить SQL напрямую
node -e "
const {createClient} = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const s = createClient(url, key);
s.from('generations')
  .select('id,type,status,preview_status,preview_path,poster_path,asset_url')
  .in('status', ['success','completed','succeeded'])
  .limit(10)
  .then(r => {
    const needsWork = r.data.filter(g => {
      const needsPreview = !g.preview_status || g.preview_status === 'none' || g.preview_status === 'failed';
      const isPhoto = g.type === 'photo';
      const isVideo = g.type === 'video';
      return needsPreview && ((isPhoto && !g.preview_path) || (isVideo && !g.poster_path));
    });
    console.log('Needs preview:', needsWork.length);
    console.log(JSON.stringify(needsWork, null, 2));
  });
"

# 6. Проверить ffmpeg доступен
which ffmpeg && ffmpeg -version | head -1

# 7. Проверить sharp работает
node -e "const sharp = require('sharp'); console.log('sharp version:', sharp.versions);"
```

### Воркер Обрабатывает Слишком Медленно
```bash
# Увеличить concurrency
ssh root@lensroom.ru
nano /opt/lensroom/current/.env.local

# Изменить:
PREVIEWS_WORKER_CONCURRENCY=3
PREVIEWS_WORKER_INTERVAL_MS=10000

# Перезапустить
pm2 restart lensroom-previews-worker --update-env
pm2 save
```

---

## 📊 Метрики

### Нормальная Работа
```
Интервал: 15 секунд
Параллелизм: 2 задачи
Память: 50-100 MB
CPU: 5-20% (пики при обработке)
Restarts: 0
```

### Хорошие Логи
```
[PreviewWorker] 📋 Found 3 generations needing previews
[PreviewWorker] 📸 Processing photo preview for xxx...
[PreviewWorker] ✅ Photo preview ready: xxx -> .../xxx_preview.webp
[PreviewWorker] 📊 Batch complete: 3 ✅ / 0 ❌ / 0 ⏭️
[PreviewWorker] ⏳ No generations need previews (all caught up!)
```

### Плохие Логи
```
[PreviewWorker] ❌ Failed to fetch generations: timeout
[PreviewWorker] ❌ Failed to generate preview for xxx: ECONNREFUSED
[PreviewWorker] ❌ Worker cycle error: Cannot find module
```

---

## 🎯 Production Setup

### После Каждого Деплоя
Деплой скрипт автоматически:
1. Останавливает оба процесса
2. Деплоит новый код
3. Запускает `lensroom` и `lensroom-previews-worker`
4. Сохраняет конфигурацию

### Ручное Управление
```bash
# Остановить всё
pm2 stop all

# Запустить только основной app
pm2 start lensroom

# Запустить только воркер
pm2 start lensroom-previews-worker

# Запустить оба из ecosystem
pm2 start /opt/lensroom/ecosystem.config.js

# Сохранить конфигурацию
pm2 save
```

---

## 📈 Ожидаемые Результаты

### До Воркера (Только Cron)
- Превью создаются: через 3-8 минут
- Застрявшие задачи: обрабатываются каждые 5 минут
- Свежие генерации: ждут до 5 минут

### После Воркера
- Превью создаются: через 15-60 секунд
- Застрявшие задачи: обрабатываются каждые 15 секунд
- Свежие генерации: подхватываются сразу

### Метрики Через 24 Часа
- 99%+ генераций имеют превью
- Средняя задержка: < 1 минута
- Воркер: stable, 0 restarts
- Library: быстрая загрузка

---

## 🔧 Команды Для Справки

### Деплой (Автоматический)
```bash
cd /Users/maratsagimov/Desktop/LensRoom.V2
bash DEPLOY_TO_PRODUCTION.sh
```

### Проверка (После Деплоя)
```bash
# Health check
curl https://lensroom.ru/api/health

# PM2 статус
ssh root@lensroom.ru "pm2 ls"

# Логи основного app
ssh root@lensroom.ru "pm2 logs lensroom --lines 50"

# Логи воркера
ssh root@lensroom.ru "pm2 logs lensroom-previews-worker --lines 50"
```

### One-Shot Test (Диагностика)
```bash
ssh root@lensroom.ru
cd /opt/lensroom/current
npm run worker:previews:oneshot

# Или напрямую:
PREVIEWS_WORKER_ONESHOT=1 node scripts/previews-worker.js
```

---

## ✅ Acceptance Criteria

Воркер работает правильно, если:
- ✅ PM2 показывает `lensroom-previews-worker` online
- ✅ Логи показывают цикл каждые 15 секунд
- ✅ Новые генерации получают превью за < 60 секунд
- ✅ Память воркера < 100 MB
- ✅ Нет crashloop (restarts = 0)
- ✅ Library показывает все превью

---

## 🆘 Support

**Если воркер не работает:**
1. Проверить логи: `pm2 logs lensroom-previews-worker`
2. Запустить one-shot: `npm run worker:previews:oneshot`
3. Проверить env: `pm2 env lensroom-previews-worker | grep SUPABASE`
4. Перезапустить: `pm2 restart lensroom-previews-worker --update-env`

**Если превью всё равно не появляются:**
1. Проверить ffmpeg: `which ffmpeg && ffmpeg -version`
2. Проверить sharp: `node -e "require('sharp'); console.log('OK')"`
3. Проверить Storage policies в Supabase
4. Проверить что `asset_url` доступен для скачивания

---

**Воркер готов к использованию!** 🚀

Откройте Library через 1-2 минуты после создания генерации:  
https://lensroom.ru/library

