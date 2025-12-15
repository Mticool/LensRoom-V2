# 🚀 KIE.AI Integration - Deployment Checklist

**Generated**: 15 Dec 2025  
**For**: Production deployment на VDS 104.222.177.29

---

## ✅ **Pre-Deployment Checklist**

### **1. Files Created (11 новых файлов)**

```bash
# Verify all files exist locally:
ls -lh src/config/kieModels.ts
ls -lh src/app/api/kie/createTask/route.ts
ls -lh src/app/api/kie/recordInfo/route.ts
ls -lh src/app/api/kie/downloadUrl/route.ts
ls -lh src/app/api/kie/callback/route.ts
ls -lh src/components/kie/test-generator.tsx
ls -lh supabase/migrations/010_kie_generations.sql
ls -lh KIE_INTEGRATION.md
ls -lh KIE_SETUP_SUMMARY.md
ls -lh DEPLOYMENT_CHECKLIST.md
```

### **2. ENV Variables Ready**

Create this file on VDS: `/root/lensroom/frontend/.env.local`

```bash
# Required KIE.ai variables
KIE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KIE_MARKET_BASE_URL=https://api.kie.ai
KIE_UPLOAD_BASE_URL=https://kieai.redpandaai.co
KIE_CALLBACK_SECRET=your_random_32_char_secret_here

# Verify callback secret is strong:
echo $KIE_CALLBACK_SECRET | wc -c  # Should be > 32
```

### **3. Supabase Migration Ready**

```sql
-- File: supabase/migrations/010_kie_generations.sql
-- Contains:
-- ✓ ALTER TABLE generations (add KIE columns)
-- ✓ CREATE INDEX on task_id, model_key, kind
-- ✓ CREATE POLICY for service role
-- ✓ INSERT INTO storage.buckets (generations)
-- ✓ CREATE POLICY for storage access
```

---

## 📤 **Deployment Steps**

### **Step 1: Upload Files to VDS**

```bash
# From local machine:
cd /Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2

# Option A: SCP (если SSH работает)
sshpass -p 'EDJwxEBDqn5z' scp -r \
  src/config/kieModels.ts \
  src/app/api/kie/ \
  src/components/kie/ \
  root@104.222.177.29:/root/lensroom/frontend/src/

# Option B: Git (рекомендуется)
git add .
git commit -m "feat: Add KIE.ai integration with 4 models"
git push

# Then on VDS:
ssh root@104.222.177.29
cd /root/lensroom/frontend
git pull
```

### **Step 2: Set ENV Variables**

```bash
# On VDS:
ssh root@104.222.177.29
cd /root/lensroom/frontend

# Create/update .env.local
nano .env.local

# Add KIE variables (paste from above)
# Save: Ctrl+O, Enter, Ctrl+X

# Verify:
grep KIE .env.local | wc -l  # Should be 4
```

### **Step 3: Run Supabase Migration**

```bash
# Option A: Supabase Dashboard (RECOMMENDED)
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click "SQL Editor"
3. Copy contents of supabase/migrations/010_kie_generations.sql
4. Paste and click "Run"
5. Verify: "Success. No rows returned"

# Option B: Via psql (if you have direct access)
psql $DATABASE_URL < supabase/migrations/010_kie_generations.sql
```

### **Step 4: Build & Deploy**

```bash
# On VDS:
cd /root/lensroom/frontend

# Clean build
rm -rf .next
rm -rf node_modules/.cache

# Install (if new deps were added)
npm install

# Build
npm run build

# Expected output:
# ✓ Compiled successfully in XX.Xs
# Route (app) ... 46+ pages
# ✓ Generating static pages

# Restart PM2
pm2 restart lensroom

# Check status
pm2 status
# Should show: online, 0 restarts

# Monitor logs for 30 seconds
pm2 logs lensroom --lines 50
```

### **Step 5: Smoke Tests**

