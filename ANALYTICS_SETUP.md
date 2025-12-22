# 📊 Настройка аналитики (Google Analytics + Яндекс.Метрика)

## ✅ Что реализовано

- ✅ Компонент `Analytics` для подключения GA4 и Яндекс.Метрики
- ✅ Автоматическое отслеживание переходов по страницам
- ✅ Helper функции для кастомных событий
- ✅ Интеграция в `layout.tsx`

---

## 🔧 Настройка

### Шаг 1: Получите ID аналитики

#### Google Analytics 4:
1. Перейдите в [Google Analytics](https://analytics.google.com/)
2. Создайте свойство (Property) или используйте существующее
3. Скопируйте **Measurement ID** (формат: `G-XXXXXXXXXX`)

#### Яндекс.Метрика:
1. Перейдите в [Яндекс.Метрика](https://metrika.yandex.ru/)
2. Создайте счётчик или используйте существующий
3. Скопируйте **ID счётчика** (число, например: `12345678`)

---

### Шаг 2: Добавьте переменные окружения

Добавьте в `.env.local` (или `.env` для production):

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Яндекс.Метрика
NEXT_PUBLIC_YM_ID=12345678
```

**Важно:** 
- `NEXT_PUBLIC_` префикс обязателен для клиентских переменных в Next.js
- Перезапустите dev сервер после добавления переменных

---

### Шаг 3: Проверка работы

1. **Откройте сайт** в браузере
2. **Откройте DevTools** → Network
3. Проверьте запросы:
   - `googletagmanager.com/gtag/js` (Google Analytics)
   - `mc.yandex.ru/metrika/tag.js` (Яндекс.Метрика)

4. **В консоли браузера:**
   ```javascript
   // Проверка Google Analytics
   window.gtag('event', 'test', { event_category: 'test' });
   
   // Проверка Яндекс.Метрики
   window.ym(12345678, 'reachGoal', 'test');
   ```

5. **В интерфейсах аналитики:**
   - Google Analytics: Realtime → Events (появится через 1-2 минуты)
   - Яндекс.Метрика: Онлайн → Посетители (появляется сразу)

---

## 📈 Использование в коде

### Импорт helper функций:

```typescript
import { 
  trackGAEvent, 
  trackYMEvent, 
  trackPageView,
  trackGeneration,
  trackPurchase,
  trackSubscription
} from '@/components/analytics/Analytics';
```

### Примеры использования:

#### 1. Отслеживание генерации

```typescript
import { trackGeneration } from '@/components/analytics/Analytics';

const handleGenerate = async () => {
  // ... генерация ...
  
  // Отследить событие
  trackGeneration('flux-pro', 'photo', 10);
};
```

#### 2. Отслеживание покупки

```typescript
import { trackPurchase } from '@/components/analytics/Analytics';

const handlePurchase = async (packId: string, price: number) => {
  // ... покупка ...
  
  trackPurchase(packId, price, 'RUB');
};
```

#### 3. Отслеживание подписки

```typescript
import { trackSubscription } from '@/components/analytics/Analytics';

const handleSubscribe = async (tier: string, price: number) => {
  // ... подписка ...
  
  trackSubscription(tier, price);
};
```

#### 4. Кастомные события

```typescript
import { trackGAEvent, trackYMEvent } from '@/components/analytics/Analytics';

// Google Analytics
trackGAEvent('button_click', 'navigation', 'header_cta', 1);

// Яндекс.Метрика
trackYMEvent('button_click', { button: 'header_cta', page: '/pricing' });
```

#### 5. Отслеживание переходов (для SPA)

```typescript
import { trackPageView } from '@/components/analytics/Analytics';

// При переходе на новую страницу
useEffect(() => {
  trackPageView(window.location.pathname);
}, [pathname]);
```

---

## 🎯 Рекомендуемые события для отслеживания

### Генерация контента:
- ✅ `generation` — каждая генерация (модель, тип, стоимость)
- ✅ `generation_success` — успешная генерация
- ✅ `generation_failed` — ошибка генерации

### Покупки:
- ✅ `purchase` — покупка пакета звёзд
- ✅ `subscription` — оформление подписки
- ✅ `checkout_start` — начало оформления

### Конверсии:
- ✅ `signup` — регистрация
- ✅ `login` — вход
- ✅ `upgrade_prompt` — показ предложения апгрейда

### Навигация:
- ✅ `page_view` — просмотр страницы (автоматически)
- ✅ `button_click` — клик по кнопке
- ✅ `link_click` — клик по ссылке

---

## 📊 Пример интеграции в генератор

**В `src/app/create/studio/page.tsx`:**

```typescript
import { trackGeneration } from '@/components/analytics/Analytics';

const handleGenerate = async () => {
  try {
    const response = await fetch('/api/generate/photo', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, ... })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Отследить успешную генерацию
      trackGeneration(model, 'photo', credits);
    }
  } catch (error) {
    // Отследить ошибку
    trackGAEvent('generation_failed', 'error', model);
  }
};
```

---

## 🔒 Privacy & GDPR

### Отключение аналитики для пользователей

Если нужно дать возможность отключить аналитику:

```typescript
// В компоненте настроек
const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

useEffect(() => {
  if (!analyticsEnabled) {
    // Отключить Google Analytics
    window['ga-disable-' + process.env.NEXT_PUBLIC_GA_ID] = true;
    
    // Отключить Яндекс.Метрику
    if (window.ym) {
      window.ym(Number(process.env.NEXT_PUBLIC_YM_ID), 'setUserID', null);
    }
  }
}, [analyticsEnabled]);
```

---

## 🐛 Troubleshooting

### Аналитика не работает:

1. **Проверьте переменные окружения:**
   ```bash
   echo $NEXT_PUBLIC_GA_ID
   echo $NEXT_PUBLIC_YM_ID
   ```

2. **Перезапустите dev сервер:**
   ```bash
   npm run dev
   ```

3. **Проверьте консоль браузера** на ошибки

4. **Проверьте Network tab** — должны быть запросы к:
   - `googletagmanager.com`
   - `mc.yandex.ru`

### События не отслеживаются:

1. **Убедитесь что ID правильные** (без пробелов, правильный формат)
2. **Проверьте что функции вызываются** (console.log перед track)
3. **В GA4:** Realtime → Events (проверка в реальном времени)
4. **В Яндекс.Метрике:** Онлайн → События

---

## 📁 Созданные файлы

1. ✅ `src/components/analytics/Analytics.tsx` — компонент аналитики
2. ✅ `src/app/layout.tsx` — интеграция (обновлён)
3. ✅ `ANALYTICS_SETUP.md` — эта документация

---

## ✅ Готово!

После добавления переменных окружения аналитика начнёт работать автоматически.

**Проверьте:**
1. ✅ Добавили `NEXT_PUBLIC_GA_ID` и `NEXT_PUBLIC_YM_ID` в `.env.local`
2. ✅ Перезапустили dev сервер
3. ✅ Открыли сайт и проверили Network tab
4. ✅ События появляются в интерфейсах аналитики

---

## 🚀 Production

Для production добавьте переменные в:
- **Vercel:** Settings → Environment Variables
- **Другой хостинг:** В настройках окружения

**Важно:** Используйте разные ID для dev и production!

```bash
# .env.local (development)
NEXT_PUBLIC_GA_ID=G-DEV123456

# Production (Vercel)
NEXT_PUBLIC_GA_ID=G-PROD789012
```

---

**Вопросы?** Смотрите примеры использования выше! 📊

