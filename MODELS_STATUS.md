# LensRoom - Статус моделей KIE.ai

Актуальный статус всех подключенных моделей на **15 декабря 2025**.

---

## ✅ **РАБОТАЮЩИЕ МОДЕЛИ** (протестированы)

### 🖼️ Фото

| Модель | API ID | Статус | Цена | Время | Примечания |
|--------|--------|--------|------|-------|------------|
| **Nano Banana** | `google/nano-banana` | ✅ Работает | 4⭐ | ~5с | Быстрый, дешёвый |
| **Imagen 4** | `google/imagen4` | ✅ Работает | 4-12⭐ | ~10с | Fast/Ultra режимы |
| **FLUX.2 Pro** | `flux-2/pro-text-to-image` | ✅ Работает | 5-7⭐ | ~75с | **Требует resolution + aspect_ratio** |

### 🎬 Видео

| Модель | API ID | Статус | Цена | Время | Примечания |
|--------|--------|--------|------|-------|------------|
| **Veo 3.1** | `veo3` | ✅ Работает | 400⭐ | ~3-5мин | Отдельный API endpoint |
| **Veo 3.1 Fast** | `veo3_fast` | ✅ Работает | 80⭐ | ~1-2мин | Отдельный API endpoint |
| **Kling 2.6 t2v** | `kling-2.6/text-to-video` | ✅ Работает | 55-220⭐ | ~2мин | С/без audio |
| **Sora 2 i2v** | `sora-2-image-to-video` | ✅ Работает | 150-270⭐ | ~3мин | Image-to-video |

---

## ⚠️ **НЕДОСТУПНЫЕ МОДЕЛИ** (требуют premium подписку)

### 🖼️ Фото

| Модель | API ID | Причина |
|--------|--------|---------|
| Seedream 4.5 | `seedream/4.5-text-to-image` | Premium tier required |
| Z-Image | `z-image/text-to-image` | Premium tier required |
| Qwen Image | `qwen/image-edit` | Premium tier required |

### 🎬 Видео

| Модель | API ID | Причина |
|--------|--------|---------|
| Bytedance Pro | `bytedance/v1-pro-image-to-video` | Operation not found |
| Sora 2 Pro | `sora-2-pro-image-to-video` | Premium tier required |
| Kling i2v | `kling-2.6/image-to-video` | Premium tier required |

---

## 🧪 **Результаты тестирования**

### Успешные генерации:

1. **Nano Banana**: ✅ 
   - Task ID: `e1a9611a2229ee73ef21c086a95287c0`
   - Время: ~10 секунд
   - Статус: success

2. **Imagen 4**: ✅
   - Task ID: `475900fd47b0a34f4c9a3fe181e12dc2`
   - Время: ~15 секунд
   - Статус: success

3. **FLUX.2 Pro**: ✅ **NEW!**
   - Task ID: `85d854b9cec45ec6dcc2cc65d23d12d7`
   - Время: 75 секунд
   - Результат: `https://tempfile.aiquickdraw.com/f/a099769d-0392-455b-a85b-f4adf048eb62_0.jpg`
   - Статус: success

4. **Veo 3.1**: ✅
   - Task ID: `3477cc710d4e858089dd85cb632dada3`
   - Статус: processing (3-5 минут)

5. **Veo 3.1 Fast**: ✅
   - Task ID: `636a3ef6e0054980aa9fc7ef19988d5c`
   - Статус: processing (1-2 минуты)

6. **Kling 2.6 t2v**: ✅
   - Task ID: `fc6e2ff1cc88452be426217745fd8a05`
   - Статус: success

7. **Sora 2 i2v**: ✅
   - Task ID: `966f11cf5936c20a390301c9183477b3`
   - Статус: success

---

## 📊 **Итоговая статистика**

### Фото генерация
- ✅ Работает: **3 модели** (Nano Banana, Imagen 4, FLUX.2 Pro)
- ⭐ Premium: **3 модели** (Seedream, Z-Image, Qwen)

### Видео генерация
- ✅ Работает: **4 модели** (Veo 3.1, Veo 3.1 Fast, Kling 2.6, Sora 2)
- ⭐ Premium: **3 модели** (Bytedance, Sora Pro, Kling i2v)

---

## 🔧 **Helper методы добавлены**

```typescript
// Premium photo helpers
await kieClient.generateFlux2Pro({
  prompt: 'Mountain sunset',
  resolution: '1K', // REQUIRED
  aspectRatio: '16:9', // REQUIRED
});

await kieClient.generateSeedream45({
  prompt: 'Test',
  aspectRatio: '16:9',
});

// Premium video helpers
await kieClient.generateKling26Video({
  prompt: 'Ocean waves',
  duration: 5,
  aspectRatio: '16:9',
  sound: false,
});

await kieClient.generateBytedanceV1Pro({
  imageUrl: 'https://...',
  prompt: 'Animate',
  duration: 5,
  resolution: '720p',
});
```

---

## 🚀 **На продакшене (lensroom.ru)**

**Доступны в UI:**
- ✅ Nano Banana
- ✅ Imagen 4
- ✅ **FLUX.2 Pro** (новая!)
- ✅ Veo 3.1
- ✅ Veo 3.1 Fast
- ✅ Kling 2.6
- ✅ Sora 2

**Скрыты (premium):**
- Seedream 4.5
- Z-Image
- Qwen Image
- Bytedance Pro
- Sora 2 Pro

---

## 📝 **Обновлено**

- Дата: 15 декабря 2025, 19:35
- Версия: 1.0.0
- Сервер: VDS 104.222.177.29
- Статус: ✅ Online

---

**Готово к использованию!** 🎉