```bash
# Test 1: Health check
curl https://lensroom.ru/api/health
# Expected: {"status":"ok"}

# Test 2: KIE routes exist
curl -I https://lensroom.ru/api/kie/recordInfo 2>&1 | head -1
# Expected: HTTP/1.1 400 Bad Request (missing taskId - OK!)

curl -I https://lensroom.ru/api/kie/downloadUrl 2>&1 | head -1
# Expected: HTTP/1.1 405 Method Not Allowed (it's POST only - OK!)

# Test 3: Pages load
curl -I https://lensroom.ru/create 2>&1 | head -1
# Expected: HTTP/1.1 200 OK

curl -I https://lensroom.ru/create/video 2>&1 | head -1
# Expected: HTTP/1.1 200 OK
```

---

## 🧪 **Testing Guide**

### **Test 1: Visual UI Test (RECOMMENDED)**

```bash
# 1. Open browser
open https://lensroom.ru/create

# 2. Login via Telegram

# 3. Scroll down to find "🧪 KIE.ai Test Generator"

# 4. Click "Test FLUX.2 Pro" (or any model)

# 5. Watch the process:
#    ✓ Status: Creating...
#    ✓ Task ID: task_xxx
#    ✓ Status: Polling (1/60)...
#    ✓ Status: Success
#    ✓ Results: [url1, url2, ...]

# 6. Click "Open" to view result

# 7. Go to /library
open https://lensroom.ru/library

# 8. Verify generation appears in history
```

### **Test 2: API Test (Advanced)**

```bash
# Prerequisites:
# - Login at https://lensroom.ru
# - Copy telegram_session cookie from browser DevTools

# Test createTask
curl -X POST https://lensroom.ru/api/kie/createTask \
  -H "Content-Type: application/json" \
  -H "Cookie: telegram_session=YOUR_SESSION_COOKIE" \
  -d '{
    "modelKey": "flux2_pro_t2i",
    "prompt": "A beautiful sunset over mountains",
    "options": {
      "resolution": "2K",
      "aspectRatio": "16:9"
    }
  }'

# Expected response:
# {
#   "success": true,
#   "taskId": "task_xxx",
#   "model": "FLUX.2 Pro",
#   "starsCost": 12,
#   "callbackEnabled": true
# }

# Copy taskId, then poll:
TASK_ID="task_xxx"

# Poll status (repeat every 3 seconds)
curl "https://lensroom.ru/api/kie/recordInfo?taskId=$TASK_ID"

# When state = "success", check database:
```

### **Test 3: Database Verification**

```sql
-- In Supabase SQL Editor:

-- Check new columns exist
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'generations' 
  AND column_name IN ('kind', 'model_key', 'result_urls', 'preview_url', 'options', 'error');
-- Expected: 6 rows

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'generations';
-- Expected: 1 row

-- Check recent generations
SELECT 
  id,
  kind,
  model_key,
  status,
  task_id,
  created_at
FROM generations
WHERE kind IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔍 **Post-Deployment Verification**

### **✅ System Health**

```bash
# On VDS:
pm2 status
# ✓ lensroom: online, uptime > 1m

pm2 logs lensroom --lines 100 | grep -i error
# ✓ No critical errors

df -h
# ✓ Disk space > 20% free

free -h
# ✓ Memory available
```

### **✅ Database Health**

```sql
-- Check table exists
SELECT COUNT(*) FROM generations;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'generations' 
  AND indexname LIKE '%kie%';
-- Expected: idx_generations_task_id, idx_generations_model_key, etc.

-- Check storage bucket
SELECT COUNT(*) FROM storage.objects 
WHERE bucket_id = 'generations';
```

### **✅ API Endpoints**

| Endpoint | Method | Expected Status | Test Command |
|---|---|---|---|
| `/api/health` | GET | 200 | `curl https://lensroom.ru/api/health` |
| `/api/kie/createTask` | POST | 401 (no auth) | `curl -X POST https://lensroom.ru/api/kie/createTask` |
| `/api/kie/recordInfo` | GET | 400 (no taskId) | `curl https://lensroom.ru/api/kie/recordInfo` |
| `/api/kie/downloadUrl` | POST | 401 (no auth) | `curl -X POST https://lensroom.ru/api/kie/downloadUrl` |
| `/api/kie/callback` | POST | 401 (no secret) | `curl -X POST https://lensroom.ru/api/kie/callback` |

