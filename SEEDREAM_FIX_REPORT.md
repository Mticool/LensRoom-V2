# Исправление: Seedream 4.5 не генерирует фото

## 🐛 Проблема

Модель **Seedream 4.5** не генерировала изображения из-за неправильной передачи параметров в KIE API.

### Причина

API эндпоинт [src/app/api/generate/photo/route.ts](src/app/api/generate/photo/route.ts) неправильно обрабатывал параметры для разных типов моделей:

1. **Параметр `resolution` передавался для всех моделей**, включая Seedream 4.5
2. **Параметр `quality` НЕ передавался для Seedream**, потому что значения `'turbo', 'balanced', 'quality'` были ошибочно классифицированы как "resolution-based"

### Различия между моделями

**Resolution-based модели** (используют параметр `resolution`):
- ✅ Nano Banana
- ✅ Nano Banana Pro
- ✅ FLUX 2 Pro
- ✅ Topaz Upscale

Значения: `'1K'`, `'2K'`, `'4K'`, `'8K'`

**Quality-based модели** (используют параметр `quality`):
- ✅ Seedream 4.5
- ✅ Grok Imagine
- ✅ Z-image
- ✅ GPT Image 1.5

Значения: `'turbo'`, `'balanced'`, `'quality'`, `'fast'`, `'ultra'`, `'medium'`, `'high'`

---

## ✅ Решение

### Изменения в [src/app/api/generate/photo/route.ts](src/app/api/generate/photo/route.ts)

#### 1. Разделены списки значений (строки 784-785)

```typescript
const resolutionBasedQualityValues = ['1k_2k', '4k', '1k', '2k', '8k'];
const qualityBasedQualityValues = ['fast', 'turbo', 'balanced', 'quality', 'ultra'];
```

#### 2. Параметр `resolution` передается только для нужных моделей (строки 772-779)

```typescript
// Only add resolution for models that actually use it (Nano Banana, FLUX, Topaz)
// Other models (Seedream, Grok) use quality parameter instead
const needsResolution = effectiveModelId.includes('nano-banana') ||
                       effectiveModelId.includes('flux') ||
                       effectiveModelId.includes('topaz');
if (needsResolution) {
  generateParams.resolution = resolutionForKie;
}
```

#### 3. Параметр `quality` передается только для качественных моделей (строки 788-800)

```typescript
// For resolution-based models (Nano Banana, FLUX, Topaz), don't pass quality separately
// For quality-based models (Seedream, Grok, etc.), pass quality parameter
if (quality) {
  const lowerQuality = quality.toLowerCase();

  // Skip quality parameter for resolution-based models when using resolution values
  if (isResolutionBasedModel && resolutionBasedQualityValues.includes(lowerQuality)) {
    // Don't add quality - resolution is already set
  } else if (qualityBasedQualityValues.includes(lowerQuality) || !isResolutionBasedModel) {
    // Add quality for quality-based models or non-resolution values
    generateParams.quality = quality;
  }
}
```

---

## 🧪 Тестирование

### Юнит-тесты параметров

Создан тест [test-photo-params.js](test-photo-params.js) для проверки логики параметров:

```bash
node test-photo-params.js
```

**Результаты: ✅ 14/14 тестов прошли успешно**

#### Протестированные сценарии:

**Quality-based модели:**
- ✅ Seedream 4.5 (turbo, balanced, quality)
- ✅ Z-image (turbo)
- ✅ GPT Image 1.5 (medium, high)
- ✅ Grok Imagine (без quality)

**Resolution-based модели:**
- ✅ Nano Banana Pro (1k_2k, 4k)
- ✅ FLUX 2 Pro (1k, 2k)
- ✅ Topaz Upscale (2k, 4k, 8k)

### Проверка параметров API

Для каждой модели проверяется:

