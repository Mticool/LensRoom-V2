# 🚀 KIE.AI Integration Guide

**Status**: ✅ **PRODUCTION READY**  
**Date**: 15 декабря 2025  
**Version**: 1.0.0

---

## 📋 **Overview**

Полная интеграция KIE.ai API для генерации фото и видео с гарантированным сохранением результатов в Supabase.

### ✅ **Что реализовано:**

1. ✅ **Unified Model Config** (`src/config/kieModels.ts`)
2. ✅ **4 API Routes** (createTask, recordInfo, downloadUrl, callback)
3. ✅ **Supabase Integration** (таблица + storage)
4. ✅ **Automatic Result Storage** (callback webhook + Supabase Storage)
5. ✅ **Test UI** (компонент для проверки каждой модели)
6. ✅ **Error Handling & Logging** (детальное логирование без токенов)

---

## 🔧 **1. ENV Configuration**

### Добавь в `.env.local`:

```bash
# KIE.AI API
KIE_API_KEY=sk-your-key-here
KIE_MARKET_BASE_URL=https://api.kie.ai
KIE_UPLOAD_BASE_URL=https://kieai.redpandaai.co
KIE_CALLBACK_SECRET=your_random_secret_min_32_chars

# Generate secret:
# openssl rand -hex 32
```

### ⚠️ **SECURITY CRITICAL:**

- `KIE_API_KEY` **НИКОГДА** не должен попадать на клиент
- Используй только в API routes (server-side)
- Проверь что нет `NEXT_PUBLIC_KIE_*` переменных

---

## 📦 **2. File Structure**

### **Созданные файлы (10):**

```
lensroom-v2/
├── src/
│   ├── config/
│   │   └── kieModels.ts              ★ Источник правды для моделей
│   │
│   ├── components/
│   │   └── kie/
│   │       └── test-generator.tsx    ★ UI для тестирования
│   │
│   └── app/api/kie/
│       ├── createTask/route.ts       ★ Создание задачи
│       ├── recordInfo/route.ts       ★ Проверка статуса
│       ├── downloadUrl/route.ts      ★ Получение download URL
│       └── callback/route.ts         ★ Webhook от KIE.ai
│
├── supabase/migrations/
│   └── 010_kie_generations.sql       ★ Schema для KIE
│
├── .env.example                       ★ Шаблон ENV переменных
└── KIE_INTEGRATION.md                ★ Эта документация
```

---

## 🎯 **3. Models Configuration**

### **4 модели в `src/config/kieModels.ts`:**

| ID | Name | API Model | Kind | Mode | Stars |
|---|---|---|---|---|---|
| `seedream_45_t2i` | Seedream 4.5 | `seedream/4.5-text-to-image` | image | t2i | 8⭐ |
| `flux2_pro_t2i` | FLUX.2 Pro | `flux-2/pro-text-to-image` | image | t2i | 12⭐ |
| `kling_26_t2v` | Kling 2.6 | `kling-2.6/text-to-video` | video | t2v | 25⭐ |
| `bytedance_v1pro_i2v` | Bytedance V1 Pro | `bytedance/v1-pro-image-to-video` | video | i2v | 30⭐ |

### **Helper functions:**

```typescript
import { getKieModel, getAllKieModels, validateModelInput } from '@/config/kieModels';

// Get specific model
const model = getKieModel('flux2_pro_t2i');

// Get all image models
const imageModels = getAllKieModels().filter(m => m.kind === 'image');

// Validate input
const validation = validateModelInput('seedream_45_t2i', { prompt: 'test' });
```

---

## 🔌 **4. API Routes**

### **A) POST `/api/kie/createTask`**

Создаёт задачу генерации.

**Request:**
```typescript
{
  modelKey: 'flux2_pro_t2i',
  prompt: 'A beautiful sunset',
  options?: {
    aspectRatio: '16:9',
    resolution: '2K',
    // ... model-specific params
  },
  assets?: {
    imageUrl?: string,     // For i2v
    imageBase64?: string,  // For i2v
  }
}
```

