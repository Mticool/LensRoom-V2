# Исправление страницы /create/studio

## Проблема
Страница `https://lensroom.ru/create/studio` не работает.

## Исправления

### 1. Добавлен Suspense для компонентов с useSearchParams

**Файл**: `lensroom-v2/src/app/(generator)/create/studio/page.tsx`

**Изменения**:
- Обернул `StudioWorkspaces` в `Suspense` (использует `useSearchParams`)
- Обернул `AudioStudio` в `Suspense` (использует `useSearchParams`)

**Причина**: В Next.js 13+ компоненты, использующие `useSearchParams()`, должны быть обернуты в `Suspense` для корректной работы.

### 2. Структура компонентов

```tsx
export default function StudioPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StudioContent /> {/* Использует useSearchParams */}
    </Suspense>
  );
}

function StudioContent() {
  const searchParams = useSearchParams();
  // ...
  return (
    <>
      {section === "photo" && (
        <Suspense fallback={<LoadingFallback />}>
          <StudioWorkspaces /> {/* Использует useSearchParams */}
        </Suspense>
      )}
      {section === "music" && (
        <Suspense fallback={<LoadingFallback />}>
          <AudioStudio /> {/* Использует useSearchParams */}
        </Suspense>
      )}
    </>
  );
}
```

## Проверка

1. **Локально**:
   ```bash
   cd lensroom-v2
   npm run dev
   # Откройте http://localhost:3000/create/studio
   ```

2. **На production**:
   - Проверьте логи: `pm2 logs lensroom`
   - Проверьте консоль браузера (F12) на ошибки
   - Проверьте Network tab на ошибки загрузки

## Возможные дополнительные проблемы

Если страница всё ещё не работает, проверьте:

1. **Ошибки в консоли браузера**:
   - Откройте DevTools (F12)
   - Проверьте вкладку Console на ошибки
   - Проверьте вкладку Network на ошибки загрузки

2. **Ошибки на сервере**:
   ```bash
   pm2 logs lensroom --lines 100
   ```

3. **Проблемы с импортами**:
   - Убедитесь, что все компоненты существуют
   - Проверьте пути импортов

4. **Проблемы с build**:
   ```bash
   npm run build
   ```

## Компоненты, используемые на странице

- `StudioWorkspaces` - основной компонент для фото-генерации
- `AudioStudio` - компонент для генерации музыки
- `VideoGeneratorLight` - компонент для генерации видео
- `ModelSelector` - селектор моделей

Все компоненты должны быть доступны и без ошибок импорта.
