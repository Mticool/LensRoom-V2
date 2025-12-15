# Veo 3.1 API Integration Guide

Документация по интеграции Veo 3.1 API от KIE.ai в проект LensRoom.

## 📋 Содержание

- [Настройка](#настройка)
- [Модели](#модели)
- [API методы](#api-методы)
- [Примеры использования](#примеры-использования)
- [Webhook интеграция](#webhook-интеграция)
- [Получение 1080p версии](#получение-1080p-версии)

---

## 🔧 Настройка

### 1. API ключ

Зарегистрируйся на [kie.ai](https://kie.ai) и получи API ключ на странице [API Keys](https://kie.ai/api-key).

### 2. Environment Variables

Добавь в `.env.local`:

```env
# KIE.ai API
KIE_API_KEY=sk-your-api-key-here

# Veo Webhook (опционально)
VEO_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_APP_URL=https://lensroom.ru
```

---

## 🎯 Модели

Veo 3.1 имеет две модели:

| Модель | ID | Описание | Скорость | Цена (⭐) |
|--------|---|----------|----------|-----------|
| **Veo 3.1** | `veo3` | Максимальное качество, кинематографический реализм | ~3-5 мин | 400 за 8с |
| **Veo 3.1 Fast** | `veo3_fast` | Быстрая генерация, высокое качество | ~1-2 мин | 80 за 8с |

### Поддерживаемые режимы

- ✅ **Text-to-Video** (`t2v`) - генерация из текста
- ✅ **Image-to-Video** (`i2v`) - анимация изображения

### Aspect Ratios

- `16:9` - горизонтальное (рекомендуется)
- `9:16` - вертикальное
- `1:1` - квадратное

---

## 🔌 API методы

### 1. Генерация видео

```typescript
const response = await kieClient.veoGenerate({
  prompt: 'A serene mountain landscape at sunset',
  model: 'veo3', // или 'veo3_fast'
  aspectRatio: '16:9',
  enhancePrompt: true,
  // Для i2v:
  imageUrls: ['https://example.com/image.jpg'],
  // Для webhook:
  callBackUrl: 'https://lensroom.ru/api/webhooks/veo?secret=xxx',
});

const taskId = response.data.taskId;
```

### 2. Проверка статуса

```typescript
const status = await kieClient.veoGetStatus(taskId);

console.log('Status:', status.data.successFlag);
// 0 = processing
// 1 = success
// 2 = failed
// 3 = invalid

if (status.data.successFlag === 1) {
  const videoUrls = status.data.info?.resultUrls || [];
  console.log('Videos:', videoUrls);
}
```

### 3. Ожидание завершения

```typescript
// Автоматически опрашивает статус каждые 30 секунд
const videoUrls = await kieClient.veoWaitForCompletion(
  taskId,
  10 * 60 * 1000, // timeout: 10 минут
  30 * 1000 // polling interval: 30 секунд
);

console.log('Generated videos:', videoUrls);
```

### 4. Получение 1080p версии

```typescript
const hd = await kieClient.veoGet1080p(taskId);

if (hd.data.video1080pUrl) {
  console.log('1080p URL:', hd.data.video1080pUrl);
}
```

---

## 📝 Примеры использования

### Text-to-Video

```typescript
import { kieClient } from '@/lib/api/kie-client';

async function generateVideo() {
  // 1. Создать задачу
  const response = await kieClient.veoGenerate({
    prompt: 'A serene mountain landscape at sunset, with clouds moving across the sky',
    model: 'veo3',
    aspectRatio: '16:9',
    enhancePrompt: true,
  });

  const taskId = response.data.taskId;

  // 2. Дождаться завершения
  const videoUrls = await kieClient.veoWaitForCompletion(taskId);

  // 3. Получить 1080p
  const hd = await kieClient.veoGet1080p(taskId);

  return {
    videos: videoUrls,
    hd: hd.data.video1080pUrl,
  };
}
```

### Image-to-Video

```typescript
async function animateImage(imageUrl: string) {
  const response = await kieClient.veoGenerate({
    prompt: 'Animate this scene with gentle camera movement',
    model: 'veo3_fast', // Быстрая версия
    aspectRatio: '16:9',
    imageUrls: [imageUrl],
    enhancePrompt: true,
  });

  const videoUrls = await kieClient.veoWaitForCompletion(response.data.taskId);
  return videoUrls[0];
}
```

### Использование через API endpoint

```typescript
// POST /api/generate/video
const response = await fetch('/api/generate/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'veo-3.1-quality', // или 'veo-3.1-fast'
    prompt: 'A serene mountain landscape at sunset',
    mode: 't2v', // или 'i2v'
    aspectRatio: '16:9',
    // Для i2v:
    referenceImage: 'https://example.com/image.jpg',
  }),
});

const { jobId, status } = await response.json();

// Проверить статус
const statusResponse = await fetch(`/api/jobs/${jobId}`);
const { status, outputs } = await statusResponse.json();
```

---

## 🔔 Webhook интеграция

### 1. Настройка webhook

Webhook автоматически настраивается если заданы `NEXT_PUBLIC_APP_URL` и `VEO_WEBHOOK_SECRET`:

```env
NEXT_PUBLIC_APP_URL=https://lensroom.ru
VEO_WEBHOOK_SECRET=your-secret-key-here
```

### 2. Endpoint

KIE.ai будет отправлять POST запросы на:
```
https://lensroom.ru/api/webhooks/veo?secret=your-secret-key-here
```

### 3. Payload

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123",
    "info": {
      "successFlag": 1,
      "resultUrls": [
        "https://example.com/video1.mp4"
      ]
    }
  }
}
```

### 4. Обработка

Webhook автоматически обновляет запись в БД:
- Статус генерации → `completed` или `failed`
- Сохраняет URL видео в `result_urls`
- Записывает время завершения в `completed_at`

---

## 🎬 Получение 1080p версии

Для видео в формате `16:9` доступна 1080p версия:

### API endpoint

```bash
GET /api/jobs/veo/[taskId]/1080p
```

### Использование

```typescript
const response = await fetch(`/api/jobs/veo/${taskId}/1080p`);
const { video1080pUrl, status } = await response.json();

if (video1080pUrl) {
  console.log('HD video ready:', video1080pUrl);
} else {
  console.log('Still processing, status:', status);
}
```

### Примечания

- 1080p версия генерируется **после** основного видео
- Может потребоваться дополнительное время (~1-2 минуты)
- Доступна только для `aspectRatio: "16:9"`

---

## 🚀 Быстрый старт

### 1. Через UI

1. Открой https://lensroom.ru/create/video
2. Выбери **Veo 3.1** или **Veo 3.1 Fast**
3. Введи промпт
4. Выбери режим (Text-to-Video или Image-to-Video)
5. Нажми "Сгенерировать"

### 2. Через код

```typescript
import { kieClient } from '@/lib/api/kie-client';

// Быстрый способ
const videoUrls = await kieClient
  .veoGenerate({
    prompt: 'Your prompt here',
    model: 'veo3_fast',
    aspectRatio: '16:9',
  })
  .then(res => kieClient.veoWaitForCompletion(res.data.taskId));

console.log('Videos:', videoUrls);
```

---

## 📚 Дополнительные ресурсы

- [KIE.ai Documentation](https://docs.kie.ai)
- [Veo 3.1 Quickstart](https://docs.kie.ai/veo3-api/quickstart)
- [API Reference](https://docs.kie.ai/veo3-api/api-reference)

---

## ⚠️ Важные примечания

1. **Pricing**: Veo 3.1 требует premium подписку на KIE.ai
2. **Duration**: Видео генерируются ~8 секунд длиной
3. **Timeout**: Установи достаточный timeout (минимум 10 минут)
4. **Webhook**: Использование webhook **рекомендуется** для production
5. **1080p**: Доступна только для 16:9 видео

---

Готово! 🎉 Veo 3.1 полностью интегрирован в LensRoom.
