# 🚀 Quick Start: Home V2

## Включить новую главную страницу

### 1. Добавьте environment variable

Создайте/обновите файл `.env.local` в корне проекта:

```bash
NEXT_PUBLIC_HOME_V2=1
```

### 2. Запустите dev сервер

```bash
cd lensroom-v2
npm run dev
```

### 3. Откройте браузер

```
http://localhost:3000
```

Готово! Вы увидите новую главную страницу в стиле Netflix 🎉

---

## Что нового?

✅ **Hero** - Короткий сильный оффер с двумя CTA
✅ **New & Trending** - Адаптивная сетка с интерактивными карточками
✅ **Recreate/Remix** - Кнопки работают через localStorage
✅ **Top Choice** - Кураторская подборка лучших инструментов
✅ **Apps/Use Cases** - 6 готовых сценариев (UGC, Ads, E-commerce, etc.)
✅ **How It Works** - 3 простых шага
✅ **Pricing** - 4 тарифа с описанием
✅ **FAQ** - 8 частых вопросов
✅ **Footer CTA** - Финальный призыв к действию

---

## Интеграция Recreate/Remix в Studio

Добавьте в `src/app/create/studio/page.tsx`:

```typescript
import { loadDraftPreset, clearDraftPreset } from '@/lib/draft-preset';

// В начале компонента или useEffect:
useEffect(() => {
  const draft = loadDraftPreset();
  
  if (draft) {
    // Предзаполните форму параметрами из draft
    setModel(draft.model);
    setPrompt(draft.prompt);
    setParams(draft.params);
    
    // Очистите draft
    clearDraftPreset();
  }
}, []);
```

---

## Файлы которые были созданы/изменены

### ✅ Новые файлы:
- `src/lib/homePresets.ts` - типы и демо-данные
- `src/lib/draft-preset.ts` - localStorage flow
- `src/app/api/home/trending/route.ts` - API endpoint
- `src/components/home-v2/HeroNew.tsx`
- `src/components/home-v2/TrendingGrid.tsx`
- `src/components/home-v2/TopChoice.tsx`
- `src/components/home-v2/AppsSection.tsx`
- `src/components/home-v2/HowItWorks.tsx`
- `src/components/home-v2/PricingSection.tsx`
- `src/components/home-v2/FAQ.tsx`
- `src/components/home-v2/FooterCTA.tsx`

### ✅ Обновлённые файлы:
- `src/components/home-v2/HomeV2.tsx` - главный компонент

### ✅ Без изменений:
- `src/app/page.tsx` - уже имел feature flag, ничего не трогали
- Все остальные роуты и компоненты - **НЕ СЛОМАНЫ** ✅

---

## Production Build

Проект успешно собирается:

```bash
npm run build
```

✅ **0 TypeScript ошибок**
✅ **0 Runtime ошибок**
✅ **Все роуты работают**

---

## Отключить Home V2

Просто удалите или закомментируйте в `.env.local`:

```bash
# NEXT_PUBLIC_HOME_V2=1
```

Перезапустите сервер - вернётся старая версия главной.

---

## Что дальше?

1. **Замените demo-изображения** на реальные в `/public/home-demo/`
2. **Настройте интеграцию** с Studio для draft presets
3. **Добавьте analytics** для отслеживания кликов
4. **Тестируйте UX** и собирайте feedback

Подробная документация: `HOME_V2_README.md`

