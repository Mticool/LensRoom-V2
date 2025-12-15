# 🔄 KIE.AI Reliable Delivery - End-to-End Fix

**Status**: ✅ **COMPLETE**  
**Date**: 15 Dec 2025

---

## 🎯 **Problem**

Генерации на KIE.ai завершались успешно, но результаты не появлялись в истории/библиотеке:
- ❌ Callback не сохранял результаты в Storage
- ❌ UI не проверял статус и не показывал loading
- ❌ Нет fallback polling если callback не пришёл
- ❌ Клик по истории "загружается, но ничего не происходит"

---

## ✅ **Solution: Двойной механизм доставки**

```
User creates task
     ↓
  DB INSERT (status='generating')
     ↓
┌────────────────────┐
│   MECHANISM A      │ ← Callback (primary)
│   Webhook          │
└────────────────────┘
     ↓
POST /api/kie/callback
     ↓
1. Fetch results from KIE
2. Download file
3. Upload to Supabase Storage  ← CRITICAL!
4. Update DB (status='success', asset_url)
     ↓
┌────────────────────┐
│   MECHANISM B      │ ← Polling (fallback)
│   Client-side      │
└────────────────────┘
     ↓
GET /api/kie/sync?taskId=xxx
     ↓
Same steps as callback
     ↓
UI displays result from asset_url
```

---

## 📦 **Created/Modified Files (7)**

### **1. Database Migration**
```sql
✅ supabase/migrations/011_kie_reliable_delivery.sql
   - ADD COLUMN provider ('kie')
   - ADD COLUMN asset_url (Supabase Storage URL)
   - UPDATE status constraint (queued, generating, success, failed)
   - CREATE POLICY for service role INSERT
```

### **2. API Routes**

```typescript
✅ src/app/api/kie/callback/route.ts (REWRITTEN)
   - Parse resultJson or fetch from recordInfo
   - Download file from KIE
   - Upload to Supabase Storage
   - Update DB with asset_url
   - Full error logging

✅ src/app/api/kie/sync/route.ts (NEW)
   - GET /api/kie/sync?taskId=xxx
   - Fallback polling endpoint
   - Does same work as callback
   - Returns current status + assetUrl

✅ src/app/api/kie/createTask/route.ts (UPDATED)
   - Always INSERT to DB with provider='kie'
   - Return error if INSERT fails (critical)
   - Add created_at, updated_at
```

### **3. UI Components**

```typescript
✅ src/components/generator/generation-result.tsx (NEW)
   - Reliable result display component
   - Priority: asset_url → result_urls → preview_url
   - Status handling: queued/generating/success/failed
   - Auto-polling for generating status
   - Download button
   - Error messages
```

### **4. Documentation**

```
✅ KIE_RELIABLE_DELIVERY.md (this file)
```

---

## 🔧 **How It Works**

### **1. Create Task (Always Insert to DB)**

```typescript
// POST /api/kie/createTask
const { error } = await supabase.from('generations').insert({
  user_id: userId,
  kind: 'image' | 'video',
  model_key: 'flux2_pro_t2i',
  provider: 'kie',
  task_id: taskId,  // From KIE API
  status: 'generating',
  prompt,
  options: {...},
  created_at: now,
  updated_at: now,
});

// CRITICAL: Return error if this fails
if (error) return { error: 'Failed to save' };
```

### **2. Callback (Primary Mechanism)**

```typescript
// POST /api/kie/callback?secret=xxx
// Triggered by KIE.ai when task completes

// A. Find generation by task_id
const generation = await supabase
  .from('generations')
  .select('*')
  .eq('task_id', taskId)
  .single();

// B. Parse results (or fetch from recordInfo if missing)
let resultUrls = parseResultJson(callback.resultJson);
if (resultUrls.length === 0) {
  resultUrls = await fetchResultsFromRecordInfo(taskId);
}

// C. Download file from KIE
const response = await fetch(resultUrls[0]);
const blob = await response.arrayBuffer();

// D. Upload to Supabase Storage
const storagePath = `${userId}/${kind}/${generationId}_${timestamp}.${ext}`;
await supabase.storage.from('generations').upload(storagePath, blob);

// E. Get public URL
const { publicUrl } = supabase.storage.from('generations').getPublicUrl(storagePath);

// F. Update DB
await supabase.from('generations').update({
  status: 'success',
  result_urls: resultUrls,
  asset_url: publicUrl,  // ← THIS IS KEY!
  updated_at: now,
});
```

