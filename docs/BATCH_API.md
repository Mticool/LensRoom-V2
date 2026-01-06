# Batch Generation API

## 📝 Описание

API endpoints для массовой обработки изображений (batch generation).

## 🎯 Два варианта реализации

### Вариант 1: Последовательная обработка (текущий)

**Используется:** Существующий endpoint `/api/generate/photo`  
**Подход:** Клиент отправляет каждое изображение отдельным запросом  
**Преимущества:**
- ✅ Не требует изменений API
- ✅ Простая реализация
- ✅ Работает прямо сейчас

**Недостатки:**
- ❌ Множество HTTP запросов
- ❌ Нет единой транзакции
- ❌ Сложнее отменить всю batch операцию

### Вариант 2: Batch endpoint (оптимизированный)

**Новый endpoint:** `/api/generate/batch`  
**Подход:** Один запрос с массивом изображений  
**Преимущества:**
- ✅ Один HTTP запрос
- ✅ Атомарная операция (списание кредитов один раз)
- ✅ Возможность параллельной обработки
- ✅ Отслеживание прогресса batch

**Недостатки:**
- ❌ Требует реализации очереди для продакшена
- ❌ Более сложная логика

---

## 🔌 API Endpoints

### 1. POST /api/generate/batch

**Создать batch задачу**

#### Request:

```typescript
POST /api/generate/batch
Content-Type: application/json

{
  "prompt": "Add white background",
  "model": "flux-2",
  "quality": "1k",
  "aspectRatio": "1:1",
  "negativePrompt": "blur, distortion",
  "images": [
    {
      "id": "client-id-1",
      "data": "data:image/png;base64,..."
    },
    {
      "id": "client-id-2",
      "data": "data:image/png;base64,..."
    }
  ]
}
```

**Параметры:**
- `prompt` (string, required) - промпт для всех изображений
- `model` (string, required) - ID модели (должна поддерживать i2i)
- `images` (array, required) - массив изображений (макс 50)
  - `id` - ID изображения на клиенте
  - `data` - base64 dataURL
- `quality` (string, optional) - качество генерации
- `aspectRatio` (string, optional) - соотношение сторон
- `negativePrompt` (string, optional) - негативный промпт

#### Response (Success):

```json
{
  "batchId": "batch_1704885600000_abc123",
  "jobs": [
    {
      "clientId": "client-id-1",
      "generationId": "gen_123"
    },
    {
      "clientId": "client-id-2",
      "generationId": "gen_124"
    }
  ],
  "totalCost": 6,
  "status": "queued",
  "message": "Queued 2 images for processing"
}
```

#### Response (Error - Insufficient Credits):

```json
{
  "error": "Insufficient credits",
  "required": 30,
  "available": 15
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid params)
- `402` - Insufficient Credits
- `500` - Internal Server Error

---

### 2. GET /api/generate/batch

**Проверить статус batch обработки**

#### Request:

```
GET /api/generate/batch?jobIds=gen_123,gen_124
```

**Query Parameters:**
- `jobIds` (string, required) - comma-separated список generation IDs
- `batchId` (string, optional) - ID batch для логирования

#### Response:

```json
{
  "batchId": "batch_1704885600000_abc123",
  "results": [
    {
      "generationId": "gen_123",
      "status": "success",
      "imageUrl": "https://...",
      "error": null
    },
    {
      "generationId": "gen_124",
      "status": "processing",
      "imageUrl": null,
      "error": null
    }
  ],
  "summary": {
    "total": 2,
    "pending": 0,
    "completed": 1,
    "failed": 0
  },
  "isComplete": false
}
```

**Возможные статусы:**
- `pending` - в очереди
- `processing` - обрабатывается
- `success` - готово
- `failed` - ошибка

---

## 💻 Client Implementation

### Вариант 1: Последовательная обработка

```typescript
async function generateBatch(images: UploadedImage[], prompt: string, settings: any) {
  const results = [];
  
  for (let i = 0; i < images.length; i++) {
    try {
      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model,
          prompt,
          mode: 'i2i',
          referenceImage: images[i].preview,
          quality: settings.quality,
          aspectRatio: settings.size,
        }),
      });

      const data = await response.json();
      results.push({ success: true, data });
      
      // Обновить UI
      onProgress?.(i + 1, images.length);
      
    } catch (error) {
      results.push({ success: false, error });
    }
  }
  
  return results;
}
```

### Вариант 2: Batch endpoint с polling

```typescript
async function generateBatch(images: UploadedImage[], prompt: string, settings: any) {
  // 1. Создать batch задачу
  const response = await fetch('/api/generate/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: settings.model,
      quality: settings.quality,
      aspectRatio: settings.size,
      images: images.map(img => ({
        id: img.id,
        data: img.preview,
      })),
    }),
  });

  const { batchId, jobs } = await response.json();
  const jobIds = jobs.map(j => j.generationId).join(',');

  // 2. Polling статуса
  const results = await pollBatchStatus(batchId, jobIds);
  return results;
}

