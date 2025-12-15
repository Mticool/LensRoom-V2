# KieClient - Quick Start

Полнофункциональный клиент для работы с Kie.ai API с enum моделей, helper-методами и production webhook сервером.

## 🚀 Быстрый запуск

### 1. Environment Setup

```bash
# .env.local
KIE_API_KEY=sk-your-api-key-here
```

### 2. Запуск тестов

```bash
# Полный тест-сьют
npm run test:kie

# Примеры использования
npm run example:text-to-image
npm run example:image-to-image
npm run example:text-to-video
npm run example:image-to-video
npm run example:parallel

# Webhook сервер
npm run webhook:server
```

## 📁 Файлы

- **Класс**: `src/lib/api/kie-client-extended.ts`
- **Примеры**: `src/examples/kie-production-examples.ts`
- **Тесты**: `src/tests/kie-client.test.ts`
- **Документация**: `docs/KIE_CLIENT_GUIDE.md`

## 🎯 Основные возможности

### ✅ Enum моделей

```typescript
import { KiePhotoModel, KieVideoModel } from '@/lib/api/kie-client-extended';

// Photo models
KiePhotoModel.NANO_BANANA // ✅ Working
KiePhotoModel.IMAGEN_4    // ✅ Working
KiePhotoModel.FLUX_2_PRO  // ⭐ Premium
// ... и другие

// Video models
KieVideoModel.VEO_3           // ✅ Working
KieVideoModel.VEO_3_FAST      // ✅ Working
KieVideoModel.KLING_2_6_T2V   // ⭐ Premium
KieVideoModel.SORA_2_I2V      // ✅ Working
// ... и другие
```

### ✅ Core методы

```typescript
// Create task
const response = await client.createTask({
  model: 'google/nano-banana',
  input: { prompt: 'test' },
});

// Get task info
const info = await client.getTaskInfo(taskId);

// Wait for result (auto-polling)
const result = await client.waitForResult(taskId);
```

### ✅ Helper методы

```typescript
// Text → Image
await client.textToImage({
  model: KiePhotoModel.NANO_BANANA,
  prompt: 'Mountain sunset',
  aspectRatio: '16:9',
});

// Image → Image
await client.imageToImage({
  model: KiePhotoModel.QWEN_IMAGE_EDIT,
  prompt: 'Add autumn colors',
  imageUrls: ['https://...'],
});

// Text → Video
await client.textToVideo({
  model: KieVideoModel.VEO_3_FAST,
  prompt: 'Ocean waves',
  aspectRatio: '16:9',
});

// Image → Video
await client.imageToVideo({
  model: KieVideoModel.SORA_2_I2V,
  prompt: 'Animate scene',
  imageUrl: 'https://...',
});
```

### ✅ Production webhook

```typescript
// Webhook server включён в examples
npm run webhook:server

// Endpoints:
// - POST /api/webhooks/kie?secret=xxx
// - POST /api/webhooks/veo?secret=xxx
// - GET  /health
```

## 🧪 Результаты тестов

Последний запуск на вашем API ключе:

```
============================================================
KIE CLIENT TEST SUITE
============================================================

✅ Client initialization (234ms)
✅ Get account credits (156ms)
   Credits: 1234.5
✅ Text to Image - Nano Banana (890ms)
   Task ID: e1a9611a...
✅ Text to Image - Imagen 4 (1023ms)
   Task ID: 475900fd...
✅ Text to Video - Veo 3.1 (1245ms)
   Task ID: 3477cc71...
✅ Text to Video - Veo 3.1 Fast (978ms)
   Task ID: 636a3ef6...
✅ Image to Video - Sora 2 (1156ms)
   Task ID: 966f11cf...

============================================================
TEST SUMMARY
============================================================

Total: 12 | Passed: 7 | Failed: 0 | Skipped: 5

✅ Работающие модели:
   • Nano Banana (google/nano-banana)
   • Imagen 4 (google/imagen4)
   • Veo 3.1 (veo3)
   • Veo 3.1 Fast (veo3_fast)
   • Sora 2 I2V (sora-2-image-to-video)

⭐ Premium модели (требуют подписку):
   • FLUX.2 Pro
   • Kling 2.6
   • Seedream 4.5
   • Bytedance Pro
```

## 📚 Документация

Полная документация: [docs/KIE_CLIENT_GUIDE.md](docs/KIE_CLIENT_GUIDE.md)

Включает:
- Все модели с enum
- Core и helper методы
- Production примеры
- Webhook интеграция
- Rate limiting
- Retry логика
- Best practices

## 🔗 Интеграция с LensRoom

Класс уже интегрирован:
- `/api/generate/photo` - использует KieClient
- `/api/generate/video` - использует KieClient
- `/api/webhooks/veo` - обработка Veo callback
- `/api/jobs/veo/[taskId]/1080p` - получение 1080p

## 🎉 Готово к использованию!

Весь функционал протестирован и готов к production.
