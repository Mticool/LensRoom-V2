# Batch Image Upload - Множественная загрузка изображений

## 📝 Описание

Компоненты для **batch загрузки и выбора** нескольких изображений одновременно:
- `BatchImageUploader` - загрузка множественных файлов
- `HistoryImagePicker` - выбор из истории генераций

## 🎯 Use Cases

### 1. **E-Commerce Batch Processing**
Загрузить 10 фото товара → применить один промпт → получить обработанные

### 2. **Style Transfer Batch**
Загрузить несколько портретов → применить один стиль → получить результаты

### 3. **Background Replacement**
Загрузить продукты → заменить фон на всех → экспорт

## 📦 Компоненты

### BatchImageUploader

**Props:**
```typescript
interface BatchImageUploaderProps {
  images: UploadedImage[];              // Текущие изображения
  onImagesChange: (images: UploadedImage[]) => void; // Callback
  maxImages?: number;                   // Лимит (default: 10)
  className?: string;
  disabled?: boolean;
  showHistoryButton?: boolean;          // Показать кнопку "Из истории"
  onSelectFromHistory?: () => void;     // Callback для истории
}

interface UploadedImage {
  id: string;
  file?: File;                          // Исходный файл
  preview: string;                      // dataURL или URL
  status: 'ready' | 'uploading' | 'error';
  source?: 'upload' | 'history';        // Источник
}
```

**Пример использования:**
```tsx
'use client';

import { useState } from 'react';
import { BatchImageUploader } from '@/components/generator-v2/BatchImageUploader';
import { HistoryImagePicker } from '@/components/generator-v2/HistoryImagePicker';

export function BatchRemixPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);

  const handleSelectFromHistory = (selected: { preview: string; id: string }[]) => {
    const historyImages: UploadedImage[] = selected.map(img => ({
      id: img.id,
      preview: img.preview,
      status: 'ready',
      source: 'history',
    }));
    
    setImages(prev => [...prev, ...historyImages]);
  };

  const handleGenerate = async () => {
    // Отправляем batch запрос
    for (const image of images) {
      await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'flux-2',
          prompt: 'Add neon lighting in cyberpunk style',
          mode: 'i2i',
          referenceImage: image.preview,
        }),
      });
    }
  };

  return (
    <div className="p-6">
      <h1>Batch Remix</h1>
      
      <BatchImageUploader
        images={images}
        onImagesChange={setImages}
        maxImages={10}
        showHistoryButton
        onSelectFromHistory={() => setShowHistoryPicker(true)}
      />

      <button onClick={handleGenerate}>
        Обработать все ({images.length})
      </button>

      <HistoryImagePicker
        isOpen={showHistoryPicker}
        onClose={() => setShowHistoryPicker(false)}
        onSelect={handleSelectFromHistory}
        maxSelect={10}
        mode="image"
      />
    </div>
  );
}
```

### HistoryImagePicker

**Props:**
```typescript
interface HistoryImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (images: { preview: string; id: string }[]) => void;
  maxSelect?: number;                   // Лимит выбора (default: 10)
  mode: 'image' | 'video';
}
```

**Функции:**
- ✅ Загрузка из API `/api/generations?type=photo&limit=50`
- ✅ Множественный выбор с чекбоксами
- ✅ Превью с промптами
- ✅ Счётчик выбранных
- ✅ Валидация лимита

## 🎨 UI Features

### BatchImageUploader

**1. Drag & Drop область**
- Анимация при наведении
- Подсветка при drag over
- Поддержка множественных файлов

**2. Выпадающее меню**
- "Загрузить файлы" (input multiple)
- "Из сгенерированных" (открывает HistoryImagePicker)
- Закрывается при клике вне

**3. Превью галерея**
- Grid layout с gap
- Размер: 80x80px
- Кнопка удаления на hover
- Индикаторы статуса (ready/uploading/error)
- Бейдж источника (history)

**4. Валидация**
- Формат: JPG, PNG, WEBP
- Размер: до 10MB
- Лимит файлов: настраиваемый
- Toast уведомления об ошибках

### HistoryImagePicker

