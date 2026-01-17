# План рефакторинга архитектуры LensRoom V2

## Проблема
Сейчас при добавлении новой модели или изменении дизайна приходится редактировать огромные файлы:
- `kie-api-settings.ts` - **1477 строк**
- `models.ts` - **890 строк**
- `gallery-editor.tsx` - **992 строки**
- `StudioRuntime.tsx` - **971 строка**

**Риски:**
- Легко сломать существующий код
- Сложно найти нужную модель
- Конфликты при работе в команде
- Невозможно переиспользовать код

---

## Решение: Модульная архитектура

### 1. Plugin-based система для моделей

#### Было:
```
src/config/
  models.ts (890 строк - ВСЕ модели)
  kie-api-settings.ts (1477 строк - ВСЕ настройки)
```

#### Станет:
```
src/models/
  registry.ts              # Центральный реестр
  types.ts                 # Общие типы

  photo/
    flux/
      config.ts            # Flux конфиг (50 строк)
      settings.ts          # Flux настройки (100 строк)
      index.ts             # Экспорт
    gpt-image/
      config.ts
      settings.ts
      index.ts
    nano-banana/
      config.ts
      settings.ts
      index.ts
    ...

  video/
    kling/
      config.ts
      settings.ts
      index.ts
    sora/
      config.ts
      settings.ts
      index.ts
    veo/
      config.ts
      settings.ts
      index.ts
    ...

  tools/
    upscale/
      config.ts
      settings.ts
    remove-bg/
      config.ts
      settings.ts
```

**Преимущества:**
- ✅ Добавить новую модель = создать папку + 2 файла (50-150 строк)
- ✅ Изменить модель = редактируешь только её файлы
- ✅ Удалить модель = удаляешь папку
- ✅ Переиспользование настроек между моделями
- ✅ Автоматическая регистрация через registry

#### Пример регистрации:

```typescript
// src/models/registry.ts
import { PhotoModel, VideoModel } from './types';

const photoModels = new Map<string, PhotoModel>();
const videoModels = new Map<string, VideoModel>();

export function registerPhotoModel(model: PhotoModel) {
  photoModels.set(model.id, model);
}

export function registerVideoModel(model: VideoModel) {
  videoModels.set(model.id, model);
}

export function getModelById(id: string) {
  return photoModels.get(id) || videoModels.get(id);
}
```

```typescript
// src/models/photo/flux/index.ts
import { registerPhotoModel } from '@/models/registry';
import { fluxConfig } from './config';

registerPhotoModel(fluxConfig);

export { fluxConfig };
```

---

### 2. Design System отдельно от компонентов

#### Было:
```tsx
// Прямо в компоненте
<div className="bg-[#18181B] border-2 border-[#27272A] hover:border-[#00D9FF]">
```

#### Станет:
```
src/design/
  tokens/
    colors.ts              # Все цвета
    spacing.ts             # Отступы
    typography.ts          # Шрифты
    shadows.ts             # Тени
    animations.ts          # Анимации

  components/
    button.styles.ts       # Стили кнопок
    card.styles.ts         # Стили карточек
    input.styles.ts        # Стили инпутов

  themes/
    dark.ts                # Темная тема
    light.ts               # Светлая тема (будущее)
```

```typescript
// src/design/tokens/colors.ts
export const colors = {
  background: {
    primary: '#0F0F10',
    secondary: '#18181B',
    tertiary: '#27272A',
  },
  accent: {
    primary: '#00D9FF',
    secondary: '#0EA5E9',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    muted: '#71717A',
  },
} as const;
```

```typescript
// src/design/components/card.styles.ts
import { colors, spacing, shadows } from '../tokens';

export const cardStyles = {
  base: `
    rounded-2xl
    bg-[${colors.background.secondary}]
    border border-[${colors.background.tertiary}]
    p-${spacing.md}
  `,
  hover: `
    hover:border-[${colors.accent.primary}]
    hover:shadow-[${shadows.glow.accent}]
  `,
  active: `
    active:scale-95
  `,
} as const;

export const getCardClassName = (variant: 'default' | 'interactive' = 'default') => {
  const base = cardStyles.base;
  if (variant === 'interactive') {
    return `${base} ${cardStyles.hover} ${cardStyles.active}`;
  }
  return base;
};
```

