# Кнопка Generate Не Активна - Диагностика

**Дата:** 18 января 2026, 17:30 UTC

---

## Проблема

Пользователь сообщил: **"кнопка сгенерировать не работает не подсвечивается"**

---

## Условия Активации Кнопки

### Код в `ControlBarBottom.tsx`:

```typescript
const hasEnoughCredits = credits >= estimatedCost;
const isDisabled = disabled || isGenerating;
const canGenerate = prompt.trim().length > 0 && !isDisabled && hasEnoughCredits;
```

### Кнопка активна ТОЛЬКО если:

1. ✅ **Промпт не пустой** - `prompt.trim().length > 0`
2. ✅ **Не disabled** - `disabled === false`
3. ✅ **Не генерируется** - `isGenerating === false`
4. ✅ **Достаточно кредитов** - `credits >= estimatedCost`

---

## Откуда Берется `disabled`?

### В генераторах (например, `NanoBananaProGenerator.tsx`):

```typescript
<ControlBarBottom
  disabled={authLoading || !isAuthenticated}
  credits={credits}
  estimatedCost={estimatedCost}
  ...
/>
```

### Значит `disabled = true` если:
- `authLoading === true` (загрузка авторизации)
- `isAuthenticated === false` (пользователь не авторизован)

---

## Откуда Берется `isAuthenticated`?

### Хук `useAuth()` в `hooks/useAuth.ts`:

```typescript
const { isAuthenticated, isLoading: authLoading, credits, refreshCredits } = useAuth();
```

### Логика в `useAuth()`:

1. **Запрос к `/api/auth/me`**:
   ```typescript
   const response = await apiFetch('/api/auth/me', { dedupe: true });
   ```

2. **Если ответ OK и есть `data.user` или `data.telegramId`**:
   ```typescript
   if (data.user || data.telegramId) {
     setAuth({ isAuthenticated: true, ... });
   }
   ```

3. **Иначе**:
   ```typescript
   setAuth({ isAuthenticated: false, ... });
   ```

---

## Возможные Причины Проблемы

### 1. ❌ `/api/auth/me` не возвращает пользователя

**Проверка:**
```bash
curl https://lensroom.ru/api/auth/me -H "Cookie: lr_session=..."
```

**Ожидаемый ответ:**
```json
{
  "user": { "id": "..." },
  "telegramId": 123456,
  "username": "...",
  "role": "user"
}
```

**Если возвращает `{}`** → пользователь не авторизован

---

### 2. ❌ Cookie `lr_session` отсутствует

**Проверка в браузере:**
```javascript
document.cookie
```

**Должно содержать:**
```
lr_session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Если отсутствует** → Telegram авторизация не прошла

---

### 3. ❌ `localStorage['lensroom-user']` пустой

**Проверка в браузере:**
```javascript
localStorage.getItem('lensroom-user')
```

**Должно содержать:**
```json
{
  "state": {
    "isAuthenticated": true,
    "id": "...",
    "email": "..."
  }
}
```

**Если `isAuthenticated: false`** → состояние не обновилось

---

### 4. ❌ `credits === 0`

**Проверка:**
```bash
curl https://lensroom.ru/api/credits/balance -H "Cookie: lr_session=..."
```

**Ожидаемый ответ:**
```json
{
  "balance": 50,
  "credits": 50
}
```

**Если `balance: 0`** → недостаточно кредитов для генерации

---

### 5. ❌ `authLoading === true` (зависло)

**Проверка в консоли браузера:**
```javascript
// Откройте React DevTools
// Найдите компонент NanoBananaProGenerator
// Проверьте state: authLoading
```

**Если `authLoading: true` больше 5 секунд** → запрос завис

---

## Решение

### Шаг 1: Проверьте Авторизацию

**Откройте:** https://lensroom.ru

**В консоли браузера (F12):**
```javascript
// 1. Проверка localStorage
console.log(JSON.parse(localStorage.getItem('lensroom-user')));

// 2. Проверка cookie
console.log(document.cookie);

// 3. Проверка API
fetch('/api/auth/me').then(r => r.json()).then(console.log);

// 4. Проверка credits
fetch('/api/credits/balance').then(r => r.json()).then(console.log);
```

---

### Шаг 2: Если Не Авторизован

**Войдите через Telegram:**
1. Нажмите "Войти через Telegram" на сайте
2. Авторизуйтесь в Telegram
3. Вернитесь на сайт
4. Проверьте баланс (должно быть 50⭐ для новых)

---

### Шаг 3: Если Авторизован, Но Кнопка Неактивна

**Проверьте в консоли:**
```javascript
// Откройте React DevTools
// Найдите компонент NanoBananaProGenerator
// Проверьте props:
// - isAuthenticated: должно быть true
// - authLoading: должно быть false
// - credits: должно быть > 0
// - estimatedCost: должно быть <= credits
```

---

### Шаг 4: Если Credits = 0

**Пополните баланс:**
1. Перейдите в раздел "Тарифы"
2. Выберите пакет звёзд
3. Оплатите через Telegram Stars или Robokassa

---

### Шаг 5: Жесткая Перезагрузка

**Если ничего не помогло:**
1. Очистите кэш браузера (`Ctrl+Shift+R`)
2. Очистите localStorage:
   ```javascript
   localStorage.clear();
   ```
3. Очистите cookies:
   ```javascript
   document.cookie.split(";").forEach(c => {
     document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   ```
4. Перезагрузите страницу
5. Войдите заново через Telegram

---

## Тестовый Файл

Создан HTML файл для диагностики:

**Файл:** `lensroom-v2/test-auth-state.html`

**Как использовать:**
1. Откройте файл в браузере
2. Нажмите кнопки для проверки:
   - localStorage
   - Cookies
   - API Session
   - Credits
3. Проверьте результаты

---

## Частые Ошибки

### 1. "Missing required env var: NEXT_PUBLIC_SUPABASE_URL"

**Причина:** Отсутствуют переменные окружения на сервере

**Решение:** Уже исправлено (см. `TELEGRAM_AUTH_FIXED.md`)

---

### 2. "Invalid initData"

**Причина:** Telegram `initData` не прошел валидацию

**Решение:**
- Проверьте `TELEGRAM_BOT_TOKEN` в `.env.local`
- Убедитесь, что токен правильный

---

### 3. "Недостаточно звёзд"

**Причина:** `credits < estimatedCost`

**Решение:**
- Пополните баланс
- Или уменьшите количество изображений

---

## Итог

**Кнопка Generate активна ТОЛЬКО если:**
1. ✅ Пользователь авторизован (`isAuthenticated: true`)
2. ✅ Загрузка завершена (`authLoading: false`)
3. ✅ Есть кредиты (`credits >= estimatedCost`)
4. ✅ Промпт не пустой (`prompt.trim().length > 0`)
5. ✅ Не идет генерация (`isGenerating: false`)

**Проверьте каждое условие в консоли браузера!**

---

**Дата:** 18 января 2026, 17:30 UTC  
**Статус:** Диагностика создана, ожидаем проверки от пользователя
