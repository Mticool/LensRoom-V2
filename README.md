## LensRoom V2

AI Content Generation Platform — 12 лучших AI моделей для фото и видео.

**Stack:** Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + KIE.ai + Telegram Bot

---

### Quick Start

```bash
npm ci
cp .env.example .env.local
# Заполни .env.local актуальными ключами
npm run dev      # Development (http://localhost:3000)
```

### Build & Production

```bash
npm run build    # Сборка
npm start        # Запуск (http://localhost:3002)
```

---

### Project Structure

```
lensroom-v2/
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── api/          # API endpoints
│   │   ├── admin/        # Admin panel
│   │   ├── create/       # Generator pages (photo, video, products)
│   │   └── ...
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components
│   │   ├── studio/       # Generator studio components
│   │   └── ...
│   ├── config/           # Model configs, pricing, presets
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, API clients, helpers
│   ├── providers/        # React Context providers
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── supabase/migrations/  # Database migrations
├── scripts/              # Deploy & maintenance scripts
├── public/               # Static assets
└── docs/                 # Documentation
```

---

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type check |
| `npm run worker:previews` | Preview generation worker |

---

### Production Deploy

**Server:** `root@104.222.177.29`  
**Path:** `/opt/lensroom/lensroom-v2`  
**Process:** PM2 (`ecosystem.config.js`)  
**Nginx:** Port 3000 → HTTPS

```bash
# На сервере
pm2 status
pm2 logs lensroom
pm2 restart lensroom
```

---

### Migrations

Применяй через Supabase Dashboard → SQL Editor:
- Все миграции в `supabase/migrations/`

---

### Telegram Bot

После деплоя установи webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://lensroom.ru/api/telegram/webhook&secret_token=<SECRET>"
```

---

### Environment Variables

См. `.env.example` для полного списка.

Ключевые:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `KIE_API_KEY` — KIE.ai API key
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `MINIMAX_API_KEY` — MiniMax API key для клонирования голоса и TTS

---

## MiniMax Voice Cloning & TTS API

### Обзор

Платформа интегрирована с **MiniMax Audio API** для:
1. **Клонирования голоса** — загрузка аудио → клонирование → получение уникального `voice_id`
2. **Предустановленные голоса** — 300+ системных голосов на 40+ языках (включая русский и английский)
3. **Text-to-Speech (TTS)** — генерация озвучки текста клонированными или системными голосами

**Base URL:** `https://api.minimax.io/v1`  
**Авторизация:** Bearer token в заголовке `Authorization: Bearer YOUR_API_KEY`

---

### 1. Клонирование голоса (Voice Cloning)

#### Шаг A: Загрузка аудио-файла

**Endpoint:** `POST https://api.minimax.io/v1/files/upload`

**Требования к файлу:**
- Форматы: `mp3`, `m4a`, `wav`
- Минимальная длительность: 10 секунд
- Рекомендуемая длительность: до 5 минут
- Максимальный размер: 20 MB
- Чистая речь без фонового шума

**Request (multipart/form-data):**
```bash
curl -X POST https://api.minimax.io/v1/files/upload \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "purpose=voice_clone" \
  -F "file=@path/to/audio.wav"
```

**Response:**
```json
{
  "file": {
    "file_id": "123456789012345678"
  }
}
```

**Примечание:** Сохраните `file_id` для следующего шага.

---

#### Шаг B: Клонирование голоса

**Endpoint:** `POST https://api.minimax.io/v1/voice_clone`

**Body (JSON):**
```json
{
  "file_id": "123456789012345678",
  "voice_id": "custom_voice_001",
  "model": "speech-2.6-hd",
  "text": "Короткий текст для превью клонированного голоса",
  "need_noise_reduction": false,
  "need_volumn_normalization": false,
  "continuous_sound": false
}
```

**Параметры:**
- `file_id` — ID загруженного файла из Шага A
- `voice_id` — **Уникальный** идентификатор голоса (8–256 символов, начинается с буквы, без дубликатов)
- `model` — Рекомендуется `speech-2.6-hd` или `speech-02-hd` для высокого качества
- `text` — Опциональный текст для генерации демо-аудио
- `need_noise_reduction` — Снижение шума (по умолчанию `false`)
- `need_volumn_normalization` — Нормализация громкости (по умолчанию `false`)
- `continuous_sound` — Обработка непрерывного звука (по умолчанию `false`)

**Response:**
```json
{
  "voice_id": "custom_voice_001",
  "demo_audio": "base64_encoded_audio_or_url"
}
```

