# Veo 3.1 Reference Images Fix

## Проблема
Ошибка: `Video API error: 该令牌无权使用模型：veo-3.1-fl-fast`

**Причина**: Неправильный формат названия модели с референсными изображениями.

## Решение

### ❌ Было (неправильно)
```
veo-3.1-fast → veo-3.1-fl-fast  (WRONG!)
```

### ✅ Стало (правильно)
```
veo-3.1-fast → veo-3.1-fast-fl  (CORRECT!)
```

## Изменения в коде

### 1. Упрощённая логика добавления `-fl` суффикса

**Файл**: `src/lib/api/laozhang-client.ts`

```typescript
if (hasReferenceImages && params.model.startsWith('veo') && !params.model.includes('-fl')) {
  // Add -fl suffix for Veo with reference images (required by API)
  // Format: veo-3.1-fast-fl (NOT veo-3.1-fl-fast)
  finalModel = `${params.model}-fl`;
  
  console.log('[Video API] Using -fl model for reference images:', {
    original: params.model,
    final: finalModel,
    referenceCount: params.referenceImages?.length || 0,
  });
}
```

### 2. Добавлены константы для -fl моделей

```typescript
export const LAOZHANG_MODELS = {
  // Standard Veo 3.1
  VEO_31: "veo-3.1",
  VEO_31_FAST: "veo-3.1-fast",
  VEO_31_LANDSCAPE: "veo-3.1-landscape",
  VEO_31_LANDSCAPE_FAST: "veo-3.1-landscape-fast",
  
  // VEO 3.1 with reference images support (-fl suffix)
  VEO_31_FL: "veo-3.1-fl",
  VEO_31_FAST_FL: "veo-3.1-fast-fl",
  VEO_31_LANDSCAPE_FL: "veo-3.1-landscape-fl",
  VEO_31_LANDSCAPE_FAST_FL: "veo-3.1-landscape-fast-fl",
}
```

## Примеры трансформации

| Исходная модель | С референсами |
|----------------|---------------|
| `veo-3.1` | `veo-3.1-fl` |
| `veo-3.1-fast` | `veo-3.1-fast-fl` |
| `veo-3.1-landscape` | `veo-3.1-landscape-fl` |
| `veo-3.1-landscape-fast` | `veo-3.1-landscape-fast-fl` |

## Как работает

1. **Без референсных изображений**: используется стандартная модель
   ```typescript
   model: "veo-3.1-fast"
   // Остаётся: "veo-3.1-fast"
   ```

2. **С референсными изображениями**: автоматически добавляется `-fl`
   ```typescript
   model: "veo-3.1-fast"
   referenceImages: [base64Image1, base64Image2]
   // Становится: "veo-3.1-fast-fl"
   ```

3. **Формат запроса к API**:
   ```json
   POST https://api.laozhang.ai/v1/chat/completions
   {
     "model": "veo-3.1-fast-fl",
     "messages": [{
       "role": "user",
       "content": [
         { "type": "text", "text": "Your prompt here" },
         { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } },
         { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
       ]
     }]
   }
   ```

## Требования для референсных изображений

- ✅ Модель: Veo 3.1 (любой вариант)
- ✅ Формат: Base64 data URLs (`data:image/jpeg;base64,...`)
- ✅ Максимум: 2 референсных изображения
- ✅ API автоматически добавит `-fl` суффикс

## Тестирование

```bash
# Тест с референсными изображениями
curl -X POST https://your-app.com/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{
    "model": "veo-3.1-fast",
    "prompt": "A person walks in a park",
    "referenceImages": [
      "data:image/jpeg;base64,...",
      "data:image/jpeg;base64,..."
    ]
  }'

# В логах должно быть:
# [Video API] Using -fl model for reference images: {
#   original: 'veo-3.1-fast',
#   final: 'veo-3.1-fast-fl',
#   referenceCount: 2
# }
```

## Статус
✅ **ИСПРАВЛЕНО** - Теперь используется правильный формат `veo-3.1-fast-fl`
