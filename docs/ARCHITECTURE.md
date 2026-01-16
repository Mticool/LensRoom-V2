# 🏗️ Архитектура LensRoom V2

> Карта проекта для быстрого понимания структуры и навигации.

---

## 📊 Обзор

**LensRoom** — SaaS-платформа для генерации AI-контента (фото и видео).

| Характеристика | Значение |
|----------------|----------|
| Framework | Next.js 16 (App Router) |
| React | 19.2 + React Compiler |
| State Management | Zustand 5 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Telegram |
| Payments | Robokassa, Prodamus, Payform |
| AI Providers | KIE.ai, LaoZhang, OpenAI, FAL.ai |
| Styling | Tailwind CSS 4 + Radix UI |

---

## 📁 Структура директорий

```
lensroom-v2/
│
├── src/                          # Исходный код
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing (/)
│   │   │
│   │   ├── generator/            # /generator — основной генератор
│   │   ├── (generator)/          # Route group для вложенных
│   │   │
│   │   ├── api/                  # API Routes (60+)
│   │   │   ├── generate/         # Генерация контента
│   │   │   ├── generations/      # CRUD генераций
│   │   │   ├── auth/             # Авторизация
│   │   │   ├── admin/            # Админ API
│   │   │   ├── payments/         # Платежи
│   │   │   ├── webhooks/         # Вебхуки
│   │   │   └── ...
│   │   │
│   │   ├── admin/                # /admin — админ-панель
│   │   ├── account/              # /account — профиль
│   │   ├── pricing/              # /pricing — тарифы
│   │   ├── library/              # /library — библиотека
│   │   └── ...                   # Ещё ~15 страниц
│   │
│   ├── components/               # React компоненты
│   │   ├── ui/                   # Base UI (button, dialog, etc.)
│   │   ├── generator/            # Generator v1
│   │   ├── generator-v2/         # Generator v2 (основной)
│   │   ├── layout/               # Header, Footer, Sidebar
│   │   ├── admin/                # Админ компоненты
│   │   └── ...
│   │
│   ├── config/                   # Конфигурации
│   │   ├── models.ts             # AI модели (главный файл!)
│   │   ├── pricing.ts            # Ценообразование
│   │   └── ...
│   │
│   ├── lib/                      # Утилиты и сервисы
│   │   ├── supabase/             # DB клиенты
│   │   ├── api/                  # AI API клиенты
│   │   ├── payments/             # Платёжные провайдеры
│   │   ├── auth/                 # Auth helpers
│   │   ├── credits/              # Логика кредитов
│   │   └── ...
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── generation-store.ts   # Состояние генератора
│   │   ├── credits-store.ts      # Баланс пользователя
│   │   ├── user-store.ts         # Данные пользователя
│   │   └── ...
│   │
│   ├── hooks/                    # React hooks
│   ├── types/                    # TypeScript типы
│   ├── providers/                # Context providers
│   ├── services/                 # Business services
│   └── constants/                # Константы
│
├── docs/                         # Документация
│   ├── ARCHITECTURE.md           # Этот файл
│   ├── CONVENTIONS.md            # Конвенции кода
│   └── internal/                 # Внутренние отчёты
│
├── scripts/                      # Скрипты
│   ├── deploy/                   # Деплой
│   └── workers/                  # Background workers
│
├── public/                       # Статика
├── supabase/                     # Миграции БД
└── tests/                        # Тесты
```

---

## 🔄 Потоки данных

### Генерация контента

```
[UI: Generator]
     │
     ▼
[Zustand: generation-store]
     │
     ▼
[API: /api/generate/photo или /api/generate/video]
     │
     ├──► [lib/credits] — проверка и списание звёзд
     │
     ▼
[lib/api/*-client.ts] — KIE, LaoZhang, FAL, OpenAI
     │
     ▼
[Supabase: generations table]
     │
     ▼
[UI: результат в Canvas]
```

### Авторизация

```
[UI: Login]
     │
     ├──► Supabase Auth (email/password)
     │
     └──► Telegram WebApp
            │
            ▼
     [/api/auth/telegram]
            │
            ▼
     [lib/telegram/auth.ts]
            │
            ▼
     [Supabase: profiles table]
```

### Платежи

```
[UI: Pricing]
     │
     ▼
[/api/checkout]
     │
     ├──► Robokassa
     ├──► Prodamus  
     └──► Payform
            │
            ▼
[Webhook: /api/webhooks/*]
            │
            ▼
[lib/credits/split-credits.ts]
            │
            ▼
[Supabase: transactions, profiles]
```

---

## 🗃️ Схема базы данных (ключевые таблицы)

```sql
-- Пользователи
profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  telegram_id BIGINT,
  stars_balance INTEGER DEFAULT 0,
  subscription_tier TEXT,
  role TEXT DEFAULT 'user'
)

-- Генерации
generations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  model_id TEXT,
  type TEXT, -- 'photo' | 'video'
  prompt TEXT,
  result_url TEXT,
  stars_cost INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ
)

-- Транзакции
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  type TEXT, -- 'purchase' | 'generation' | 'refund'
  amount INTEGER,
  created_at TIMESTAMPTZ
)
```

---

## 🔌 Внешние интеграции

### AI Провайдеры

| Провайдер | Файл клиента | Модели |
|-----------|--------------|--------|
| KIE.ai | `lib/api/kie-client.ts` | Midjourney, Kling, WAN, Ideogram |
| LaoZhang | `lib/api/laozhang-client.ts` | Nano Banana, Veo 3.1, Sora 2 |
| FAL.ai | `lib/api/fal-client.ts` | Kling O1 |
| OpenAI | `lib/api/openai-client.ts` | GPT Image |

### Платёжные системы

| Система | Файл клиента | Webhook |
|---------|--------------|---------|
| Robokassa | `lib/payments/robokassa-client.ts` | `/api/webhooks/robokassa` |
| Prodamus | `lib/payments/prodamus-client.ts` | `/api/webhooks/prodamus` |
| Payform | `lib/payments/payform-client.ts` | `/api/webhooks/payform` |

### Telegram

| Функция | Файл |
|---------|------|
| Bot API | `lib/telegram/bot-client.ts` |
| Auth | `lib/telegram/auth.ts` |
| Notifications | `lib/telegram/notify.ts` |

---

## 📍 Точки входа

| URL | Файл | Описание |
|-----|------|----------|
| `/` | `app/page.tsx` | Landing page |
| `/generator` | `app/generator/page.tsx` | Основной генератор |
| `/pricing` | `app/pricing/page.tsx` | Тарифы |
| `/library` | `app/library/page.tsx` | Библиотека |
| `/admin` | `app/admin/page.tsx` | Админ-панель |
| `/account` | `app/account/page.tsx` | Профиль |

---

## ⚡ Производительность

### React Compiler
Включён в `next.config.ts`:
```typescript
experimental: {
  reactCompiler: true,
}
```

### Стратегии кеширования
- React Query для API-запросов
- Zustand persist для локального состояния
- Next.js ISR для статических страниц

---

## 📚 См. также

- [CONVENTIONS.md](./CONVENTIONS.md) — конвенции кода
- [MODELS_CONFIG_GUIDE.md](../MODELS_CONFIG_GUIDE.md) — конфигурация AI моделей
- [.cline/rules.md](../.cline/rules.md) — правила агента

---

*Последнее обновление: 2025-01-16*