async function pollBatchStatus(
  batchId: string,
  jobIds: string,
  maxAttempts = 120
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/generate/batch?batchId=${batchId}&jobIds=${jobIds}`);
    const data = await response.json();

    // Обновить прогресс
    const { completed, total } = data.summary;
    onProgress?.(completed, total);

    if (data.isComplete) {
      return data.results;
    }

    // Подождать перед следующей проверкой
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Batch timeout');
}
```

---

## 🏗️ Infrastructure для Production

### Очередь задач (рекомендуется)

Для продакшена batch обработка должна использовать систему очередей:

**Варианты:**
1. **BullMQ** (Redis) - рекомендуется
2. **AWS SQS** + Lambda
3. **Google Cloud Tasks**
4. **Vercel Edge Functions** + Upstash

**Пример с BullMQ:**

```typescript
import { Queue, Worker } from 'bullmq';

// Создать очередь
const imageQueue = new Queue('image-generation', {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379,
  },
});

// Добавить задачи
for (const image of images) {
  await imageQueue.add('generate', {
    generationId: image.generationId,
    prompt,
    modelId,
    referenceImage: image.data,
  });
}

// Worker для обработки
const worker = new Worker('image-generation', async (job) => {
  const { generationId, prompt, modelId, referenceImage } = job.data;
  
  // Генерация
  const result = await kieClient.generateImage({
    model: modelId,
    prompt,
    referenceImage,
    mode: 'i2i',
  });
  
  // Сохранить результат
  await supabase
    .from('generations')
    .update({
      status: 'success',
      result_urls: [result.imageUrl],
    })
    .eq('id', generationId);
});
```

---

## 💰 Pricing & Credits

### Списание кредитов

**Вариант 1 (последовательная):**
- Списывается при каждом запросе
- Если один запрос fails - остальные продолжаются
- Частичный возврат не требуется

**Вариант 2 (batch endpoint):**
- Списывается ВСЯ сумма сразу
- Если batch fails - нужен возврат кредитов
- Более сложная логика, но атомарная

### Расчёт стоимости

```typescript
const pricePerImage = computePrice(modelId, { quality }).stars;
const totalCost = pricePerImage * images.length;

// Пример
// 10 images × FLUX.2 (3⭐) = 30⭐
```

---

## 🧪 Тестирование

### Тест batch endpoint

```bash
curl -X POST http://localhost:3000/api/generate/batch \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=..." \
  -d '{
    "prompt": "Add white background",
    "model": "flux-2",
    "images": [
      {
        "id": "test-1",
        "data": "data:image/png;base64,iVBORw0KG..."
      }
    ]
  }'
```

### Проверить статус

```bash
curl "http://localhost:3000/api/generate/batch?jobIds=gen_123,gen_124"
```

---

## 📊 База данных

**Текущая схема:**
```sql
-- Каждое изображение = отдельная запись
SELECT * FROM generations 
WHERE user_id = '...' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Опционально: добавить batch_id**
```sql
ALTER TABLE generations 
ADD COLUMN batch_id TEXT;

-- Найти все изображения из одного batch
SELECT * FROM generations 
WHERE batch_id = 'batch_123';
```

---

## 🎯 Рекомендации

### Для MVP:
✅ **Используйте Вариант 1** (последовательная обработка)
- Работает прямо сейчас
- Не требует инфраструктуры
- Достаточно для небольших batch (до 10 изображений)

### Для Scale:
✅ **Переходите на Вариант 2** (batch endpoint + очередь)
- Когда нужна обработка 50+ изображений
- Когда важна скорость (параллельная обработка)
- Когда нужна надёжность (retry, monitoring)

---

**Файлы:**
- `/src/app/api/generate/batch/route.ts` - batch endpoint
- `/src/components/generator-v2/GeneratorV2.tsx` - client logic