**Использование:**
```tsx
import { getCardClassName } from '@/design/components/card.styles';

<div className={getCardClassName('interactive')}>
  Контент
</div>
```

**Преимущества:**
- ✅ Изменить цвет/стиль = 1 место в tokens
- ✅ Единая дизайн-система
- ✅ Легко добавить светлую тему
- ✅ Type-safe дизайн токены

---

### 3. Разделение больших компонентов

#### StudioRuntime.tsx (971 строка) → 7 компонентов

**Было:**
```
StudioRuntime.tsx (971 строка)
```

**Станет:**
```
src/components/studio/
  StudioRuntime.tsx        # Главный компонент (150 строк)

  components/
    StudioToolbar.tsx      # Тулбар (120 строк)
    StudioCanvas.tsx       # Превью (150 строк)
    StudioSettings.tsx     # Настройки (180 строк)
    StudioModeSelector.tsx # Выбор режима (80 строк)
    StudioHistory.tsx      # История (100 строк)
    StudioResults.tsx      # Результаты (120 строк)

  hooks/
    useStudioState.ts      # Состояние студии
    useStudioGeneration.ts # Логика генерации
    useStudioHistory.ts    # История
```

#### gallery-editor.tsx (992 строки) → 8 компонентов

**Было:**
```
gallery-editor.tsx (992 строки)
```

**Станет:**
```
src/components/admin/gallery/
  GalleryEditor.tsx        # Главный (120 строк)

  components/
    GalleryGrid.tsx        # Сетка (100 строк)
    GalleryCard.tsx        # Карточка (80 строк)
    GalleryFilters.tsx     # Фильтры (90 строк)
    GalleryUpload.tsx      # Загрузка (120 строк)
    GalleryPreview.tsx     # Превью (110 строк)
    GallerySettings.tsx    # Настройки (100 строк)
    GalleryActions.tsx     # Действия (80 строк)

  hooks/
    useGalleryData.ts      # Данные галереи
    useGalleryFilters.ts   # Фильтры
    useGalleryUpload.ts    # Загрузка
```

**Преимущества:**
- ✅ Маленькие файлы = легко понять
- ✅ Переиспользование компонентов
- ✅ Легче тестировать
- ✅ Меньше конфликтов в git

---

### 4. Слои архитектуры (Clean Architecture)

```
src/
  models/              # Модели (бизнес-логика)
    photo/
    video/
    tools/
    registry.ts

  design/              # Design System
    tokens/
    components/
    themes/

  features/            # Функционал (UI + логика)
    generator/
      components/      # UI компоненты
      hooks/           # Бизнес-логика
      types.ts         # Типы фичи

    library/
      components/
      hooks/
      types.ts

    studio/
      components/
      hooks/
      types.ts

  lib/                 # Утилиты
    api/               # API клиенты
    validation/        # Валидация
    hooks/             # Общие хуки
    utils/             # Утилиты

  components/          # Переиспользуемые UI
    ui/                # shadcn/ui компоненты
    common/            # Общие компоненты

  app/                 # Next.js страницы
```

**Правила:**
- `models/` - не зависит ни от чего
- `design/` - не зависит от моделей
- `features/` - использует models + design + lib
- `components/` - использует только design
- `app/` - использует features

---

### 5. Как добавить новую модель (пример)

#### Шаг 1: Создать папку модели
```bash
mkdir -p src/models/photo/midjourney
```