**Response:**
```typescript
{
  success: true,
  taskId: 'task_xxx',
  model: 'FLUX.2 Pro',
  starsCost: 12,
  callbackEnabled: true
}
```

**Features:**
- ✅ Auth check (Telegram session)
- ✅ Credits check & deduction
- ✅ Image upload (for i2v models)
- ✅ Model-specific transformations
- ✅ Callback URL registration
- ✅ Database insert (status: 'generating')

---

### **B) GET `/api/kie/recordInfo?taskId=xxx`**

Проверяет статус задачи (polling).

**Response:**
```typescript
{
  code: 0,
  message: 'success',
  data: {
    taskId: 'task_xxx',
    state: 'success' | 'fail' | 'generating' | 'waiting' | 'queuing',
    resultJson?: string,  // JSON with results
    failMsg?: string,
    failCode?: string,
  }
}
```

**Usage:**
```typescript
// Poll every 3 seconds
const checkStatus = async (taskId: string) => {
  const res = await fetch(`/api/kie/recordInfo?taskId=${taskId}`);
  const data = await res.json();
  return data.data.state;
};
```

---

### **C) POST `/api/kie/downloadUrl`**

Получает постоянную ссылку для скачивания.

**Request:**
```typescript
{
  url: 'https://kieai.redpandaai.co/result/xxx'
}
```

**Response:**
```typescript
{
  downloadUrl: 'https://...',
  expiresIn: 3600  // seconds
}
```

---

### **D) POST `/api/kie/callback?secret=xxx`**

Webhook от KIE.ai при завершении задачи.

**Payload from KIE:**
```typescript
{
  taskId: 'task_xxx',
  state: 'success' | 'fail',
  resultJson?: string,
  failMsg?: string,
}
```

**What it does:**
1. ✅ Verifies `KIE_CALLBACK_SECRET`
2. ✅ Finds generation in DB by `task_id`
3. ✅ Downloads result files
4. ✅ Uploads to Supabase Storage (`generations` bucket)
5. ✅ Updates DB with:
   - `status`: 'success' / 'failed'
   - `result_urls`: array of Supabase Storage URLs
   - `preview_url`: first result URL

**Result**: Гарантирует что результаты не пропадут!

---

## 🗄️ **5. Database Schema**

### **Table: `generations`**

```sql
-- New columns added in migration 010:
ALTER TABLE generations ADD COLUMN
  kind TEXT,                -- 'image' | 'video'
  model_key TEXT,          -- 'flux2_pro_t2i'
  result_urls JSONB,       -- ['url1', 'url2', ...]
  preview_url TEXT,        -- First result or Storage URL
  options JSONB,           -- { prompt, aspectRatio, ... }
  error TEXT;              -- Error message if failed
```

### **Storage Bucket: `generations`**

```sql
-- Path structure:
-- {user_id}/{kind}/{generation_id}_{index}_{timestamp}.{ext}

-- Example:
-- abc-123/image/gen-456_0_1734300000.jpg
-- abc-123/video/gen-789_0_1734300000.mp4
```

**Policies:**
- ✅ Public read access (anyone can view via URL)
- ✅ User write access (только в свою папку)
- ✅ Service role full access (для callback)

---

## 🧪 **6. Testing**

### **A) Setup Test Environment**

1. **Run migration:**
```bash
# On VDS:
ssh root@104.222.177.29
cd /root/lensroom/frontend
```

```sql
-- In Supabase SQL Editor:
-- Copy contents of supabase/migrations/010_kie_generations.sql
-- Execute
```

2. **Set ENV variables:**
```bash
# Add to .env.local or PM2 ecosystem:
KIE_API_KEY=sk-your-key
KIE_CALLBACK_SECRET=$(openssl rand -hex 32)
```

3. **Restart server:**
```bash
npm run build
pm2 restart lensroom
```

---

### **B) UI Testing**

Компонент `<TestGenerator />` добавлен на:
- `/create` (image models)
- `/create/video` (video models)

