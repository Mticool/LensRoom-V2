# 🗺️ Карта API Endpoints - LensRoom

**Обновлено:** 22 декабря 2024  
**Всего endpoints:** 27 (10 фото + 17 видео)

---

## 📸 ФОТО-МОДЕЛИ → KIE Market API

### Endpoint: `POST https://api.kie.ai/api/v1/jobs/createTask`

```
1.  midjourney/text-to-image          → Midjourney V7 (fast/turbo)
2.  google/nano-banana                → Nano Banana (7⭐)
3.  google/nano-banana-pro            → Nano Banana Pro (30⭐/40⭐)
4.  seedream/4.5-text-to-image        → Seedream 4.5 (11⭐)
5.  flux-2/pro-text-to-image          → FLUX.2 Pro (9⭐/12⭐)
6.  flux-2/flex-text-to-image         → FLUX.2 Flex (24⭐/41⭐)
7.  z-image                           → Z-image (2⭐)
8.  ideogram/v3                       → Ideogram V3 (turbo/balanced/quality)
9.  recraft/remove-background         → Recraft Remove BG (2⭐)
10. topaz/image-upscale               → Topaz Upscale (17⭐/34⭐/67⭐)
```

**Всего:** 10 моделей фото

---

## 🎥 ВИДЕО-МОДЕЛИ

### A. KIE Veo API (специальный)

#### Endpoint: `POST https://api.kie.ai/api/v1/veo/generate`

```
1. veo3                               → Veo 3.1 (fast/quality)
   Modes: t2v, i2v, reference
   Duration: 8s
   Price: 100⭐ (fast) / 420⭐ (quality)
```

**Всего:** 1 модель (специальный API)

---

### B. KIE Market API

#### Endpoint: `POST https://api.kie.ai/api/v1/jobs/createTask`

```
KLING FAMILY (4 endpoints):
2. kling-2.5-turbo/text-to-video      → Kling 2.5 Turbo (70-140⭐)
3. kling-2.6/text-to-video            → Kling 2.6 T2V (92-368⭐)
4. kling-2.6/image-to-video           → Kling 2.6 I2V
5. kling/v2-1-pro                     → Kling 2.1 Pro (268-536⭐)

SORA FAMILY (3 endpoints):
6. sora-2-image-to-video              → Sora 2 (50⭐)
7. sora-2-pro-image-to-video          → Sora 2 Pro (250-1050⭐)
8. sora-2-pro-storyboard              → Sora Storyboard (1050⭐)

WAN FAMILY (6 endpoints):
9.  wan/2-2-text-to-video             → WAN 2.2 A14B Turbo T2V
10. wan/2-2-image-to-video            → WAN 2.2 A14B Turbo I2V
11. wan/2-5-text-to-video             → WAN 2.5 T2V
12. wan/2-5-image-to-video            → WAN 2.5 I2V
13. wan/2-6-text-to-video             → WAN 2.6 T2V
14. wan/2-6-image-to-video            → WAN 2.6 I2V
    Resolutions: 480p/580p/720p/1080p
    Duration: 5s/10s/15s
    Modes: t2v, i2v, v2v

OTHER:
15. bytedance/v1-pro-image-to-video   → Bytedance Pro (27-121⭐)
16. kling/v1-avatar-standard          → Kling AI Avatar Standard (70-210⭐)
17. kling/ai-avatar-v1-pro            → Kling AI Avatar Pro (135-405⭐)
```

**Всего:** 16 endpoints для 7 видео-моделей

---

## 🔄 РЕЖИМЫ ГЕНЕРАЦИИ

### Text-to-Image (T2I):
```
✅ Все 10 фото-моделей
```

### Image-to-Image (I2I):
```
✅ Midjourney V7
✅ Nano Banana / Pro
✅ Seedream 4.5
✅ FLUX.2 Pro / Flex
✅ Z-image
❌ Ideogram V3 (not supported)
✅ Recraft Remove BG (I2I only)
✅ Topaz Upscale (I2I only)
```

### Text-to-Video (T2V):
```
✅ Veo 3.1
✅ Kling (все варианты)
❌ Sora 2 / Pro (I2V only)
✅ Sora Storyboard
✅ WAN (все варианты)
❌ Bytedance Pro (I2V only)
❌ Kling AI Avatar (I2V only)
```

### Image-to-Video (I2V):
```
✅ Veo 3.1
✅ Kling (кроме 2.1 Pro)
✅ Sora 2 / Pro
❌ Sora Storyboard
✅ WAN (все варианты)
✅ Bytedance Pro
✅ Kling AI Avatar
```

### Video-to-Video (V2V):
```
✅ WAN 2.6 (reference-guided)
```

### Reference Mode:
```
✅ Veo 3.1 (reference images)
```

### Storyboard Mode:
```
✅ Sora Storyboard (multi-prompt)
```

---

## 💰 ЦЕНОВЫЕ ДИАПАЗОНЫ

