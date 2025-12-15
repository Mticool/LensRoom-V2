# KieClient - Complete Guide

Полная документация по классу `KieClient` для работы с Kie.ai API.

## 📋 Содержание

- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Модели](#модели)
- [Core методы](#core-методы)
- [Helper методы](#helper-методы)
- [Production примеры](#production-примеры)
- [Webhook интеграция](#webhook-интеграция)
- [Тестирование](#тестирование)

---

## 🔧 Установка

### 1. Environment Variables

```env
# .env.local
KIE_API_KEY=sk-your-api-key-here

# For webhook (optional)
KIE_WEBHOOK_SECRET=your-webhook-secret
VEO_WEBHOOK_SECRET=your-veo-webhook-secret
NEXT_PUBLIC_APP_URL=https://lensroom.ru
```

### 2. Импорт

```typescript
import { KieClient, KiePhotoModel, KieVideoModel } from '@/lib/api/kie-client-extended';

const client = new KieClient(process.env.KIE_API_KEY);
```

---

## 🚀 Быстрый старт

### Text to Image

```typescript
// Создать задачу
const response = await client.textToImage({
  model: KiePhotoModel.NANO_BANANA,
  prompt: 'A serene mountain landscape at sunset',
  aspectRatio: '16:9',
  resolution: '1K',
});

console.log('Task created:', response.data.taskId);

// Дождаться результата
const result = await client.waitForResult(response.data.taskId);
console.log('Generated images:', result.resultUrls);
```

### Text to Video

```typescript
// Veo 3.1
const response = await client.textToVideo({
  model: KieVideoModel.VEO_3_FAST,
  prompt: 'Ocean waves at sunset, cinematic',
  aspectRatio: '16:9',
});

// Дождаться результата
const videos = await client.veoWaitForResult(response.data.taskId);
console.log('Generated videos:', videos);
```

---

## 📦 Модели

### Photo Models

```typescript
export enum KiePhotoModel {
  // ✅ Available (tested)
  NANO_BANANA = 'google/nano-banana',
  IMAGEN_4 = 'google/imagen4',
  
  // ⭐ Premium (require subscription)
  SEEDREAM_45 = 'seedream/4.5-text-to-image',
  FLUX_2_PRO = 'flux/2-pro-text-to-image',
  NANO_BANANA_PRO = 'google/nano-banana-pro',
  Z_IMAGE = 'z-image/text-to-image',
  IDEOGRAM_V3 = 'ideogram/v3-text-to-image',
  QWEN_IMAGE_EDIT = 'qwen/image-edit',
}
```

### Video Models

```typescript
export enum KieVideoModel {
  // ✅ Veo (separate API)
  VEO_3 = 'veo3',
  VEO_3_FAST = 'veo3_fast',
  
  // ✅ Available (Market API)
  KLING_2_6_T2V = 'kling-2.6/text-to-video',
  KLING_2_6_I2V = 'kling-2.6/image-to-video',
  SORA_2_I2V = 'sora-2-image-to-video',
  SORA_2_PRO_I2V = 'sora-2-pro-image-to-video',
  SORA_2_PRO_STORYBOARD = 'sora-2-pro-storyboard',
  
  // ⭐ Premium
  BYTEDANCE_V1_PRO = 'bytedance/v1-pro-image-to-video',
}
```

---

## 🔌 Core методы

### createTask

Создать новую задачу генерации.

```typescript
const response = await client.createTask({
  model: 'google/nano-banana',
  input: {
    prompt: 'Mountain landscape',
    aspect_ratio: '16:9',
    resolution: '1K',
  },
  callBackUrl: 'https://lensroom.ru/api/webhooks/kie?secret=xxx', // optional
});

// Response
{
  code: 200,
  msg: 'success',
  data: {
    taskId: 'abc123...',
    recordId: 'abc123...',
  }
}
```

### getTaskInfo

Получить информацию о задаче.

```typescript
const info = await client.getTaskInfo(taskId);

// Response
{
  data: {
    taskId: 'abc123',
    model: 'google/nano-banana',
    state: 'success', // waiting | queuing | generating | success | fail
    resultJson: '{"resultUrls":["https://..."]}',
    costTime: 5000,
    completeTime: 1234567890,
  }
}
```

### waitForResult

Дождаться результата с автоматическим polling.

```typescript
const result = await client.waitForResult(
  taskId,
  5 * 60 * 1000, // maxWaitMs (default: 5 minutes)
  5000 // pollIntervalMs (default: 5 seconds)
);

// Response
{
  taskId: 'abc123',
  status: 'completed',
  resultUrls: ['https://...', 'https://...'],
  metadata: {
    model: 'google/nano-banana',
    costTime: 5000,
    completeTime: 1234567890,
  }
}
```

### Veo методы

```typescript
// Generate
const response = await client.veoGenerate({
  prompt: 'Ocean waves',
  model: 'veo3_fast',
  aspectRatio: '16:9',
  enhancePrompt: true,
  imageUrls: ['https://...'], // for i2v
});

// Get status
const status = await client.veoGetStatus(taskId);
// successFlag: 0=processing, 1=success, 2=failed, 3=invalid

// Wait for result
const videos = await client.veoWaitForResult(taskId);

// Get 1080p (for 16:9 videos)
const hd = await client.veoGet1080p(taskId);
console.log('1080p URL:', hd.video1080pUrl);
```

---

## 🎨 Helper методы

### Text to Image

```typescript
const response = await client.textToImage({
  model: KiePhotoModel.NANO_BANANA,
  prompt: 'A serene mountain landscape at sunset',
  aspectRatio: '16:9',
  resolution: '1K', // 1K | 2K | 4K
  outputFormat: 'png', // png | jpg
  quality: 'fast', // fast | ultra
  callBackUrl: 'https://...',
});
```

### Image to Image

```typescript
const response = await client.imageToImage({
  model: KiePhotoModel.QWEN_IMAGE_EDIT,
  prompt: 'Add autumn colors',
  imageUrls: ['https://...'],
  aspectRatio: '16:9',
  callBackUrl: 'https://...',
});
```

### Text to Video

```typescript
// Veo
const response = await client.textToVideo({
  model: KieVideoModel.VEO_3_FAST,
  prompt: 'Ocean waves, cinematic',
  aspectRatio: '16:9',
  callBackUrl: 'https://...',
});

// Kling
const response = await client.textToVideo({
  model: KieVideoModel.KLING_2_6_T2V,
  prompt: 'Mountain landscape',
  duration: '5', // 5 | 10
  aspectRatio: '16:9',
  sound: false,
  callBackUrl: 'https://...',
});
```

### Image to Video

```typescript
// Veo
const response = await client.imageToVideo({
  model: KieVideoModel.VEO_3,
  prompt: 'Animate with camera movement',
  imageUrl: 'https://...',
  aspectRatio: '16:9',
  callBackUrl: 'https://...',
});

// Sora
const response = await client.imageToVideo({
  model: KieVideoModel.SORA_2_I2V,
  prompt: 'Add motion',
  imageUrl: 'https://...',
  duration: '10', // 10 | 15
  aspectRatio: 'landscape', // portrait | landscape
  callBackUrl: 'https://...',
});
```

---

## 🏭 Production примеры

### 1. Параллельная генерация

```typescript
// Запустить несколько задач параллельно
const tasks = await Promise.all([
  client.textToImage({
    model: KiePhotoModel.NANO_BANANA,
    prompt: 'Mountain sunset',
    aspectRatio: '16:9',
  }),
  client.textToImage({
    model: KiePhotoModel.IMAGEN_4,
    prompt: 'Ocean waves',
    aspectRatio: '16:9',
  }),
  client.textToVideo({
    model: KieVideoModel.VEO_3_FAST,
    prompt: 'City timelapse',
    aspectRatio: '16:9',
  }),
]);

// Дождаться всех результатов
const results = await Promise.all(
  tasks.map(t => client.waitForResult(t.data.taskId))
);

console.log('All completed!', results);
```

### 2. Retry логика

```typescript
async function generateWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

// Usage
const result = await generateWithRetry(() => 
  client.textToImage({
    model: KiePhotoModel.NANO_BANANA,
    prompt: 'Test',
    aspectRatio: '1:1',
  })
);
```

### 3. Rate limiting

```typescript
class RateLimitedClient {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxConcurrent = 3;
  
  constructor(private client: KieClient) {}
  
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxConcurrent);
      await Promise.all(batch.map(fn => fn()));
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }
    
    this.processing = false;
  }
}

// Usage
const rateLimitedClient = new RateLimitedClient(client);

const results = await Promise.all([
  rateLimitedClient.enqueue(() => client.textToImage({...})),
  rateLimitedClient.enqueue(() => client.textToImage({...})),
  rateLimitedClient.enqueue(() => client.textToImage({...})),
]);
```

---

## 🔔 Webhook интеграция

### Express Webhook Server

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// KIE Market API webhook
app.post('/api/webhooks/kie', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.KIE_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { taskId, status, resultUrls, error } = req.body;

  if (status === 'completed') {
    // Save to database
    await updateDB(taskId, {
      status: 'completed',
      result_urls: resultUrls,
      completed_at: new Date(),
    });
    
    // Notify user
    await notifyUser(taskId, resultUrls);
  } else if (status === 'failed') {
    await updateDB(taskId, { status: 'failed', error });
    await refundCredits(taskId);
  }

  res.json({ status: 'received' });
});

// Veo webhook
app.post('/api/webhooks/veo', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.VEO_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { data } = req.body;
  const taskId = data?.taskId;
  const successFlag = data?.info?.successFlag;
  const resultUrls = data?.info?.resultUrls || [];

  if (successFlag === 1) {
    await updateDB(taskId, {
      status: 'completed',
      result_urls: resultUrls,
    });
    
    // Try to get 1080p after 1 minute
    setTimeout(async () => {
      const hd = await client.veoGet1080p(taskId);
      if (hd.video1080pUrl) {
        await updateDB(taskId, { hd_url: hd.video1080pUrl });
      }
    }, 60000);
  }

  res.json({ status: 'received' });
});

app.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

### Next.js API Routes

```typescript
// app/api/webhooks/kie/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.KIE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { taskId, status, resultUrls } = body;

  // Process webhook...

  return NextResponse.json({ status: 'received' });
}
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Run all tests
npm run test:kie

# Run specific test
npm run test:kie -- text-to-image

# Run with verbose output
DEBUG=kie:* npm run test:kie
```

### Test Suite

Файл: `src/tests/kie-client.test.ts`

Тесты включают:
- ✅ Client initialization
- ✅ Get credits
- ✅ Text to Image (Nano Banana, Imagen 4)
- ✅ Text to Video (Veo 3.1, Veo 3.1 Fast)
- ✅ Image to Video (Sora 2)
- ✅ Wait for result
- ✅ Get task info
- ✅ Veo get status

### Пример вывода

```
============================================================
KIE CLIENT TEST SUITE
============================================================

📝 Client initialization
   ✅ Passed (234ms)

📝 Get account credits
   Credits: 1234.5
   ✅ Passed (156ms)

📝 Text to Image - Nano Banana
   Task ID: abc123...
   ✅ Passed (890ms)

📝 Text to Video - Veo 3.1 Fast
   Task ID: def456...
   ✅ Passed (1245ms)

============================================================
TEST SUMMARY
============================================================

Total: 12 | Passed: 10 | Failed: 0 | Skipped: 2
```

---

## 📊 Поддерживаемые модели (сводка)

| Модель | Доступность | Тип | Режимы |
|--------|-------------|-----|--------|
| **Nano Banana** | ✅ Работает | Photo | t2i, i2i |
| **Imagen 4** | ✅ Работает | Photo | t2i |
| **Veo 3.1** | ✅ Работает | Video | t2v, i2v |
| **Veo 3.1 Fast** | ✅ Работает | Video | t2v, i2v |
| **Kling 2.6** | ⭐ Premium | Video | t2v, i2v |
| **Sora 2** | ✅ Работает | Video | i2v |
| **Seedream 4.5** | ⭐ Premium | Photo | t2i |
| **FLUX.2 Pro** | ⭐ Premium | Photo | t2i |

---

## 🔗 Ссылки

- [KIE.ai Documentation](https://docs.kie.ai)
- [API Reference](https://docs.kie.ai/api-reference)
- [Model Pricing](https://kie.ai/pricing)

---

## 💡 Советы

1. **Используйте callback URL** для production вместо polling
2. **Кэшируйте результаты** чтобы не генерировать одно и то же
3. **Добавьте rate limiting** чтобы не превысить лимиты API
4. **Проверяйте credits** перед генерацией
5. **Для Veo 16:9** запрашивайте 1080p версию через минуту после завершения

---

Готово! 🎉 Полный класс `KieClient` готов к использованию.