**Использование в коде:**
```typescript
import { getMiniMaxClient } from '@/lib/api/minimax-client';

const minimax = getMiniMaxClient();

// Шаг A: Загрузка файла
const uploadResult = await minimax.uploadAudio(audioFile);
const fileId = uploadResult.file_id;

// Шаг B: Клонирование
const cloneResult = await minimax.cloneVoice(fileId);
const voiceId = cloneResult.voice_id;

// Сохранить voice_id в базу данных для дальнейшего использования
```

---

### 2. Предустановленные голоса MiniMax

MiniMax предоставляет **300+ системных голосов** на **40+ языках**, включая:
- 🇷🇺 Русский
- 🇬🇧 Английский
- 🇪🇸 Испанский
- 🇫🇷 Французский
- 🇩🇪 Немецкий
- 🇵🇹 Португальский
- 🇸🇦 Арабский
- 🇮🇹 Итальянский
- 🇯🇵 Японский
- 🇰🇷 Корейский

**Примеры системных voice_id для демонстрации:**

| Язык | Тип | Примерный voice_id | Описание |
|------|-----|-------------------|-----------|
| Русский | Мужской | `Russian_male_01` | Мужской голос, нейтральный |
| Русский | Женский | `Russian_female_01` | Женский голос, нейтральный |
| Английский | Мужской | `English_male_01` | Мужской голос, американский акцент |
| Английский | Женский | `English_female_01` | Женский голос, британский акцент |

**Примечание:**  
Для получения полного списка доступных системных голосов:
1. Обратитесь к официальной документации MiniMax
2. Используйте MiniMax Platform API для получения списка голосов
3. Предварительно сгенерируйте демо-аудио для каждого голоса и сохраните в Supabase Storage

**Генерация демо-превью для системных голосов:**
```typescript
// Генерация демо для системного голоса
const demoResult = await minimax.generateTTS({
  text: "Это демонстрация русского голоса номер один",
  voice_id: "Russian_male_01", // системный voice_id
  language: 'ru',
  output_format: 'mp3'
});

// Сохранить в Supabase Storage для быстрого доступа
```

---

### 3. Text-to-Speech (Озвучка текста)

**Endpoint:** `POST https://api.minimax.io/v1/t2a_v2`

**Body (JSON):**
```json
{
  "model": "speech-2.6-hd",
  "text": "Ваш текст для озвучки",
  "voice_id": "custom_voice_001",
  "speed": 1.0,
  "vol": 1.0,
  "pitch": 0,
  "audio_sample_rate": 32000,
  "bitrate": 128000,
  "format": "mp3"
}
```

**Параметры:**

| Параметр | Тип | Описание | Значения |
|----------|-----|----------|----------|
| `model` | string | Модель TTS | `speech-2.6-hd` (рекомендуется), `speech-02-hd` |
| `text` | string | Текст для озвучки | До 10,000 символов |
| `voice_id` | string | ID голоса | Системный или клонированный voice_id |
| `speed` | float | Скорость речи | 0.5 - 2.0 (по умолчанию 1.0) |
| `vol` | float | Громкость | 0.1 - 2.0 (по умолчанию 1.0) |
| `pitch` | int | Высота тона | -12 до +12 (по умолчанию 0) |
| `audio_sample_rate` | int | Частота дискретизации | 16000, 24000, 32000, 48000 |
| `bitrate` | int | Битрейт аудио | 64000, 96000, 128000, 192000, 256000 |
| `format` | string | Формат вывода | `mp3`, `wav`, `flac`, `aac` |

**Response:**
```json
{
  "audio_file": "base64_encoded_audio_string",
  "trace_id": "abc123def456",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

**Примечание:** В зависимости от настроек API, аудио может вернуться:
- Как `audio_file` (base64 строка)
- Как `audio_url` (прямая ссылка на файл)

**Использование в коде:**
```typescript
import { getMiniMaxClient } from '@/lib/api/minimax-client';

const minimax = getMiniMaxClient();

const result = await minimax.generateTTS({
  text: "Привет! Это тест озвучки с использованием MiniMax.",
  voice_id: "custom_voice_001", // или системный voice_id
  language: 'ru',
  output_format: 'mp3'
});

// result.audio_url или result.audio_file
const audioUrl = result.audio_url;
const base64Audio = result.audio_file;

