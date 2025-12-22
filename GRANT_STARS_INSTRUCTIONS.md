# Инструкция: Начисление 10000 звезд пользователю @Mticool

## Способ 1: SQL скрипт (рекомендуется)

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Скопируйте содержимое файла `ADD_STARS_TO_USER.sql`
3. Вставьте в редактор и выполните (Run)

Скрипт автоматически:
- Найдет пользователя по username "Mticool" или "@Mticool"
- Начислит 10000 звезд
- Запишет транзакцию в историю
- Покажет результат

---

## Способ 2: API endpoint (для админов)

### Через curl:

```bash
curl -X POST https://lensroom.ru/api/admin/credits/grant \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "username": "Mticool",
    "amount": 10000,
    "reason": "Manual grant by admin"
  }'
```

### Через JavaScript/TypeScript:

```typescript
const response = await fetch('/api/admin/credits/grant', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    username: 'Mticool',  // или '@Mticool'
    amount: 10000,
    reason: 'Manual grant by admin',  // опционально
  }),
});

const result = await response.json();
console.log(result);
```

### Ответ API:

```json
{
  "success": true,
  "message": "Successfully granted 10000 ⭐ to @Mticool",
  "data": {
    "username": "Mticool",
    "userId": "uuid-here",
    "amount": 10000,
    "previousBalance": 0,
    "newBalance": 10000,
    "transactionRecorded": true
  }
}
```

---

## Проверка результата

После начисления проверьте баланс:

```sql
SELECT 
    tp.username,
    c.amount as balance,
    c.updated_at
FROM public.telegram_profiles tp
LEFT JOIN public.credits c ON c.user_id = tp.auth_user_id
WHERE LOWER(tp.username) IN (LOWER('Mticool'), LOWER('@Mticool'));
```

Или через API:

```bash
GET /api/credits/balance
```

---

## Важно

- ✅ Требуется **админ доступ** для API endpoint
- ✅ SQL скрипт можно выполнить напрямую в Supabase (нужны права на выполнение SQL)
- ✅ Транзакция автоматически записывается в `credit_transactions`
- ✅ Если пользователь не найден, будет ошибка 404

---

## Файлы

- `ADD_STARS_TO_USER.sql` - SQL скрипт для прямого выполнения
- `src/app/api/admin/credits/grant/route.ts` - API endpoint для начисления

