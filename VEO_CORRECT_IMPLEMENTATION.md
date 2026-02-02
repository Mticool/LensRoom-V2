# Veo 3.1 - Правильная реализация

## ⚠️ Важная информация о референсных изображениях

### Ограничения Fast-моделей
**КРИТИЧНО**: Fast-модели (`veo-3.1-fast`, `veo-3.1-landscape-fast`) **НЕ поддерживают** множественные референсные изображения (2-3 шт)!

### Доступные варианты

#### 1. Veo 3.1 Fast (image-to-video с 1 кадром)
```json
{
  "model": "veo-3.1-fast",
  "action": "image2video",
  "image_urls": ["https://..."],
  "prompt": "описание движения, стиля, камеры"
}
```

**Особенности:**
- ✅ Только **1 первый кадр** как референс
- ✅ Быстрая генерация
- ✅ 720p разрешение
- ❌ НЕТ поддержки множественных референсов

#### 2. Veo 3.1 Standard (2-3 референса)
```json
{
  "model": "veo-3.1-fl",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "prompt" },
      { "type": "image_url", "image_url": { "url": "data:image/..." } },
      { "type": "image_url", "image_url": { "url": "data:image/..." } },
      { "type": "image_url", "image_url": { "url": "data:image/..." } }
    ]
  }]
}
```

**Особенности:**
- ✅ До **3 референсных изображений**
- ✅ Более точное соответствие стилю
- ⏱️ Более медленная генерация
- ❌ НЕТ Fast-варианта

---

## 📦 Доступные модели

### Fast Models (720p) - Single Image Only
| Model ID | Description | Refs Support |
|----------|-------------|--------------|
| `veo-3.1-fast` | Fast, portrait/square | ✅ 1 first frame |
| `veo-3.1-landscape-fast` | Fast, landscape 16:9 | ✅ 1 first frame |

### 4K Models - Single Image Only
| Model ID | Description | Refs Support |
|----------|-------------|--------------|
| `veo-3.1-fast-4k` | Fast 4K, portrait/square | ✅ 1 first frame |
| `veo-3.1-landscape-fast-4k` | Fast 4K, landscape 16:9 | ✅ 1 first frame |

### Standard Models (720p) - Multiple References
| Model ID | Description | Refs Support |
|----------|-------------|--------------|
| `veo-3.1-fl` | Standard + refs, portrait/square | ✅ 2-3 images |
| `veo-3.1-landscape-fl` | Standard + refs, landscape 16:9 | ✅ 2-3 images |

**ИТОГО: 6 вариантов моделей**

---

## 🔧 Реализация в коде

### 1. Автоматическое определение режима

```typescript
// Fast модель + множественные референсы → конвертируем в первый кадр
if (hasReferenceImages && isFastModel) {
  console.warn('Fast models do NOT support multiple reference images!');
  params.startImageUrl = params.referenceImages[0];
  params.referenceImages = undefined;
}
```

### 2. Выбор endpoint

```typescript
if (useVeoVideoAPI) {
  // Veo Video API format (action-based)
  return this.generateVideoVeoFormat(params);
} else {
  // Chat/completions format (for Sora, Veo with multiple refs)
  return this.generateVideoChatFormat(params);
}
```

### 3. Формирование запроса для Fast-модели

```typescript
// POST /v1/video/generations
{
  "model": "veo-3.1-fast",
  "action": "image2video",
  "image_urls": ["https://image-url.jpg"],
  "prompt": "A person walks in a park"
}
```

### 4. Формирование запроса для Standard-модели

```typescript
// POST /v1/chat/completions
{
  "model": "veo-3.1-fl",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "A person walks in a park" },
      { "type": "image_url", "image_url": { "url": "data:image/..." } },
      { "type": "image_url", "image_url": { "url": "data:image/..." } }
    ]
  }]
}
```

---

## 💡 Рекомендации по использованию

### Для Fast-моделей (image2video)
1. **Используйте качественный первый кадр**
   - Чёткое изображение персонажа/сцены
   - Правильный ракурс
   - Хорошее освещение

2. **Детальный промпт**
   - Опишите одежду, стиль, цвета
   - Укажите движение камеры
   - Опишите фон и освещение

3. **Пример хорошего промпта:**
   ```
   A person in blue jacket walks slowly through autumn park, 
   cinematic camera following from behind, golden hour lighting, 
   leaves falling, warm color grading
   ```

### Для Standard-моделей (multiple refs)
1. **Используйте 2-3 референса**
   - Разные ракурсы персонажа
   - Детали одежды, аксессуаров
   - Стилистические элементы

2. **Референсы должны быть согласованными**
   - Один и тот же персонаж/стиль
   - Схожее освещение
   - Одна и та же сцена/локация

---

## 🧪 Тестирование

### Test 1: Fast модель с первым кадром
```bash
curl -X POST https://api.laozhang.ai/v1/video/generations \
  -H "Authorization: Bearer $LAOZHANG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1-fast",
    "action": "image2video",
    "image_urls": ["https://example.com/first-frame.jpg"],
    "prompt": "A person walks in a park"
  }'
```

### Test 2: Standard модель с множественными референсами
```bash
curl -X POST https://api.laozhang.ai/v1/chat/completions \
  -H "Authorization: Bearer $LAOZHANG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1-fl",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "A person walks in a park"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }]
  }'
```

---

## 📊 Матрица выбора модели

| Требование | Модель | Режим |
|-----------|--------|-------|
| Быстро + 1 референс | `veo-3.1-fast` | image2video |
| 4K + 1 референс | `veo-3.1-fast-4k` | image2video |
| Landscape + 1 референс | `veo-3.1-landscape-fast` | image2video |
| 2-3 референса | `veo-3.1-fl` | chat/completions |
| Landscape + 2-3 референса | `veo-3.1-landscape-fl` | chat/completions |
| Только текст | `veo-3.1-fast` | text2video |

---

## ⚠️ Частые ошибки

### ❌ Ошибка 1: Fast + множественные референсы
```typescript
// WRONG!
{
  model: "veo-3.1-fast",
  referenceImages: [img1, img2, img3]  // НЕ РАБОТАЕТ!
}
```

**Решение:** Используйте standard модель или только первый кадр:
```typescript
// CORRECT Option 1: Use first image only
{
  model: "veo-3.1-fast",
  action: "image2video",
  image_urls: [img1]
}

// CORRECT Option 2: Use standard model
{
  model: "veo-3.1-fl",
  referenceImages: [img1, img2, img3]
}
```

### ❌ Ошибка 2: Неправильный endpoint
```typescript
// WRONG for fast models!
POST /v1/chat/completions with veo-3.1-fast
```

**Решение:** Используйте правильный endpoint:
```typescript
// CORRECT
POST /v1/video/generations with action parameter
```

---

## 📝 Changelog

### 2026-02-02 - Исправление реализации
- ✅ Убрали `-fl` суффикс для Fast-моделей
- ✅ Добавили автоматическую конвертацию multiple refs → first frame для Fast
- ✅ Реализовали правильный формат с `action: "image2video"`
- ✅ Добавили 4K варианты моделей
- ✅ Разделили логику на `generateVideoVeoFormat` и `generateVideoChatFormat`

---

**Статус**: ✅ Ready for Testing

**Дата**: 2026-02-02