// Сохранить в Supabase Storage
if (base64Audio) {
  const buffer = Buffer.from(base64Audio, 'base64');
  const storagePath = `tts/${userId}/${crypto.randomUUID()}.mp3`;
  
  await supabase.storage
    .from('generations')
    .upload(storagePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });
}
```

---

### 4. Workflow в UI (AudioStudio)

**Путь:** `src/components/audio/AudioStudio.tsx`

#### Клонирование голоса:
1. Пользователь записывает голос или загружает файл
2. Клик "Клонировать голос" → вызывает `/api/tts/upload-audio`
3. Получаем `file_id` → вызываем `/api/tts/clone-voice`
4. Сохраняем `voice_id` в таблице `voices` в Supabase
5. Голос добавляется в дропдаун выбора голосов

#### Озвучка текста:
1. Пользователь выбирает голос из дропдауна (клонированный или системный)
2. Вводит текст (до 10,000 символов)
3. Выбирает язык (`ru` / `en`) и формат (`mp3` / `wav`)
4. Клик "Сгенерировать" → вызывает `/api/tts/generate-audio`
5. Результат сохраняется в Supabase Storage
6. Аудио отображается в галерее с возможностью воспроизведения

---

### 5. API Routes

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/tts/upload-audio` | POST | Загрузка аудио в MiniMax |
| `/api/tts/clone-voice` | POST | Клонирование голоса |
| `/api/tts/voices` | GET | Получить список клонированных голосов пользователя |
| `/api/tts/generate-audio` | POST | Генерация TTS |
| `/api/tts/preview-voice` | POST | Превью голоса |
| `/api/tts/history` | GET | История генераций TTS |
| `/api/tts/regenerate-audio` | POST | Перегенерация аудио |

---

### 6. Database Schema

**Таблица `voices`** (клонированные голоса):
```sql
CREATE TABLE voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  minimax_voice_id TEXT NOT NULL,
  language TEXT DEFAULT 'ru',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Таблица `tts_jobs`** (история генераций):
```sql
CREATE TABLE tts_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  voice_id UUID REFERENCES voices(id),
  text TEXT NOT NULL,
  language TEXT DEFAULT 'ru',
  audio_url TEXT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 7. Обработка ошибок и граничные случаи

#### Ошибки клонирования:
- **Дубликат `voice_id`**: MiniMax вернет ошибку уникальности. Используйте UUID или временную метку.
- **Файл слишком короткий**: Минимум 10 секунд чистой речи.
- **Файл слишком большой**: Максимум 20 MB.

#### Ошибки TTS:
- **Текст слишком длинный**: Разбивайте текст на фрагменты по 10,000 символов.
- **Неверный `voice_id`**: Убедитесь, что голос существует (системный или клонирован).
- **Превышен лимит API**: Используйте retry с экспоненциальной задержкой.

**Пример обработки:**
```typescript
try {
  const result = await minimax.generateTTS({...});
} catch (error) {
  if (error instanceof MiniMaxAPIError) {
    console.error('MiniMax API Error:', error.status, error.message);
    // Логировать детали для отладки
    console.error('Details:', error.details);
  }
  throw error;
}
```

---

### 8. Рекомендации по production

1. **Кэширование демо-голосов**: Предварительно сгенерируйте демо для системных голосов и храните в CDN
2. **Валидация текста**: Проверяйте длину текста перед отправкой в API (< 10,000 символов)
3. **Rate Limiting**: Ограничивайте количество запросов от одного пользователя
4. **Мониторинг**: Логируйте все вызовы MiniMax API (trace_id) для диагностики
5. **Резервное копирование**: Сохраняйте аудио в Supabase Storage для надежности
6. **Оптимизация**: Используйте меньший битрейт (96000) для экономии трафика, где качество не критично

---

### 9. Тестирование

**Скрипт для тестирования:**
```bash
node scripts/test-tts-api.js
```

**Пример теста:**
```javascript
// Тест получения голосов
const voicesRes = await fetch('http://localhost:3000/api/tts/voices');
const voices = await voicesRes.json();
console.log('Voices:', voices);

// Тест генерации TTS
const generateRes = await fetch('http://localhost:3000/api/tts/generate-audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voice_id: 'Russian_male_01',
    text: 'Привет! Это тест MiniMax TTS.',
    language: 'ru',
    output_format: 'mp3'
  })
});
const audio = await generateRes.json();
console.log('Audio URL:', audio.audio_url);
```

---

### 10. Полезные ссылки

- [MiniMax Audio API Docs](https://minimaxaudio.org/api-docs.html)
- [MiniMax Platform](https://platform.minimax.io/docs/guides/speech-voice-clone)
- [Supported Languages](https://platform.minimax.io/docs/api-reference/speech-t2a-intro)

---