**1. Модальное окно**
- Full screen overlay
- Центрированная карточка
- Анимация появления

**2. Грид изображений**
- Responsive (3-5 колонок)
- Aspect ratio 1:1
- Hover эффекты

**3. Выбор**
- Чекбоксы с анимацией
- Выделение рамкой
- Счётчик в хедере

**4. Промпты**
- Overlay с градиентом
- Line-clamp 2 строки
- Показ на hover

## 🔌 Интеграция

### Вариант 1: Замена ImageUploader

Если нужна batch загрузка вместо одиночной:

```tsx
// Было
<ImageUploader
  value={referenceImage}
  onChange={setReferenceImage}
  mode="prominent"
/>

// Стало
<BatchImageUploader
  images={images}
  onImagesChange={setImages}
  maxImages={1} // Для совместимости
/>
```

### Вариант 2: Новая страница Batch Remix

Создать `/create/batch-remix`:

```tsx
// app/(generator)/create/batch-remix/page.tsx
import { BatchRemixGenerator } from '@/components/generator-v2/BatchRemixGenerator';

export default function BatchRemixPage() {
  return <BatchRemixGenerator />;
}
```

### Вариант 3: E-Com Integration

Добавить в E-Com Studio:

```tsx
// В /create/products
<BatchImageUploader
  images={productImages}
  onImagesChange={setProductImages}
  maxImages={50}
  showHistoryButton={false}
/>
```

## 🚀 API для Batch обработки

### Последовательная обработка (текущее)

```typescript
for (const image of images) {
  const response = await fetch('/api/generate/photo', {
    method: 'POST',
    body: JSON.stringify({
      model: 'flux-2',
      prompt: 'Add white background',
      mode: 'i2i',
      referenceImage: image.preview,
    }),
  });
}
```

### Batch endpoint (опционально)

Если нужна оптимизация, создать `/api/generate/batch`:

```typescript
// POST /api/generate/batch
{
  "model": "flux-2",
  "prompt": "Add white background",
  "mode": "i2i",
  "images": [
    { "id": "1", "data": "data:image/png;base64,..." },
    { "id": "2", "data": "data:image/png;base64,..." }
  ]
}

// Response
{
  "batchId": "batch_123",
  "jobs": [
    { "imageId": "1", "jobId": "job_1", "status": "queued" },
    { "imageId": "2", "jobId": "job_2", "status": "queued" }
  ]
}
```

## 💰 Pricing

Batch обработка = N × цена модели

**Пример:**
- 10 изображений × FLUX.2 (3⭐) = 30⭐

**Рекомендации:**
1. Показывать общую стоимость до генерации
2. Списывать кредиты постепенно (по мере обработки)
3. Возврат при ошибках

## 📊 База данных

**Без изменений!** Каждое изображение сохраняется как отдельная генерация:

```sql
-- 10 изображений = 10 записей в generations
INSERT INTO generations (user_id, type, model_id, prompt, ...)
VALUES 
  ('user_1', 'photo', 'flux-2', 'Add white background', ...),
  ('user_1', 'photo', 'flux-2', 'Add white background', ...),
  ...
```

Опционально можно добавить `batch_id`:

```sql
ALTER TABLE generations ADD COLUMN batch_id TEXT;
```

## 🧪 Тестирование

1. ✅ Загрузка 1-10 изображений
2. ✅ Drag & Drop множественных
3. ✅ Выбор из истории
4. ✅ Удаление отдельных
5. ✅ Валидация лимитов
6. ✅ Обработка всех
7. ✅ Прогресс индикация

## 📱 Responsive

- **Desktop:** Grid 5 колонок
- **Tablet:** Grid 4 колонки  
- **Mobile:** Grid 3 колонки

## 🎯 Roadmap

- [ ] Прогресс бар batch обработки
- [ ] Pause/Resume batch
- [ ] Экспорт всех результатов (ZIP)
- [ ] Предустановки промптов для batch
- [ ] Сравнение до/после для каждого

---

**Файлы:**
- `src/components/generator-v2/BatchImageUploader.tsx`
- `src/components/generator-v2/HistoryImagePicker.tsx`

