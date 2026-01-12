# 🤖 Telegram Bot & Mini App Integration

## Обзор

LensRoom поддерживает 3 способа использования через Telegram:

1. **Bot Commands** — быстрые команды прямо в чате
2. **Mini App** — полноценный редактор внутри Telegram
3. **Inline Mode** — генерация в любом чате через @LensRoomBot

---

## 🔧 Настройка

### 1. Создание бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям:
   - Имя бота: `LensRoom AI`
   - Username: `LensRoomBot` (или ваш вариант)
4. Сохраните полученный **токен**

### 2. Настройка команд бота

Отправьте @BotFather команду `/setcommands` и выберите вашего бота:

```
start - Начать работу
generate - Сгенерировать изображение
photo - Генерация фото
video - Генерация видео
balance - Проверить баланс
models - Список моделей
app - Открыть редактор
help - Справка по командам
```

### 3. Настройка Mini App

1. Отправьте `/mybots` → выберите бота
2. **Bot Settings** → **Menu Button**
3. Установите:
   - Title: `🎨 Редактор`
   - URL: `https://lensroom.ru/tg`

### 4. Включение Inline Mode

1. `/mybots` → выберите бота
2. **Bot Settings** → **Inline Mode** → Turn on
3. Placeholder: `Введите промпт для генерации...`

### 5. Environment Variables

Добавьте в `.env.local`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_BOT_WEBHOOK_SECRET=random_secure_string_for_webhook_verification
```

Генерация секрета:
```bash
openssl rand -hex 32
```

### 6. Настройка Webhook

После деплоя выполните GET запрос для установки webhook:

```bash
curl "https://lensroom.ru/api/telegram/webhook?action=setup"
```

Проверка:
```bash
curl "https://lensroom.ru/api/telegram/webhook?action=info"
```

---

## 📱 Использование

### Bot Commands

| Команда | Описание | Пример |
|---------|----------|--------|
| `/generate` | Быстрая генерация | `/generate космос неон` |
| `/photo` | Фото с выбором модели | `/photo киберпанк город` |
| `/video` | Видео генерация | `/video танцующий робот` |
| `/balance` | Баланс звёзд | `/balance` |
| `/models` | Список моделей | `/models` |
| `/app` | Открыть Mini App | `/app` |

**Сокращения:** `/g`, `/p`, `/v`, `/b`

### Inline Mode

В любом чате введите:
```
@LensRoomBot космическая станция
```

### Mini App

- Полный функционал генератора
- Все модели и настройки
- Оптимизировано для мобильных

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     Telegram                             │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Bot   │  │  Mini App    │  │    Inline Mode     │ │
│  │Commands │  │ (WebApp)     │  │                    │ │
│  └────┬────┘  └──────┬───────┘  └─────────┬──────────┘ │
└───────┼──────────────┼────────────────────┼────────────┘
        │              │                    │
        ▼              ▼                    ▼
┌───────────────────────────────────────────────────────┐
│                 LensRoom Backend                       │
│  ┌────────────────────────────────────────────────┐   │
│  │           /api/telegram/webhook                 │   │
│  │  - Обработка команд бота                       │   │
│  │  - Callback queries (кнопки)                   │   │
│  │  - Inline queries                              │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │           /api/telegram/auth                    │   │
│  │  - Валидация initData Mini App                 │   │
│  │  - Создание/получение профиля                  │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │                   /tg                           │   │
│  │  - Mini App UI (React)                         │   │
│  │  - Адаптивный генератор                        │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

---

## 🗄️ База данных

### telegram_profiles

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | Primary key |
| telegram_id | BIGINT | Telegram user ID |
| user_id | UUID | Linked LensRoom user (optional) |
| first_name | TEXT | Имя |
| username | TEXT | @username |
| is_premium | BOOLEAN | Telegram Premium |

Миграция: `supabase/migrations/20250104_telegram_profiles.sql`

---

## 💰 Система звёзд

Telegram пользователи используют ту же систему звёзд:
- При первой авторизации: +50⭐ бонус
- Покупки через сайт или Telegram Payments
- Подписки работают аналогично

---

## 🔒 Безопасность

1. **Webhook Secret** — каждый запрос проверяется
2. **initData Validation** — Mini App данные криптографически верифицируются
3. **Rate Limiting** — защита от спама (рекомендуется добавить)

---

## 📋 TODO

- [ ] Telegram Payments для покупки звёзд
- [ ] Уведомления о завершении генерации
- [ ] История генераций в боте
- [ ] Реферальная система через бота
- [ ] Группы: генерация для админов

---

## 🐛 Troubleshooting

### Webhook не работает
```bash
# Проверить статус
curl "https://lensroom.ru/api/telegram/webhook?action=info"

# Переустановить webhook
curl "https://lensroom.ru/api/telegram/webhook?action=setup"
```

### Mini App не открывается
1. Проверьте URL в настройках бота
2. Убедитесь что сайт доступен по HTTPS
3. Проверьте консоль браузера

### Команды не работают
1. Проверьте `TELEGRAM_BOT_TOKEN`
2. Убедитесь что webhook установлен
3. Проверьте логи: `pm2 logs lensroom`