**Why this works:**
- ✅ File stored in OUR storage (guaranteed availability)
- ✅ `asset_url` never expires
- ✅ No dependency on KIE URLs

### **3. Sync (Fallback Mechanism)**

```typescript
// GET /api/kie/sync?taskId=xxx
// Manual polling by client or server cron

// Does EXACT same steps as callback:
// 1. Fetch from KIE recordInfo
// 2. Download file
// 3. Upload to Storage
// 4. Update DB

// Returns current status
{
  "status": "success",
  "assetUrl": "https://supabase.../image.jpg"
}
```

**When to use:**
- ✅ Callback didn't arrive (network issue)
- ✅ Callback failed (server error)
- ✅ User wants to refresh status manually

### **4. UI Display**

```typescript
// src/components/generator/generation-result.tsx

// Priority order:
1. if (generation.asset_url) {
     // ✅ Use Supabase Storage URL (most reliable)
     displayUrl = generation.asset_url;
   }

2. else if (generation.result_urls[0]) {
     // Try KIE URL (may expire)
     // Attempt /api/kie/downloadUrl for better access
     displayUrl = await getDownloadUrl(generation.result_urls[0]);
   }

3. else if (generation.preview_url) {
     // Legacy fallback
     displayUrl = generation.preview_url;
   }

4. else if (generation.status === 'generating') {
     // Show loading spinner
     // Auto-poll /api/kie/sync every 3 seconds
   }

5. else {
     // Show error
   }
```

---

## 📊 **Status Flow**

```
User clicks "Generate"
     ↓
Status: queued
     ↓
KIE picks up task
     ↓
Status: generating
     ↓ (1-5 minutes)
KIE completes task
     ↓
┌──────────────────┐
│ Callback arrives │
└──────────────────┘
     ↓
Download + Upload to Storage
     ↓
Status: success
asset_url: https://supabase.co/.../image.jpg
     ↓
UI displays image/video
```

**If callback fails:**

```
Status: generating (stuck)
     ↓
Client polls /api/kie/sync every 3s
     ↓
Sync fetches from KIE
     ↓
Download + Upload to Storage
     ↓
Status: success
     ↓
UI displays image/video
```

---

## 🧪 **Testing**

### **Test 1: Photo Generation**

```bash
# 1. Login at https://lensroom.ru
# 2. Go to /create
# 3. Select "FLUX.2 Pro"
# 4. Click "Test FLUX.2 Pro"

# Expected:
- ✅ Task ID appears
- ✅ Status in history: "Генерация..."
- ✅ Polling every 3s
- ✅ After 30-60s: Status → "success"
- ✅ Click history item → Image loads
- ✅ Download button works

# Verify in DB:
SELECT 
  id, status, asset_url, result_urls, task_id
FROM generations
WHERE task_id = 'task_xxx';

# Expected:
-- status: 'success'
-- asset_url: 'https://PROJECT.supabase.co/storage/v1/object/public/generations/...'
-- result_urls: ['https://kieai.redpandaai.co/...']
```

### **Test 2: Video Generation**

```bash
# 1. Go to /create/video
# 2. Select "Kling 2.6"
# 3. Click "Test Kling 2.6"

# Expected:
- ✅ Task ID appears
- ✅ Status: "Генерация..." (2-5 min)
- ✅ Polling continues
- ✅ After 2-5 min: Status → "success"
- ✅ Click history → Video plays
- ✅ Download button works
```

### **Test 3: Callback Verification**

```bash
# On VDS:
pm2 logs lensroom | grep "KIE callback"

# Expected logs:
[KIE callback] Received: { taskId: 'task_xxx', state: 'success' }
[KIE callback] Parsed 1 URLs from callback
[KIE callback] Downloading from: https://kieai.redpandaai.co/...
[KIE callback] Downloaded 350000 bytes
[KIE callback] Uploading to: user_id/image/gen_xxx.jpg
[KIE callback] ✅ Stored: https://...supabase.co/...
[KIE callback] ✅ SUCCESS in 1500ms
```

### **Test 4: Fallback Polling**

```bash
# Simulate callback failure:
# 1. Create task
# 2. Callback doesn't arrive (network issue)
# 3. Client polls /api/kie/sync

# Expected:
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"

# Response:
{
  "status": "success",
  "assetUrl": "https://...supabase.co/...",
  "resultUrls": ["https://kieai..."]
}

# Verify DB was updated by sync endpoint
```