**Как использовать:**
1. Открой `/create` или `/create/video`
2. Найди блок "🧪 KIE.ai Test Generator"
3. Нажми "Test {Model Name}"
4. Наблюдай:
   - ✅ Task ID появляется
   - ✅ Polling attempts увеличиваются
   - ✅ Статус меняется на success/failed
   - ✅ Результаты показываются со ссылками

---

### **C) Test Each Model**

#### **1. Seedream 4.5 (Image)**

```bash
curl -X POST https://lensroom.ru/api/kie/createTask \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=YOUR_SESSION" \
  -d '{
    "modelKey": "seedream_45_t2i",
    "prompt": "A majestic lion in savanna, photorealistic",
    "options": {
      "aspectRatio": "16:9",
      "steps": 30,
      "guidanceScale": 7.5
    }
  }'
```

**Expected:**
- ✅ HTTP 200
- ✅ Returns `taskId`
- ✅ Deducts 8⭐
- ✅ After 30-60s: result appears in `/library`

**Possible errors:**
- ❌ 401: Not logged in
- ❌ 402: Insufficient credits
- ❌ 422: Model requires premium subscription

---

#### **2. FLUX.2 Pro (Image)**

```bash
curl -X POST https://lensroom.ru/api/kie/createTask \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=YOUR_SESSION" \
  -d '{
    "modelKey": "flux2_pro_t2i",
    "prompt": "A cyberpunk city at night, neon lights",
    "options": {
      "resolution": "2K",
      "aspectRatio": "16:9"
    }
  }'
```

**Expected:**
- ✅ Deducts 12⭐
- ✅ Higher quality than Seedream
- ✅ Requires both `resolution` and `aspectRatio`

---

#### **3. Kling 2.6 (Video)**

```bash
curl -X POST https://lensroom.ru/api/kie/createTask \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=YOUR_SESSION" \
  -d '{
    "modelKey": "kling_26_t2v",
    "prompt": "A bird flying over ocean waves, cinematic",
    "options": {
      "duration": 5,
      "aspectRatio": "16:9",
      "sound": false
    }
  }'
```

**Expected:**
- ✅ Deducts 25⭐
- ✅ Video generation takes 2-5 minutes
- ✅ `duration` sent as string ("5" not 5)

---

#### **4. Bytedance V1 Pro (Image-to-Video)**

**Note:** Requires image upload!

```bash
# Step 1: Upload image
curl -X POST https://kieai.redpandaai.co/api/file-url-upload \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/image.jpg"}'
# Returns: { "data": { "url": "https://..." } }

# Step 2: Create task
curl -X POST https://lensroom.ru/api/kie/createTask \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=YOUR_SESSION" \
  -d '{
    "modelKey": "bytedance_v1pro_i2v",
    "prompt": "Make the person wave hand",
    "options": {
      "duration": 5,
      "aspectRatio": "16:9",
      "resolution": "720p"
    },
    "assets": {
      "imageUrl": "UPLOADED_IMAGE_URL"
    }
  }'
```

**Expected:**
- ✅ Deducts 30⭐
- ✅ Image uploaded automatically
- ✅ Video animates the source image

---

## 📊 **7. Monitoring & Logs**

### **Server Logs:**

```bash
# On VDS:
pm2 logs lensroom

# Watch for:
[KIE createTask] Starting for model: flux2_pro_t2i
[KIE createTask] Task created: task_xxx
[KIE callback] Received for task task_xxx, state: success
[KIE callback] Stored 1 files in Supabase Storage
```

### **Check Database:**

```sql
-- See recent generations:
SELECT 
  id, 
  user_id, 
  kind, 
  model_key, 
  status, 
  task_id,
  created_at
FROM generations
ORDER BY created_at DESC
LIMIT 10;

-- Check successful generations:
SELECT 
  kind,
  model_key,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as successful
FROM generations
GROUP BY kind, model_key;
```

### **Check Storage:**

```sql
-- See stored files:
SELECT 
  name, 
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'generations'
ORDER BY created_at DESC
LIMIT 20;
```

