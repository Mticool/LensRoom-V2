# ImageUploaderBatch - Множественная загрузка изображений

## 📝 Описание

Компонент для загрузки нескольких референсных изображений одновременно. Поддерживает drag & drop, валидацию и управление списком.

## 🎯 Применение

- **Batch Remix** - редактирование нескольких изображений за раз
- **Collage Generator** - создание коллажей из нескольких фото
- **Style Transfer** - применение стиля к набору изображений
- **Comparison** - A/B тестирование разных промптов на одном наборе

## 📦 Установка

Компонент уже создан: `src/components/generator-v2/ImageUploaderBatch.tsx`

## 💻 Использование

### Базовый пример

```typescript
'use client';

import { useState } from 'react';
import { ImageUploaderBatch, UploadedImage } from '@/components/generator-v2/ImageUploaderBatch';

export function MyComponent() {
  const [images, setImages] = useState<UploadedImage[]>([]);

  return (
    <ImageUploaderBatch
      images={images}
      onImagesChange={setImages}
      maxImages={10}
      mode="prominent"
    />
  );
}
```

### С GeneratorV2

```typescript
'use client';

import { useState } from 'react';
import { ImageUploaderBatch, UploadedImage } from '@/components/generator-v2/ImageUploaderBatch';

export function RemixBatchPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (images.length === 0) {
      toast.error('Загрузите хотя бы одно изображение');
      return;
    }

    setIsGenerating(true);

    // Генерируем для каждого изображения
    for (const image of images) {
      try {
        const response = await fetch('/api/generate/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'flux-2',
            prompt,
            mode: 'i2i',
            referenceImage: image.preview, // base64
            quality: '1k',
            aspectRatio: '1:1',
          }),
        });

        const data = await response.json();
        console.log('Generated:', data);
        toast.success(`Обработано: ${image.id}`);
      } catch (error) {
        console.error('Error generating:', error);
        toast.error(`Ошибка: ${image.id}`);
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <ImageUploaderBatch
        images={images}
        onImagesChange={setImages}
        maxImages={10}
        mode="prominent"
      />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опишите изменения..."
        className="w-full px-4 py-3 rounded-lg bg-[#27272A] text-white"
        rows={3}
      />

      <button
        onClick={handleGenerate}
        disabled={isGenerating || images.length === 0}
        className="px-6 py-3 rounded-lg bg-[#00D9FF] text-black font-medium"
      >
        {isGenerating ? 'Генерация...' : `Обработать ${images.length} изображений`}
      </button>
    </div>
  );
}
```

## 🔧 API

### Props

```typescript
interface ImageUploaderBatchProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;              // default: 10
  mode: 'compact' | 'prominent';
  className?: string;
  disabled?: boolean;
}
```

### UploadedImage Type

```typescript
interface UploadedImage {
  id: string;                      // UUID
  file?: File;                     // Original file object
  preview: string;                 // base64 dataURL or blob URL
  status: 'ready' | 'uploading' | 'error';
}
```

## 🎨 Режимы отображения

### `mode="compact"`
Компактный вид для сайдбара:
- Grid 2x2
- Маленькие превью (h-16)
- Удаление по кнопке X

### `mode="prominent"`
Полноразмерный вид для Canvas:
- Grid 2-3-4 колонки (responsive)
- Большие превью (aspect-square)
- Кнопки "Добавить ещё" и "Очистить всё"

## 🚀 Функции

### Множественная загрузка
```typescript
// Пользователь может выбрать несколько файлов сразу
<input type="file" multiple />
```

### Drag & Drop
- Перетаскивание нескольких файлов
- Визуальная индикация (подсветка зоны)

### Валидация
- ✅ Формат: JPG, PNG, WEBP
- ✅ Размер: до 10MB каждый
- ✅ Лимит: до `maxImages`

### Управление
- **Удалить одно** - кнопка X на каждом превью
- **Очистить всё** - удалить все изображения
- **Добавить ещё** - загрузить дополнительные файлы

### Автоматическая очистка
При удалении изображений blob URLs автоматически освобождаются:
```typescript
URL.revokeObjectURL(image.preview);
```

## 💡 Примеры сценариев

### 1. Batch Style Transfer
```typescript
const [images, setImages] = useState<UploadedImage[]>([]);
const [style, setStyle] = useState('anime');

// Применить стиль ко всем изображениям
const applyStyle = async () => {
  for (const image of images) {
    await generateWithStyle(image.preview, style);
  }
};
```

### 2. Collage Generator
```typescript
const [images, setImages] = useState<UploadedImage[]>([]);

// Создать коллаж из всех загруженных изображений
const createCollage = async () => {
  const response = await fetch('/api/generate/collage', {
    method: 'POST',
    body: JSON.stringify({
      images: images.map(img => img.preview),
      layout: 'grid',
    }),
  });
};
```

### 3. A/B Testing
```typescript
const [images, setImages] = useState<UploadedImage[]>([]);
const [prompts, setPrompts] = useState(['prompt1', 'prompt2']);

// Тестировать каждый промпт на каждом изображении
const runABTest = async () => {
  for (const image of images) {
    for (const prompt of prompts) {
      await generate(image.preview, prompt);
    }
  }
};
```

## 🎯 Best Practices

### 1. Показывайте прогресс
```typescript
const [progress, setProgress] = useState(0);

for (let i = 0; i < images.length; i++) {
  await processImage(images[i]);
  setProgress(((i + 1) / images.length) * 100);
}
```

### 2. Обрабатывайте ошибки
```typescript
const results = await Promise.allSettled(
  images.map(img => generateImage(img.preview))
);

const succeeded = results.filter(r => r.status === 'fulfilled').length;
toast.success(`Успешно: ${succeeded}/${images.length}`);
```

### 3. Лимитируйте параллельные запросы
```typescript
import pLimit from 'p-limit';

const limit = pLimit(3); // Максимум 3 параллельных запроса

const promises = images.map(img => 
  limit(() => generateImage(img.preview))
);

await Promise.all(promises);
```

## 🔍 Отличия от обычного ImageUploader

| Функция | ImageUploader | ImageUploaderBatch |
|---------|--------------|-------------------|
| Количество файлов | 1 | до `maxImages` |
| Multiple upload | ❌ | ✅ |
| Grid view | ❌ | ✅ |
| Batch actions | ❌ | ✅ |
| Memory cleanup | Manual | Auto |

## 📱 Адаптивность

- **Desktop:** grid-cols-4
- **Tablet:** grid-cols-3
- **Mobile:** grid-cols-2

## ⚠️ Важные замечания

1. **Memory Management**
   - Не забывайте очищать blob URLs
   - Компонент делает это автоматически при unmount

2. **Performance**
   - Для большого количества файлов используйте pagination
   - Рекомендуемый лимит: 10-20 изображений

3. **Backend**
   - API должен поддерживать `referenceImage` в base64
   - Учитывайте лимиты размера request body

4. **Pricing**
   - Каждое изображение = отдельная генерация
   - 10 изображений = 10x стоимость модели

## 🧪 Тестирование

```typescript
describe('ImageUploaderBatch', () => {
  it('should upload multiple files', () => {
    // Test multiple upload
  });

  it('should validate file types', () => {
    // Test validation
  });

  it('should respect maxImages limit', () => {
    // Test limit
  });

  it('should remove individual images', () => {
    // Test removal
  });
});
```

---

**Создано:** 2025-01-09  
**Автор:** AI Assistant  
**Версия:** 1.0