### **✅ UI Pages**

| Page | Expected | Test URL |
|---|---|---|
| `/create` | 200, has TestGenerator | https://lensroom.ru/create |
| `/create/video` | 200, has TestGenerator | https://lensroom.ru/create/video |
| `/library` | 200, shows generations | https://lensroom.ru/library |

---

## 🐛 **Troubleshooting**

### **Build Failed**

```bash
# Error: Module not found
npm install  # Re-install dependencies

# Error: Type errors
npx tsc --noEmit  # Check TypeScript errors
# Fix any import errors in new files

# Error: Out of memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### **Runtime Errors**

```bash
# Check logs
pm2 logs lensroom --err

# Common issues:

# 1. "KIE_API_KEY not configured"
echo $KIE_API_KEY  # Should not be empty
nano .env.local    # Add variable
pm2 restart lensroom

# 2. "Module not found: @/config/kieModels"
ls src/config/kieModels.ts  # File should exist
npm run build  # Rebuild

# 3. "Cannot find module 'kie/test-generator'"
ls src/components/kie/test-generator.tsx
# Fix import paths if needed
```

### **Migration Issues**

```sql
-- Check if migration already ran
SELECT * FROM information_schema.columns 
WHERE table_name = 'generations' AND column_name = 'kind';

-- If empty, run migration again

-- If error: "column already exists"
-- Migration was already run, safe to skip
```

---

## 📊 **Monitoring**

### **Live Monitoring**

```bash
# Server logs
pm2 logs lensroom | grep -E "KIE|error"

# Database activity
# In Supabase Dashboard:
# Database → Query Performance
# Look for queries to 'generations' table

# API calls
# Check Vercel/Next.js logs for:
# POST /api/kie/createTask
# GET /api/kie/recordInfo
# POST /api/kie/callback
```

### **Metrics to Track**

```sql
-- Generation stats (last 24h)
SELECT 
  model_key,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_sec
FROM generations
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND kind IS NOT NULL
GROUP BY model_key;

-- Storage usage
SELECT 
  (metadata->>'size')::bigint / 1024 / 1024 as size_mb,
  created_at
FROM storage.objects
WHERE bucket_id = 'generations'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ **Final Checklist**

- [ ] **Files uploaded** (11 new files)
- [ ] **ENV set** (`KIE_API_KEY`, `KIE_CALLBACK_SECRET`)
- [ ] **Migration run** (010_kie_generations.sql)
- [ ] **Build successful** (`npm run build` completed)
- [ ] **PM2 online** (`pm2 status` shows online)
- [ ] **Health check passes** (`/api/health` returns 200)
- [ ] **KIE routes exist** (`/api/kie/*` respond)
- [ ] **UI test works** (TestGenerator on `/create`)
- [ ] **Generation saved** (appears in `/library`)
- [ ] **Logs clean** (no errors in `pm2 logs`)

---

## 🎉 **Success Criteria**

✅ **Integration is successful if:**

1. **UI Test works**:
   - Click "Test FLUX.2 Pro" on `/create`
   - Task ID appears
   - Polling completes (success or fail)
   - If success: Result URLs shown
   - Generation appears in `/library`

2. **Database updated**:
   - `generations` table has new record
   - `status` = 'success'
   - `result_urls` not empty
   - `preview_url` set

3. **Storage working**:
   - Files uploaded to `generations` bucket
   - Public URLs accessible

4. **No errors**:
   - PM2 logs clean
   - Browser console clean
   - Supabase logs OK

---

## 📞 **Support**

If issues persist:

1. **Check logs**: `pm2 logs lensroom`
2. **Check docs**: `KIE_INTEGRATION.md`
3. **Check database**: Run queries above
4. **Check ENV**: `cat .env.local | grep KIE`

---

## 🚀 **Deployment Complete!**

**Next**: Test at https://lensroom.ru/create

**Docs**: See `KIE_INTEGRATION.md` for full guide

**Summary**: See `KIE_SETUP_SUMMARY.md` for overview

---

**Good luck! 🎨**
