# 📐 Конвенции и стандарты LensRoom V2

> Единые правила написания кода для поддержания консистентности проекта.

---

## 📝 Именование

### Файлы и папки

| Тип | Стиль | Пример |
|-----|-------|--------|
| Компоненты | PascalCase | `PromptBar.tsx`, `SettingsPanel.tsx` |
| Утилиты | camelCase | `formatDate.ts`, `parsePrompt.ts` |
| Хуки | camelCase с `use` | `useGenerator.ts`, `useCredits.ts` |
| API routes | `route.ts` в папке | `api/generate/route.ts` |
| Конфиги | kebab-case | `image-models-config.ts` |
| Типы | camelCase | `generator.ts`, `model-options.ts` |

### Переменные и функции

```typescript
// ✅ Правильно
const userId = 'abc123';
const isLoading = true;
const handleSubmit = () => {};
const fetchUserData = async () => {};

// ❌ Неправильно
const user_id = 'abc123';
const IsLoading = true;
const HandleSubmit = () => {};
```

### Типы и интерфейсы

```typescript
// ✅ Используем type для объектов
type User = {
  id: string;
  email: string;
};

// ✅ Используем interface для расширяемых контрактов
interface GenerationConfig {
  modelId: string;
  prompt: string;
}

// ❌ НЕ используем prefix I
interface IUser {} // Неправильно
```

---

## 📦 Импорты

### Порядок импортов

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// 2. Внешние библиотеки
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// 3. Внутренние модули (через @/)
import { Button } from '@/components/ui';
import { useCreditsStore } from '@/stores';
import { getModelById } from '@/config/models';
import type { Generation } from '@/types';

// 4. Относительные (только для локальных файлов компонента)
import { CanvasItem } from './CanvasItem';
import styles from './Canvas.module.css';
```

### Path aliases

Всегда используй `@/` для импортов из `src/`:

```typescript
// ✅ Правильно
import { Button } from '@/components/ui';

// ❌ Неправильно
import { Button } from '../../../components/ui';
```

---

## 🧱 Компоненты

### Структура компонента

```typescript
// 1. Импорты
import { useState } from 'react';
import { Button } from '@/components/ui';

// 2. Типы (если локальные)
type Props = {
  title: string;
  onSubmit: (data: FormData) => void;
};

// 3. Компонент
export function MyComponent({ title, onSubmit }: Props) {
  // 3.1. Хуки
  const [isOpen, setIsOpen] = useState(false);
  
  // 3.2. Handlers
  const handleClick = () => {
    setIsOpen(true);
  };
  
  // 3.3. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Open</Button>
    </div>
  );
}
```

### Экспорт компонентов

```typescript
// ✅ Named export (предпочтительно)
export function MyComponent() {}

// ✅ Для страниц Next.js — default export
export default function Page() {}
```

### Props

```typescript
// ✅ Деструктуризация в параметрах
function Card({ title, description, onClick }: CardProps) {}

// ✅ Spread для передачи остальных props
function Button({ children, variant, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```

---

## 🔌 API Routes

### Структура route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Получение данных
    const body = await request.json();
    
    // 2. Валидация
    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // 3. Авторизация
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 4. Бизнес-логика
    const result = await processRequest(body);
    
    // 5. Успешный ответ
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Обработка ошибок

```typescript
// ✅ Используй кастомные error классы
class InsufficientCreditsError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

// ✅ В API route
if (error instanceof InsufficientCreditsError) {
  return NextResponse.json(
    { error: error.message, code: 'INSUFFICIENT_CREDITS' },
    { status: 402 }
  );
}
```

---

## 🗄️ Zustand Stores

### Структура store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CreditsState = {
  balance: number;
  isLoading: boolean;
};

type CreditsActions = {
  setBalance: (balance: number) => void;
  deduct: (amount: number) => void;
  fetchBalance: () => Promise<void>;
};

type CreditsStore = CreditsState & CreditsActions;

export const useCreditsStore = create<CreditsStore>()(
  persist(
    (set, get) => ({
      // State
      balance: 0,
      isLoading: false,
      
      // Actions
      setBalance: (balance) => set({ balance }),
      
      deduct: (amount) => set((state) => ({
        balance: state.balance - amount,
      })),
      
      fetchBalance: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/credits/balance');
          const data = await res.json();
          set({ balance: data.balance });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'credits-storage',
    }
  )
);
```

---

## 🎨 Стили

### Tailwind CSS

```tsx
// ✅ Используй утилиты Tailwind
<div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-lg">

// ✅ Условные классы через clsx/cn
import { cn } from '@/lib/utils';

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  disabled && 'opacity-50 cursor-not-allowed'
)}>
```

### CSS Variables

```css
/* Используй CSS переменные для темизации */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
}

[data-theme="dark"] {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
}
```

---

## 🧪 Логирование

### Используй lib/logger.ts

```typescript
import { logger } from '@/lib/logger';

// ✅ Правильно
logger.info('Generation started', { modelId, userId });
logger.error('Generation failed', { error, modelId });

// ❌ Неправильно (в production)
console.log('Generation started');
console.error('Error:', error);
```

---

## ✅ Чеклист code review

- [ ] Импорты через `@/` alias
- [ ] Нет `any` типов (используй `unknown`)
- [ ] Нет `console.log` (используй logger)
- [ ] Обработаны все error cases
- [ ] Компоненты имеют корректные типы props
- [ ] API routes возвращают правильные status codes
- [ ] Нет хардкода secrets/keys
- [ ] Нет дублирования кода (DRY)

---

## 📚 См. также

- [ARCHITECTURE.md](./ARCHITECTURE.md) — структура проекта
- [.cline/rules.md](../.cline/rules.md) — правила агента
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Next.js Docs](https://nextjs.org/docs)

---

*Последнее обновление: 2025-01-16*