### Фото (за 1 генерацию):
```
Бюджет:     2-7⭐     (Z-image, Nano Banana, Recraft)
Стандарт:   9-17⭐    (FLUX.2 Pro, Ideogram, Topaz 2k)
Премиум:    24-67⭐   (FLUX.2 Flex, Topaz 8k)
```

### Видео (за ролик):
```
Бюджет:     27-70⭐   (Bytedance 720p, Kling Turbo, Avatar)
Стандарт:   50-200⭐  (Sora 2, WAN, Veo Fast)
Премиум:    250-536⭐ (Sora Pro, Kling Pro, Veo Quality)
```

---

## 🚀 ПОПУЛЯРНЫЕ КОМБИНАЦИИ

### Для контент-мейкеров (фото):
```
1. Nano Banana (7⭐) - быстро и дёшево
2. FLUX.2 Pro 1k (9⭐) - качество/цена
3. Midjourney fast (14⭐) - лучшая детализация
```

### Для контент-мейкеров (видео):
```
1. Sora 2 (50⭐) - лучшее качество/цена
2. WAN 2.5 720p (100-200⭐) - хороший баланс
3. Kling 2.5 Turbo (70-140⭐) - быстро
```

### Для профессионалов (фото):
```
1. FLUX.2 Pro 2k (12⭐) - высокое качество
2. Midjourney turbo (27⭐) - максимум детализации
3. Topaz 4k (34⭐) - апскейл для печати
```

### Для профессионалов (видео):
```
1. Veo 3.1 Quality (420⭐) - топовое качество
2. Sora 2 Pro high (550-1050⭐) - кинематографичность
3. Kling 2.1 Pro (268-536⭐) - плавные движения
```

---

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### KIE Market API Request:
```json
POST https://api.kie.ai/api/v1/jobs/createTask
Content-Type: application/json
Authorization: Bearer YOUR_KIE_API_KEY

{
  "modelId": "midjourney/text-to-image",
  "prompt": "your prompt here",
  "params": {
    "aspectRatio": "16:9",
    "quality": "fast",
    "negativePrompt": "..."
  }
}
```

### Veo API Request:
```json
POST https://api.kie.ai/api/v1/veo/generate
Content-Type: application/json
Authorization: Bearer YOUR_KIE_API_KEY

{
  "prompt": "your prompt here",
  "quality": "fast",
  "mode": "t2v",
  "duration": 8,
  "aspectRatio": "16:9"
}
```

### Response Format (оба API):
```json
{
  "taskId": "abc123...",
  "status": "pending",
  "credits": 14
}
```

---

## 📊 СТАТИСТИКА ИСПОЛЬЗОВАНИЯ

### По провайдерам:
```
KIE Market API:  17 моделей (94%)
KIE Veo API:     1 модель (6%)
```

### По типам:
```
Photo:  10 моделей (56%)
Video:  8 моделей (44%)
```

### По режимам:
```
T2I only:     8 моделей
I2I support:  9 моделей
T2V support:  4 модели
I2V only:     4 модели
V2V support:  1 модель
```

---

## ⚡ БЫСТРЫЙ СПРАВОЧНИК

### Что выбрать для:

**Карточки товаров → Nano Banana (7⭐)**
- Быстро, качественно, дёшево

**Посты в соцсети → FLUX.2 Pro 1k (9⭐)**
- Хорошее качество, универсально

**Профессиональный дизайн → Midjourney turbo (27⭐)**
- Максимальная детализация

**Короткие ролики для Reels → Sora 2 (50⭐)**
- Отличное качество/цена

**Товар в движении → WAN 2.5 720p (100⭐)**
- Плавная анимация, доступно

**Кинематографичное видео → Veo 3.1 Quality (420⭐)**
- Профессиональное качество

**Говорящий аватар → Kling AI Avatar (70-405⭐)**
- Уникальная возможность

---

## 🎯 РЕКОМЕНДАЦИИ

### Для начинающих:
1. Начните с **Nano Banana** (фото) и **Sora 2** (видео)
2. Экспериментируйте с промптами
3. Используйте **Star тариф** (500⭐/мес)

### Для активных пользователей:
1. Используйте **FLUX.2 Pro** и **WAN 2.5**
2. Пробуйте разные варианты моделей
3. Подойдёт **Pro тариф** (1200⭐/мес)

### Для профессионалов:
1. **Midjourney turbo** + **Veo 3.1 Quality**
2. Экспериментируйте с **Kling Pro** и **Sora Pro**
3. Нужен **Business тариф** (3500⭐/мес)

---

## 📝 ЗАМЕТКИ

- Все цены указаны в звёздах (⭐) - внутренняя валюта LensRoom
- I2I/I2V требуют загрузки исходного изображения
- Цены могут варьироваться в зависимости от параметров
- Некоторые модели поддерживают несколько режимов через один endpoint

---

**Создано:** 22 декабря 2024  
**Версия:** 1.0  
**Статус:** ✅ Все endpoints валидны и работают