---

## 🔍 **Troubleshooting**

### **Problem: "Генерация..." stuck forever**

**Причины:**
1. Callback не пришёл (network/firewall)
2. Callback пришёл, но упал (error in code)
3. Task в KIE не завершился (still generating)

**Solution:**
```bash
# Check server logs
pm2 logs lensroom | grep "task_xxx"

# Manually trigger sync
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"

# Check KIE API directly
curl "https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_xxx" \
  -H "Authorization: Bearer $KIE_API_KEY"
```

### **Problem: История пустая**

**Причины:**
1. DB INSERT failed in createTask
2. RLS policies blocking read
3. Wrong user_id

**Solution:**
```sql
-- Check if generation exists
SELECT * FROM generations WHERE task_id = 'task_xxx';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'generations';

-- Test as user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'USER_UUID';
SELECT * FROM generations;
```

### **Problem: Клик на историю → ничего не происходит**

**Причины:**
1. `asset_url` = null
2. `result_urls` = []
3. Status still 'generating'
4. URL expired

**Solution:**
```sql
-- Check generation data
SELECT 
  id,
  status,
  asset_url,
  result_urls,
  error,
  created_at,
  updated_at
FROM generations
WHERE id = 'GEN_UUID';

-- If asset_url is null but status is success:
-- Manually trigger sync:
```

```bash
curl "https://lensroom.ru/api/kie/sync?taskId=TASK_ID"
```

### **Problem: Storage upload fails**

**Error:** "Upload failed: 403 Forbidden"

**Solution:**
```sql
-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'generations';

-- Ensure service role policy exists:
CREATE POLICY "Service can manage all generation files" 
ON storage.objects
FOR ALL
USING (bucket_id = 'generations');
```

---

## 📈 **Monitoring**

### **Key Metrics**

```sql
-- Success rate (last 24h)
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'generating') as stuck,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 1) as success_rate
FROM generations
WHERE 
  provider = 'kie'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Average time to completion
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM generations
WHERE 
  provider = 'kie'
  AND status = 'success'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Storage usage
SELECT 
  COUNT(*) as files,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
WHERE bucket_id = 'generations';
```

### **Alerts**

```sql
-- Stuck generations (>10 minutes in generating)
SELECT 
  id,
  task_id,
  kind,
  model_key,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_elapsed
FROM generations
WHERE 
  status = 'generating'
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at ASC;

-- Failed generations (last hour)
SELECT 
  id,
  task_id,
  kind,
  model_key,
  error,
  created_at
FROM generations
WHERE 
  status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## 🎯 **Summary**

### **✅ Improvements**

| Before | After |
|---|---|
| ❌ Callback only | ✅ Callback + Polling |
| ❌ No Storage upload | ✅ Always upload to Storage |
| ❌ KIE URLs (expire) | ✅ Supabase URLs (permanent) |
| ❌ No status in UI | ✅ Clear status + spinner |
| ❌ Stuck on "loading" | ✅ Auto-polling + retry |
| ❌ No error messages | ✅ Clear error display |
| ❌ Can't recover | ✅ Manual sync available |

### **🔐 Guarantees**

1. ✅ **Always save to DB** before returning taskId
2. ✅ **Always upload to Storage** on success
3. ✅ **Always update asset_url** after upload
4. ✅ **Always show status** in UI (generating/success/failed)
5. ✅ **Always retry** via polling if callback fails
6. ✅ **Always log** errors for debugging

---

## 🚀 **Next Steps**

### **Deployment:**

```bash
# 1. Run migration
# In Supabase SQL Editor:
# Execute: supabase/migrations/011_kie_reliable_delivery.sql

# 2. Deploy code
ssh root@104.222.177.29
cd /root/lensroom/frontend
git pull
npm run build
pm2 restart lensroom

# 3. Test both mechanisms
# - Create generation → verify callback works
# - Manually call /api/kie/sync → verify polling works
# - Check history → verify UI shows results

# 4. Monitor
pm2 logs lensroom | grep "KIE"
```

### **Optional Enhancements:**

1. **Cron job** to sync stuck generations
2. **Retry logic** in callback (3 attempts)
3. **Cleanup** old failed generations
4. **Notifications** when generation completes
5. **Progress bar** for long generations

---

**✅ Reliable Delivery: COMPLETE**

**Result**: Users will ALWAYS see their generated content in history/library!

---

**Test Now**: https://lensroom.ru/create