| Модель | Quality Parameter | Resolution Parameter |
|--------|------------------|---------------------|
| **Seedream 4.5** | ✅ `quality: 'turbo'` | ❌ Нет |
| **Nano Banana Pro** | ❌ Нет | ✅ `resolution: '2K'` |
| **FLUX 2 Pro** | ❌ Нет | ✅ `resolution: '1K'` |
| **Topaz Upscale** | ❌ Нет | ✅ `resolution: '4K'` |
| **Z-image** | ✅ `quality: 'turbo'` | ❌ Нет |
| **GPT Image 1.5** | ✅ `quality: 'medium'` | ❌ Нет |
| **Grok Imagine** | ❌ Нет (нет опций) | ❌ Нет |

---

## 📋 Чек-лист для ручного тестирования

### 1. Seedream 4.5

- [ ] Открыть http://localhost:3000/generator
- [ ] Settings → Выбрать **Seedream 4.5**
- [ ] Выбрать качество **Turbo**
- [ ] Промпт: "A beautiful sunset over mountains"
- [ ] Запустить генерацию
- [ ] ✅ Проверить в DevTools Console:
  ```
  [API] Generating image with params: {
    model: 'seedream/4.5-text-to-image',
    quality: 'turbo',  // ← должен быть quality
    aspectRatio: '1:1'
    // resolution должен отсутствовать!
  }
  ```

### 2. Другие качества Seedream

- [ ] Повторить с **Balanced**
- [ ] Повторить с **Quality**
- [ ] Все должны передавать `quality`, а не `resolution`

### 3. Nano Banana Pro (для сравнения)

- [ ] Settings → Выбрать **Nano Banana Pro**
- [ ] Выбрать качество **1K/2K**
- [ ] Запустить генерацию
- [ ] ✅ Проверить в Console:
  ```
  [API] Generating image with params: {
    model: 'gemini-3-pro-image-preview-2k',
    resolution: '2K',  // ← должен быть resolution
    aspectRatio: '1:1'
    // quality должен отсутствовать!
  }
  ```

### 4. FLUX 2 Pro

- [ ] Settings → Выбрать **FLUX 2 Pro**
- [ ] Выбрать **1K** или **2K**
- [ ] ✅ Должен передавать `resolution`, НЕ `quality`

### 5. Topaz Upscale

- [ ] Settings → Выбрать **Topaz Upscale**
- [ ] Выбрать **2K**, **4K** или **8K**
- [ ] ✅ Должен передавать `resolution`, НЕ `quality`

---

## 🔍 Логи для проверки

### Правильные логи для Seedream 4.5:

```
[API] Generating image with params: {
  model: 'seedream/4.5-text-to-image',
  quality: 'turbo',
  aspectRatio: '16:9',
  outputFormat: 'png'
}
```

### Неправильные логи (до исправления):

```
[API] Generating image with params: {
  model: 'seedream/4.5-text-to-image',
  resolution: '1K',  // ❌ НЕПРАВИЛЬНО!
  aspectRatio: '16:9',
  outputFormat: 'png'
  // quality отсутствует ❌
}
```

---

## 📊 Статус

✅ **Исправление внесено**
✅ **Юнит-тесты прошли (14/14)**
⏳ **Требуется ручное тестирование с реальной авторизацией**

---

## 🚀 Деплой

После подтверждения работоспособности:

1. Коммит изменений:
   ```bash
   git add src/app/api/generate/photo/route.ts
   git commit -m "Fix: Seedream 4.5 API parameters (quality vs resolution)"
   ```

2. Push в продакшн:
   ```bash
   git push origin main
   ```

3. Проверить на production после деплоя

---

## 📝 Дополнительные файлы

- [test-photo-params.js](test-photo-params.js) - Юнит-тесты логики параметров
- [test-api-live.js](test-api-live.js) - Тесты реального API (требует auth)
- [src/app/api/generate/photo/route.ts](src/app/api/generate/photo/route.ts) - Исправленный эндпоинт