---

## ❌ **8. Error Handling**

### **Common Errors:**

| Error | HTTP | Причина | Решение |
|---|---|---|---|
| Unauthorized | 401 | Not logged in | Login via Telegram |
| Insufficient credits | 402 | Not enough stars | Buy credits |
| Model not found | 400 | Invalid modelKey | Check `kieModels.ts` |
| Invalid input | 400 | Missing required fields | Validate with `validateModelInput()` |
| Upload failed | 500 | Image upload error | Check image URL/base64 |
| Task failed | KIE callback | KIE API error | Check `failMsg` in logs |
| Premium required | 422 | Model needs subscription | Upgrade KIE.ai plan |

### **Logging:**

✅ **Все ошибки логируются:**
- Полный ответ от KIE API (без токена)
- HTTP status codes
- Error messages from KIE
- Stack traces

❌ **НЕ логируется:**
- `KIE_API_KEY` (security)
- User passwords
- Sensitive data

### **User-Facing Errors:**

```typescript
// BAD: Не используй термин "Premium"
{ error: "Premium model requires subscription" }

// GOOD: Реальная причина
{ error: "This model requires a KIE.ai Pro subscription. Please upgrade your account." }
```

---

## 🔄 **9. Flow Diagram**

```
User clicks "Generate"
        ↓
POST /api/kie/createTask
        ↓
┌───────────────────────┐
│ 1. Check auth         │
│ 2. Check credits      │
│ 3. Validate input     │
│ 4. Upload image (i2v) │
│ 5. Call KIE Market API│
│ 6. Deduct credits     │
│ 7. Save to DB         │
└───────────────────────┘
        ↓
   Returns taskId
        ↓
   ┌─────────────┐
   │   OPTION A  │ ← Callback (автоматически)
   │   Webhook   │
   └─────────────┘
        ↓
POST /api/kie/callback
        ↓
┌───────────────────────┐
│ 1. Verify secret      │
│ 2. Parse results      │
│ 3. Download files     │
│ 4. Upload to Storage  │
│ 5. Update DB          │
└───────────────────────┘
        ↓
   ┌─────────────┐
   │   OPTION B  │ ← Polling (manual)
   │   UI polls  │
   └─────────────┘
        ↓
GET /api/kie/recordInfo
        ↓
┌───────────────────────┐
│ Check state           │
│ → success: show URLs  │
│ → fail: show error    │
│ → else: keep polling  │
└───────────────────────┘
        ↓
Result in /library
```

---

## 🎉 **10. Summary**

### ✅ **What Works:**

- ✅ 4 KIE.ai models configured
- ✅ Full API integration (create, poll, download, callback)
- ✅ Automatic result storage (Supabase Storage)
- ✅ Database tracking (generations table)
- ✅ Credits system integration
- ✅ Error handling & logging
- ✅ Test UI for each model
- ✅ Security (callback secret, server-only API key)

### 📝 **Checklist:**

1. ✅ ENV variables set (`KIE_API_KEY`, `KIE_CALLBACK_SECRET`)
2. ✅ Migration run (`010_kie_generations.sql`)
3. ✅ Storage bucket created (`generations`)
4. ✅ Test UI available (`/create`, `/create/video`)
5. ✅ Server restarted with new code

### 🚀 **Ready to Test:**

```bash
# 1. Login at https://lensroom.ru
# 2. Buy credits or use registration bonus (50⭐)
# 3. Go to /create
# 4. Find "🧪 KIE.ai Test Generator"
# 5. Click "Test FLUX.2 Pro" or any model
# 6. Watch magic happen! 🎨
```

---

## 📚 **Resources**

- [KIE.ai Docs](https://docs.kie.ai)
- [KIE.ai Dashboard](https://kie.ai/dashboard)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**🎯 Integration Status: PRODUCTION READY ✅**

All systems operational. Ready for production use.

**Deployed**: https://lensroom.ru  
**Test Pages**: `/create`, `/create/video`