#### Шаг 2: Создать config.ts
```typescript
// src/models/photo/midjourney/config.ts
import { PhotoModelConfig } from '@/models/types';

export const midjourneyConfig: PhotoModelConfig = {
  id: 'midjourney-v6',
  name: 'Midjourney v6',
  type: 'photo',
  provider: 'midjourney',
  description: 'Midjourney v6 - лучшее качество',
  icon: '🎨',
  featured: true,
  aspectRatios: ['1:1', '16:9', '9:16', '4:3'],
  pricing: 50,
  estimatedTime: 30,
};
```

#### Шаг 3: Создать settings.ts
```typescript
// src/models/photo/midjourney/settings.ts
import { ModelSettings } from '@/models/types';

export const midjourneySettings: ModelSettings = {
  quality: {
    type: 'select',
    label: 'Quality',
    options: [
      { value: 'standard', label: 'Standard', price: 50 },
      { value: 'high', label: 'High', price: 100 },
    ],
    default: 'standard',
  },
  stylize: {
    type: 'slider',
    label: 'Stylize',
    min: 0,
    max: 1000,
    default: 100,
  },
};
```

#### Шаг 4: Создать index.ts
```typescript
// src/models/photo/midjourney/index.ts
import { registerPhotoModel } from '@/models/registry';
import { midjourneyConfig } from './config';

registerPhotoModel(midjourneyConfig);

export { midjourneyConfig };
```

#### Шаг 5: Импортировать в registry
```typescript
// src/models/photo/index.ts
export * from './flux';
export * from './gpt-image';
export * from './nano-banana';
export * from './midjourney'; // Новая модель!
```

**Готово!** Модель автоматически появится во всех UI:
- ✅ В списке моделей
- ✅ В генераторе
- ✅ В настройках
- ✅ В документации

---

### 6. Как изменить дизайн (пример)

#### Изменить цвет акцента:
```typescript
// src/design/tokens/colors.ts
export const colors = {
  accent: {
    primary: '#FF6B6B', // Было: '#00D9FF'
  },
};
```

**Готово!** Все компоненты обновятся автоматически.

#### Изменить стиль кнопок:
```typescript
// src/design/components/button.styles.ts
export const buttonStyles = {
  primary: `
    rounded-xl      // Было: rounded-2xl
    px-6 py-3       // Было: px-4 py-2
  `,
};
```

**Готово!** Все кнопки обновятся.

---

## План внедрения

### Фаза 1: Создать структуру (2-3 часа)
- ✅ Создать папки models/, design/, features/
- ✅ Создать базовые типы и registry
- ✅ Создать design tokens

### Фаза 2: Миграция моделей (4-6 часов)
- ✅ Перенести 5 главных моделей (Flux, GPT, Nano, Kling, Sora)
- ✅ Протестировать registry
- ✅ Обновить импорты

### Фаза 3: Миграция Design System (3-4 часа)
- ✅ Создать tokens для всех цветов
- ✅ Создать компонентные стили
- ✅ Обновить 5 главных компонентов

### Фаза 4: Разделить большие компоненты (5-7 часов)
- ✅ Разделить StudioRuntime на 7 компонентов
- ✅ Разделить gallery-editor на 8 компонентов
- ✅ Создать хуки для бизнес-логики

### Фаза 5: Тестирование (2-3 часа)
- ✅ Проверить все модели работают
- ✅ Проверить design system применяется
- ✅ Production build

---

## Метрики успеха

### До рефакторинга:
- Добавить модель: **редактировать 890 строк в 1 файле**
- Изменить цвет: **поиск по 50+ файлам**
- Изменить компонент: **читать 971 строку**

### После рефакторинга:
- Добавить модель: **создать 3 файла по 50 строк**
- Изменить цвет: **1 место в tokens**
- Изменить компонент: **читать 120 строк**

---

## Рекомендация

**Начать с Фазы 1-2**: Создать модульную систему моделей.

Это самое важное, потому что:
1. Модели добавляются чаще всего
2. Риск сломать код при редактировании огромного файла
3. Легко перенести постепенно

После этого можно делать остальные фазы по мере необходимости.

**Начинаем?** 🚀
