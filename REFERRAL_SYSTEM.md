# Реферальная система + Партнёрская программа

## Обзор

Полнофункциональная реферальная система с двумя режимами монетизации:
1. **Classic Referral** - фикс-бонусы за события (signup, first_generation)
2. **Affiliate (инфлюенсеры)** - заявки + уровни (30% стандарт / 50% для крупных)

### Ключевые особенности

- ✅ First-touch атрибуция (реферал закрепляется навсегда)
- ✅ Полная идемпотентность (одно событие = одно начисление)
- ✅ Server-side награды (безопасность)
- ✅ Готова к интеграции платежей (Robokassa)

## Файлы

### База данных (Supabase)

**Миграция:**
- `supabase/migrations/023_referral_system.sql`

**Таблицы:**
1. `referral_codes` - уникальные коды пользователей
2. `referral_attributions` - привязка invitee к referrer (first-touch)
3. `referral_events` - события (signup, first_generation)
4. `referral_rewards` - начисленные награды
5. `affiliate_applications` - заявки на партнёрство
6. `affiliate_tiers` - уровни партнёров (classic 30% / pro 50%)

### Backend (Server Helpers)

**Helpers:**
- `src/lib/referrals/referral-helper.ts` - основная логика
  - `recordReferralEventAndReward()` - запись события + награда (идемпотентно)
  - `claimReferral()` - привязка реферала
  - `getReferralStats()` - статистика
  
- `src/lib/referrals/track-first-generation.ts` - отслеживание first_generation

**Integration Points:**
- `src/lib/supabase/ensure-profile.ts` - событие signup при создании профиля
- `src/lib/kie/sync-task.ts` - событие first_generation при успехе генерации

### API Endpoints

**Public:**
- `POST /api/referrals/claim` - привязать реферала (после логина)
- `GET /api/referrals/me` - получить свою реферальную информацию
- `POST /api/affiliate/apply` - подать заявку на партнёрство
- `GET /api/affiliate/apply` - статус заявки

**Admin:**
- `GET /api/admin/partners?status=pending` - список заявок
- `POST /api/admin/partners` - одобрить/отклонить заявку
- `GET /api/admin/referrals/overview` - общая статистика

### Frontend

**Components:**
- `src/components/referrals/ReferralHandler.tsx` - обработка ?ref=CODE

**Admin Pages:**
- `src/app/admin/referrals/page.tsx` - статистика рефералов
- `src/app/admin/partners/page.tsx` - управление партнёрами

**Layout:**
- `src/app/layout.tsx` - добавлен ReferralHandler

## Конфигурация наград

В `src/lib/referrals/referral-helper.ts`:

```typescript
export const REFERRAL_REWARDS = {
  signup: {
    referrer: 50, // ⭐ for referrer
    invitee: 25,  // ⭐ welcome bonus
  },
  first_generation: {
    referrer: 100, // ⭐ for referrer
    invitee: 0,
  },
};
```

## Smoke-тесты (ручные)

### 1. Регистрация по реферальной ссылке

```bash
# 1. Создайте тестового пользователя A (рефере)
# 2. Получите его реферальный код: GET /api/referrals/me
# 3. Откройте сайт с ?ref=CODE в новом инкогнито окне
# 4. Зарегистрируйтесь как пользователь B
# 5. Проверьте:
#    - У пользователя A добавилось +50⭐ (signup reward)
#    - У пользователя B добавилось +25⭐ (welcome bonus)
#    - GET /api/referrals/me пользователя B показывает referredBy
```

### 2. Первая генерация

```bash
# 1. Пользователь B (из теста 1) делает первую генерацию
# 2. Дождитесь успеха генерации
# 3. Проверьте:
#    - У пользователя A добавилось еще +100⭐ (first_generation reward)
#    - Повторная генерация B не дает новых наград
```

### 3. Партнёрская заявка

```bash
# 1. POST /api/affiliate/apply
#    Body: { channelUrl: "https://t.me/mychannel", followers: 10000 }
# 2. Админ: GET /api/admin/partners?status=pending
# 3. Админ: POST /api/admin/partners
#    Body: { applicationId: "...", action: "approve", tier: "pro" }
# 4. Проверьте в таблице affiliate_tiers: user_id, tier=pro, percent=50
```

### 4. Admin аналитика

```bash
# Админ: GET /api/admin/referrals/overview
# Должно вернуть:
# - totalCodes, totalAttributions, totalEvents
# - totalStarsRewarded
# - topReferrers (топ 10)
# - eventsByType (signup: N, first_generation: M)
```

## Интеграция платежей (Robokassa) - ГОТОВО

Реализовано в `AFFILIATE_COMMISSIONS.md`:
1. Webhook от Robokassa -> /api/webhooks/robokassa
2. Проверяем affiliate_tiers для referrer
3. Если referrer является партнёром, начисляем % комиссию в рублях
4. Комиссия сохраняется в таблице `affiliate_earnings` (status=pending)
5. Админ выплачивает вручную через UI

**Важно:** Партнёры НЕ получают звёзды ⭐ (signup/first_generation).
Они получают ТОЛЬКО % от продаж рефералов.

## Идемпотентность

Все события используют уникальный `event_key`:
- `signup:<user_id>` - для регистрации
- `first_gen:<generation_id>` - для первой генерации
- `purchase:<payment_id>` - для будущих платежей (TODO)

Повторный вызов с тем же `event_key` просто вернёт "already processed".

## Масштабирование

- RLS policies защищают данные пользователей
- Server-side логика предотвращает читерство
- Награды начисляются атомарно через Supabase RPC
- База готова к миллионам событий (индексы на всех ключах)

## Мониторинг

Основные метрики для отслеживания:
- Conversion rate (регистрации -> активация реферала)
- Average rewards per referrer
- Top referrers (потенциальные партнёры)
- Affiliate applications pending/approved ratio

